// Honest-claims and hygiene checks over every product file. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STR, LANGS, makeT, pickLang } from '../js/i18n.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (['node_modules', 'tests', 'fixtures'].includes(n) ? [] : walk(p)) : [p]; });
const product = walk(root).filter((p) => /\.(html|mjs|js|css|json|webmanifest|svg)$/.test(p) && !p.includes('/scripts/'));
const shipped = product.map((p) => [p, readFileSync(p, 'utf8')]);

test('no internal company name in any product file, test or fixture', () => {
  for (const p of walk(root).concat(walk(join(root, 'tests')), walk(join(root, 'fixtures')))) if (!/\.png$/.test(p)) assert.ok(!/\bMONAD\b/i.test(readFileSync(p, 'utf8')), p);
});
test('every UI string exists in every language', () => {
  const keys = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, pre + k + '.') : [pre + k]));
  const en = keys(STR.en).sort();
  for (const l of LANGS) assert.deepEqual(keys(STR[l]).sort(), en, l);
  assert.equal(makeT('es')('st.cancelled'), 'Cancelado'); assert.equal(makeT('en')('rows', { n: 3 }), '3 transactions');
  assert.equal(pickLang('?lang=es', null, 'en-US'), 'es'); assert.equal(pickLang('', 'en', 'es-MX'), 'en'); assert.equal(pickLang('', null, 'es-MX'), 'es');
});
test('no overclaims: no guaranteed savings, no "we cancel for you", no "US dollars", no bank-login asks', () => {
  const banned = [/guarantee/i, /we cancel (it )?for you/i, /cancelamos por ti/i, /US dollars/i, /d[oó]lares estadounidenses/i, /you will save/i, /ahorrar[aá]s seguro/i,
    /enter your (bank )?(password|login)/i, /connect your bank/i, /link your bank/i, /conecta tu banco/i, /AI-powered/i, /\b100% accurate\b/i];
  for (const [p, s] of shipped) for (const re of banned) assert.ok(!re.test(s), `${p}: ${re}`);
});
test('the page says it is not financial or legal advice, and never asks for bank logins (in both languages)', () => {
  assert.match(STR.en.disclaimer, /Not financial or legal advice/); assert.match(STR.es.disclaimer, /No es asesoría financiera ni legal/);
  assert.match(STR.en.lock, /never ask for bank logins or passwords/); assert.match(STR.es.lock, /Nunca te pedimos usuario ni contraseña/);
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  assert.match(html, /Not financial or legal advice/); assert.ok(!/type="password"/.test(html));
});
test('the only statute cited anywhere is ROSCA §8403, and the FTC note matches what eCFR shows', () => {
  for (const [p, s] of shipped) for (const m of s.matchAll(/(\d+) U\.S\.C\. §\s?(\w+)/g)) assert.equal(`${m[1]}:${m[2]}`, '15:8403', `${p}: ${m[0]}`);
  assert.match(STR.en.ftc, /removed on Feb 12, 2026/);
});
test('prices on the page match the plan: $2.99/month, $24.99/year, about 30% off, and Plus is linked', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  assert.match(html, /\$2\.99<small>\/mo/); assert.match(html, /\$24\.99<small>\/yr/);
  assert.equal(Math.round((1 - 24.99 / (2.99 * 12)) * 100), 30);
  assert.equal((24.99 / 12).toFixed(2), '2.08');
  assert.match(html, /href="\/plus\/\?ref=saver"/);
  const app = readFileSync(join(root, 'js', 'app.mjs'), 'utf8');
  assert.match(app, /Studio\.upgrade\('saver', b\.dataset\.buy\)/); assert.match(app, /Studio\.init\(\{ tool: TOOL/); assert.match(app, /const TOOL = 'saver'/);
});
test('the page loads nothing from third parties except pdf.js (only when a PDF is chosen)', () => {
  for (const [p, s] of shipped) for (const m of s.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)/g)) assert.ok(/^https:\/\/quickwell\.app\//.test(m[1]), `${p}: ${m[1]}`);
  const app = readFileSync(join(root, 'js', 'app.mjs'), 'utf8');
  assert.deepEqual([...app.matchAll(/https:\/\/[a-z.]+/g)].map((m) => m[0]), ['https://cdnjs.cloudflare.com']);
});
