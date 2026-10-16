// Entitlement cache: who has an active subscription to which tool, kept current by Stripe webhooks.
//
// Read path (/api/access): signed token (HMAC) -> cached entitlement (KV, ~1 ms) -> Stripe only on a miss.
// Write path (/api/webhook): customer.subscription.created|updated|deleted -> one KV record per (customer, tool).
//
// Why a cache record per (customer, tool) instead of trusting a long-lived token: a cancellation or failed
// payment must take effect at once. Webhooks flip the record immediately, and access checks read the record,
// so revocation stays instant while Stripe drops out of the hot path.
import { kvEnabled, kvGetJson, kvSetJson } from './kv.js';
import { isActive } from './core.js';

const key = (customer, tool) => `ent:v1:${customer}:${tool}`;
const DAY = 86400;
export const ENTRY_TTL_SECONDS = DAY;

// Stripe moved the billing period from the subscription onto its items (API 2025-03-31 "basil").
// Read either place so the cache works on old and new API versions.
export function periodEnd(sub) {
  const item = sub?.items?.data?.[0];
  return Number(item?.current_period_end || sub?.current_period_end || 0);
}

// Record a subscription's state. Out-of-order webhook deliveries are ignored: a record is only replaced
// by an event that is at least as new (Stripe retries can deliver an older "active" after a "canceled").
export async function recordSubscription(sub, eventCreated) {
  const tool = sub?.metadata?.tool;
  const customer = typeof sub?.customer === 'string' ? sub.customer : sub?.customer?.id;
  if (!tool || !customer || !kvEnabled()) return { stored: false, reason: !tool ? 'no_tool' : !customer ? 'no_customer' : 'no_kv' };
  const prev = await kvGetJson(key(customer, tool));
  if (prev && Number(prev.ts) > Number(eventCreated)) return { stored: false, reason: 'stale_event' };
  const active = isActive(sub);
  const end = periodEnd(sub);
  const rec = { active, status: sub.status, plan: sub.metadata?.plan || null, sub: sub.id, until: end || null, ts: Number(eventCreated) || Math.floor(Date.now() / 1000) };
  // Every entry lives at most 24 hours (CEO direction, 2026-10-16), so the cache refreshes itself
  // daily even if a webhook is ever missed. Webhooks still update it the moment anything changes.
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.min(ENTRY_TTL_SECONDS, active && end > now ? end - now + 2 * DAY : ENTRY_TTL_SECONDS);
  const ok = await kvSetJson(key(customer, tool), rec, ttl);
  return ok ? { stored: true, active } : { stored: false, active, reason: 'kv_write_failed' };
}

// Cached answer for (customer, tool), or null when there is no usable cache entry.
export async function cachedEntitlement(customer, tool) {
  if (!kvEnabled()) return null;
  const rec = await kvGetJson(key(customer, tool));
  if (!rec || typeof rec.active !== 'boolean') return null;
  // An "active" record past its paid-through date (+ grace) is not trusted: re-check Stripe.
  if (rec.active && rec.until && rec.until + DAY < Math.floor(Date.now() / 1000)) return null;
  return rec;
}

// After a live Stripe check, store the result so the next visit is served from cache.
export async function rememberFromStripe(customer, tool, sub) {
  if (!kvEnabled()) return;
  if (sub) {
    await recordSubscription({ ...sub, customer, metadata: { ...(sub.metadata || {}), tool } }, Math.floor(Date.now() / 1000) - 1);
  } else {
    // Negative entry, written with an old timestamp so any real webhook overrides it.
    await kvSetJson(key(customer, tool), { active: false, status: 'none', plan: null, sub: null, until: null, ts: 0 }, 10 * 60);
  }
}
