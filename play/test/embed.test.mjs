// "Today's Linkr" widget: only /play/embed/ may be framed by other sites; every other path refuses framing.
// The widget is light (no billing script, no storage, no network calls), shows today's daily and links back with ?ref=embed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../../', import.meta.url).pathname;
const read = (f) => readFileSync(root + f, 'utf8');
const rules = JSON.parse(read('vercel.json')).headers;
// Vercel "source" patterns used here are plain regex groups, so they read the same as JS regexes.
const headersFor = (path) => {
  const out = {};
  for (const r of rules) if (new RegExp(`^${r.source}$`).test(path)) for (const h of r.headers) out[h.key] = h.value;
  return out;
};

test('framing: the widget path allows any site; every other page allows only our own', () => {
  for (const p of ['/play/embed/linkr/', '/play/embed/linkr']) {
    const h = headersFor(p);
    assert.match(h['Content-Security-Policy'], /frame-ancestors \*/, p);
    assert.equal(h['X-Frame-Options'], undefined, p);
    assert.equal(h['X-Content-Type-Options'], 'nosniff', p);
  }
  for (const p of ['/', '/play/', '/play/linkr/', '/footsure/', '/spare-key/', '/api/checkout', '/play/embedded']) {
    const h = headersFor(p);
    assert.match(h['Content-Security-Policy'], /frame-ancestors 'self'$/, p);
    assert.equal(h['X-Frame-Options'], 'SAMEORIGIN', p);
  }
  // The embed keeps its stricter no-Supabase connect-src; all other directives match the site policy.
  const strip = (c) => c
    .replace(/ https:\/\/dejplqevodwfeaemrska\.supabase\.co/g, '')
    .replace(/; frame-ancestors .*$/, '');
  const embedCsp = headersFor('/play/embed/linkr/')['Content-Security-Policy'];
  const siteCsp = headersFor('/play/')['Content-Security-Policy'];
  assert.equal(strip(embedCsp), strip(siteCsp));
  assert.doesNotMatch(embedCsp, /dejplqevodwfeaemrska\.supabase\.co/);
});

test('the widget plays today\'s daily with no storage, billing or network, and links back with ?ref=embed', () => {
  const html = read('play/embed/linkr/index.html'); const js = read('play/js/embed-linkr.mjs');
  assert.match(html, /href="\/play\/\?ref=embed"/);
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(html, /pro\.js/);
  assert.match(js, /L\.dailyPuzzle\(day, 'normal'\)/);
  assert.doesNotMatch(js, /localStorage|sessionStorage|fetch\(|serviceWorker|sendBeacon/);
  assert.ok(!new RegExp(['MO', 'NAD'].join(''), 'i').test(html + js));
});

test('the Play hub offers the embed code for the widget', () => {
  const hub = read('play/index.html');
  assert.match(hub, /Put today's puzzle on your site/);
  assert.match(hub, /&lt;iframe src="https:\/\/quickwell\.app\/play\/embed\/linkr\/"/);
  assert.ok(existsSync(root + 'play/embed/linkr/index.html'));
});
