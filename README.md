# Quickwell (studio)

Small web tools, each solving one problem well, with one shared billing server on Stripe.

- **Tools** are static pages: `/<tool-id>/index.html` (start from `_template/`). Each tool has a free tier and a Pro tier.
- **Billing server** (`/api`): Vercel functions that create Stripe Checkout sessions, verify payments, unlock Pro and open Stripe's self-serve page for customers. Stripe is the source of truth: every access check re-reads the subscription, so a cancellation or failed payment takes effect right away.
- **Catalog** (`catalog/tools.json`): the tools on sale and their plans.


## Try Quickwell's consumer tools

Start with a free browser-based tool for a common everyday task:

- [Quickwell Shield — check a suspicious message](https://quickwell.app/shield/?utm_source=github&utm_medium=referral&utm_campaign=quickwell_consumer_tools_20261116&utm_content=shield&ref=github-readme-shield) — review a text, email, direct message or link for common warning signs and safer next steps.
- [Quickwell Saver — review recurring charges](https://quickwell.app/saver/?utm_source=github&utm_medium=referral&utm_campaign=quickwell_consumer_tools_20261116&utm_content=saver&ref=github-readme-saver) — review a bank export for recurring charges, price changes, duplicate charges and fees.
- [Bill Radar — preview a 12-month electricity forecast](https://quickwell.app/bill-radar/?utm_source=github&utm_medium=referral&utm_campaign=quickwell_consumer_tools_20261116&utm_content=bill-radar&ref=github-readme-bill-radar&demo=1) — see an illustrative sample forecast immediately, then replace it with your own kWh, rate and fixed-plan end date; your entries stay in your browser.
- [Fair Price — review a repair or contractor estimate](https://quickwell.app/fair-price/?utm_source=github&utm_medium=referral&utm_campaign=quickwell_consumer_tools_20261116&utm_content=fair-price&ref=github-readme-fair-price&demo=1) — organize estimate line items and scope before deciding what to ask the provider.
- [What's for Dinner? — find meals from ingredients at home](https://quickwell.app/dinner/?utm_source=github&utm_medium=referral&utm_campaign=quickwell_consumer_tools_20261116&utm_content=dinner&ref=github-readme-dinner) — find dinner ideas from what you already have; sharing sends meal ideas, not your ingredient selections.

Each tool has a free starting point; any paid options are shown inside the tool.

## Free printable guide

- [Unexpected text? Use the five-step checklist before you click](https://quickwell.app/guides/check-suspicious-text-message/?utm_source=github&utm_medium=referral&utm_campaign=quickwell_shield_checklist_20261118&utm_content=printable_checklist&ref=github-readme-shield-checklist) — verify an unexpected message through a trusted channel, protect sensitive information, and report suspected scams. Includes a print / save-as-PDF checklist and links to U.S. FTC guidance.

## Free practical guide

- [Find recurring charges in a bank statement](https://quickwell.app/guides/find-recurring-bank-statement-charges/?utm_source=github&utm_medium=referral&utm_campaign=quickwell_saver_recurring_guide_20261119&utm_content=bank_statement_guide&ref=github-saver-recurring-guide) — follow a source-backed review process for repeat payments and unfamiliar charges, then open Quickwell Saver if you want to scan your own bank or card export in your browser.
- [When your fixed electricity rate ends: the roll-off](https://quickwell.app/learn/power-bills/when-a-fixed-rate-plan-ends/?utm_source=github&utm_medium=referral&utm_campaign=quickwell_bill_radar_rolloff_guide_20261123&utm_content=fixed_rate_rolloff&ref=github-bill-radar-rolloff) — understand the month-to-month transition in deregulated markets, then use Bill Radar to map your own plan end date and estimate the next 12 months.

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
