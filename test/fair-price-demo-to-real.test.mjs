import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fairPrice = readFileSync(resolve(root, 'fair-price/index.html'), 'utf8');
const analytics = readFileSync(resolve(root, 'js/va.js'), 'utf8');

test('Fair Price sample result offers a direct next step into a real estimate check', () => {
  assert.match(fairPrice, /id="demoToRealBtn"/);
  assert.match(fairPrice, /Check your own estimate/);
  assert.match(fairPrice, /demoToRealBtn[\\s\\S]*?sampleActive = false;[\\s\\S]*?\\$\("text"\\)\\.value = "";[\\s\\S]*?window\\.qwTrack\\('fair-price', 'demo_to_real'\\)/);
});

test('demo-to-real telemetry is an allowlisted fixed-label event', () => {
  assert.match(analytics, /allowedEvents = \\[[^\\]]*'demo_to_real'/);
  assert.match(fairPrice, /window\\.qwTrack\\('fair-price', 'demo_to_real'\\)/);
});
