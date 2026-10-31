// Power-bill reference pages beside Bill Radar. The latest national benchmark was checked against EIA's
// Electric Power Monthly, Table 5.6.A, released 2026-10-23 with August 2026 data. The 2026 values are
// preliminary estimates based on a cutoff-model sample; 2025 values are final. Contract roll-off guidance
// is checked against the PUCT consumer Electricity Plans page. No page claims to know a reader's utility rate.

const EIA_MONTHLY = { label: 'U.S. Energy Information Administration, Electric Power Monthly, Table 5.6.A — August 2026 residential prices (released 2026-10-23; 2026 estimates preliminary)', url: 'https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a' };
const PUCT = { label: 'Public Utility Commission of Texas — Electricity plans (fixed vs. variable; what happens when a plan ends), consumer page checked 2026-10-31', url: 'https://www.puc.texas.gov/industry/electric/plans' };

const TOOL = (text) => `<a href="/bill-radar/?ref=learn-power-bills">${text || 'Bill Radar'}</a>`;
const eia = (text) => `<a href="https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a" rel="noopener">${text}</a>`;
const puct = (text) => `<a href="https://www.puc.texas.gov/industry/electric/plans" rel="noopener">${text}</a>`;

export const SECTION = {
  path: '/learn/power-bills/',
  name: 'Power bills',
  h1: 'Understanding your electricity bill and rate',
  title: 'Power Bills: Rate Roll-Off and 2026 Prices Explained',
  description: 'Plain-English pages on fixed-rate plan endings, how to compare your own bill, and the latest EIA U.S. residential electricity price data.',
  lang: 'en', crumbs: [{ name: 'Quickwell', path: '/' }, { name: 'Learn', path: '/learn/' }],
  checked: { iso: '2026-10-31', en: 'October 31, 2026' },
  lede: 'A fixed electricity rate feels settled until it ends. These pages explain what a plan end date can mean, how to read your own bill, and what the latest EIA national average can — and cannot — tell you.',
  hubText: 'What happens when a fixed rate ends, how to compare your bill, and what the latest EIA average means.',
  intro: `<h2>Why the end of a plan matters more than the plan</h2>
<p>Most people choose an electricity plan once and forget it. The problem is that fixed-rate plans have an end date. Depending on the market and contract, a provider may move you to a month-to-month variable plan, where the price can change. Check your own plan documents rather than assuming every provider uses the same roll-off. These pages explain the mechanics from public sources, and the free ${TOOL()} tool turns your own rate and usage into a dated forecast so the roll-off never surprises you.</p>
<p>Nothing here is a specific company's rate or a prediction of your bill. Every page lists the source and the date it was checked, and the tool works only from numbers you type in, on your device.</p>`,
  outro: `<p class="note">Want this for your own bill? The free ${TOOL('Bill Radar')} takes your current rate, your usage and your plan's end date and shows the roll-off month and a 12-month estimate — every assumption adjustable, nothing uploaded. General information, not financial advice.</p>`,
  cta: { title: 'See your own roll-off date and a year-ahead estimate', text: 'Bill Radar turns your rate, usage and plan end date into a dated 12-month forecast, with every assumption in your hands. Runs entirely in your local browser — nothing you enter leaves your device. Estimates only — not a quote or financial advice.', href: '/bill-radar/?ref=learn-power-bills', label: 'Open Bill Radar' },
  disclaimer: 'General information, not financial advice. These pages explain how retail electricity pricing works, using public data linked on each page with the date it was checked. Rules and rates vary by state, market and provider, and change over time. Your actual bill depends on your usage, weather, taxes and fees, and your utility’s real rates — check your own plan documents and provider.',
};

export const PAGES = [
{
  slug: 'when-a-fixed-rate-plan-ends',
  h1: 'What happens when your fixed-rate electricity plan ends',
  crumbName: 'When a fixed-rate plan ends',
  short: 'When a fixed plan expires, your contract may move you to a month-to-month variable plan. Check the renewal terms and compare the rate before it changes.',
  title: 'When Your Fixed Electricity Rate Ends: The Roll-Off',
  description: 'When a fixed-rate term ends, the next step depends on your plan and market. What to check in the renewal notice before the price changes.',
  lede: 'When a fixed-rate term ends, the next step depends on the plan terms and the rules in your market. Some plans move to a month-to-month variable rate that can change; do not assume the new price will be higher or that every provider follows the same process. Here is what to check before the date arrives.',
  related: ['average-electricity-price-2026'],
  sources: [PUCT],
  body: `
<h2>The short answer</h2>
<p>A fixed-rate plan locks a price per kilowatt-hour for a stated term. When the term ends, the next step depends on your contract and market rules. Some retail plans move to a <b>month-to-month variable plan</b>, where the price can change. Check the renewal notice and plan documents rather than assuming every provider follows the same process.</p>

<h2>What the rules say</h2>
<p>The ${puct('Public Utility Commission of Texas consumer page')} explains that a variable-rate plan has no fixed term and that its price per kilowatt-hour can vary from month to month. That is Texas consumer guidance, not a rule for every state or every utility. Read your own contract and renewal notice to see whether the plan changes automatically, what rate applies next and whether any fee or action deadline applies.</p>

<h2>Why the next rate can change</h2>
<p>A variable rate can move up or down from month to month. A renewal offer may also differ from a new-customer offer, but the direction and amount depend on the provider, market and contract. Compare the actual next rate and all recurring charges rather than assuming a plan end date automatically means a price increase.</p>

<h2>How to get ahead of it</h2>
<p>The fix is to read the notice early. Find your plan's end date in the contract or electricity facts label, check how and when the provider will notify you, and compare available plans before the deadline. Review any cancellation fee, renewal term, variable-rate formula and action required. If you are already on a month-to-month plan, check its actual cancellation terms before switching.</p>

<h2>See your own roll-off month</h2>
<p>This is exactly what the free ${TOOL()} tool is for: enter your current rate, your typical usage and your plan's end date, and it marks the month the roll-off hits and estimates the 12 months around it, with the "default rate" assumption adjustable to whatever you expect. Runs entirely in your local browser — nothing you enter leaves your device. It is an estimate from your inputs, not a quote or financial advice.</p>`,
},
{
  slug: 'average-electricity-price-2026',
  h1: 'The average U.S. residential electricity price in August 2026',
  crumbName: 'Average price in August 2026',
  short: 'EIA reports a U.S. residential average of 18.16¢/kWh for August 2026, 3.4% above August 2025. What the national benchmark does and does not tell you.',
  title: 'Average U.S. Residential Electricity Price: Aug 2026',
  description: 'EIA reports an August 2026 U.S. residential average of 18.16¢/kWh, 3.4% above August 2025. Understand the benchmark and its limits.',
  lede: 'EIA’s latest Electric Power Monthly reports an August 2026 U.S. residential average of 18.16 cents per kilowatt-hour, compared with 17.57 cents in August 2025. The 2026 value is preliminary, and your own plan rate may differ substantially.',
  related: ['when-a-fixed-rate-plan-ends'],
  sources: [EIA_MONTHLY],
  body: `
<h2>Latest published national figure</h2>
<p>The U.S. Energy Information Administration’s Electric Power Monthly, released October 23, 2026, reports an average residential electricity price of <b>18.16 cents per kilowatt-hour</b> for August 2026. The comparable August 2025 figure was <b>17.57 cents</b>, a year-over-year increase of about <b>3.4%</b>. EIA labels 2026 values as preliminary estimates based on a cutoff-model sample; 2025 values are final. The table also reports state and census-division averages, which vary widely.</p>

<h2>What the average does and does not mean</h2>
<p>This is a national sector average, not a live offer from an electricity supplier and not a prediction for a particular household. It combines reported electricity sales and revenue across residential customers. Your actual bill depends on location, utility, provider, customer class, usage, delivery charges, fixed fees, taxes, credits and the terms of your plan. A national benchmark is useful context, not a price target or proof that an individual bill is too high.</p>

<h2>How to compare your own bill</h2>
<p>Find the billing-period kilowatt-hours and the charges that apply to that usage. Separate the energy or supply rate from delivery charges, fixed monthly fees, taxes, credits and one-time adjustments. Dividing the total bill by kWh gives an all-in average for that month; it is not necessarily the supply rate in your contract. For a plan comparison, read the plan document or electricity facts label and compare offers at the same usage level.</p>

<h2>Why the fixed-plan end date matters</h2>
<p>A fixed-rate plan may end or renew under terms that differ by provider and jurisdiction. In Texas, the Public Utility Commission explains fixed and variable plans and tells consumers to review the plan details. Do not assume every state or provider uses the same default plan. Check your contract for the end date, renewal notice and rate that applies if you take no action.</p>

<h2>Put your own numbers in</h2>
<p>The free <a href="/bill-radar/?ref=learn-power-bills">Bill Radar</a> tool uses the rate, usage, end date and assumptions you enter to create an adjustable 12-month estimate. It does not retrieve your utility tariff, verify a plan rate or predict a future offer. A simple rate-times-usage model may not represent every separate fixed charge, tax, credit or time-of-use tier. Treat the output as an estimate, not a quote or financial advice. Runs entirely in your local browser — nothing you enter leaves your device.</p>`

},
];
