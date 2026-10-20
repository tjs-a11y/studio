# Fuelgauge — fuel margin & loss analytics (on-device)

Free tool at `/fuelgauge/`. Drop deliveries + sales by product/site → gross margin, ¢/gal, and the product/site leaking money. Runs in the browser; nothing uploaded. Back-office analytics only: never trades fuel, sets prices, moves money, or connects to a terminal/rack/pump.

## Fuelgauge Pro — volume-banded (so price rises with gallons)
The plan is chosen by the operator's monthly gallons, so what we charge scales with their throughput. Catalog plans: `pro-small`, `pro-mid`, `pro-large` (each `trialDays: 14`). The page detects the band from the gallons entered and sends that band's plan id to checkout. **Pro unlocks (on-device):** weighted cost/sell per gallon, best & worst site, top product, count of lines sold under cost, and CSV export.

| Band | Monthly gallons | Monthly | Yearly |
|---|---|---|---|
| Small | under 150K | $49 | $499 |
| Mid | 150K–500K | $99 | $999 |
| Large | 500K+ | $199 | $1,999 |

### Stripe setup (one-time, in the Stripe dashboard — the only "connect Stripe" step)
`STRIPE_HUB_KEY` is read-only on products, so prices are created by hand (root `README.md` step 3). Create a **Product** "Fuelgauge Pro" (metadata `tool=fuelgauge`, + a product tax code), then add **six Prices** with these exact lookup keys:
- `fuelgauge__pro-small__month` — **$49**/mo · `fuelgauge__pro-small__year` — **$499**/yr
- `fuelgauge__pro-mid__month` — **$99**/mo · `fuelgauge__pro-mid__year` — **$999**/yr
- `fuelgauge__pro-large__month` — **$199**/mo · `fuelgauge__pro-large__year` — **$1,999**/yr

14-day trial comes from the catalog `trialDays`. To change the band thresholds, edit `BANDS` in `fuelgauge/index.html` (keep them in sync with the price amounts). Until the Prices exist, Unlock shows and checkout says "not on sale yet"; the free tool keeps working.

**Roadmap to true per-gallon:** bands are the honest step-one. Later, metered usage billing (per load / per 1,000 gallons via Stripe usage-based billing) or a back-office data feed makes revenue track gallons exactly — both need server-side usage counting, earned once operators are paying.
