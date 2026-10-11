// End-to-end checks of the billing server against a stand-in Stripe (no network, no real money).
import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';

process.env.STRIPE_HUB_KEY = 'rk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
const core = await import('../api/_lib/core.js');
const { POST: checkout } = await import('../api/checkout.js');
const { GET: access } = await import('../api/access.js');
const { POST: portal } = await import('../api/portal.js');
const { POST: webhook } = await import('../api/webhook.js');
const { GET: health } = await import('../api/health.js');

core.tools.push({ id: 'demo', name: 'Demo', tagline: 'x', plans: [{ id: 'pro', trialDays: 7 }] });
const real = new Stripe('sk_test_x');
const calls = [];
const sub = { id: 'sub_1', status: 'active', metadata: { tool: 'demo', plan: 'pro' } };
const fake = {
  prices: { list: async (q) => { calls.push(['prices', q]); return { data: q.lookup_keys[0] === 'demo__pro__month' ? [{ id: 'price_1' }] : [] }; } },
  checkout: { sessions: {
    create: async (p) => { calls.push(['create', p]); return { url: 'https://checkout.stripe.com/c/pay/cs_test_abc' }; },
    retrieve: async (id) => ({ id, status: 'complete', payment_status: 'paid', customer: 'cus_1', metadata: { tool: 'demo' }, subscription: sub }),
  } },
  subscriptions: { list: async () => ({ data: [sub] }) },
  billingPortal: { sessions: { create: async (p) => { calls.push(['portal', p]); return { url: 'https://billing.stripe.com/p/session/x' }; } } },
  webhooks: real.webhooks,
};
core.setStripeForTests(fake);
const req = (url, init) => new Request(`https://studio.example${url}`, init);
const post = (url, body, headers = {}) => req(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('health shows setup without secrets', async () => {
  const j = await (await health()).json();
  assert.deepEqual([j.payments, j.webhooks, j.tax], [true, true, false]);
  assert.ok(!JSON.stringify(j).includes('rk_'));
});

test('checkout creates a subscription session the right way', async () => {
  const r = await checkout(post('/api/checkout', { tool: 'demo', plan: 'pro', interval: 'month' }));
  assert.equal(r.status, 200);
  assert.match((await r.json()).url, /checkout\.stripe\.com/);
  const p = calls.find((c) => c[0] === 'create')[1];
  assert.equal(p.mode, 'subscription');
  assert.equal(p.payment_method_types, undefined, 'never pass payment_method_types');
  assert.equal(p.automatic_tax, undefined, 'tax stays off until a registration exists');
  assert.equal(p.subscription_data.trial_period_days, 7);
  assert.equal(p.metadata.tool, 'demo');
  assert.match(p.integration_identifier, /^demo_[a-z]{8}$/);
  assert.match(p.success_url, /\/demo\/\?session_id=\{CHECKOUT_SESSION_ID\}$/);
});

test('tax switches on only when TAX_ENABLED=1', async () => {
  process.env.TAX_ENABLED = '1';
  await checkout(post('/api/checkout', { tool: 'demo', plan: 'pro', interval: 'month' }));
  assert.deepEqual(calls.filter((c) => c[0] === 'create').at(-1)[1].automatic_tax, { enabled: true });
  delete process.env.TAX_ENABLED;
});

test('unknown tool or unsold plan is refused', async () => {
  assert.equal((await checkout(post('/api/checkout', { tool: 'nope' }))).status, 404);
  assert.equal((await checkout(post('/api/checkout', { tool: 'demo', plan: 'pro', interval: 'year' }))).status, 409);
});

test('access: session verified with Stripe, then token re-checked live', async () => {
  const j = await (await access(req('/api/access?tool=demo&session_id=cs_test_abc'))).json();
  assert.equal(j.pro, true); assert.ok(j.token);
  const again = await (await access(req(`/api/access?tool=demo&token=${encodeURIComponent(j.token)}`))).json();
  assert.equal(again.pro, true);
  sub.status = 'canceled';
  const after = await (await access(req(`/api/access?tool=demo&token=${encodeURIComponent(j.token)}`))).json();
  assert.equal(after.pro, false, 'cancellation removes access');
  sub.status = 'active';
  const forged = await (await access(req(`/api/access?tool=demo&token=${encodeURIComponent(j.token.slice(0, -2) + 'xx')}`))).json();
  assert.equal(forged.pro, false, 'tampered token rejected');
  assert.equal((await access(req('/api/access?tool=demo&session_id=evil'))).status, 400);
});

test('portal needs a valid token', async () => {
  const { token } = await (await access(req('/api/access?tool=demo&session_id=cs_test_abc'))).json();
  assert.equal((await portal(post('/api/portal', { tool: 'demo', token: 'bad' }))).status, 401);
  const r = await portal(post('/api/portal', { tool: 'demo', token }));
  assert.match((await r.json()).url, /billing\.stripe\.com/);
});

test('webhook verifies signatures', async () => {
  const payload = JSON.stringify({ id: 'evt_1', object: 'event', type: 'checkout.session.completed', data: { object: { id: 'cs_test_abc', payment_status: 'paid', metadata: { tool: 'demo' } } } });
  const good = real.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test_secret' });
  assert.equal((await webhook(post('/api/webhook', payload, { 'stripe-signature': good }))).status, 200);
  assert.equal((await webhook(post('/api/webhook', payload, { 'stripe-signature': 't=1,v1=bad' }))).status, 400);
});

test('one-time plan: payment-mode checkout, then access re-checked from the original session', async () => {
  core.tools.push({ id: 'kit', name: 'Kit', tagline: 'x', plans: [{ id: 'kit', once: true }] });
  const prev = { list: fake.prices.list, retrieve: fake.checkout.sessions.retrieve };
  let paid = 'paid';
  fake.prices.list = async (q) => ({ data: q.lookup_keys[0] === 'kit__kit__once' ? [{ id: 'price_once' }] : [] });
  fake.checkout.sessions.retrieve = async (id) => ({ id, mode: 'payment', status: 'complete', payment_status: paid, customer: 'cus_2', metadata: { tool: 'kit', plan: 'kit' }, subscription: null });
  const r = await checkout(post('/api/checkout', { tool: 'kit', plan: 'kit', interval: 'month' }));
  assert.equal(r.status, 200);
  const p = calls.filter((c) => c[0] === 'create').at(-1)[1];
  assert.equal(p.mode, 'payment');
  assert.equal(p.subscription_data, undefined);
  assert.equal(p.customer_creation, 'always');
  assert.equal(p.payment_intent_data.metadata.tool, 'kit');
  const j = await (await access(req('/api/access?tool=kit&session_id=cs_test_kit'))).json();
  assert.equal(j.pro, true); assert.equal(j.once, true);
  const again = await (await access(req(`/api/access?tool=kit&token=${encodeURIComponent(j.token)}`))).json();
  assert.equal(again.pro, true);
  paid = 'unpaid';
  assert.equal((await (await access(req(`/api/access?tool=kit&token=${encodeURIComponent(j.token)}`))).json()).pro, false);
  const demoTok = (await (await access(req('/api/access?tool=kit&session_id=cs_test_kit'))).json()).token;
  assert.equal(demoTok, undefined);
  fake.prices.list = prev.list; fake.checkout.sessions.retrieve = prev.retrieve;
});

test('free tools refuse checkout cleanly', async () => {
  core.tools.push({ id: 'freebie', name: 'Free', tagline: 'x', plans: [] });
  assert.equal((await checkout(post('/api/checkout', { tool: 'freebie' }))).status, 409);
});

test('checkout carries a clean marketing ref label and drops junk', async () => {
  await checkout(post('/api/checkout', { tool: 'demo', plan: 'pro', interval: 'month', ref: 'reddit-owneroperators' }));
  assert.equal(calls.filter((c) => c[0] === 'create').at(-1)[1].metadata.ref, 'reddit-owneroperators');
  await checkout(post('/api/checkout', { tool: 'demo', plan: 'pro', interval: 'month', ref: '<script>x' }));
  assert.equal(calls.filter((c) => c[0] === 'create').at(-1)[1].metadata.ref, undefined);
});
