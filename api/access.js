// GET /api/access?tool=x&session_id=cs_...   after checkout: verifies with Stripe, returns a signed access token
// GET /api/access?tool=x&token=...            later visits: re-checks the subscription with Stripe
import { stripe, json, fail, toolById, signToken, readToken, verifySession, activeSubscription } from './_lib/core.js';

export async function GET(request) {
  const s = stripe();
  if (!s) return json({ pro: false, reason: 'payments_off' });
  const q = new URL(request.url).searchParams;
  const tool = toolById(q.get('tool') || '');
  if (!tool) return fail(404, 'Unknown tool.');
  const sessionId = q.get('session_id');
  if (sessionId) {
    if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) return fail(400, 'Bad session.');
    const v = await verifySession(s, sessionId, tool.id);
    if (!v.ok) return json({ pro: false, reason: v.reason });
    return json({ pro: true, token: signToken({ c: v.customer, t: tool.id }), plan: v.subscription.metadata?.plan || null });
  }
  const p = readToken(q.get('token'));
  if (!p || p.t !== tool.id) return json({ pro: false, reason: 'no_access' });
  const sub = await activeSubscription(s, p.c, tool.id);
  if (!sub) return json({ pro: false, reason: 'inactive' });
  return json({ pro: true, token: signToken({ c: p.c, t: tool.id }), plan: sub.metadata?.plan || null });
}
