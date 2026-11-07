import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function harness(fetchImpl, path = '/shield/') {
  const warnings = [];
  const analyticsEvents = [];
  const listeners = {};
  const document = {
    addEventListener(type, handler) { listeners[type] = handler; },
  };
  const window = {
    location: { search: '', pathname: path, href: 'https://quickwell.app' + path },
    fetch: fetchImpl,
    va: (...args) => analyticsEvents.push(args),
  };
  vm.runInNewContext(readFileSync(new URL('../js/va.js', import.meta.url), 'utf8'), {
    window, document, URL, URLSearchParams, Date,
    console: { warn: (...args) => warnings.push(args) },
  });
  return { window, warnings, analyticsEvents, listeners };
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

test('priority consumer pages emit exactly one anonymous tool_open on page load', () => {
  for (const [path, tool] of [
    ['/saver/', 'saver'],
    ['/bill-radar/', 'bill-radar'],
    ['/fair-price/', 'fair-price'],
    ['/dinner/', 'dinner'],
  ]) {
    const { analyticsEvents } = harness(async () => ({ ok: true, status: 200 }), path);
    const actual = analyticsEvents.map(([type, payload]) => ({
      type, name: payload.name, data: JSON.parse(JSON.stringify(payload.data))
    }));
    assert.deepEqual(actual, [{
      type: 'event',
      name: 'tool_open',
      data: { tool, source: 'direct' }
    }], path);
  }
});

test('first-party open request does not duplicate the page-load open event', async () => {
  const { window, analyticsEvents } = harness(async () => ({
    ok: true, status: 200, clone: () => ({ json: async () => ({ ok: true, stored: true }) })
  }), '/dinner/');
  await window.fetch('/api/event', {
    method: 'POST',
    body: JSON.stringify({ tool: 'dinner', event: 'open' })
  });
  assert.equal(analyticsEvents.filter(([, payload]) => payload.name === 'tool_open').length, 1);
});

test('Shield remains excluded from Vercel Web Analytics events', () => {
  const { analyticsEvents } = harness(async () => ({ ok: true, status: 200 }), '/shield/');
  assert.equal(analyticsEvents.length, 0);
});

test('prelaunch tier interest emits the exact fixed tool/event payload', () => {
  const { window, analyticsEvents } = harness(async () => ({ ok: true, status: 200 }));
  for (const [tool, event] of [
    ['port-watcher', 'click_operator'], ['port-watcher', 'click_manager'],
    ['hydro-flow', 'click_operator'], ['hydro-flow', 'click_manager'],
    ['scale-audit', 'click_operator'], ['scale-audit', 'click_manager'],
  ]) window.qwTrackInterest(tool, event);

  const actual = analyticsEvents.map(([type, payload]) => ({
    type, name: payload.name, data: JSON.parse(JSON.stringify(payload.data))
  }));
  const expected = [
    { type: 'event', name: 'port-watcher.interest', data: { tool: 'port-watcher', event: 'click_operator' } },
    { type: 'event', name: 'port-watcher.interest', data: { tool: 'port-watcher', event: 'click_manager' } },
    { type: 'event', name: 'hydro-flow.interest', data: { tool: 'hydro-flow', event: 'click_operator' } },
    { type: 'event', name: 'hydro-flow.interest', data: { tool: 'hydro-flow', event: 'click_manager' } },
    { type: 'event', name: 'scale-audit.interest', data: { tool: 'scale-audit', event: 'click_operator' } },
    { type: 'event', name: 'scale-audit.interest', data: { tool: 'scale-audit', event: 'click_manager' } },
  ];
  assert.deepEqual(actual, expected);
  window.qwTrackInterest('northstar', 'click_operator');
  window.qwTrackInterest('port-watcher', 'open');
  assert.equal(analyticsEvents.length, 6);
});

test('prelaunch tier click listener reads only the static data attributes', () => {
  const { analyticsEvents, listeners } = harness(async () => ({ ok: true, status: 200 }));
  const attributes = {
    'data-qw-tool': 'hydro-flow',
    'data-qw-event': 'click_manager',
  };
  const anchor = { getAttribute: (name) => attributes[name] ?? null };
  const target = { closest: (selector) => selector === '[data-qw-interest]' ? anchor : null };
  listeners.click({ target });
  assert.deepEqual(analyticsEvents.map(([type, payload]) => ({
    type, name: payload.name, data: JSON.parse(JSON.stringify(payload.data))
  })), [{
    type: 'event',
    name: 'hydro-flow.interest',
    data: { tool: 'hydro-flow', event: 'click_manager' },
  }]);
});

test('each prelaunch page labels its two tier CTAs with fixed events only', () => {
  for (const [path, tool] of [
    ['port-watcher/index.html', 'port-watcher'],
    ['hydro-flow/index.html', 'hydro-flow'],
    ['scale-audit/index.html', 'scale-audit'],
  ]) {
    const html = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    assert.equal((html.match(/data-qw-interest="true"/g) || []).length, 2, path);
    assert.ok(html.includes(`data-qw-tool="${tool}" data-qw-event="click_operator"`), path + ' operator CTA');
    assert.ok(html.includes(`data-qw-tool="${tool}" data-qw-event="click_manager"`), path + ' manager CTA');
  }
});
