// POST /api/checkout  { tool, plan, interval }  ->  { url }  Stripe-hosted checkout.
// interval 'month' | 'year' = subscription; plans marked { once: true } in the catalog sell one-time (lookup key <tool>__<plan>__once).
import { stripe, json, fail, toolById, taxOn, randomLetters, originOf } from './_lib/core.js';

export async function POST(request) {
  const s = stripe();
  if (!s) return fail(503, 'Payments are not switched on yet.');
  let body; try { body = await request.json(); } catch { return fail(400, 'Bad request.'); }
  const tool = toolById(String(body.tool || ''));
  if (!tool) return fail(404, 'Unknown tool.');
  // Never silently substitute the first plan or default an invalid interval.
  const plan = tool.plans.find((p) => p.id === body.plan);
  if (!plan) return fail(tool.plans.length ? 400 : 409, tool.plans.length ? 'Invalid plan.' : 'This tool is free.');
  const once = !!plan.once;
  const interval = once ? 'once' : body.interval;
  if (!once && !['month', 'year'].includes(interval)) return fail(400, 'Invalid billing interval.');

  // These two professional B2B subscriptions have fixed monthly SKUs and price terms.
  // Keep them separate from the consumer Quickwell Plus bundle.
  const fixedB2B = {
    'haul-audit': { plan: 'pro', interval: 'month', lookup: 'haul-audit__pro__month', amount: 1500, currency: 'usd' },
    'royalty-check': { plan: 'pro', interval: 'month', lookup: 'royalty-check__pro__month', amount: 1500, currency: 'usd' },
  };
  const fixed = fixedB2B[tool.id];
  if (fixed && (plan.id !== fixed.plan || interval !== fixed.interval || once)) {
    return fail(400, 'This professional plan is available monthly only.');
  }
  const lookup = fixed ? fixed.lookup : `${tool.id}__${plan.id}__${interval}`;
  const prices = await s.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) return fail(409, 'This plan is not on sale yet.');
  if (fixed && (price.unit_amount !== fixed.amount || price.currency !== fixed.currency ||
      price.type !== 'recurring' || price.recurring?.interval !== 'month' ||
      (price.recurring?.interval_count ?? 1) !== 1)) {
    return fail(409, 'The configured price does not match the approved monthly plan.');
  }
  const base = originOf(request);
  // Marketing attribution: a short channel label from ?ref= links (e.g. 'reddit-owneroperators'), never personal data.
  const ref = /^[a-z0-9_-]{1,40}$/.test(String(body.ref || '')) ? String(body.ref) : '';
  const session = await s.checkout.sessions.create({
    mode: once ? 'payment' : 'subscription',
    // payment_method_types is deliberately omitted: Stripe shows the best payment methods for each customer.
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${base}/${tool.id}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/${tool.id}/?checkout=cancelled`,
    client_reference_id: tool.id,
    metadata: { tool: tool.id, plan: plan.id, ...(ref ? { ref } : {}) },
    ...(once
      ? { customer_creation: 'always', payment_intent_data: { metadata: { tool: tool.id, plan: plan.id, ...(ref ? { ref } : {}) } } }
      : { subscription_data: { metadata: { tool: tool.id, plan: plan.id, ...(ref ? { ref } : {}) }, ...(plan.trialDays ? { trial_period_days: plan.trialDays } : {}) } }),
    allow_promotion_codes: true,
    integration_identifier: `${tool.id}_${randomLetters(8)}`,
    // Tax is only switched on once a tax registration exists (TAX_ENABLED=1); otherwise Stripe would silently collect $0.
    ...(taxOn() ? { automatic_tax: { enabled: true } } : {}),
  });
  return json({ url: session.url });
}
