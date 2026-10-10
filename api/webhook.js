// POST /api/webhook  Stripe sends payment and subscription events here. Every event's signature is verified first.
// Access is always read live from Stripe, so these handlers confirm, log and (later) notify; they never trust unsigned input.
import { stripe, json, fail, verifySession } from './_lib/core.js';

export async function POST(request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return fail(503, 'Webhook not configured.');
  const raw = await request.text();
  let event;
  try {
    event = await s.webhooks.constructEventAsync(raw, request.headers.get('stripe-signature') || '', secret);
  } catch {
    return fail(400, 'Invalid signature.');
  }
  const obj = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      if (obj.payment_status === 'unpaid') break; // delayed payment methods: wait for async_payment_succeeded
      const v = await verifySession(s, obj.id, obj.metadata?.tool);
      console.log(JSON.stringify({ evt: event.type, tool: obj.metadata?.tool, ok: v.ok, reason: v.reason || null }));
      break;
    }
    case 'checkout.session.async_payment_failed':
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'invoice.paid':
    case 'invoice.payment_failed':
      console.log(JSON.stringify({ evt: event.type, tool: obj.metadata?.tool || obj.subscription_details?.metadata?.tool || null, status: obj.status || null }));
      break;
    default:
      break;
  }
  return json({ received: true });
}
