# Studio

Small web tools, each solving one problem well, with one shared billing server on Stripe.

- **Tools** are static pages: `/<tool-id>/index.html` (start from `_template/`). Each tool has a free tier and a Pro tier.
- **Billing server** (`/api`): Vercel functions that create Stripe Checkout sessions, verify payments, unlock Pro and open Stripe's self-serve page for customers. Stripe is the source of truth: every access check re-reads the subscription, so a cancellation or failed payment takes effect right away.
- **Catalog** (`catalog/tools.json`): the tools on sale and their plans.

## Adding a tool
1. Copy `_template/` to `/<tool-id>/` and build the tool.
2. Add it to `catalog/tools.json`: `{ "id", "name", "tagline", "plans": [{ "id": "pro", "trialDays": 7 }] }`.
3. In Stripe, create **one Product per plan** (metadata `tool=<tool-id>`, a specific product tax code), with Prices whose lookup keys are `<tool-id>__pro__month` and `<tool-id>__pro__year`.
4. Run `npm test`, then push. Vercel deploys automatically.

## Settings on the host (Vercel → Project → Settings → Environment Variables, all marked Sensitive)
| Name | What |
|---|---|
| `STRIPE_HUB_KEY` | A Stripe **restricted** key for this server only. Write: Checkout Sessions, Customer portal. Read: Prices, Products, Subscriptions. Nothing else. |
| `STRIPE_WEBHOOK_SECRET` | The signing secret (`whsec_…`) of the webhook endpoint `https://<domain>/api/webhook` |
| `TAX_ENABLED` | Set to `1` only after Stripe Tax has an active registration; otherwise leave unset |
| `PUBLIC_URL` | Optional: the public address, if it's a custom domain |

Webhook events to send: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

`GET /api/health` shows whether payments, webhooks and tax are set up (yes/no only, never secrets).

## Rules
- Never commit keys. `npm test` fails if one appears.
- Never pass `payment_method_types`; Stripe picks the best methods per customer.
- Tax stays off until a registration exists (`TAX_ENABLED=1`), because Stripe otherwise collects $0 without warning.
