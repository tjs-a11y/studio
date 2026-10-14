// Honest-claims and hygiene checks over every product file. Run: node --test tests/wording.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STR, LANGS, makeT, pickLang } from '../js/i18n.mjs';
import * as Kit from '../js/kit.mjs';
import { EDITIONS } from '../js/tips.mjs';
import { RULES } from '../js/rules.mjs';
import { CHECKS } from '../js/url.mjs';
import { COMBOS } from '../js/check.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (['node_modules', 'tests', 'scripts'].includes(n) ? [] : walk(p)) : [p]; });
const product = walk(root).filter((p) => /\.(html|mjs|js|css|json|webmanifest|svg)$/.test(p) && !/catalog-entry\.json$/.test(p));
const shipped = product.map((p) => [p, readFileSync(p, 'utf8')]);
const html = readFileSync(join(root, 'index.html'), 'utf8');
const ui = JSON.stringify(STR);

test('no internal company name in any file (product, tests, scripts, README)', () => {
  const all = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? all(p) : [p]; });
  for (const p of all(root)) if (!/\.png$/.test(p)) assert.ok(!/\bMONAD\b/i.test(readFileSync(p, 'utf8')), p);
});

test('every UI string exists in every language, and every data-i18n key exists', () => {
  const keys = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, pre + k + '.') : [pre + k]));
  const en = keys(STR.en).sort();
  for (const l of LANGS) assert.deepEqual(keys(STR[l]).sort(), en, l);
  for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) assert.equal(typeof makeT('en')(m[1]), 'string', m[1]);
  assert.equal(makeT('es')('level.scam'), 'Probable estafa');
  assert.equal(pickLang('?lang=es', null, 'en-US'), 'es'); assert.equal(pickLang('', 'en', 'es-MX'), 'en'); assert.equal(pickLang('', null, 'es-MX'), 'es');
});

test('calm and honest: never "safe", no guarantees, no fear words, no AI or accuracy claims, no invented stats', () => {
  const banned = [/\b(?:is|looks|it'?s) safe\b/i, /\bsafe to (?:click|open|pay)\b/i, /es seguro hacer/i, /guarantee(?!d[- ]returns?)/i, /garantizamos/i, /\b100% (?:accurate|safe|protection)\b/i,
    /AI-powered/i, /\bpowered by AI\b/i, /con IA\b/i, /\bterrifying\b/i, /\bepidemic\b/i, /\bvictims? every\b/i, /\bbillions? (?:lost|stolen)\b/i, /\b\d+% of (?:people|adults|Americans)\b/i, /never be scammed/i, /stop every scam/i, /blocks? (?:all|every) scam/i,
    /enter your (?:bank )?(?:password|login)/i, /connect your bank/i, /US dollars/i];
  // rules.mjs is excluded: its patterns must contain the scam words they look for
  for (const [p, s] of shipped.filter(([p]) => !p.endsWith('rules.mjs'))) for (const re of banned) assert.ok(!re.test(s), `${p}: ${re}`);
  assert.ok(!/type="password"/.test(html));
  // statistics or authority claims would need a source opened this shift; the UI cites none
  assert.ok(!/\b(?:FBI|FTC|IC3|7726|ReportFraud)\b/.test(ui), 'no agency is cited (unverified this shift)');
  assert.ok(!/https?:\/\/(?!quickwell\.app)[a-z0-9]/i.test(ui), 'no outside links in UI text');
});

test('the disclaimer and the privacy promise are on the page in both languages', () => {
  assert.match(STR.en.disclaimer, /can be wrong, in both directions/); assert.match(STR.en.disclaimer, /never means safe/); assert.match(STR.en.disclaimer, /Not legal or financial advice/);
  assert.match(STR.es.disclaimer, /puede equivocarse/); assert.match(STR.es.disclaimer, /nunca significa seguro/);
  assert.match(STR.en.offlineText, /not sent anywhere, and no link was opened/);
  assert.match(html, /never means safe/);
});

test('prices match the plan: $2.99/month, $24.99/year, about 30% off; plan id family; Plus is linked', () => {
  assert.match(html, /\$2\.99<small>\/mo/); assert.match(html, /\$24\.99<small>\/yr/);
  assert.equal(Math.round((1 - 24.99 / (2.99 * 12)) * 100), 30); assert.equal((24.99 / 12).toFixed(2), '2.08');
  assert.match(html, /href="\/plus\/\?ref=shield"/);
  const app = readFileSync(join(root, 'js', 'app.mjs'), 'utf8');
  assert.match(app, /Studio\.upgrade\('family', b\.dataset\.buy\)/); assert.match(app, /Studio\.init\(\{ tool: TOOL/); assert.match(app, /const TOOL = 'shield'/);
  const entry = (() => { try { return JSON.parse(readFileSync(join(root, 'catalog-entry.json'), 'utf8')); } catch { return JSON.parse(readFileSync(join(root, '..', 'catalog', 'tools.json'), 'utf8')).tools.find((t) => t.id === 'shield'); } })();
  assert.equal(entry.id, 'shield'); assert.deepEqual(entry.plans, [{ id: 'family' }]);
});

test('nothing is loaded from or sent to third parties; no analytics; messages never reach fetch', () => {
  for (const [p, s] of shipped) for (const m of s.matchAll(/(?:src|href|action)=["'](https?:\/\/[^"']+)/g)) assert.ok(/^https:\/\/quickwell\.app\//.test(m[1]), `${p}: ${m[1]}`);
  for (const [p, s] of shipped.filter(([p]) => /\.mjs$|sw\.js$/.test(p))) {
    assert.ok(!/https?:\/\/(?!quickwell\.app)[a-z]/i.test(s.replace(/\/\/.*$/gm, '').replace(/'(?:https?:\/\/)[^']*'/g, (m) => (/usps\.parcel|correos-entregas/.test(m) ? "''" : m))), `${p}: outside URL in code`);
    assert.ok(!/\bfetch\(/.test(s) || p.endsWith('sw.js'), `${p}: page code must not call fetch`);
    assert.ok(!/XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(s), p);
  }
  assert.ok(!/api\/event/.test(shipped.map(([, s]) => s).join('\n')), 'no usage counting');
});

test('the xlinks placeholder, the site CSP and the share target are in place', () => {
  assert.match(html, /<!-- xlinks:shield -->[\s\S]*?<!-- \/xlinks -->/);
  const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  const site = JSON.parse(readFileSync('/home/user/studio/vercel.json', 'utf8')).headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;
  assert.equal(csp.replace("img-src 'self' data: blob:", "img-src 'self' data:").replace("; object-src 'none'", ''), site.replace("; frame-ancestors 'self'", ''));
  const man = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
  assert.deepEqual(man.share_target, { action: '/shield/share-target', method: 'POST', enctype: 'multipart/form-data', params: { title: 'title', text: 'text', url: 'url' } });
  assert.match(readFileSync(join(root, 'sw.js'), 'utf8'), /\/shield\/share-target/);
});

test('family kit: code word, script, alert text with no personal data, history without the message', () => {
  const t = makeT('en');
  let i = 0; const seq = [0.1, 0.1, 0.6];
  assert.equal(Kit.suggestWord(['a', 'b', 'c'], () => seq[i++]), 'a b');
  assert.equal(Kit.cleanWord('  <b>apple\u0000  pie</b> '), 'bapple pie/b');
  assert.match(Kit.scriptText(t), /^3-line call script\n1\. “I want to help/);
  for (const l of LANGS) for (const k of Kit.ALERT_KINDS) { const s = Kit.alertText(makeT(l), k); assert.ok(s.length < 300, s); assert.ok(!/\d{3}/.test(s), s); }
  const e = Kit.entryFrom({ level: 'scam', findings: [{ id: 'pay-giftcard' }, { id: 'urgency' }] }, '2026-10-14T12:00:00Z');
  assert.deepEqual(e, { at: '2026-10-14T12:00:00Z', level: 'scam', ids: ['pay-giftcard', 'urgency'] });
  // storage blocked: nothing throws
  assert.deepEqual(Kit.load(), { history: [] }); assert.equal(Kit.save({ history: [] }), false);
});

test('pattern notes: dated weekly editions, both languages, tied to real rules, no numbers', () => {
  const ids = new Set([...RULES.map((r) => r.id), ...CHECKS.map((c) => c.id), ...COMBOS.map((c) => c.id)]);
  for (const ed of EDITIONS) {
    assert.match(ed.week, /^\d{4}-\d{2}-\d{2}$/); assert.equal(new Date(ed.week + 'T00:00:00Z').getUTCDay(), 1, 'editions start on a Monday');
    for (const n of ed.notes) {
      for (const l of LANGS) { assert.ok(n[l].t && n[l].look && n[l].do, `${n.id}/${l}`); assert.ok(!/\d+\s?%|\$\d{2,}|millones|millions?|billions?/i.test(JSON.stringify(n[l])), `${n.id}: no statistics`); }
      for (const r of n.rules) assert.ok(ids.has(r), `${n.id}: ${r}`);
    }
  }
});
