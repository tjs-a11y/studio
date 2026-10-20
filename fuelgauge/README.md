# Fuelgauge — fuel margin & loss analytics (on-device)

Free tool at `/fuelgauge/`. Drop deliveries + sales by product/site → gross margin, ¢/gal, and the product/site leaking money. Runs in the browser; nothing uploaded. Back-office analytics only: never trades fuel, sets prices, moves money, or connects to a terminal/rack/pump.

## Fuelgauge Pro (paid tier)
Catalog plan: `{ "id": "pro", "trialDays": 14 }` (subscription, priced per site). Paywall + unlock use the shared `/js/pro.js` + `/api/*`, same as every other paid Quickwell tool. **Pro unlocks (on-device):** weighted cost/sell per gallon, best & worst site, top product, count of lines sold under cost, and CSV export.

### Stripe setup (one-time, in the Stripe dashboard — the only "connect Stripe" step)
`STRIPE_HUB_KEY` is read-only on products, so prices are created by hand (root `README.md` step 3):
1. Create a **Product** "Fuelgauge Pro" with metadata `tool=fuelgauge` (+ a product tax code).
2. Add two **Prices** with these exact lookup keys:
   - `fuelgauge__pro__month` — **$49.00 USD**, recurring monthly (per site)
   - `fuelgauge__pro__year` — **$499.00 USD**, recurring yearly
3. 14-day trial comes from the catalog `trialDays`. Add currencies on the same Prices as needed.

Until those Prices exist, Unlock shows and checkout says "not on sale yet"; the free tool keeps working.
