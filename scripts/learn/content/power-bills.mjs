// Power-bill reference pages that sit next to the free Bill Radar tool. Every figure here was read on
// 2026-10-23 from the sources listed on each page:
//  - U.S. average residential electricity price: the Empire Center's Energy Data Bulletin (April 2026),
//    which cites EIA retail-sales data, plus EIA's Short-Term Energy Outlook electricity page. EIA's
//    averages are computed from sales revenue divided by volume, not direct price observations — stated as such.
//  - Contract roll-off behaviour: the Public Utility Commission of Texas (PUCT) consumer "Electricity plans" page.
// No claim states a specific utility's real rate; the tool and these pages only ever work from numbers the reader enters.

const EIA_STEO = { label: 'U.S. Energy Information Administration, Short-Term Energy Outlook — electricity (residential price projection, read 2026-10-23)', url: 'https://www.eia.gov/outlooks/steo/report/elec_coal_renew.php' };
const EMPIRE = { label: 'Empire Center, Energy Data Bulletin — April 2026 (U.S. average residential rate from EIA retail-sales data; notes the figure is a revenue-over-volume approximation)', url: 'https://www.empirecenter.org/publications/energy-data-bulletin-april-2026/' };
const PUCT = { label: 'Public Utility Commission of Texas — Electricity plans (fixed vs. variable; what happens when a plan ends), consumer page read 2026-10-23', url: 'https://www.puc.texas.gov/industry/electric/plans' };

const TOOL = (text) => `<a href="/bill-radar/">${text || 'Bill Radar'}</a>`;
const eia = (text) => `<a href="https://www.eia.gov/outlooks/steo/report/elec_coal_renew.php" rel="noopener">${text}</a>`;
const puct = (text) => `<a href="https://www.puc.texas.gov/industry/electric/plans" rel="noopener">${text}</a>`;

export const SECTION = {
  path: '/learn/power-bills/',
  name: 'Power bills',
  h1: 'Understanding your electricity bill and rate',
  title: 'Power Bills: Rate Roll-Off and 2026 Prices Explained',
  description: 'Plain-English pages on what happens when a fixed electricity rate ends, why the roll-off rate is usually higher, and what the average U.S. price is in 2026.',
  lang: 'en', crumbs: [{ name: 'Quickwell', path: '/' }, { name: 'Learn', path: '/learn/' }],
  checked: { iso: '2026-10-23', en: 'October 23, 2026' },
  lede: 'A fixed electricity rate feels settled until it ends — and the day it ends is the day most bills quietly jump. These pages explain what the roll-off is, why it usually costs more, and what a normal 2026 price even looks like, from public data you can check.',
  hubText: 'What happens when a fixed rate ends, why the roll-off costs more, and the 2026 average price.',
  intro: `<h2>Why the end of a plan matters more than the plan</h2>
<p>Most people choose an electricity plan once and forget it. The problem is that fixed-rate plans have an end date, and in deregulated markets the provider does not simply keep your old price — it moves you onto a month-to-month "default" rate that is usually higher. The jump is invisible until it lands on a bill. These pages explain the mechanics from public sources, and the free ${TOOL()} tool turns your own rate and usage into a dated forecast so the roll-off never surprises you.</p>
<p>Nothing here is a specific company's rate or a prediction of your bill. Every page lists the source and the date it was checked, and the tool works only from numbers you type in, on your device.</p>`,
  outro: `<p class="note">Want this for your own bill? The free ${TOOL('Bill Radar')} takes your current rate, your usage and your plan's end date and shows the roll-off month and a 12-month estimate — every assumption adjustable, nothing uploaded. General information, not financial advice.</p>`,
  cta: { title: 'See your own roll-off date and a year-ahead estimate', text: 'Bill Radar turns your rate, usage and plan end date into a dated 12-month forecast, with every assumption in your hands. Runs on your device; nothing is uploaded. Estimates only — not a quote or financial advice.', href: '/bill-radar/', label: 'Open Bill Radar' },
  disclaimer: 'General information, not financial advice. These pages explain how retail electricity pricing works, using public data linked on each page with the date it was checked. Rules and rates vary by state, market and provider, and change over time. Your actual bill depends on your usage, weather, taxes and fees, and your utility’s real rates — check your own plan documents and provider.',
};

export const PAGES = [
{
  slug: 'when-a-fixed-rate-plan-ends',
  h1: 'What happens when your fixed-rate electricity plan ends',
  crumbName: 'When a fixed-rate plan ends',
  short: 'When a fixed plan expires, most providers roll you onto a month-to-month variable rate that is usually higher. What that means and how to get ahead of it.',
  title: 'When Your Fixed Electricity Rate Ends: The Roll-Off',
  description: 'When a fixed-rate electricity plan expires, most providers move you to a month-to-month variable rate that is usually higher. How the roll-off works and how to avoid it.',
  lede: 'The riskiest day in the life of an electricity plan is the day it ends. If you do nothing, you are not cut off — you are moved onto a month-to-month rate that is usually higher than the deal you had. Here is how that works and how to stay ahead of it.',
  related: ['average-electricity-price-2026'],
  sources: [PUCT, EMPIRE],
  body: `
<h2>The short answer</h2>
<p>A fixed-rate plan locks your price per kilowatt-hour for a set term — often 12, 24 or 36 months. When that term ends and you have not signed a new plan or switched provider, your service does not stop. Instead, in deregulated retail markets, the provider rolls you onto a <b>month-to-month, variable "default" plan</b>, and that rate is typically higher than the fixed deal you just left.</p>

<h2>What the rules say</h2>
<p>The ${puct('Public Utility Commission of Texas consumer page')} describes the two plan types and the end-of-term behaviour plainly: a variable-rate plan has no fixed term or cancellation fee, but the rate per kilowatt-hour "can vary from month to month," moving up or down with the market and the provider. The same consumer guidance is clear that if your plan ends and you have not chosen a new one, your provider keeps serving you — on that month-to-month plan — rather than disconnecting you. Texas is the clearest example because its retail market is fully open, but the same renewal pattern appears across deregulated markets.</p>

<h2>Why the roll-off usually costs more</h2>
<p>Two things push the default rate up. First, a variable rate is not protected by a contract, so it tracks wholesale costs and the provider's discretion — and providers have little reason to make the "do nothing" rate their cheapest. Second, renewal offers sent to existing customers are often priced above the rates advertised to brand-new customers. The result is that the households least likely to shop — the ones who let a plan lapse — tend to pay the most.</p>

<h2>How to get ahead of it</h2>
<p>The fix is a date, not a decision made under pressure. Find your plan's end date (it is on your contract or "facts" document), and mark a reminder <b>60 to 90 days before</b> it. That window is enough to compare offers and re-sign or switch before the roll-off rate ever applies. On a month-to-month plan there is generally no cancellation fee, so leaving is cheap once you are already on it — the cost is the weeks or months you spend on the higher rate before you notice.</p>

<h2>See your own roll-off month</h2>
<p>This is exactly what the free ${TOOL()} tool is for: enter your current rate, your typical usage and your plan's end date, and it marks the month the roll-off hits and estimates the 12 months around it, with the "default rate" assumption adjustable to whatever you expect. It runs on your device and uploads nothing. It is an estimate from your inputs, not a quote or financial advice.</p>`,
},
{
  slug: 'average-electricity-price-2026',
  h1: 'The average U.S. electricity price in 2026 — and how to read your own',
  crumbName: 'Average price in 2026',
  short: 'The U.S. average residential rate is roughly 18 cents per kWh in 2026, up from 2025. What that number means, and how to find your own rate from a bill.',
  title: 'Average U.S. Electricity Price in 2026 (cents per kWh)',
  description: 'The U.S. average residential electricity rate is about 18 cents per kWh in 2026, up from 2025. What the figure means, its limits, and how to read your own rate.',
  lede: 'If you want to know whether your electricity rate is high, you need a yardstick. The U.S. average residential price in 2026 is roughly 18 cents per kilowatt-hour — but the number comes with caveats, and your own rate is the one that matters.',
  related: ['when-a-fixed-rate-plan-ends'],
  sources: [EMPIRE, EIA_STEO],
  body: `
<h2>The number</h2>
<p>For 2026, the U.S. average residential electricity price is in the neighbourhood of <b>18 cents per kilowatt-hour</b>. The Empire Center's April 2026 Energy Data Bulletin, drawing on EIA retail-sales data, put the national average at about <b>18.83&cent;/kWh in April 2026</b>, up roughly <b>7.3%</b> from 17.55&cent; a year earlier. EIA's own ${eia('Short-Term Energy Outlook')} projects the full-year 2026 residential average near the same level (an increase of a few percent over 2025). Both are national figures; your state can be far higher or lower.</p>

<h2>What the figure does and doesn't mean</h2>
<p>Two caveats keep this honest. First, EIA's "average price" is not a survey of what people pay per plan — it is total sales revenue divided by total kilowatt-hours, so it is an approximation, a point the Empire Center notes directly. Second, state spreads are enormous: high-cost states can run more than double the national average, while some run well below it. A national average is a yardstick for "is my rate roughly normal," not a target you should expect to hit.</p>

<h2>How to read your own rate</h2>
<p>Your real rate is simple to compute from a single bill: divide the total dollars for energy by the kilowatt-hours used that month. A $150 charge for 1,000 kWh is $0.15, or 15&cent;/kWh. Comparing that to the ~18&cent; national figure tells you whether you are below, around, or above average — and if you are well above it, the most common reason is a plan that has rolled off its fixed rate onto a variable default (see the companion page on what happens when a fixed-rate plan ends).</p>

<h2>Why bills have been rising</h2>
<p>The year-over-year increase in the national average is real, not noise: the April 2026 figure was up about 7% over the prior April. Rising delivery and generation costs feed retail prices with a lag, which is why a rate that looked fine last year can be below today's offers. That lag is also why the end of a fixed plan matters so much — you can be locked in below the market, or stranded above it, depending only on timing.</p>

<h2>Put your own numbers in</h2>
<p>The free ${TOOL()} tool uses your rate (the cents-per-kWh you just computed) and your usage to estimate the year ahead, including the jump if your fixed plan rolls off. Every assumption is yours to change; nothing is uploaded. Estimates only, not financial advice.</p>`,
},
];
