// Honest-claims and hygiene checks over every product file. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STR, LANGS, makeT, pickLang } from '../js/i18n.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d, skip = ['node_modules', 'tests', 'fixtures', 'vendor']) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (skip.includes(n) ? [] : walk(p, skip)) : [p]; });
const product = walk(root).filter((p) => /\.(html|mjs|js|css|json|webmanifest|svg)$/.test(p) && !p.includes('/scripts/'));
const shipped = product.map((p) => [p, readFileSync(p, 'utf8')]);
const html = readFileSync(join(root, 'index.html'), 'utf8');

test('no internal company name in any file (product, tests, scripts, vendor notes)', () => {
  for (const p of walk(root, ['node_modules'])) if (/\.(html|mjs|js|css|json|webmanifest|svg|md|txt)$/.test(p) && !/\.wasm\.js$|tesseract\.min\.js$|worker\.min\.js$/.test(p)) assert.ok(!/\bMONAD\b/i.test(readFileSync(p, 'utf8')), p);
});
test('every UI string exists in every language', () => {
  const keys = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, pre + k + '.') : [pre + k]));
  const en = keys(STR.en).sort();
  for (const l of LANGS) assert.deepEqual(keys(STR[l]).sort(), en, l);
  assert.equal(makeT('es')('act.pay'), 'Pagar'); assert.equal(makeT('en')('days.in', { n: 3 }), 'in 3 days');
  assert.equal(pickLang('?lang=es', null, 'en-US'), 'es'); assert.equal(pickLang('', 'en', 'es-MX'), 'en'); assert.equal(pickLang('', null, 'es-MX'), 'es');
  for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) assert.equal(typeof makeT('en')(m[1]), 'string', m[1]);
});
test('no overclaims: no AI hype, guarantees, "we handle it", "US dollars", password or login asks', () => {
  const banned = [/guarantee/i, /garantiza/i, /AI-powered/i, /we (?:will )?(?:handle|file|pay|send|cancel) (?:it|this|them)? ?for you/i, /never miss a deadline again/i, /US dollars/i, /d[oó]lares estadounidenses/i,
    /enter your (?:bank )?(?:password|login)/i, /connect your (?:bank|email|account)/i, /\b100% accurate\b/i];
  for (const [p, s] of shipped) for (const re of banned) assert.ok(!re.test(s), `${p}: ${re}`);
  // user-facing text makes no AI claim at all (v1 is rules on the device)
  for (const s of [html, JSON.stringify(STR), readFileSync(join(root, 'manifest.webmanifest'), 'utf8')]) assert.ok(!/\bAI\b|\bIA\b|artificial/i.test(s));
  assert.ok(!/type="password"/.test(html));
});
test('the page says it is not legal advice, that nothing is uploaded, and never asks for passwords (both languages)', () => {
  assert.match(STR.en.disclaimer, /Not legal, tax or financial advice/); assert.match(STR.es.disclaimer, /No es asesoría legal, fiscal ni financiera/);
  assert.match(STR.en.lock, /Nothing is uploaded\. We never ask for passwords or logins\./); assert.match(STR.es.lock, /No se sube nada\. Nunca te pedimos contraseñas ni usuarios\./);
  assert.match(STR.en.replyNote, /Not legal advice/); assert.match(STR.es.replyNote, /No es asesoría legal/);
  assert.match(html, /Not legal, tax or financial advice/);
});
test('prices and plan: $2.99/month, $24.99/year (30% off), plan id "pilot", Plus is linked', () => {
  assert.match(html, /\$2\.99<small>\/mo/); assert.match(html, /\$24\.99<small>\/yr/);
  assert.equal(Math.round((1 - 24.99 / (2.99 * 12)) * 100), 30); assert.equal((24.99 / 12).toFixed(2), '2.08');
  assert.match(html, /href="\/plus\/\?ref=pilot"/);
  const app = readFileSync(join(root, 'js', 'app.mjs'), 'utf8');
  assert.match(app, /Studio\.upgrade\('pilot', b\.dataset\.buy\)/); assert.match(app, /Studio\.init\(\{ tool: TOOL/); assert.match(app, /const TOOL = 'pilot'/); assert.match(app, /FREE_ITEMS = 3/);
  const cat = (() => { try { return JSON.parse(readFileSync(join(root, 'catalog-entry.json'), 'utf8')); } catch { return JSON.parse(readFileSync(join(root, '..', 'catalog', 'tools.json'), 'utf8')).tools.find((t) => t.id === 'pilot'); } })();
  assert.equal(cat.id, 'pilot'); assert.deepEqual(cat.plans, [{ id: 'pilot' }]);
});
test('third parties: only pdf.js from cdnjs; OCR files are self-hosted and never fall back to a CDN', () => {
  for (const [p, s] of shipped) for (const m of s.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)/g)) assert.ok(/^https:\/\/quickwell\.app\//.test(m[1]), `${p}: ${m[1]}`);
  for (const f of ['app.mjs', 'ocr.mjs', 'extract.mjs', 'store.mjs', 'card.mjs', 'ics.mjs', 'replies.mjs']) {
    const s = readFileSync(join(root, 'js', f), 'utf8');
    for (const m of s.matchAll(/https:\/\/[a-z0-9.-]+/g)) assert.equal(m[0], 'https://cdnjs.cloudflare.com', `${f}: ${m[0]}`);
  }
  const ocr = readFileSync(join(root, 'js', 'ocr.mjs'), 'utf8');
  assert.match(ocr, /workerPath: OCR_BASE \+ 'worker\.min\.js', corePath: OCR_BASE, langPath: OCR_BASE \+ 'lang'/);
  for (const f of ['tesseract.min.js', 'worker.min.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js', 'lang/eng.traineddata.gz', 'lang/spa.traineddata.gz', 'LICENSE-tesseract.js.md', 'LICENSE-tesseract.js-core.txt', 'lang/LICENSE-tessdata.txt'])
    assert.ok(statSync(join(root, 'vendor', 'tesseract', f)).size > 0, f);
  const total = walk(join(root, 'vendor'), []).reduce((a, p) => a + statSync(p).size, 0);
  assert.ok(total < 14e6, `vendor size ${total}`);
});
test('the meta CSP is the site policy plus only wasm-unsafe-eval (for on-device photo reading)', () => {
  const meta = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  assert.match(meta, /script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https:\/\/cdnjs\.cloudflare\.com;/);
  assert.match(meta, /connect-src 'self' https:\/\/cdnjs\.cloudflare\.com;/); assert.ok(!/unsafe-eval'(?<!wasm-unsafe-eval')/.test(meta.replace("'wasm-unsafe-eval'", '')));
});
