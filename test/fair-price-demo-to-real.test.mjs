import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fairPrice = readFileSync(resolve(root, 'fair-price/index.html'), 'utf8');
const analytics = readFileSync(resolve(root, 'js/va.js'), 'utf8');

test('Fair Price sample result offers a direct next step into a real estimate check', () => {
  assert.ok(fairPrice.includes('id="demoToRealBtn"'));
  assert.ok(fairPrice.includes('Check your own estimate'));
  assert.ok(fairPrice.includes('sampleActive = false;'));
  assert.ok(fairPrice.includes('$("text").value = "";'));
  assert.ok(fairPrice.includes("window.qwTrack('fair-price', 'demo_to_real')"));
});

test('demo-to-real telemetry is an allowlisted fixed-label event', () => {
  assert.ok(analytics.includes("'demo_to_real'"));
  assert.ok(fairPrice.includes("window.qwTrack('fair-price', 'demo_to_real')"));
});
