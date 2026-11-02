import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('learn/dataqs-review-process/index.html', 'utf8');
const mod = readFileSync('scripts/learn/content/dataqs.mjs', 'utf8');
const builder = readFileSync('scripts/learn/build.mjs', 'utf8');
const sitemap = readFileSync('sitemap-learn.xml', 'utf8');
const hub = readFileSync('learn/index.html', 'utf8');
const audit = readFileSync('audit-kit/index.html', 'utf8');

test('DataQs guide is source-backed, discoverable, and does not overpromise', () => {
  assert.ok(builder.includes("'dataqs'"));
  assert.ok(html.includes('https://quickwell.app/learn/dataqs-review-process/'));
  assert.ok(html.includes('"@type":"Article"'));
  assert.ok(html.includes('within 21 days'));
  assert.ok(html.includes('within 45 days'));
  assert.ok(html.includes('within 30 days'));
  assert.ok(html.includes('within 14 days'));
  assert.ok(html.includes('three years from an inspection and five years from a crash'));
  assert.ok(html.includes('burden of providing a factual or legal reason'));
  assert.ok(html.includes('Crash Preventability Determination Program'));
  assert.ok(html.includes('Runs entirely in your local browser — nothing you enter leaves your device.'));
  assert.ok(html.includes('General educational information only, not legal advice. Confirm current requirements with FMCSA’s DataQs Help Center and the applicable State DataQs Implementation Plan.'));
  assert.ok(!html.includes('original deeds or contractual terms'));
  assert.ok(html.includes('fmcsa.dot.gov/newsroom/fmcsa-announces-all-50-states'));
  assert.ok(html.includes('dataqs.fmcsa.dot.gov/HelpCenter/Faqs'));
  assert.ok(mod.includes('2026-10-31'));
  assert.ok(sitemap.includes('https://quickwell.app/learn/dataqs-review-process/'));
  assert.ok(hub.includes('/learn/dataqs-review-process/'));
  assert.ok(audit.includes('/learn/dataqs-review-process/'));
});
