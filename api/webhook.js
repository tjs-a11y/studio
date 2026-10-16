// POST /api/webhook  Stripe sends payment and subscription events here. Every event's signature is verified first.
// Subscription events update the entitlement cache (api/_lib/entitlements.js) so /api/access can answer
// without calling Stripe, while cancellations and failed payments still take effect immediately.
import { stripe, json, fail, verifySession } from './_lib/core.js';
import { recordSubscription } from './_lib/entitlements.js';

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
  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        if (obj.payment_status === 'unpaid') break; // delayed payment methods: wait for async_payment_succeeded
        const v = await verifySession(s, obj.id, obj.metadata?.tool);
        if (v.ok && v.subscription) await recordSubscription({ ...v.subscription, customer: v.customer }, event.created);
        console.log(JSON.stringify({ evt: event.type, tool: obj.metadata?.tool, ok: v.ok, reason: v.reason || null }));
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const r = await recordSubscription(obj, event.created);
        console.log(JSON.stringify({ evt: event.type, tool: obj.metadata?.tool || null, status: obj.status || null, cached: r.stored, reason: r.reason || null }));
        break;
      }
      case 'checkout.session.async_payment_failed':
      case 'invoice.paid':
      case 'invoice.payment_failed':
        // A failed renewal also arrives as customer.subscription.updated (past_due/unpaid), which updates the cache.
        console.log(JSON.stringify({ evt: event.type, tool: obj.metadata?.tool || obj.subscription_details?.metadata?.tool || null, status: obj.status || null }));
        break;
      default:
        break;
    }
  } catch (e) {
    // Returning 500 makes Stripe retry the delivery with backoff (up to 3 days), so a transient cache or
    // Stripe outage heals itself. The handler is idempotent, so retries are safe.
    console.error(JSON.stringify({ evt: event.type, error: String(e?.message || e) }));
    return fail(500, 'Temporary error; Stripe will retry.');
  }
  return json({ received: true });
}
