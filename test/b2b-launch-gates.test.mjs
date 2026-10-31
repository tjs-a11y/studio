import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { POST as postEvent, setStoreForTests as setEventStore } from '../api/event.js';
import { GET as getStats, setStoreForTests as setStatsStore } from '../api/stats.js';
import { POST as postCheckout } from '../api/checkout.js';
import { setStripeForTests } from '../api/_lib/core.js';

const req = (body, path = '/api/event') => new Request('https://quickwell.app' + path, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});

test('tier-click events accept only anonymous tool/event pairs', async () => {
  const seen = [];
  setEventStore(async (...commands) => { seen.push(...commands); return []; });
  try {
    for (const tool of ['port-watcher', 'hydro-flow', 'scale-audit']) {
      for (const event of ['click_operator', 'click_manager']) {
        const response = await postEvent(req({ tool, event }));
        assert.equal(response.status, 200);
        assert.ok(seen.some((c) => c[0] === 'INCR' && c[1] === 'count:' + tool + ':interest'));
        assert.ok(seen.some((c) => c[0] === 'INCR' && c[1] === 'count:' + tool + ':' + event));
      }
    }
    assert.ok(seen.every((c) => typeof c[1] === 'string' && c[1].startsWith('count:')));
    assert.equal((await postEvent(req({ tool: 'haul-audit', event: 'click_operator' }))).status, 400);
    assert.equal((await postEvent(req({ tool: 'port-watcher', event: 'click_manager', email: 'a@b.co' }))).status, 400);
  } finally { setEventStore(null); }
});

test('stats exposes aggregate interest and separate operator/manager counters', async () => {
  const values = new Map([
    ['count:port-watcher:interest', '7'],
    ['count:port-watcher:interest:2026-10-29', '2'],
    ['count:port-watcher:click_operator', '5'],
    ['count:port-watcher:click_operator:2026-10-29', '1'],
    ['count:port-watcher:click_manager', '2'],
    ['count:port-watcher:click_manager:2026-10-29', '1'],
  ]);
  setStatsStore(async (commands) => commands.map(([, key]) => ({ result: values.get(key) || 0 })));
  try {
    const body = await (await getStats()).json();
    assert.equal(body.interest['port-watcher'].interest, 7);
    assert.equal(body.interest['port-watcher'].interest_today, 2);
    assert.equal(body.interest['port-watcher'].click_operator, 5);
    assert.equal(body.interest['port-watcher'].click_manager, 2);
    assert.ok(body.interest['hydro-flow']);
    assert.ok(body.interest['scale-audit']);
  } finally { setStatsStore(null); }
});

test('B2B checkout uses exact monthly lookup keys and short ref metadata', async () => {
  for (const [tool, lookup] of [
    ['haul-audit', 'haul-audit__pro__month'],
    ['royalty-check', 'royalty-check__pro__month'],
  ]) {
    let seenLookup = null, sessionArgs = null;
    setStripeForTests({
      prices: { list: async (args) => { seenLookup = args.lookup_keys[0]; return { data: [{
        id: 'price_test', type: 'recurring', currency: 'usd', unit_amount: 1500,
        recurring: { interval: 'month', interval_count: 1 },
      }] }; } },
      checkout: { sessions: { create: async (args) => { sessionArgs = args; return { url: 'https://checkout.stripe.com/c/test' }; } } },
    });
    try {
      const response = await postCheckout(req({ tool, plan: 'pro', interval: 'month', ref: 'newsletter-2026' }, '/api/checkout'));
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.url, 'https://checkout.stripe.com/c/test');
      assert.equal(seenLookup, lookup);
      assert.equal(sessionArgs.metadata.ref, 'newsletter-2026');
      assert.equal(sessionArgs.subscription_data.metadata.ref, 'newsletter-2026');
      assert.equal(sessionArgs.payment_intent_data, undefined);
    } finally { setStripeForTests(null); }
  }
});

test('B2B checkout rejects prices other than $15 USD monthly', async () => {
  for (const badPrice of [
    { currency: 'usd', unit_amount: 1499 },
    { currency: 'cad', unit_amount: 1500 },
    { currency: 'usd', unit_amount: 1500, recurring: { interval: 'year', interval_count: 1 } },
  ]) {
    let created = false;
    setStripeForTests({
      prices: { list: async () => ({ data: [{
        id: 'price_wrong', type: 'recurring', currency: 'usd', unit_amount: 1500,
        recurring: { interval: 'month', interval_count: 1 }, ...badPrice,
      }] }) },
      checkout: { sessions: { create: async () => { created = true; return { url: 'https://checkout.stripe.com/c/test' }; } } },
    });
    try {
      const response = await postCheckout(req({ tool: 'haul-audit', plan: 'pro', interval: 'month' }, '/api/checkout'));
      assert.equal(response.status, 409);
      assert.equal(created, false);
    } finally { setStripeForTests(null); }
  }
});

test('js/pro.js sends only the fire-and-forget tier event payload', () => {
  const code = readFileSync(new URL('../js/pro.js', import.meta.url), 'utf8');
  const listeners = {}, calls = [], storage = new Map();
  const document = { addEventListener: (name, fn) => { listeners[name] = fn; } };
  const window = { addEventListener: () => {}, location: { assign: () => {} } };
  const context = {
    window, document, location: { href: 'https://quickwell.app/port-watcher/' },
    localStorage: { getItem: (k) => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) },
    sessionStorage: { getItem: (k) => storage.get('s:' + k) || null, setItem: (k, v) => storage.set('s:' + k, v) },
    fetch: (url, options) => { calls.push({ url, body: JSON.parse(options.body), keepalive: options.keepalive }); return Promise.resolve({ ok: true }); },
    URL, Promise, console,
  };
  vm.runInNewContext(code, context);
  for (const [tool, tier] of [['port-watcher', 'operator'], ['hydro-flow', 'manager'], ['scale-audit', 'operator']]) {
    const el = { getAttribute: (k) => ({ 'data-tool': tool, 'data-tier': tier }[k] || null) };
    listeners.click({ target: { closest: (selector) => selector === '[data-tier-click]' ? el : null } });
  }
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, '/api/event');
  assert.deepEqual(calls[0].body, { tool: 'port-watcher', event: 'click_operator' });
  assert.deepEqual(calls[1].body, { tool: 'hydro-flow', event: 'click_manager' });
  assert.deepEqual(calls[2].body, { tool: 'scale-audit', event: 'click_operator' });
  assert.ok(calls.every((call) => call.keepalive === true));
});

test('landing pages load shared tier-click listener and label both tiers', () => {
  for (const [path, tool] of [
    ['port-watcher/index.html', 'port-watcher'],
    ['hydro-flow/index.html', 'hydro-flow'],
    ['scale-audit/index.html', 'scale-audit'],
  ]) {
    const html = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    assert.ok(html.includes('data-tool="' + tool + '" data-tier="operator"'));
    assert.ok(html.includes('data-tool="' + tool + '" data-tier="manager"'));
    assert.ok(html.includes('<script src="/js/pro.js"></script>'));
  }
});

test('Haul Audit and Royalty Check preserve visible results and save history only for Pro', () => {
  for (const path of ['haul-audit/index.html', 'royalty-check/index.html']) {
    const html = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    assert.ok(html.includes('const FREE_PER_DAY = 3'));
    assert.ok(html.includes('checks before the Pro reminder today'));
    assert.ok(!html.includes('unlimited daily settlement reconciliations'));
    assert.ok(!html.includes('unlimited daily decimal calculations'));
    assert.ok(html.includes('getFullYear()') && html.includes('getMonth()') && html.includes('getDate()'));
    assert.ok(html.includes('Your result is always free and always visible'));
    const historyWrite = html.indexOf("ls.set('pro-history'");
    const proGuard = html.lastIndexOf("if (PRO) {", historyWrite);
    assert.ok(proGuard >= 0 && historyWrite > proGuard && historyWrite - proGuard < 300);
    assert.ok(html.slice(proGuard, historyWrite).includes("const h = ls.get('pro-history'"));
    assert.ok(html.includes("ls.get('pro-history'"));
    assert.ok(!html.includes("ls.set('history'"));
    assert.ok(!html.includes('id="buyY"'));
  }
});

test('daily metrics history preserves anonymous interest counters', () => {
  const script = readFileSync(new URL('../scripts/stats-snapshot.mjs', import.meta.url), 'utf8');
  assert.ok(script.includes('stats.interest'));
  assert.ok(script.includes('click_operator_today'));
  assert.ok(script.includes('click_manager_today'));
});
