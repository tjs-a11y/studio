// Shared helpers for the billing server. Keys live only in the host's secret settings, never in this repo.
import Stripe from 'stripe';
import crypto from 'node:crypto';
import catalog from '../../catalog/tools.json' with { type: 'json' };

let client = null;
// One Stripe client instance per server (never the deprecated global-key pattern).
export function stripe() {
  if (client) return client;
  const key = process.env.STRIPE_HUB_KEY;
  if (!key) return null;
  client = new Stripe(key, { appInfo: { name: 'studio-billing', version: '1.0.0' } });
  return client;
}
export const setStripeForTests = (fake) => { client = fake; };

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
export const fail = (status, message) => json({ error: message }, status);

export const tools = catalog.tools;
export const toolById = (id) => tools.find((t) => t.id === id) || null;
export const taxOn = () => process.env.TAX_ENABLED === '1';
const ACTIVE = new Set(['active', 'trialing']);
export const isActive = (sub) => !!sub && ACTIVE.has(sub.status);

// Signed access tokens: proof that a browser completed checkout for a tool. Stripe stays the source of truth;
// every check re-reads the subscription, so cancellations and failed payments take effect right away.
const secret = () => process.env.ACCESS_SECRET || process.env.STRIPE_WEBHOOK_SECRET || '';
const b64 = (buf) => Buffer.from(buf).toString('base64url');
export function signToken(payload, days = 30) {
  if (!secret()) throw new Error('No signing secret configured');
  const body = b64(JSON.stringify({ ...payload, e: Date.now() + days * 864e5 }));
  const sig = b64(crypto.createHmac('sha256', secret()).update(body).digest());
  return `${body}.${sig}`;
}
export function readToken(token) {
  if (!token || !secret() || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const want = b64(crypto.createHmac('sha256', secret()).update(body).digest());
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.e > Date.now() ? p : null; } catch { return null; }
}

// Is this customer subscribed to this tool right now? Reads Stripe directly.
export async function activeSubscription(s, customer, tool) {
  const subs = await s.subscriptions.list({ customer, status: 'all', limit: 20 });
  return subs.data.find((x) => x.metadata?.tool === tool && isActive(x)) || null;
}

// Verify a finished Checkout Session server-side (never trust the success page alone). Idempotent: safe to call
// from both the webhook and the return page.
export async function verifySession(s, sessionId, tool) {
  const session = await s.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
  if (session.metadata?.tool !== tool) return { ok: false, reason: 'wrong_tool' };
  if (session.status !== 'complete' || session.payment_status === 'unpaid') return { ok: false, reason: 'not_paid' };
  const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  // One-time purchases (mode=payment): paid is final; there is no subscription to watch.
  if (session.mode === 'payment') {
    if (session.payment_status !== 'paid') return { ok: false, reason: 'not_paid' };
    return { ok: true, once: true, customer, session: session.id, plan: session.metadata?.plan || null };
  }
  const sub = session.subscription;
  if (!isActive(sub)) return { ok: false, reason: 'inactive' };
  return { ok: true, customer, subscription: sub, plan: sub.metadata?.plan || null };
}

export const randomLetters = (n = 8) => Array.from(crypto.randomBytes(n), (b) => String.fromCharCode(97 + (b % 26))).join('');
export const originOf = (request) => process.env.PUBLIC_URL || new URL(request.url).origin;
