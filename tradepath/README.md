# Tradepath — honest trading journal (on-device)

Free tool at `/tradepath/`. Log trades or drop a broker CSV; all stats + "The Number" run in the browser, nothing uploaded. Never executes trades or connects to a brokerage; **not investment advice**.

## Tradepath Pro (paid tier)
Catalog plan: `{ "id": "pro", "trialDays": 7 }` (subscription). Paywall + unlock use the shared `/js/pro.js` + `/api/*`, same as every other paid Quickwell tool. **Pro unlocks (all on-device):** expectancy per trade, max drawdown, best/worst trade, longest win/loss streaks, and CSV export.

### Stripe setup (one-time, in the Stripe dashboard — the only "connect Stripe" step)
`STRIPE_HUB_KEY` is read-only on products, so prices are created by hand, same as the other tools (root `README.md` step 3):
1. Create a **Product** "Tradepath Pro" with metadata `tool=tradepath` (and a product tax code).
2. Add two **Prices** with these exact lookup keys:
   - `tradepath__pro__month` — **$9.99 USD**, recurring monthly
   - `tradepath__pro__year` — **$99.00 USD**, recurring yearly (≈2 months free)
3. The 7-day trial comes from the catalog `trialDays`. Add more currencies on the same Prices if wanted.

Until those Prices exist, the Unlock buttons show and checkout returns "This plan is not on sale yet." (free tool keeps working).
