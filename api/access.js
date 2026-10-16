// GET /api/access?tool=x&session_id=cs_...   after checkout: verifies with Stripe, returns a signed access token
// GET /api/access?tool=x&token=...            later visits: answered without Stripe whenever possible
//
// Order of checks for a token (cheapest first, Stripe last):
//   1. HMAC signature + expiry of the access token (in-process, no network).
//   2. Entitlement cache (KV), kept current by Stripe webhooks: authoritative while present, so a cancellation
//      webhook revokes access immediately even if the token's check window is still open.
//   3. The token's own "verified until" window (field v): a recent live check is reused for
//      ACCESS_RECHECK_SECONDS (default 300 s). Used only when the cache has no entry (or no cache is configured).
//   4. Stripe (source of truth). The result is written back to the cache and a token with a fresh window is issued.
import { stripe, json, fail, toolById, signToken, readToken, verifySession, activeSubscription, plusCovers } from './_lib/core.js';
import { cachedEntitlement, rememberFromStripe } from './_lib/entitlements.js';

const recheckSeconds = () => {
  const n = Number(process.env.ACCESS_RECHECK_SECONDS ?? 300);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 3600) : 300;
};
const freshUntil = () => Date.now() + recheckSeconds() * 1000;
const windowOpen = (p) => recheckSeconds() > 0 && Number(p.v) > Date.now();

// Answer for a subscription entitlement (customer c, tool t). `via` marks Quickwell Plus.
async function subscriptionAnswer(s, p, toolId, via) {
  const plan = (rec) => rec?.plan || (via ? 'plus' : null);
  const tok = (v) => signToken({ c: p.c, t: p.t, v });
  const cached = await cachedEntitlement(p.c, p.t);
  if (cached) {
    if (!cached.active) return json({ pro: false, reason: 'inactive', ...(via ? { via } : {}), source: 'cache' });
    return json({ pro: true, ...(via ? { via } : {}), token: tok(freshUntil()), plan: plan(cached), source: 'cache' });
  }
  if (windowOpen(p)) {
    return json({ pro: true, ...(via ? { via } : {}), token: tok(p.v), plan: via ? 'plus' : p.pl || null, source: 'token' });
  }
  if (!s) return json({ pro: false, reason: 'payments_off' });
  const sub = await activeSubscription(s, p.c, p.t);
  await rememberFromStripe(p.c, p.t, sub);
  if (!sub) return json({ pro: false, reason: 'inactive', ...(via ? { via } : {}) });
  const pl = sub.metadata?.plan || (via ? 'plus' : null);
  return json({ pro: true, ...(via ? { via } : {}), token: signToken({ c: p.c, t: p.t, v: freshUntil(), ...(pl ? { pl } : {}) }), plan: pl, source: 'stripe' });
}

export async function GET(request) {
  const s = stripe();
  const q = new URL(request.url).searchParams;
  const tool = toolById(q.get('tool') || '');
  if (!tool) return fail(404, 'Unknown tool.');
  const sessionId = q.get('session_id');
  if (sessionId) {
    if (!s) return json({ pro: false, reason: 'payments_off' });
    if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) return fail(400, 'Bad session.');
    const v = await verifySession(s, sessionId, tool.id);
    if (!v.ok) return json({ pro: false, reason: v.reason });
    if (v.once) return json({ pro: true, once: true, token: signToken({ c: v.customer, t: tool.id, s: v.session, v: freshUntil() }, 365), plan: v.plan });
    await rememberFromStripe(v.customer, tool.id, v.subscription);
    return json({ pro: true, token: signToken({ c: v.customer, t: tool.id, v: freshUntil(), ...(v.plan ? { pl: v.plan } : {}) }), plan: v.plan });
  }
  const p = readToken(q.get('token'));
  if (!p) return json({ pro: false, reason: 'no_access' });
  // Quickwell Plus: one subscription unlocks every tool listed in the plus entry's "covers".
  if (p.t === 'plus' && tool.id !== 'plus' && plusCovers(tool.id)) return subscriptionAnswer(s, p, tool.id, 'plus');
  if (p.t !== tool.id) return json({ pro: false, reason: 'no_access' });
  if (p.s) { // one-time purchase: paid is final; re-read the original checkout only after the check window
    if (windowOpen(p)) return json({ pro: true, once: true, token: q.get('token'), source: 'token' });
    if (!s) return json({ pro: false, reason: 'payments_off' });
    const v = await verifySession(s, p.s, tool.id);
    if (!v.ok) return json({ pro: false, reason: v.reason });
    return json({ pro: true, once: true, token: signToken({ c: p.c, t: tool.id, s: p.s, v: freshUntil() }, 365), plan: v.plan, source: 'stripe' });
  }
  return subscriptionAnswer(s, p, tool.id, null);
}
