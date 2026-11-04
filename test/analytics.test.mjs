// Public pages carry Vercel Web Analytics except Shield and the privacy-first Utility Pipeline.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { pages } from '../scripts/analytics.mjs';

test('every public page loads Vercel Web Analytics', () => {
  const missing = pages().filter((f) => { const h = readFileSync(f, 'utf8'); return h.includes('</head>') && !h.includes('/_vercel/insights/script.js'); });
  assert.deepEqual(missing, []);
});

test('Quickwell Shield and Utility Pipeline do not load Vercel Web Analytics', () => {
  for (const folder of ['shield', 'utility-pipeline']) {
    assert.ok(!readFileSync(new URL(`../${folder}/index.html`, import.meta.url), 'utf8').includes('_vercel/insights'), folder);
  }
});

test('the privacy page discloses the analytics', () => {
  assert.match(readFileSync(new URL('../privacy.html', import.meta.url), 'utf8'), /Vercel Web Analytics/);
});
