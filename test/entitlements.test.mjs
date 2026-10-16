// Entitlement cache: Stripe stays the source of truth, but repeat access checks are answered from
// a webhook-fed cache (or the token's short check window) instead of calling Stripe every time.
import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';

process.env.STRIPE_HUB_KEY = 'rk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.ACCESS_SECRET = 'test-access-secret';
process.env.ACCESS_RECHECK_SECONDS = '300';
const core = await import('../api/_lib/core.js');
const kv = await import('../api/_lib/kv.js');
const { GET: access } = await import('../api/access.js');
const { POST: webhook } = await import('../api/webhook.js');

core.tools.push({ id: 'demo', name: 'Demo', tagline: 'x', plans: [{ id: 'pro', trialDays: 7 }] });
const real = new Stripe('sk_test_x');
let stripeCalls = 0;
const now = () => Math.floor(Date.now() / 1000);
const sub = { id: 'sub_1', customer: 'cus_1', status: 'active', metadata: { tool: 'demo', plan: 'pro' }, items: { data: [{ current_period_end: now() + 30 * 86400 }] } };
const fake = {
  checkout: { sessions: { retrieve: async (id) => { stripeCalls++; return { id, status: 'complete', payment_status: 'paid', customer: 'cus_1', metadata: { tool: 'demo' }, subscription: { ...sub } }; } } },
  subscriptions: { list: async () => { stripeCalls++; return { data: [{ ...sub }] }; } },
  webhooks: real.webhooks,
};
core.setStripeForTests(fake);
const req = (url) => new Request(`https://studio.example${url}`);
const check = async (token) => (await access(req(`/api/access?tool=demo&token=${encodeURIComponent(token)}`))).json();
const sendEvent = async (type, object, created = now()) => {
  const payload = JSON.stringify({ id: `evt_${Math.random()}`, object: 'event', type, created, data: { object } });
  const sig = real.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test_secret' });
  return webhook(new Request('https://studio.example/api/webhook', { method: 'POST', headers: { 'stripe-signature': sig }, body: payload }));
};
const firstToken = async () => (await (await access(req('/api/access?tool=demo&session_id=cs_test_abc'))).json()).token;

test('no cache: repeat checks inside the window skip Stripe; expired window re-checks Stripe', async () => {
  kv.setKvForTests(null);
  stripeCalls = 0;
  const tok = await firstToken();
  assert.equal(stripeCalls, 1, 'checkout verification is one Stripe call');
  for (let i = 0; i < 20; i++) assert.equal((await check(tok)).pro, true);
  assert.equal(stripeCalls, 1, '20 repeat checks made zero Stripe calls');
  const expired = core.signToken({ c: 'cus_1', t: 'demo', v: Date.now() - 1 });
  const r = await check(expired);
  assert.equal(r.pro, true); assert.equal(r.source, 'stripe'); assert.equal(stripeCalls, 2);
  assert.ok(core.readToken(r.token).v > Date.now(), 'a fresh window is issued after a live check');
});

test('cache: webhook cancellation revokes access at once, even inside the token window', async () => {
  kv.setKvForTests(kv.memoryKv());
  stripeCalls = 0;
  const tok = await firstToken();
  assert.equal((await check(tok)).source, 'cache');
  assert.equal(stripeCalls, 1);
  assert.equal((await sendEvent('customer.subscription.deleted', { ...sub, status: 'canceled' })).status, 200);
  const r = await check(tok);
  assert.equal(r.pro, false); assert.equal(r.reason, 'inactive'); assert.equal(r.source, 'cache');
  assert.equal(stripeCalls, 1, 'revocation came from the cache, not Stripe');
});

test('cache: out-of-order webhook (older "active" after "canceled") is ignored', async () => {
  kv.setKvForTests(kv.memoryKv());
  const t = now();
  await sendEvent('customer.subscription.updated', { ...sub, status: 'canceled' }, t);
  await sendEvent('customer.subscription.updated', { ...sub, status: 'active' }, t - 60);
  const r = await check(core.signToken({ c: 'cus_1', t: 'demo' }));
  assert.equal(r.pro, false, 'stale event did not resurrect access');
  await sendEvent('customer.subscription.updated', { ...sub, status: 'active' }, t + 60);
  assert.equal((await check(core.signToken({ c: 'cus_1', t: 'demo' }))).pro, true, 'newer event re-activates');
});

test('cache miss with an expired window: Stripe once, then cached', async () => {
  kv.setKvForTests(kv.memoryKv());
  stripeCalls = 0;
  const expired = core.signToken({ c: 'cus_1', t: 'demo', v: 0 });
  assert.equal((await check(expired)).source, 'stripe');
  assert.equal((await check(expired)).source, 'cache');
  assert.equal(stripeCalls, 1);
});

test('cache outage falls back to Stripe and never grants on error', async () => {
  kv.setKvForTests({ command: async () => { throw new Error('kv down'); } });
  stripeCalls = 0;
  const original = fake.subscriptions.list;
  fake.subscriptions.list = async () => { stripeCalls++; return { data: [{ ...sub, status: 'canceled' }] }; };
  try {
    const r = await check(core.signToken({ c: 'cus_1', t: 'demo', v: 0 }));
    assert.equal(r.pro, false); assert.equal(stripeCalls, 1);
  } finally { fake.subscriptions.list = original; }
});

test('forged or foreign tokens never reach the cache or Stripe', async () => {
  kv.setKvForTests(kv.memoryKv());
  stripeCalls = 0;
  const good = core.signToken({ c: 'cus_1', t: 'demo', v: Date.now() + 60000 });
  assert.equal((await check(good.slice(0, -2) + 'xx')).pro, false);
  assert.equal((await check(core.signToken({ c: 'cus_1', t: 'other' }))).pro, false);
  assert.equal(stripeCalls, 0);
});

test('webhook with a bad signature is refused and changes nothing', async () => {
  const store = kv.memoryKv();
  kv.setKvForTests(store);
  const payload = JSON.stringify({ id: 'evt_x', object: 'event', type: 'customer.subscription.updated', created: now(), data: { object: { ...sub, status: 'active' } } });
  const r = await webhook(new Request('https://studio.example/api/webhook', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=bad' }, body: payload }));
  assert.equal(r.status, 400);
  assert.equal(store.m.size, 0);
});

test('webhook: a failed cache write returns 500 so Stripe retries the cancellation', async () => {
  const store = kv.memoryKv();
  kv.setKvForTests(store);
  await firstToken();
  const down = { command: async ([op, ...rest]) => (op === 'SET' ? null : store.command([op, ...rest])) };
  kv.setKvForTests(down);
  assert.equal((await sendEvent('customer.subscription.deleted', { ...sub, status: 'canceled' })).status, 500);
  kv.setKvForTests(store);
  assert.equal((await sendEvent('customer.subscription.deleted', { ...sub, status: 'canceled' })).status, 200, 'the retry succeeds');
  const r = await check(core.signToken({ c: 'cus_1', t: 'demo', v: Date.now() + 60000 }));
  assert.equal(r.pro, false); assert.equal(r.source, 'cache');
});
