// POST /api/portal { tool, token } -> { url }  Stripe's self-serve page: cancel, change plan, update card, invoices.
import { stripe, json, fail, toolById, readToken, originOf } from './_lib/core.js';

export async function POST(request) {
  const s = stripe();
  if (!s) return fail(503, 'Payments are not switched on yet.');
  let body; try { body = await request.json(); } catch { return fail(400, 'Bad request.'); }
  const tool = toolById(String(body.tool || ''));
  const p = readToken(body.token);
  if (!tool || !p || p.t !== tool.id) return fail(401, 'Please unlock Pro on this device first.');
  const portal = await s.billingPortal.sessions.create({ customer: p.c, return_url: `${originOf(request)}/${tool.id}/` });
  return json({ url: portal.url });
}
