// Guardian wording rules: general wellness only. Scans every product file the visitor can see.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const files = ['index.html', 'privacy.html', 'manifest.webmanifest', 'cutoffs.json', 'sw.js',
  ...readdirSync(join(root, 'js')).map((f) => 'js/' + f)];
// Allowed only in these exact disclaimer forms.
const ALLOW = [/not a medical diagnosis/gi, /not a medical device/gi];
const BANNED = [
  [/diagnos/i, '"diagnose"'], [/predict/i, '"predict"'], [/medical device/i, '"medical device" (outside the disclaimer)'],
  [/risk score/i, '"risk score"'], [/prevent(?!Default)/i, '"prevent"'], [/\bAI\b/, '"AI" claims'], [new RegExp(['mo', 'nad'].join(''), 'i'), 'the parent company name'],
  [/detects? falls?/i, '"detect falls"'], [/fall-risk score/i, '"fall-risk score"'],
];

for (const f of files) {
  test(`wording: ${f}`, () => {
    let text = readFileSync(join(root, f), 'utf8');
    text = text.replace(/https?:\/\/[^\s"'<>)]+/g, ' '); // URLs are addresses, not claims
    for (const a of ALLOW) text = text.replace(a, ' ');
    for (const [re, name] of BANNED) {
      const m = re.exec(text);
      assert.equal(m, null, `${f} uses ${name}: "…${m && text.slice(Math.max(0, m.index - 40), m.index + 40)}…"`);
    }
  });
}

test('every result screen carries the disclaimer and the pending-cutoff banner exists', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  assert.match(html, /Not medical advice/);
  assert.match(html, /Not a medical device/);
  assert.match(html, /Cutoffs pending verification against the CDC STEADI form/);
  const app = readFileSync(join(root, 'js/app.mjs'), 'utf8');
  assert.match(app, /Not medical advice\. Not a medical device\./);
});

// The same rules on the public pages that talk about Footsure outside the app: the printable flyer and the
// "Fall-risk tests explained" learn pages (English and Spanish). The CDC's full name contains "Prevention".
const studio = join(root, '..');
const EXTRA = ['footsure/flyer/index.html', 'learn/fall-risk-tests/index.html', 'es/learn/fall-risk-tests/index.html', 'scripts/learn/content/footsure.mjs'];
const ALLOW_EXTRA = [...ALLOW, /Centers for Disease Control and Prevention/g, /Centros para el Control y la Prevención de Enfermedades/g, /no es (consejo médico ni )?un diagnóstico médico/gi, /no es un diagnóstico médico/gi];
for (const f of EXTRA) {
  test(`wording: ${f}`, () => {
    let text = readFileSync(join(studio, f), 'utf8');
    text = text.replace(/https?:\/\/[^\s"'<>)]+/g, ' ');
    for (const a of ALLOW_EXTRA) text = text.replace(a, ' ');
    for (const [re, name] of [...BANNED, [/predic/i, '"predecir"'], [/prevenc|prevenir|previene/i, '"prevenir"']]) {
      const m = re.exec(text);
      assert.equal(m, null, `${f} uses ${name}: "…${m && text.slice(Math.max(0, m.index - 40), m.index + 40)}…"`);
    }
    assert.match(text, /not affiliated with or endorsed by the CDC|no está afiliado a los CDC/i, `${f}: CDC disclaimer`);
  });
}

test('the learn pages cite only the CDC STEADI forms and link to Footsure with ?ref=learn-fall-risk', () => {
  for (const f of ['learn/fall-risk-tests/index.html', 'es/learn/fall-risk-tests/index.html']) {
    const html = readFileSync(join(studio, f), 'utf8');
    const sources = /<section class="sources">([\s\S]*?)<\/section>/.exec(html)[1];
    const urls = [...sources.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(urls.length, 3, f);
    for (const u of urls) assert.equal(u, 'https://www.cdc.gov/steadi/', f);
    assert.match(html, /href="\/footsure\/\?ref=learn-fall-risk"/, f);
    const cut = JSON.parse(readFileSync(join(root, 'cutoffs.json'), 'utf8'));
    for (const r of cut.chairStand.rows) assert.ok(html.includes(`<th scope="row">${r.ageMin}–${r.ageMax}</th><td>&lt; ${r.male}</td><td>&lt; ${r.female}</td>`), `${f}: row ${r.ageMin}`);
    assert.match(html, /12 (seconds|segundos) (or more|o más)/, f);
  }
});
