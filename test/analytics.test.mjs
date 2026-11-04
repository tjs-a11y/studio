// Public pages carry Vercel Web Analytics except Shield and the explicitly no-telemetry Utility Pipeline Matrix.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { pages } from '../scripts/analytics.mjs';

test('every analytics-enabled public page loads Vercel Web Analytics', () => {
  const excluded = new Set(['shield/index.html', 'utility-pipeline/index.html']);
  const missing = pages().filter((f) => {
    const rel = f.replace(process.cwd() + '/', '');
    const h = readFileSync(f, 'utf8');
    return !excluded.has(rel) && h.includes('</head>') && !h.includes('/_vercel/insights/script.js');
  });
  assert.deepEqual(missing, []);
});

test('Quickwell Shield and Utility Pipeline use no Vercel Web Analytics', () => {
  for (const folder of ['shield', 'utility-pipeline']) {
    const html = readFileSync(new URL(`../${folder}/index.html`, import.meta.url), 'utf8');
    assert.ok(!html.includes('_vercel/insights'), folder);
  }
});

test('the privacy page discloses the analytics', () => {
  assert.match(readFileSync(new URL('../privacy.html', import.meta.url), 'utf8'), /Vercel Web Analytics/);
});
