// Form 1099 basics for small businesses under the 2026 rules: the $2,000 threshold, who is excluded, and the deadlines
// for 2026 payments. Rechecked 2026-10-31 against the current IRS "Am I required to file" page and 2026 Publication 1099,
// alongside Title 26 and eCFR text. The IRS sources confirm $2,000 for covered 2026 service/rent categories while preserving
// separate thresholds for some payment types (including $10 royalties and $600 gross proceeds paid to attorneys).
const USC = (s) => `https://raw.githubusercontent.com/TheJoshuaEvans/united-states-code/HEAD/usc/26/${s}.xml`;
const usc = (s, what) => ({ label: `26 U.S.C. ${s}${what ? ` (${what})` : ''}, U.S. Code text (Law Revision Counsel USLM release, public mirror)`, url: USC(s) });
const CFR = (s) => `https://www.ecfr.gov/api/versioner/v1/full/2026-10-06/title-26.xml?part=1&section=${s}`;
const cfrSrc = (s, what) => ({ label: `26 CFR ${s} (${what}), eCFR text as of Oct 6, 2026`, url: CFR(s) });

const S6041 = usc('6041', 'payments of $2,000 or more; inflation adjustment in (h)');
const S6041A = usc('6041A', 'payments for services');
const S3406 = usc('3406', 'backup withholding; effective-date note for Pub. L. 119-21 §70433');
const S6050W = usc('6050W', 'payment card and third party network transactions');
const S6050N = usc('6050N', 'royalties');
const S6045 = usc('6045', 'payments to attorneys in (f)');
const S6071 = usc('6071', 'time for filing information returns');
const S7503 = usc('7503', 'deadlines on a weekend or legal holiday');
const S6721 = usc('6721', 'penalty for late or incorrect information returns');
const R6041_1 = cfrSrc('1.6041-1', 'information returns; card and payment network rule');
const R6041_3 = cfrSrc('1.6041-3', 'payments for which no return is required');
const R6049_4 = cfrSrc('1.6049-4', 'who counts as a corporation for the exemption');
const R6050W = cfrSrc('1.6050W-1', 'payment card and third party network reporting');
const IRS1099 = { label: 'Internal Revenue Service — Am I required to file a Form 1099 or other information return? (2026 thresholds and payment-type exceptions)', url: 'https://www.irs.gov/businesses/small-businesses-self-employed/am-i-required-to-file-a-form-1099-or-other-information-return' };
const IRSPub1099 = { label: 'Internal Revenue Service — Publication 1099 (2026), General Instructions for Certain Information Returns (thresholds and due dates)', url: 'https://www.irs.gov/publications/p1099' };

// Human-readable links in the text (official sites).
const u = (sec, text) => `<a href="https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section${sec}&amp;num=0&amp;edition=prelim" rel="noopener">${text || `26 U.S.C. §${sec}`}</a>`;
const r = (sec, text) => `<a href="https://www.ecfr.gov/current/title-26/section-${sec}" rel="noopener">${text || `26 CFR ${sec}`}</a>`;
const TOOL = (text) => `<a href="/vendor-check/?ref=learn-1099">${text}</a>`;

export const SECTION = {
  path: '/learn/1099/',
  name: '1099 reporting',
  h1: 'Form 1099 for small businesses: 2026 thresholds and exceptions',
  title: 'Form 1099 for Small Businesses: 2026 Thresholds',
  description: 'IRS confirms $2,000 for many 2026 Form 1099 payments, but exceptions vary by payment type. Official IRS sources and deadlines.',
  lang: 'en', crumbs: [{ name: 'Quickwell', path: '/' }, { name: 'Learn', path: '/learn/' }],
  checked: { iso: '2026-10-31', en: 'October 31, 2026' },
  lede: 'For covered payments made in 2026, the IRS lists a $2,000 threshold for 1099-NEC services and many 1099-MISC categories. Some payment types still have different thresholds, so check the IRS table before classifying a payee.',
  hubText: 'The $2,000 threshold for covered 2026 payments, payment-type exceptions, and early-2027 filing dates.',
  intro: `<h2>Why 2026 is different</h2>
<p>A law signed on July 4, 2025 (Pub. L. 119-21) raised the threshold for covered information returns. The IRS's current 2026 guidance confirms $2,000 for nonemployee services reported on Form 1099-NEC and many Form 1099-MISC categories, including rent. The 2026 IRS table also preserves different amounts for some categories: for example, $10 for royalties and $600 for gross proceeds paid to attorneys. Do not apply one threshold to every vendor payment.</p>
<p>Older web pages and some Treasury regulation text may still display $600 for categories now covered by the $2,000 rule. Use the current IRS page and Publication 1099 for 2026 payments, and check the specific payment type, payee and payment method. Card/network payments, corporations, backup withholding, goods and employee wages have separate rules.</p>
<p>Each page below links the current IRS guidance alongside the statute and regulation text. Check the current instructions before filing a form or deciding a payment is excluded.</p>`,
  outro: `<p class="note">Want the list for your own business? The free ${TOOL('Year-End Vendor Check')} reads your 2026 bank, card, QuickBooks or Xero export in your browser and sorts each payee into "likely needs a 1099", "near the line", "probably not needed" and "need info". Nothing is uploaded.</p>`,
  cta: { title: 'Find who likely needs a 1099 from your own export', text: 'The free Year-End Vendor Check reads a 2026 bank, card, QuickBooks or Xero export in your browser, totals each payee and flags covered $2,000 payments plus common card and corporation exclusions. Use the IRS table for payment-type exceptions. Nothing is uploaded. Not tax advice.', href: '/vendor-check/?ref=learn-1099', label: 'Open the Vendor Check' },
  disclaimer: 'Not tax, legal or accounting advice. These pages explain federal rules in plain English from the statute and regulation text linked on each page. They do not cover state rules, which can differ. Check the current IRS instructions for Forms 1099-NEC and 1099-MISC, or ask a tax professional, before you file.',
};

export const PAGES = [
{
  slug: 'threshold-2026',
  h1: '1099 threshold for 2026: $2,000 for covered payments, with exceptions',
  crumbName: '1099 threshold for 2026',
  short: 'The $2,000 threshold for covered 2026 Form 1099 payments, plus exceptions such as $10 royalties and $600 gross proceeds to attorneys.',
  title: '1099 Threshold for 2026: $2,000 and Exceptions',
  description: 'IRS confirms $2,000 for many 2026 1099 payments, but exceptions include $10 royalties and $600 gross proceeds paid to attorneys.',
  lede: 'If your business pays a contractor or landlord in 2026, the federal threshold is generally $2,000 for covered services and rent. The IRS keeps separate thresholds for some other payment types, so classify the payment before applying the number.',
  related: ['who-does-not-get-a-1099', 'deadlines-2026-payments', { href: '/learn/business-costs/find-recurring-charges-bank-csv/', title: 'Find recurring charges in a CSV', text: 'Pull a year of payments out of a bank or accounting export in a spreadsheet.' }],
  sources: [IRS1099, IRSPub1099, S6041, S6041A, S3406, R6041_1, S6050N, S6050W, S6721],
  body: `
<h2>The short answer</h2>
<p>For payments made in 2026, the $2,000 threshold applies to covered services reported on Form 1099-NEC and many Form 1099-MISC categories, including rent. It does not apply to every payment type: royalties remain reportable from $10, and gross proceeds paid to attorneys remain reportable at $600 or more. Check the IRS table for the category before deciding a payment is below the reporting threshold.</p>

<h2>What the law says now</h2>
<p>The basic rule is in ${u('6041')}(a). It applies to anyone "engaged in a trade or business" who pays another person rent, compensation, fees and similar income "of $2,000 or more in any calendar year". The heading of that subsection used to read "of $600 or more"; the 2025 law (Pub. L. 119-21, §70433) changed it to "Payments exceeding threshold" and replaced "$600" with "$2,000".</p>
<p>Payments for services, the ones reported on Form 1099-NEC, are covered by ${u('6041A')}(a). It now requires a return when the year's payments for services to one person "equals or exceeds the dollar amount in effect for such calendar year under section 6041(a)". In other words, the services rule follows the same $2,000 figure, and it will follow it as the figure changes.</p>
<p>The start date comes from §70433(f) of the 2025 law, which the U.S. Code prints as a note under ${u('3406')}: the amendments "shall apply with respect to payments made after December 31, 2025." So the date that matters is when you <b>paid</b>, not when the work was done or the invoice was dated.</p>

<h2>Worked examples (2026 payments)</h2>
<div class="tbl"><table><thead><tr><th>Payee</th><th>Paid in 2026</th><th>Federal 1099 under the $2,000 line?</th></tr></thead><tbody>
<tr><td>Freelance designer (sole proprietor), paid by check</td><td>$1,950</td><td>No form required at that total. One more $50 invoice in 2026 would cross the line.</td></tr>
<tr><td>Bookkeeper (individual), paid by ACH</td><td>$2,000.00 exactly</td><td>Yes: the services rule says "equals or exceeds".</td></tr>
<tr><td>Office landlord (individual), paid monthly by check</td><td>$2,400</td><td>Yes: rent is covered by §6041(a).</td></tr>
<tr><td>Cleaner paid $500 in March 2026 and $1,600 in November 2026</td><td>$2,100</td><td>Yes: the line is the calendar-year total per payee, not per payment.</td></tr>
<tr><td>Contractor paid $1,200 in December 2025 and $1,000 in January 2026</td><td>$1,000 in 2026</td><td>Not for 2026. The 2025 payment belongs to 2025, which used $600.</td></tr>
</tbody></table></div>
<p>These examples assume the payee is not a corporation and was paid by check, bank transfer or cash. Card payments, payments through some payment apps, and payments to most corporations follow different rules; see <a href="/learn/1099/who-does-not-get-a-1099/">who doesn't get a 1099</a>.</p>

<h2>How to read older $600 references</h2>
<p>Some older Treasury regulation text and older articles still display $600. The current IRS page and 2026 Publication 1099 confirm $2,000 for covered 2026 service and rent categories. They also show that the threshold is not universal: royalties remain reportable from $10, and gross proceeds paid to attorneys remain at $600. Check the IRS table for the exact payment type rather than treating every $600 reference as either current or obsolete.</p>

<h2>From 2027 the amount moves with inflation</h2>
<p>A new ${u('6041')}(h) says that for "any calendar year after 2026" the $2,000 is increased by a cost-of-living adjustment that uses 2025 as the base year, rounded to the nearest $100. So the 2027 figure is not fixed in the law; the IRS will publish it. The IRS's 2026 Publication 1099 says the $2,000 amount will be adjusted for inflation beginning in calendar year 2027. The 2027 amount is not listed in the current 2026 publication; check the next IRS update before applying a 2027 threshold.</p>

<h2>What did not change</h2>
<ul>
<li><b>Royalties</b> are reported from <b>$10</b> a year under a separate rule (${u('6050N')}(a)); do not apply the general $2,000 line to royalty payments.</li>
<li><b>Gross proceeds paid to attorneys</b> are listed by the IRS at <b>$600 or more</b> on Form 1099-MISC. This is a different payment category from attorney fees for services reported on Form 1099-NEC.</li>
<li><b>Card and payment-network payments</b> are reported by the processor, not by you, under ${u('6050W')}. The 2025 law set that processor threshold at more than $20,000 and more than 200 transactions for third party networks (§6050W(e)), but that threshold is about the processor's own form, not yours.</li>
<li><b>Backup withholding</b> uses the same line: under ${u('3406')}(b)(6), a payment counts as reportable once the year's total to the payee reaches the amount in effect under §6041(a). If a payee above the line has not given you a taxpayer identification number, ask for a Form W-9 before you pay again.</li>
<li><b>Penalties</b> still apply. ${u('6721')}(a) sets $250 per late or incorrect return, before the inflation adjustment in §6721(f), with lower amounts if you correct within 30 days or by August 1.</li>
<li><b>State rules</b> are separate. Some states set their own reporting rules, and we have not verified any state's 2026 figure, so check yours.</li>
</ul>

<h2>How to apply it to your own books</h2>
<ol>
<li>Export every 2026 payment from your bank accounts (and your accounting software, if you use one).</li>
<li>Total the year by payee. Merge the different spellings of the same person, and count checks that have no name in the description.</li>
<li>Set aside card payments and payments to corporations (with the attorney and medical exceptions), goods and employee wages.</li>
<li>Flag every remaining payee at $2,000 or more, and watch anyone between $1,500 and $1,999 who may get another payment before December 31.</li>
<li>Collect a W-9 from each flagged payee now, not in January.</li>
</ol>
<p>The free ${TOOL('Year-End Vendor Check')} does steps 2 to 4 from a bank, card, QuickBooks or Xero export, in your browser, and shows the rule behind each result. A spreadsheet pivot table works too; the <a href="/learn/business-costs/find-recurring-charges-bank-csv/">recurring charges guide</a> shows the export and grouping steps.</p>`,
},
{
  slug: 'who-does-not-get-a-1099',
  h1: "Who doesn't get a 1099: card payments, corporations and the attorney and medical exceptions",
  crumbName: "Who doesn't get a 1099",
  short: 'Card and payment-network payments, most corporations, goods, phone and freight bills, and employees. Plus the two corporate exceptions: lawyers and medical providers.',
  title: "Who Doesn't Get a 1099: Cards, Corporations, Exceptions",
  description: 'Understand 1099 exclusions and exceptions: card payments, most corporations, $10 royalties, $600 gross proceeds to attorneys, and 2026 service thresholds.',
  lede: 'Crossing $2,000 is only half the question. Many payments never need a Form 1099 from you, because someone else reports them or because the payee is exempt. Here are the main exclusions from the regulation text, and the two exceptions that catch people out.',
  related: ['threshold-2026', 'deadlines-2026-payments'],
  sources: [IRS1099, IRSPub1099, R6041_1, R6050W, S6050W, R6041_3, R6049_4, S6045, S6041A],
  body: `
<h2>1. Payments by credit card, debit card or a payment network</h2>
<p>If you paid a contractor with a credit or debit card, the card processor reports the payment, not you. The regulation, ${r('1.6041-1')}(a)(1)(iv), says that payments by payment card or through a third party payment network that would otherwise be reportable under both §6041 and §6050W "are reported under section 6050W and not section 6041". Section 6050W is the rule that makes processors file Form 1099-K.</p>
<p>The same sentence of the regulation adds that, for this purpose, the processor's own minimum (more than $20,000 and more than 200 transactions for third party networks, in ${u('6050W')}(e)) is disregarded. So a business payment that goes through a third party network still counts as "reported under 6050W" for your purposes, even if the payee is too small to get a 1099-K from the network. Card payments have no such minimum in the first place. Either way, do not issue your own 1099 for those payments as well.</p>
<h3>Payment apps and bank transfers: check how you paid</h3>
<p>Not every app counts. ${r('1.6050W-1')}(c) defines a third party payment network as an arrangement in which a central organization has accounts with a substantial number of unrelated providers of goods or services, who have agreed to settle transactions under its terms, and which guarantees payment to those providers. Card-issuing arrangements are excluded from that definition. Whether a particular app or bank-to-bank transfer service fits it, and whether a given payment was sent as a business payment or a personal transfer, depends on the service and how you used it. We have not verified any brand, so treat payment-app and person-to-person transfers as "check" items, not automatic exclusions, and ask your tax professional or the app's own tax documents.</p>

<h2>2. Payments to most corporations</h2>
<p>${r('1.6041-3')}(p)(1) lists payments made to a corporation among the payments for which no return is required under §6041. To tell whether a payee counts as a corporation, the regulation points to ${r('1.6049-4')}(c)(1)(ii)(A), which says you may treat a payee as a corporation (absent actual knowledge otherwise) if, before you pay:</p>
<ul>
<li>its name contains "Incorporated", "Inc.", "Corporation", "Corp." or "P.C." (but <b>not</b> just "Company" or "Co."), or an insurance-company term;</li>
<li>you have a corporate resolution or similar document showing corporate status; or</li>
<li>it gives you a Form W-9 with an employer identification number and a statement that it is a domestic corporation.</li>
</ul>
<p>An "LLC" in the name is not on that list. An LLC may or may not be treated as a corporation for tax purposes, so the W-9 is the reliable way to find out.</p>

<h2>3. The two corporate exceptions: lawyers and medical providers</h2>
<p>The corporate exemption in §1.6041-3(p)(1) has two carve-outs, and they matter now that the threshold is higher:</p>
<ul>
<li><b>Attorneys' fees.</b> Payments made to a corporation after December 31, 1997 for attorneys' fees are <b>not</b> exempt. A law firm organized as a corporation, a professional corporation or an LLC still gets a 1099 if you pay it $2,000 or more in fees for 2026.</li>
<li><b>Medical and health care.</b> A corporation "engaged in providing medical and health care services or engaged in the billing and collecting of payments" for them is not exempt either. The regulation then excludes tax-exempt hospitals and extended care facilities, and government-owned ones.</li>
</ul>
<p>Lawyers have a second rule. ${u('6045')}(f) requires a return for "any payment to an attorney in connection with legal services", for example a settlement paid to a claimant's lawyer, except for the part already reported under §6041(a) or that would be but for its dollar limit. The IRS's current Publication 1099 distinguishes attorney fees reported on Form 1099-NEC (generally $2,000 or more for 2026 services) from gross proceeds paid to attorneys reported on Form 1099-MISC ($600 or more). Check the instructions for the exact transaction and box.</p>

<h2>4. Goods, utilities, freight and storage</h2>
<p>§1.6041-3(c) excludes "payments of bills for merchandise, telegrams, telephone, freight, storage, and similar charges". Buying supplies, inventory or equipment from a sole proprietor is not a payment for services. If one invoice mixes parts and labor, ask the vendor to show them separately so you know the services amount.</p>

<h2>5. Employees, partners, rent through agents and others</h2>
<ul>
<li><b>Employees.</b> Wages reported on Form W-2 are not reported again on a 1099: ${u('6041A')}(c) says no services return is required where a W-2 statement is required, and §1.6041-3(a) excludes payments reported on Forms W-2 and W-3.</li>
<li><b>Rent paid to a rental agent.</b> §1.6041-3(d): the property manager, not you, reports to the landlord.</li>
<li><b>Partners.</b> §1.6041-3(f): a partnership's payments to its own partners are reported through the partnership return.</li>
<li><b>Tax-exempt organizations and governments.</b> §1.6041-3(p)(2) to (4) exempt payments to organizations exempt under section 501(a), to the United States and to states and their subdivisions.</li>
<li><b>Expense reimbursements</b> under an accountable plan (§1.6041-3(h)) and certain payments to foreign persons (§1.6041-4) are also excluded.</li>
</ul>

<h2>A quick decision order</h2>
<ol>
<li>Was it wages on a W-2? Stop.</li>
<li>Was it paid by card, or through a payment network as a business payment? The processor reports it. Stop.</li>
<li>Was it for goods, phone, freight or storage only? Stop.</li>
<li>Is the payee a corporation (W-9, name or resolution)? Stop, <b>unless</b> it is an attorney or a medical or health care provider.</li>
<li>Is the 2026 total for services or rent $2,000 or more (royalties: $10)? Then a 1099 is likely. See the <a href="/learn/1099/threshold-2026/">$2,000 rule</a>.</li>
</ol>
<p>The free ${TOOL('Year-End Vendor Check')} follows this order on your own bank and card exports. You tag each file as a bank account or a card once, answer a short question per payee (corporation? goods or services? W-9 on file?), and every row says which rule put it in its group. Nothing leaves your browser.</p>`,
},
{
  slug: 'deadlines-2026-payments',
  h1: '1099 deadlines for 2026 payments (filed in early 2027)',
  crumbName: '1099 deadlines for 2026 payments',
  short: 'For 2026 payments: 1099-NEC due February 1, paper 1099-MISC due March 1, and electronic 1099-MISC due March 31, 2027.',
  title: '1099 Deadlines for 2026 Payments (Filed in Early 2027)',
  description: 'For 2026 payments: 1099-NEC due February 1, paper 1099-MISC due March 1, and electronic 1099-MISC due March 31, 2027.',
  lede: 'Forms for payments made in 2026 are due in early 2027, and the main date moves this year: January 31, 2027 falls on a Sunday, so the 1099-NEC deadline is Monday, February 1, 2027. Here is where each date comes from, and a plan that works backward from it.',
  related: ['threshold-2026', 'who-does-not-get-a-1099', { href: '/learn/business-costs/auto-renewal-notice-window/', title: 'Auto-renewal notice windows', text: 'The other year-end calendar job: cancel-by dates for contracts that renew on their own.' }],
  sources: [IRSPub1099, IRS1099, S6071, S7503, S6041A, S6041, S6721, S3406],
  body: `
<h2>The dates for 2026 payments</h2>
<div class="tbl"><table><thead><tr><th>What</th><th>Due</th><th>Where the date comes from</th></tr></thead><tbody>
<tr><td>Form 1099-NEC (services) to the IRS, paper or electronic</td><td><b>Mon, Feb 1, 2027</b></td><td>${u('6071')}(c): January 31 of the following year; moved to Monday by ${u('7503')} because Jan 31, 2027 is a Sunday</td></tr>
<tr><td>1099-NEC copy to the contractor</td><td><b>Mon, Feb 1, 2027</b></td><td>${u('6041A')}(e): on or before January 31; same weekend rule</td></tr>
<tr><td>1099-MISC (rent and similar) copy to the payee</td><td><b>Mon, Feb 1, 2027</b></td><td>${u('6041')}(d): on or before January 31; same weekend rule. Check the IRS instructions as well, since they set some form-specific details</td></tr>
<tr><td>1099-MISC and other 1099s filed <b>electronically</b> with the IRS</td><td><b>Wed, Mar 31, 2027</b></td><td>§6071(b): March 31 for information returns filed electronically, other than nonemployee compensation</td></tr>
<tr><td>1099-MISC filed on <b>paper</b> with the IRS</td><td>See the IRS instructions</td><td>§6071(a) leaves this date to the regulations and instructions, which we could not open, so we do not state it</td></tr>
</tbody></table></div>

<h2>Why it is February 1, not January 31</h2>
<p>Section 6071(c) says returns and statements reporting nonemployee compensation "shall be filed on or before January 31 of the year following the calendar year to which such returns relate." For 2026 payments, that is January 31, 2027, a Sunday.</p>
<p>Section 7503 says that when the last day for an act under the tax laws "falls on Saturday, Sunday, or a legal holiday", the act is timely if done "on the next succeeding day which is not a Saturday, Sunday, or a legal holiday", where legal holiday means a legal holiday in the District of Columbia. Monday, February 1, 2027 is not a holiday, so the deadline is <b>February 1, 2027</b>. (Our date arithmetic: January 31, 2027 is a Sunday and March 31, 2027 is a Wednesday.)</p>
<p>The one extra day is a buffer, not a plan. Treat January 29, the Friday before, as your real deadline.</p>

<h2>Why 1099-NEC is earlier than 1099-MISC</h2>
<p>A 2015 amendment to §6071 (Pub. L. 114-113) added subsection (c), which gave nonemployee compensation its own January 31 filing deadline. Other information returns kept the later date when filed electronically (§6071(b)). In practice, a business that only pays contractors has one date to remember; one that also pays rent has two filing dates but one recipient-copy date.</p>

<h2>A backward plan (our suggestion)</h2>
<p>These steps and dates are our suggestion, not legal deadlines:</p>
<ol>
<li><b>By mid-November 2026:</b> export your 2026 payments so far and total them by payee. Anyone at $1,500 or more is worth watching; see the <a href="/learn/1099/threshold-2026/">$2,000 rule</a>.</li>
<li><b>By December 15, 2026:</b> send a W-9 request to everyone who is above, or likely to cross, $2,000. People are easier to reach before the holidays, and under ${u('3406')}(b)(6) a payee who crosses the line without giving you a taxpayer identification number can trigger backup withholding on later payments.</li>
<li><b>First week of January 2027:</b> export the full year, re-total, and remove card payments and corporations (with the attorney and medical exceptions); see <a href="/learn/1099/who-does-not-get-a-1099/">who doesn't get a 1099</a>.</li>
<li><b>By January 22, 2027:</b> prepare the forms in your filing service or accounting software, and check names and taxpayer identification numbers against the W-9s.</li>
<li><b>By January 29, 2027:</b> file the 1099-NECs and send recipient copies. Keep proof of when you sent them.</li>
<li><b>By March 31, 2027:</b> e-file any remaining 1099-MISC returns.</li>
</ol>

<h2>If you miss a date</h2>
<p>${u('6721')}(a) sets a penalty of $250 per late or incorrect information return, with a yearly cap. It drops to $50 per return if the failure is corrected within 30 days of the due date, and to $100 if corrected by August 1. These are the base amounts written in the statute. §6721(f) increases them for inflation, so the amounts that actually apply are higher; check the IRS for the current figures. The practical lesson is the same: if you find a missed contractor in February, file right away instead of waiting.</p>

<h2>Confirm the filing details before you submit</h2>
<p>The IRS's 2026 Publication 1099 lists the applicable form categories, recipient-copy dates and filing deadlines. For 2026 payments, 1099-NEC is due January 31, 2027 (moved to February 1 because the date is Sunday); paper 1099-MISC is due February 28, 2027 (moved to March 1), and electronic 1099-MISC is due March 31. Check the current IRS instructions for the precise box, payee category, e-file requirements and any later updates before filing.</p>
<p>The free ${TOOL('Year-End Vendor Check')} shows these deadlines with your results and, in the paid packs, saves them to your calendar with W-9 reminders.</p>`,
},
];
