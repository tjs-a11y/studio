import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function harness(fetchImpl) {
  const warnings = [];
  const window = {
    location: { search: '', href: 'https://quickwell.app/shield/' },
    fetch: fetchImpl,
    va: () => {},
  };
  vm.runInNewContext(readFileSync(new URL('../js/va.js', import.meta.url), 'utf8'), {
    window, URL, URLSearchParams, Date,
    console: { warn: (...args) => warnings.push(args) },
  });
  return { window, warnings };
}

test('event diagnostics report only safe metadata on HTTP failure', async () => {
  const { window, warnings } = harness(async () => ({ ok: false, status: 503 }));
  await window.fetch('/api/event', { method: 'POST', body: JSON.stringify({
    tool: 'shield', event: 'check', text: 'private message text'
  }) });
  assert.equal(warnings.length, 1);
  assert.deepEqual({ ...warnings[0][1] }, { tool: 'shield', event: 'check', status: 503 });
  assert.doesNotMatch(JSON.stringify(warnings), /private message text/);
});

test('accepted but unpersisted events are visibly distinguished from stored events', async () => {
  const { window, warnings } = harness(async () => ({
    ok: true, status: 200, clone: () => ({ json: async () => ({ ok: true, stored: false }) })
  }));
  await window.fetch('/api/event', { method: 'POST', body: JSON.stringify({ tool: 'dinner', event: 'open' }) });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(warnings.length, 1);
  assert.deepEqual({ ...warnings[0][1] }, { tool: 'dinner', event: 'open', status: 200 });
});

test('successful persisted events do not emit diagnostics and preserve the response', async () => {
  const response = { ok: true, status: 200, clone: () => ({ json: async () => ({ ok: true, stored: true }) }) };
  const { window, warnings } = harness(async () => response);
  const result = await window.fetch('/api/event', { method: 'POST', body: JSON.stringify({ tool: 'fair-price', event: 'check' }) });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(result, response);
  assert.equal(warnings.length, 0);
});
