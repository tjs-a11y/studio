# Vigless — honest bet tracker (on-device)

Free tool at `/vigless/`. All tracking + "The Number" run in the browser; nothing is uploaded. 21+; takes no wagers; connects to no sportsbook; not betting advice.

## Vigless Pro (paid tier)
Catalog plan: `{ "id": "pro", "trialDays": 7 }` (subscription). The paywall + unlock use the shared `/js/pro.js` + `/api/*` exactly like every other paid Quickwell tool. **Pro unlocks (all on-device):** expectancy per bet, max drawdown, biggest win/loss, longest win/loss streaks, and CSV export.

### Stripe setup (one-time, in the Stripe dashboard — the only "connect Stripe" step)
The server's `STRIPE_HUB_KEY` is read-only on products, so prices are created by hand, same as the other tools (see root `README.md` step 3):
1. Create a **Product** "Vigless Pro" with metadata `tool=vigless` (and a product tax code).
2. Add two **Prices** with these exact lookup keys (checkout finds them by key):
   - `vigless__pro__month` — **$9.99 USD**, recurring monthly
   - `vigless__pro__year` — **$99.00 USD**, recurring yearly (≈2 months free)
3. The 7-day trial comes from the catalog `trialDays`, not the price. Multi-currency: add more currency options on the same Prices if wanted.

Until those Prices exist, the page shows the Unlock buttons and checkout returns "This plan is not on sale yet." (free tool keeps working).
