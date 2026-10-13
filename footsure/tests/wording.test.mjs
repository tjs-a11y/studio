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
