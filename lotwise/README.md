# Lotwise — dealership inventory analytics (on-device)

Free tool at `/lotwise/`. Drop a used-car inventory (stock, vehicle, cost, list, days-on-lot) → capital tied up, avg days on lot, capital frozen in 60+ day units, upside-down units, aging by make. Runs in the browser; nothing uploaded. Analytics only: never sets prices, lists cars, moves money, or connects to a DMS.

## Lotwise Pro — volume-banded by lot size
Price scales with the dealership's unit count. Catalog plans: `pro-small`/`pro-mid`/`pro-large` (`trialDays:14`). The page detects the band from the number of units and sends it to checkout. **Pro unlocks (on-device):** estimated floorplan cost on aged units, upside-down total, units 90+ days and capital frozen in them, avg gross/unit, and CSV export.

| Band | Units in stock | Monthly | Yearly |
|---|---|---|---|
| Small | under 100 | $99 | $999 |
| Mid | 100–300 | $199 | $1,999 |
| Large | 300+ | $349 | $3,499 |

### Stripe setup (dashboard — the only "connect Stripe" step)
`STRIPE_HUB_KEY` is read-only on products. Create a **Product** "Lotwise Pro" (metadata `tool=lotwise`, + tax code) and six **Prices** with these exact lookup keys:
- `lotwise__pro-small__month` **$99** · `lotwise__pro-small__year` **$999**
- `lotwise__pro-mid__month` **$199** · `lotwise__pro-mid__year` **$1,999**
- `lotwise__pro-large__month` **$349** · `lotwise__pro-large__year` **$3,499**

Until the Prices exist, Unlock shows and checkout says "not on sale yet"; the free tool keeps working.
