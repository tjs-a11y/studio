// Small-business recurring costs: auto-renewal notice windows, price increases at renewal, finding recurring
// charges in a CSV export. Mostly practical, general guidance (contracts vary). The only regulatory facts used are
// ones read on 2026-10-12 through the eCFR versioner API: 16 CFR Part 425 (current text and version history,
// Title 16 up to date as of Oct 8, 2026) and 12 CFR 1005.2 and 1005.10 (Regulation E, Title 12 up to date as of Oct 8, 2026).
const ecfr16 = (what, url) => ({ label: what, url });
const P425_NOW = ecfr16('16 CFR Part 425 (FTC), current eCFR text, Title 16 up to date as of Oct 8, 2026', 'https://www.ecfr.gov/api/versioner/v1/full/2026-10-01/title-16.xml?part=425');
const P425_HIST = ecfr16('16 CFR Part 425, eCFR version history (shows sections 425.3 to 425.9, including 425.6 "Simple cancellation (Click to Cancel)", in effect from Jan 14, 2025 and removed Feb 12, 2026)', 'https://www.ecfr.gov/api/versioner/v1/versions/title-16.json?part=425');
const P425_2025 = ecfr16('16 CFR Part 425 as it read on June 1, 2025 (the removed "Recurring subscriptions and other negative option programs" version)', 'https://www.ecfr.gov/api/versioner/v1/full/2025-06-01/title-16.xml?part=425');
const REGE_10 = { label: '12 CFR 1005.10 (Regulation E, preauthorized transfers), eCFR text, Title 12 up to date as of Oct 8, 2026', url: 'https://www.ecfr.gov/api/versioner/v1/full/2026-10-05/title-12.xml?part=1005&section=1005.10' };
const REGE_2 = { label: '12 CFR 1005.2(b) (Regulation E, definition of "account"), eCFR text, Title 12 up to date as of Oct 8, 2026', url: 'https://www.ecfr.gov/api/versioner/v1/full/2026-10-05/title-12.xml?part=1005&section=1005.2' };
const ecfrLink = (href, text) => `<a href="${href}" rel="noopener">${text}</a>`;
const L425 = ecfrLink('https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-425', '16 CFR Part 425');
const L1005_10 = ecfrLink('https://www.ecfr.gov/current/title-12/chapter-X/part-1005/subpart-A/section-1005.10', '12 CFR 1005.10');
const L1005_2 = ecfrLink('https://www.ecfr.gov/current/title-12/chapter-X/part-1005/subpart-A/section-1005.2', '12 CFR 1005.2(b)');

const regE = `<p>One federal rule is worth knowing if you pay any business costs from a <em>personal</em> account. Regulation E covers "consumer" accounts, which it defines as accounts established primarily for personal, family or household purposes (${L1005_2}); a business checking account generally falls outside it. For a covered account, you can stop a preauthorized electronic transfer by telling your bank, orally or in writing, at least three business days before the scheduled date, and the bank may ask for written confirmation within 14 days (${L1005_10}(c)). If a preauthorized transfer will change in amount, the payee or the bank must send written notice of the amount and date at least 10 days before the transfer, though you can agree to get notice only when it falls outside a set range (${L1005_10}(d)). Stopping a payment does not end the contract; you may still owe the money.</p>`;

export const SECTION = {
  path: '/learn/business-costs/',
  name: 'Business costs',
  h1: 'Recurring business costs: auto-renewals, price increases and forgotten subscriptions',
  title: 'Small Business Recurring Costs: Renewals and Price Creep',
  description: 'Small-business guides: find auto-renewal deadlines in contracts, push back on vendor price increases, and spot recurring and duplicate charges.',
  lang: 'en', crumbs: [{ name: 'Quickwell', path: '/' }, { name: 'Learn', path: '/learn/' }],
  checked: { iso: '2026-10-12', en: 'October 12, 2026' },
  lede: 'Software, services and supplies that renew on their own are easy to forget. These pages show how to find the deadline in a contract, catch price creep before it renews, and pull every recurring charge out of a bank or accounting export.',
  hubText: 'Auto-renewal notice windows, vendor price increases and finding recurring charges.',
  intro: `<h2>Why these costs slip through</h2>
<p>Most small businesses pay for a long list of things that renew without anyone pressing a button: software subscriptions, phone and internet plans, equipment leases, insurance, maintenance contracts, payroll and bookkeeping services, listing and marketing fees. Each one was a reasonable decision on the day it was signed. The trouble comes later. The person who signed it leaves or forgets. The contract renews for another year because the notice window closed a month before anyone looked. The price goes up a little at each renewal, a few seats get added and never removed, and the same tool ends up paid for twice by two departments.</p>
<p>None of this needs special software to fix. It needs three habits, and each page below covers one: knowing every cancel-by date before it passes, checking the price at each renewal and asking for a better one, and reviewing the transactions themselves a few times a year.</p>
<p>The pages are general guidance. Contracts differ, and the wording of yours is what counts. Where a federal rule is relevant we link the official text and say exactly what it covers; where we could not verify something, we say so.</p>`,
  outro: '<p class="note">Start with the page that matches what you have in hand: a contract, a renewal quote or a bank export. Each one stands on its own.</p>',
  disclaimer: 'Not legal, tax or financial advice. These pages explain common contract terms and bookkeeping steps in plain English. Contract wording and state laws vary, so read your own documents and ask a qualified professional before you rely on a deadline or stop a payment.',
};

export const PAGES = [
{
  slug: 'auto-renewal-notice-window',
  h1: 'Auto-renewal clauses: how to find your cancel-by date and not miss it',
  crumbName: 'Auto-renewal notice windows',
  short: 'Find the renewal clause, work out the cancel-by date, calendar it, and send a clean non-renewal notice.',
  title: 'Auto-Renewal Clause Notice Window: Find Your Cancel-By Date',
  description: 'Find the auto-renewal clause in a business contract, work out the cancel-by date from the notice window, calendar it, and word a non-renewal letter.',
  lede: 'Many business contracts renew for another full term unless you send notice a set number of days before the current term ends. Miss that window by a day and you can be locked in for another year. Here is how to find the deadline and keep it.',
  related: ['vendor-price-increase-at-renewal', 'find-recurring-charges-bank-csv'],
  sources: [P425_NOW, P425_HIST, P425_2025],
  body: `
<h2>What an auto-renewal clause looks like</h2>
<p>An automatic renewal (or "evergreen") clause says the agreement continues for another term unless one side says otherwise in time. Typical wording looks like this:</p>
<blockquote>"This Agreement will automatically renew for successive twelve (12) month terms unless either party gives written notice of non-renewal at least sixty (60) days before the end of the then-current term."</blockquote>
<p>Three numbers matter: the <b>end date</b> of the current term, the <b>length of the renewal term</b> (sometimes the same as the first term, sometimes shorter), and the <b>notice period</b>. A fourth detail matters almost as much: <b>how</b> notice must be given.</p>

<h2>Where to look in the contract</h2>
<p>The renewal rule is rarely where you expect it. Check all of these:</p>
<ul>
<li><b>The order form or quote you signed.</b> SaaS and service deals often put the "subscription term", start date and renewal wording here, not in the main terms.</li>
<li><b>"Term and Termination"</b> or <b>"Term"</b> in the master agreement or terms of service.</li>
<li><b>"Notices".</b> This section says how notice must be sent (email, a specific address, certified mail, through the account portal) and when it counts as received.</li>
<li><b>"Fees" or "Pricing".</b> Renewal price changes are often here (see the <a href="/learn/business-costs/vendor-price-increase-at-renewal/">price increase page</a>).</li>
<li><b>An "order of precedence" clause.</b> If the order form and the main terms disagree, this says which wins.</li>
<li><b>Online terms incorporated by link.</b> If the contract says it includes terms "available at" a web address, those terms are part of the deal and can change. Save a copy (print to PDF) on the day you sign and again before each renewal.</li>
</ul>
<p>Search the PDF for these words: <code>renew</code>, <code>automatic</code>, <code>successive</code>, <code>non-renewal</code>, <code>evergreen</code>, <code>prior to</code>, <code>days before</code>, <code>term</code>, <code>notice</code>, <code>expiration</code>.</p>

<h2>Work out the cancel-by date</h2>
<p>Count backwards from the end of the current term, using the contract's own words.</p>
<div class="card"><b>Worked example</b><br>
Current term ends <b>March 31, 2027</b>. Notice must be given "at least 60 days before the end of the then-current term."<br>
60 calendar days before March 31, 2027 is <b>January 30, 2027</b>. That is the last possible day, if notice counts on the day it is sent. Treat <b>January 23</b> as your real deadline so there is a week of margin, and set reminders at 90, 60 and 30 days before that.</div>
<p>Before you trust the date, check these questions in the contract:</p>
<ul>
<li><b>Sent or received?</b> If notice is effective "upon receipt", mail time counts against you. Send earlier.</li>
<li><b>Calendar or business days?</b> Count calendar days unless the clause says "business days", and if the wording is unclear, use whichever reading gives the earlier date.</li>
<li><b>When did the term really start?</b> The start date may be the signature date, the go-live date or the first invoice date. Check the order form, then the first invoice.</li>
<li><b>Has it already renewed?</b> If a renewal already happened, the current term ends a full renewal term later. Work from the latest renewal invoice.</li>
<li><b>Multiple orders?</b> Each order form or add-on may have its own term. Some contracts align them ("co-terminus"); many do not.</li>
</ul>

<h2>Put it on a calendar that someone owns</h2>
<ol>
<li>Create one calendar event per contract on the <b>cancel-by date</b> (with your safety margin), not the renewal date.</li>
<li>Add reminders 90, 60 and 30 days before it. Ninety days gives time to compare alternatives and negotiate; thirty days is the last call.</li>
<li>In the event notes, paste: vendor, contract or account number, the exact notice clause, the notice method and address, the current annual cost, and a link to the signed PDF.</li>
<li>Give each event an owner by name, and invite a second person so a holiday or departure does not sink it.</li>
<li>Keep a simple list (a spreadsheet is fine) with one row per contract: vendor, cost per year, term end, notice days, cancel-by date, notice method, owner, decision.</li>
</ol>

<h2>Sample non-renewal notice</h2>
<p>Send it by the method the Notices section requires, and keep proof (a sent email with the vendor's reply, a portal confirmation screenshot, or a mail receipt). Adapt this wording:</p>
<pre>Subject: Notice of non-renewal: [Company] account [number]

To: [Vendor legal name], [notice address or email from the contract]

This is written notice under section [X] of the [agreement name]
dated [date] that [Your company legal name] does not wish to renew
the agreement (including order form [number]) when the current term
ends on [end date]. Please do not renew any part of the subscription
and do not charge us for any period after [end date].

Please confirm in writing that you received this notice and that the
agreement will end on [end date].

[Name], [Title]
[Company], [date]</pre>
<p>Non-renewal is not the same as termination for cause, and you do not need to give a reason. If you still want to talk about renewing on better terms, you can say so in a separate message: sending notice first keeps your options open while you negotiate.</p>

<h2>Is there a law that protects my business?</h2>
<p>Usually the contract governs, so do not count on a law to rescue a missed window. On the federal side, the FTC's negative option rule in the eCFR, ${L425}, now covers "prenotification negative option plans" for goods: the model where a seller sends announcements of upcoming selections and ships them unless the member declines. The eCFR history shows that a broader version, which included a "Simple cancellation (Click to Cancel)" section, was in effect from January 14, 2025 and removed on February 12, 2026. State laws on automatic renewal vary; many are written for consumer subscriptions, and we could not open the state statutes while writing this page. Ask a lawyer in your state if a renewal you missed is large.</p>`,
},
{
  slug: 'vendor-price-increase-at-renewal',
  h1: 'Vendor and SaaS price increases at renewal: how to spot them and negotiate',
  crumbName: 'Price increases at renewal',
  short: 'Spot price creep in statements and contracts, then ask for a lock, a cap or fewer seats before the renewal date.',
  title: 'SaaS Price Increase at Renewal: How to Spot and Negotiate It',
  description: 'Spot vendor and SaaS price creep in bank statements and contracts, then negotiate the renewal price, a cap or fewer seats before the contract renews.',
  lede: 'Renewal is the one moment a vendor has to win your business again. Price increases tend to arrive quietly at that moment: a higher rate per seat, more seats, a plan change or a new fee line. Catch them early and you have room to push back.',
  related: ['auto-renewal-notice-window', 'find-recurring-charges-bank-csv'],
  sources: [REGE_10, REGE_2],
  body: `
<h2>The five shapes of price creep</h2>
<ol>
<li><b>Higher unit price.</b> The same plan costs more per user, per location or per month.</li>
<li><b>More units.</b> Seats, users or locations are added during the year and never removed. Some contracts have a "true-up" that bills for the highest count you reached.</li>
<li><b>Plan migration.</b> The plan you bought is retired and you are moved to a pricier one, or a feature you rely on moves to a higher tier.</li>
<li><b>New fee lines.</b> Platform, support, compliance, processing or "technology" fees appear on the invoice next to an unchanged headline price.</li>
<li><b>Lost discount.</b> A first-year or promotional discount ends at renewal, so the price jumps to list.</li>
</ol>

<h2>How to spot it in your statements</h2>
<p>You do not need a full audit. For each vendor you pay regularly:</p>
<ul>
<li>Pull 13 months of charges, so a yearly renewal shows twice. The <a href="/learn/business-costs/find-recurring-charges-bank-csv/">recurring charges page</a> shows how to do this from a CSV export.</li>
<li>Compare the <b>oldest</b> and <b>newest</b> amount for the same vendor. Work out the change: (new − old) ÷ old. A charge that went from $480 to $540 rose 12.5%.</li>
<li>Look at the invoice, not just the bank line. The bank line shows the total; the invoice shows whether the unit price, the number of units or a fee changed.</li>
<li>Watch for amounts that differ by small, steady steps month to month. That is usually seats being added.</li>
</ul>

<h2>How to spot it in the contract</h2>
<p>Search the order form and main terms for: <code>renewal pricing</code>, <code>then-current</code>, <code>list price</code>, <code>increase</code>, <code>uplift</code>, <code>CPI</code>, <code>price protection</code>, <code>true-up</code>, <code>fees may change</code>. What you find tells you how much room there is:</p>
<ul>
<li><b>"Renews at the then-current list price"</b> means the vendor can set the renewal price. Your leverage is the notice window and your willingness to leave.</li>
<li><b>A cap</b> such as "increases will not exceed X% per renewal term" limits the jump. Check whether the cap applies to unit price only or to the total.</li>
<li><b>An index link</b> (for example to a consumer price index) ties increases to inflation figures. Check which index, which month and whether there is also a floor.</li>
<li><b>"Upon notice"</b> clauses let the vendor change fees mid-term after telling you. Check how notice is given: an email to a shared inbox counts if the contract says it does.</li>
</ul>

<h2>Negotiate before the cancel-by date, not after</h2>
<p>Once the <a href="/learn/business-costs/auto-renewal-notice-window/">notice window</a> closes, you have lost your strongest card. Start about 90 days before the cancel-by date.</p>
<ol>
<li><b>Know what you actually use.</b> Count active users or locations from the admin panel. Seats nobody has logged into for months are the easiest saving.</li>
<li><b>Price the alternatives.</b> Get at least one real quote from a competitor, or decide what you would do without the product. A credible alternative matters more than any script.</li>
<li><b>Ask in writing, specifically.</b> Vague requests get vague answers. Ask for one or more of: renewal at the current unit price; a written cap on future increases; removing unused seats before renewal; dropping a fee line; a shorter notice window or month-to-month after the first term.</li>
<li><b>Trade carefully.</b> Vendors often offer a lower price for a longer term or upfront payment. That can be fine, but get the cap and the exit terms in the same document, and only commit to a term you are confident about.</li>
<li><b>Get the result into the order form.</b> A sales rep's email is not the contract. Make sure the signed renewal shows the price, the units, the term and any cap.</li>
</ol>
<p>If you have decided to leave unless the price changes, send the non-renewal notice before the deadline and keep talking. That keeps your options open.</p>

<h2>Sample email</h2>
<pre>Subject: [Company] renewal: pricing before [cancel-by date]

Hi [name],

Our [product] agreement (account [number]) renews on [date].
Before we decide, we are reviewing every vendor.

This year we are paying [amount] for [units]. We actively use
[number] of them. For the renewal we would need:
- [number] [units] at our current rate of [rate],
- future increases capped at [X]% per year, in the order form,
- [any fee] removed.

Our notice deadline is [cancel-by date], so we need a written
quote by [date] to keep [product].

Thanks,
[Name]</pre>

<h2>If the price changes on an automatic payment</h2>
${regE}
<p>We could not find reliable public data on how large typical SaaS increases are, so this page does not quote any. Judge each one against your own usage and alternatives.</p>`,
},
{
  slug: 'find-recurring-charges-bank-csv',
  h1: 'How to find recurring charges and duplicate subscriptions in a bank or accounting CSV export',
  crumbName: 'Find recurring charges in a CSV',
  short: 'Export 13 months of transactions, group by merchant, and flag repeats, duplicates and rising amounts in a spreadsheet.',
  title: 'Find Recurring Charges and Duplicate Subscriptions in a CSV',
  description: 'Export 13 months of bank, card or accounting transactions to CSV, then use a spreadsheet to find recurring charges, duplicates and rising prices.',
  lede: 'A transaction export and an ordinary spreadsheet are enough to list every subscription your business pays for, find the ones paid twice, and see which ones went up. This takes about an hour the first time.',
  related: ['vendor-price-increase-at-renewal', 'auto-renewal-notice-window'],
  sources: [REGE_10, REGE_2],
  body: `
<h2>Step 1: Export at least 13 months</h2>
<p>Thirteen months catches yearly renewals, which are the easiest to miss. Export from every place money leaves the business:</p>
<ul>
<li><b>Business checking accounts.</b> Online banking usually offers a download of account activity; look for "Download", "Export" or the statements area, and choose CSV (or a spreadsheet format) for the date range. Some banks limit how far back a single download goes, so you may need two or three downloads.</li>
<li><b>Business credit cards.</b> Many subscriptions are on cards, not the bank account. Export each card separately.</li>
<li><b>Accounting software.</b> A transaction list or general ledger report for expense accounts, exported to CSV or Excel, gives the same data with your categories already applied.</li>
<li><b>Payment apps and marketplaces</b> you pay vendors through, if any.</li>
</ul>
<p>Menu names change and differ between banks and software, so if you cannot find the export, the provider's help pages or support line will have the current steps.</p>
<p class="note">Privacy: a transaction export shows who you pay and who pays you. Keep it on your own computer or your company's storage. Do not upload it to sites you do not trust, and delete working copies when you are done.</p>

<h2>Step 2: Put everything in one sheet with the same columns</h2>
<p>Exports differ, but almost all have a date, a description (the merchant text) and an amount. Make one sheet with these columns and paste every export into it:</p>
<div class="tbl"><table><thead><tr><th>Column</th><th>What goes in it</th></tr></thead><tbody>
<tr><td>Date</td><td>The transaction or posting date. Make sure the spreadsheet reads it as a date, not text.</td></tr>
<tr><td>Source</td><td>Which account or card it came from.</td></tr>
<tr><td>Description</td><td>The merchant text exactly as exported.</td></tr>
<tr><td>Amount</td><td>Money out as a positive number. If your export has separate Debit and Credit columns, use the Debit column. If it has one signed column where money out is negative, flip the sign.</td></tr>
<tr><td>Merchant</td><td>A cleaned-up name (Step 3).</td></tr>
<tr><td>Month</td><td>The year and month, e.g. <code>=TEXT(A2,"yyyy-mm")</code> in Excel or Google Sheets.</td></tr>
</tbody></table></div>
<p>Delete transfers between your own accounts and card payments from the bank account, or you will count the same spending twice.</p>

<h2>Step 3: Clean the merchant names</h2>
<p>The same vendor often appears with changing reference numbers, like <code>ACME SOFTWARE *INV 20931</code> one month and <code>ACME SOFTWARE *INV 21877</code> the next. Grouping needs one name per vendor.</p>
<ul>
<li><b>Google Sheets:</b> <code>=TRIM(REGEXREPLACE(UPPER(C2),"[0-9#*.]+"," "))</code> removes digits and common symbols. Copy it down, then fix the few names it leaves messy.</li>
<li><b>Any spreadsheet:</b> sort by Description, then type a short Merchant name for each group by hand. For 13 months of a small business this is usually a few hundred rows, and many repeat.</li>
</ul>

<h2>Step 4: Pivot by merchant and month</h2>
<p>Insert a pivot table: Merchant in rows, Month in columns, sum of Amount in values. Then add a second pivot (or extra value fields) with, per merchant: count of transactions, minimum amount and maximum amount. Read it like this:</p>
<ul>
<li><b>Recurring:</b> a merchant that appears in three or more separate months with similar amounts, or in the same month a year apart.</li>
<li><b>Rising:</b> maximum noticeably above minimum for the same merchant. Divide (max − min) by min to see the change, then check the invoices (see the <a href="/learn/business-costs/vendor-price-increase-at-renewal/">price increase page</a>).</li>
<li><b>Duplicate:</b> two charges from the same merchant for the same amount in the same month; the same tool paid on two different cards; or two products that do the same job (two video-call tools, two file-sharing services, two password managers).</li>
<li><b>Forgotten:</b> a merchant nobody on the team recognizes. Search your email for the name to find the account and its owner.</li>
</ul>

<h2>Step 5: Turn the list into decisions</h2>
<p>Copy every recurring merchant to a short register: vendor, what it is for, owner, monthly or yearly cost, payment method, renewal date, and a decision (keep, cut, downgrade, renegotiate, merge). Then:</p>
<ol>
<li>For each "keep", find the contract or terms and note the cancel-by date (see <a href="/learn/business-costs/auto-renewal-notice-window/">auto-renewal notice windows</a>).</li>
<li>For each "cut", cancel through the vendor's own process and keep the confirmation. Watch the next statement to make sure the charges stopped.</li>
<li>For each duplicate, pick one, move the users, and cancel the other at its next cancel-by date.</li>
<li>Repeat the review every quarter. The second time takes a fraction of the first, because the merchant names are already cleaned.</li>
</ol>

<h2>An example of what you are looking for</h2>
<p>This is a made-up extract, not real data:</p>
<pre>Date,Description,Amount
2026-01-03,ACME SOFTWARE *INV 20931,120.00
2026-01-17,CLOUDBOX STORAGE,15.00
2026-01-17,CLOUDBOX STORAGE,15.00
2026-02-03,ACME SOFTWARE *INV 21877,120.00
2026-03-03,ACME SOFTWARE *INV 22710,132.00</pre>
<p>Acme is recurring and rose from $120 to $132 (10%) in March. CloudBox was charged twice on the same day: either two accounts or a billing error, worth a support ticket.</p>

<h2>Stopping a charge you did not agree to</h2>
<p>First ask the vendor to cancel and refund, in writing. For a card, your card issuer has its own dispute process and deadlines; check your cardholder agreement. For bank debits:</p>
${regE}`,
},
];
