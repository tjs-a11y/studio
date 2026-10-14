// Every public page carries Vercel Web Analytics (cookie-free page-visit counts), except Quickwell Shield,
// which promises "No analytics" on its page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { pages } from '../scripts/analytics.mjs';

test('every public page loads Vercel Web Analytics', () => {
  const missing = pages().filter((f) => { const h = readFileSync(f, 'utf8'); return h.includes('</head>') && !h.includes('/_vercel/insights/script.js'); });
  assert.deepEqual(missing, []);
});

test('Quickwell Shield keeps its "No analytics" promise', () => {
  for (const f of readdirSync(new URL('../shield/', import.meta.url)).filter((n) => n.endsWith('.html'))) {
    assert.ok(!readFileSync(new URL(`../shield/${f}`, import.meta.url), 'utf8').includes('_vercel/insights'), f);
  }
});

test('the privacy page discloses the analytics', () => {
  assert.match(readFileSync(new URL('../privacy.html', import.meta.url), 'utf8'), /Vercel Web Analytics/);
});
