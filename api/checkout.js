// POST /api/checkout  { tool, plan, interval }  ->  { url }  Stripe-hosted checkout.
// interval 'month' | 'year' = subscription; plans marked { once: true } in the catalog sell one-time (lookup key <tool>__<plan>__once).
import { stripe, json, fail, toolById, taxOn, randomLetters, originOf } from './_lib/core.js';

export async function POST(request) {
  const s = stripe();
  if (!s) return fail(503, 'Payments are not switched on yet.');
  let body; try { body = await request.json(); } catch { return fail(400, 'Bad request.'); }
  const tool = toolById(String(body.tool || ''));
  if (!tool) return fail(404, 'Unknown tool.');
  const plan = tool.plans.find((p) => p.id === body.plan) || tool.plans[0];
  if (!plan) return fail(409, 'This tool is free.');
  const once = !!plan.once;
  const interval = once ? 'once' : body.interval === 'year' ? 'year' : 'month';
  const lookup = `${tool.id}__${plan.id}__${interval}`;
  const prices = await s.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) return fail(409, 'This plan is not on sale yet.');
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
      ? { customer_creation: 'always', payment_intent_data: { metadata: { tool: tool.id, plan: plan.id } } }
      : { subscription_data: { metadata: { tool: tool.id, plan: plan.id }, ...(plan.trialDays ? { trial_period_days: plan.trialDays } : {}) } }),
    allow_promotion_codes: true,
    integration_identifier: `${tool.id}_${randomLetters(8)}`,
    // Tax is only switched on once a tax registration exists (TAX_ENABLED=1); otherwise Stripe would silently collect $0.
    ...(taxOn() ? { automatic_tax: { enabled: true } } : {}),
  });
  return json({ url: session.url });
}
