import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../learn/trucking-detention-law-disputes.html', import.meta.url), 'utf8');

test('detention authorization guide has a canonical, source links, local-first CTA and required disclaimer', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/quickwell\.app\/learn\/trucking-detention-law-disputes\.html">/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /49 CFR 371\.3/);
  assert.match(html, /FMCSA.*2024/);
  assert.match(html, /Runs entirely in your local browser — nothing you enter leaves your device\./);
  assert.match(html, /General educational information only, not legal, accounting, tax, or financial advice\. Confirm parameters with original deeds or contractual terms\./);
  assert.match(html, /href="\/haul-audit\/\?ref=learn-detention-terms"/);
  assert.match(html, /does not set a detention hourly rate/i);
});
