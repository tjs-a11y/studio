// Public pages carry Vercel Web Analytics except Shield and the privacy-first Utility Pipeline.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { TAG, pages } from '../scripts/analytics.mjs';

test('every public page loads Vercel Web Analytics', () => {
  const missing = pages().filter((f) => { const h = readFileSync(f, 'utf8'); return h.includes('</head>') && !h.includes('/_vercel/insights/script.js'); });
  assert.deepEqual(missing, []);
});

test('Quickwell Shield and Utility Pipeline do not load Vercel Web Analytics', () => {
  for (const folder of ['shield', 'utility-pipeline']) {
    assert.ok(!readFileSync(new URL(`../${folder}/index.html`, import.meta.url), 'utf8').includes('_vercel/insights'), folder);
  }
  const utility = readFileSync(new URL('../utility-pipeline/index.html', import.meta.url), 'utf8');
  assert.match(utility, /telemetry:\s*false/);
});

test('the privacy page discloses the analytics', () => {
  assert.match(readFileSync(new URL('../privacy.html', import.meta.url), 'utf8'), /Vercel Web Analytics/);
});


test('priority consumer event bridge runs before inline tool scripts', () => {
  const expected = '<script src="/js/va.js"></script><script defer src="/_vercel/insights/script.js"></script>';
  assert.equal(TAG, expected);
  for (const path of ['saver/index.html', 'bill-radar/index.html', 'fair-price/index.html', 'dinner/index.html', 'port-watcher/index.html', 'hydro-flow/index.html', 'scale-audit/index.html']) {
    const html = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    const bridge = html.indexOf(expected);
    assert.ok(bridge >= 0, path + ' loads the synchronous event bridge');
    assert.ok(bridge < html.indexOf('</head>'), path + ' loads the bridge in the head');
    assert.ok(!html.includes('<script defer src="/js/va.js"></script>'), path + ' must not defer the event bridge');
  }
});
