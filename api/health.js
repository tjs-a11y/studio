// GET /api/health  Is the billing server set up? Shows only yes/no, never any secret.
import { json, tools, taxOn } from './_lib/core.js';
export function GET() {
  return json({ ok: true, payments: !!process.env.STRIPE_HUB_KEY, webhooks: !!process.env.STRIPE_WEBHOOK_SECRET, tax: taxOn(), tools: tools.map((t) => t.id) });
}
