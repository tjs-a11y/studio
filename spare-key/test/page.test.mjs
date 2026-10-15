// Static checks on spare-key/index.html: search tags, strict CSP, no outside network calls, billing wiring,
// the exact honesty and privacy wording from the build spec, and banned claims.
// Run: node --test spare-key/test/page.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const dir = new URL('..', import.meta.url).pathname;
const root = new URL('../..', import.meta.url).pathname;
const html = readFileSync(dir + 'index.html', 'utf8');
const ctx = vm.createContext({});
vm.runInContext(html.match(/<script id="sk-i18n">([\s\S]*?)<\/script>/)[1], ctx);
const I = JSON.parse(JSON.stringify(ctx.SK_I18N));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"');

test('search tags follow the site conventions', () => {
  const title = (/<title>([^<]*)<\/title>/.exec(html) || [])[1];
  const desc = decode((/<meta name="description" content="([^"]*)">/.exec(html) || [])[1] || '');
  assert.ok(title && title.length <= 60, `title ${title && title.length}`);
  assert.ok(desc && desc.length <= 155, `description ${desc.length}`);
  assert.ok(html.includes('<link rel="canonical" href="https://quickwell.app/spare-key/">'));
  assert.ok(html.includes('<meta property="og:url" content="https://quickwell.app/spare-key/">'));
  assert.ok(html.includes('<meta property="og:image" content="https://quickwell.app/spare-key/og.png">'));
  for (const tag of ['og:title', 'og:description', 'twitter:card', 'twitter:image']) assert.ok(html.includes(tag), tag);
  assert.ok(existsSync(dir + 'og.png'));
  const png = readFileSync(dir + 'og.png');
  assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
});

test('JSON-LD parses and offers match the real prices ($0 and $4.99 once)', () => {
  const offers = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) for (const n of JSON.parse(m[1])['@graph']) if (n.offers) offers.push(...n.offers.map((o) => o.price));
  assert.deepEqual(offers.sort(), ['0', '4.99']);
});

test('strict CSP: no outside scripts, styles, fonts or connections; checkout only via a top-level redirect', () => {
  const csp = (/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html) || [])[1];
  assert.ok(csp, 'CSP meta');
  const d = Object.fromEntries(csp.split(';').map((x) => x.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
  assert.deepEqual(d['default-src'], ["'self'"]);
  assert.deepEqual(d['connect-src'], ["'self'"]);
  assert.deepEqual(d['script-src'], ["'self'", "'unsafe-inline'"]);
  assert.deepEqual(d['object-src'], ["'none'"]); assert.deepEqual(d['frame-src'], ["'none'"]);
  const srcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(srcs, ['/js/va.js', '/_vercel/insights/script.js', '/js/pro.js']); // same-origin page-visit counter (privacy page) + billing
  assert.ok(!/<link[^>]+rel="stylesheet"/.test(html), 'no outside stylesheets');
  const code = [...html.matchAll(/<script id="sk-(core|ui)">([\s\S]*?)<\/script>/g)].map((m) => m[2]).join('\n');
  const calls = [...code.matchAll(/fetch\(\s*(['"`])([^'"`]+)\1/g)].map((m) => m[2]);
  assert.ok(calls.length >= 1); for (const c of calls) assert.ok(c.startsWith('/api/'), `network call outside /api: ${c}`);
  assert.ok(!/XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts|new Image\(/.test(code));
  assert.ok(!/\b(localStorage|sessionStorage)\.(get|set|remove)Item/.test(code.replace(/try \{ (return )?localStorage\.(get|set|remove)Item[^}]*\}/g, '')), 'storage only through the try/catch helper');
});

test('billing: tool id spare-key, one-time Family plan', () => {
  assert.match(html, /const SK = window\.SK, I = window\.SK_I18N, TOOL = 'spare-key';/);
  assert.match(html, /Studio\.init\(\{ tool: TOOL, onChange: setPro \}\)/);
  assert.match(html, /Studio\.upgrade\('family', 'once'\)/);
});

test('exact honesty and privacy wording from the build spec is on the page', () => {
  const text = decode(html).replace(/&#39;|’/g, "'");
  for (const s of [
    "Spare Key is a planning checklist. It doesn't log in to anything, and it can't recover an account for you.",
    'Platform rules change. Each step links to the official page and shows when we last checked it.',
    'The For My Family letter is not a will or power of attorney. For legal questions about an estate, ask a qualified professional where you live.',
    "Your plan stays on this device. We never see your accounts, and we never ask for passwords or codes. If you save it, it's encrypted with a passphrase only you know. We can't read it or recover it. If you buy the Family Pack, Stripe processes the payment, and we keep only the record that you bought it.",
    'If you lost your phone tonight, could you get back into your bank, email and WhatsApp? Find out in 10 minutes. Nothing leaves your phone.',
  ]) assert.ok(text.includes(s), s);
});

test('no banned claims (secure, guaranteed, protects you) and no internal names, in either language', () => {
  const all = html + JSON.stringify(I);
  const internal = new RegExp(String.fromCharCode(77, 79, 78, 65, 68), 'i'); // the parent company's name, spelled by code so it never appears in a public file
  assert.ok(!internal.test(all), 'internal name');
  for (const re of [/\bsecure(ly)?\b/i, /guarantee/i, /protects you/i, /(es|100 ?%|totalmente) seguro/i, /garantiza/i, /te protege/i, /\bhack-?proof\b/i, /bank-grade|military-grade/i]) assert.ok(!re.test(all), String(re));
});

test('Spanish covers every English string and every static text on the page', () => {
  for (const k of Object.keys(I.en)) assert.ok(k in I.es, `es missing ${k}`);
  for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) assert.ok(m[1] in I.es, `es missing static ${m[1]}`);
  for (const [k, v] of Object.entries(I.en)) if (Array.isArray(v)) assert.equal(I.es[k].length, v.length, k);
  for (const [k, v] of Object.entries(I.en)) if (typeof v === 'string') for (const x of v.match(/\{\w+\}/g) || []) assert.ok(I.es[k].includes(x), `${k}: es lacks ${x}`);
});

test('internal links resolve inside the studio', () => {
  for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
    const p = m[1].split(/[?#]/)[0];
    const f = root + (p.endsWith('/') ? p + 'index.html' : p).slice(1);
    assert.ok(existsSync(f), `broken link ${m[1]}`);
  }
});

test('first load stays light (under 200 KB of HTML, no libraries)', () => {
  assert.ok(Buffer.byteLength(html) < 200 * 1024, `${Buffer.byteLength(html)} bytes`);
});
