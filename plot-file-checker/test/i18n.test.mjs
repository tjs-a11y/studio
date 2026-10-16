// Language tests: every UI string, message, rule card, source name and country name exists in English, French and
// Spanish, with the same {placeholders}. Run: node --test plot-file-checker/test/i18n.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const core = html.match(/<script id="pfc-core">([\s\S]*?)<\/script>/)[1];
const ctx = vm.createContext({});
vm.runInContext(core, ctx);
const P = ctx.PFC;
// The string tables are plain object literals between `var SRC = {` and `function t(` in the page script.
const tables = html.match(/(  var SRC = \{[\s\S]*?)\n  function t\(/)[1];
const T = vm.runInContext(tables + '\n({ SRC: SRC, UI: UI, MSG: MSG, RULES: RULES, SRC_NAME: SRC_NAME })', vm.createContext({}));
const LANGS = ['en', 'fr', 'es'];
const holes = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('UI strings: same keys and placeholders in en, fr and es', () => {
  const en = T.UI.en;
  for (const l of LANGS) {
    assert.deepEqual(Object.keys(T.UI[l]).sort(), Object.keys(en).sort(), `${l}: UI keys`);
    for (const k of Object.keys(en)) {
      if (typeof en[k] === 'string') { assert.ok(T.UI[l][k], `${l}.${k} empty`); assert.equal(holes(T.UI[l][k]), holes(en[k]), `${l}.${k} placeholders`); }
      else assert.deepEqual(Object.keys(T.UI[l][k]).sort(), Object.keys(en[k]).sort(), `${l}.${k} keys`);
    }
  }
});

test('messages: every code has n/t/h in all three languages, with the same placeholders', () => {
  const codes = Object.keys(T.MSG);
  assert.ok(codes.length >= 58, `${codes.length} codes`);
  for (const c of codes) for (const l of LANGS) {
    const m = T.MSG[c][l];
    assert.ok(m && m.n, `${c}.${l} missing`);
    assert.deepEqual(Object.keys(m).sort(), Object.keys(T.MSG[c].en).sort(), `${c}.${l} fields`);
    for (const f of Object.keys(m)) assert.equal(holes(m[f]), holes(T.MSG[c].en[f]), `${c}.${l}.${f} placeholders`);
  }
});

test('rule cards and source names: same count and same sources in every language', () => {
  for (const l of LANGS) {
    assert.equal(T.RULES[l].length, T.RULES.en.length, `${l} rule count`);
    T.RULES[l].forEach((r, i) => { assert.ok(r[0] && r[1], `${l} rule ${i}`); assert.deepEqual([...r[2]], [...T.RULES.en[i][2]], `${l} rule ${i} sources`); });
    assert.deepEqual(Object.keys(T.SRC_NAME[l]).sort(), Object.keys(T.SRC).sort(), `${l} source names`);
  }
});

test('Spanish strings are Spanish, not leftover English or French', () => {
  const es = [...Object.values(T.UI.es).filter((v) => typeof v === 'string'), ...Object.values(T.MSG).map((m) => m.es.n), ...T.RULES.es.map((r) => r[1])].join(' ').replace(/\S*quickwell\.app\S*/g, '');
  for (const w of [/\bthe\b/i, /\bplots?\b/i, /\bparcelles?\b/i, /\bfichier\b/i, /\bvotre\b/i]) assert.ok(!w.test(es), `found ${w} in Spanish text`);
  assert.match(T.UI.es.h1, /Verificador de archivos de parcelas EUDR/);
  assert.match(T.UI.es.discl, /No es asesoría legal/);
});

test('countries: an English, French and Spanish name for each, and Spanish names in files map to ISO codes', () => {
  for (const [c, names] of Object.entries(P.COUNTRIES)) assert.equal(names.length, 3, c);
  for (const [name, code] of [['Costa de Marfil', 'CI'], ['Perú', 'PE'], ['peru', 'PE'], ['Brasil', 'BR'], ['Etiopía', 'ET'], ['Camerún', 'CM'], ['República Democrática del Congo', 'CD'], ['Malasia', 'MY']])
    assert.equal(P.countryCode(name), code, name);
});

test('page: ES toggle, ?lang= support, Spanish FAQ and search tags', () => {
  assert.match(html, /data-lang="es"/);
  assert.match(html, /\[\?&\]lang=/);
  assert.match(html, /<div class="faq-es" lang="es">/);
  assert.match(html, /html\[lang="es"\] \.faq-en/);
  assert.match(html, /"inLanguage":\["en","fr","es"\]/);
  assert.match(html, /og:locale:alternate" content="es_ES"/);
  assert.doesNotMatch(html, /LANG === 'fr'/, 'language-specific branches go through the per-language maps');
});
