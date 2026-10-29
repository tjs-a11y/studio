// "Factoring fee vs broker short-pay" — a standalone guide next to Haul Audit.
// Grounded in trucking trade sources read via search on 2026-10-29 (FreightWaves, Bobtail) for the factoring
// numbers, and in reporting on broker transaction records (OOIDA's broker-document request form; trade press on
// 49 CFR 371.3 and the ongoing broker-transparency rulemaking). The official CFR hosts (law.cornell.edu, ecfr.gov)
// did not resolve from this network this shift, so the regulation's right-to-review is stated as reported, not
// quoted, and the eCFR address is listed as the official text to check rather than one opened here. The factoring
// figures are reported ranges that vary by provider; the worked example is labelled as illustrative.
// Haul Audit's "runs in your browser; nothing uploaded" claim was verified against the code this shift:
// haul-audit/index.html computes with the pure engine (js/engine.mjs) on-device; its only network call is an
// anonymous /api/event {event:'check'} count that carries no entered values.

const TOOL = '/haul-audit/?ref=learn-factoring-shortpay';
const CHECKED = { iso: '2026-10-29', en: 'October 29, 2026' };

const SOURCES = [
  { label: 'FreightWaves, "What Is Invoice Factoring? Types, Costs, & How It Works" (fee ranges, pricing models, recourse vs non-recourse, worked example)', url: 'https://www.freightwaves.com/checkpoint/invoice-factoring' },
  { label: 'FreightWaves, "What Is the Average Factoring Advance Rate for Truckers?" (advance rate vs factoring rate)', url: 'https://www.freightwaves.com/checkpoint/factoring-advance-rate/' },
  { label: 'Bobtail, "Trucking factoring cost" (fee structures and additional fees)', url: 'https://www.bobtail.com/blog/trucking-factoring-cost/' },
  { label: 'OOIDA, "Request For Broker Documents" form (carrier request for a broker’s transaction record)', url: 'https://www.ooida.com/wp-content/uploads/2023/12/Request-For-Broker-Documents.pdf' },
  { label: '49 CFR 371.3, "Records to be kept by brokers" — official text at the eCFR (not opened from this network this shift; stated here as reported by the sources above)', url: 'https://www.ecfr.gov/current/title-49/section-371.3' },
];

const EN = {
  path: '/learn/factoring-vs-broker-shortpay/', lang: 'en',
  title: 'Factoring Fee vs Broker Short-Pay on Your Settlement',
  h1: 'Factoring fee or broker short-pay? Telling two deductions apart',
  description: 'A factoring fee and a broker short-pay can look identical on your bank deposit but are two separate gaps, with different paperwork. How to tell them apart.',
  crumbs: [{ name: 'Quickwell', path: '/' }, { name: 'Learn', path: '/learn/' }],
  crumbName: 'Factoring fee vs broker short-pay',
  lede: 'A factoring company’s fee comes out of your advance. A broker short-pay is the broker paying less than the rate confirmation said. On a bank statement they look like the same missing money — but they are two separate gaps, with two separate paper trails and two separate fixes.',
  body: `
<h2>Two different gaps that look the same</h2>
<p>When a deposit lands smaller than you expected, there are usually two very different reasons, and they are easy to mix up:</p>
<ul>
<li><b>A factoring deduction.</b> If you factor your invoices, your factoring company advances most of the invoice up front and keeps a fee. That gap is between you and your factor, and it is set by your factoring agreement.</li>
<li><b>A broker short-pay.</b> The broker pays less than the amount on the rate confirmation — often with a reason attached (a lumper that was not reimbursed, a late fee, a claim, a detention request that was denied). That gap is between you and the broker, and it is set by the load paperwork.</li>
</ul>
<p>On a bank statement, both just look like &ldquo;less money than the load was worth.&rdquo; Telling which one happened — and whether anything is actually wrong — means pulling the documents, not guessing from the deposit.</p>

<h2>How a factoring deduction is built</h2>
<p>Two numbers drive it, and they are not the same thing:</p>
<ul>
<li>The <b>advance rate</b> is how much of the invoice you get up front — trade sources report this often sits in the 90%–100% range.</li>
<li>The <b>factoring fee</b> (or factoring rate) is what the factor charges — commonly reported around 1%–5% of the invoice, with many established carriers landing near 2%–3.5%. The exact numbers vary by provider and contract.</li>
</ul>
<p>A worked example the trade sources use: on a $2,000 invoice at a 90% advance and a 3% fee, you receive $1,800 up front. When the customer pays, the $200 reserve is released minus the $60 fee, so $140 more comes back. Your total is $1,940, and the $60 fee is the gap. <span class="note">(estimate — illustrative figures from the sources below; your own schedule may differ.)</span></p>
<p>Factors price this in one of three shapes: a <b>flat</b> fee, a <b>tiered or variable</b> fee that grows the longer the invoice stays open, or an <b>advance-plus-reserve</b> structure like the example. Other line items can appear too — setup, transaction, monthly minimum, termination, and non-ACH payment fees. And the agreement is either <b>recourse</b> (you buy back invoices the customer never pays; usually the cheaper option, because you keep the credit risk) or <b>non-recourse</b> (the factor absorbs some losses, often only when a broker or shipper goes bankrupt; usually costs more). Ask for a sample settlement statement at 30, 45 and 60 days before you sign.</p>

<h2>What a broker short-pay looks like</h2>
<p>A short-pay is the broker remitting less than the rate confirmation amount. Sometimes it is legitimate (a deduction you agreed to, a documented claim); sometimes it is an error or a disputed charge. The only way to know is to compare the rate confirmation and the broker’s settlement line by line, and to read the reason attached to the deduction.</p>
<p>Federal rules require brokers to keep a record of each transaction, and a party to the transaction can request it; driver advocates such as OOIDA publish a broker-document request form for exactly this. In practice that right is contested — many carrier contracts try to waive it, and broker transparency is the subject of ongoing FMCSA rulemaking — so check the current official source before you rely on it.</p>

<h2>The documents to pull before you decide</h2>
<p>You cannot reconcile a short deposit from memory. Gather these and lay them side by side:</p>
<ul>
<li>The <b>rate confirmation</b> and any revised versions.</li>
<li><b>Proof of delivery</b>, and any <b>accessorial approval</b> with timestamps (detention in/out, lumper receipt, layover).</li>
<li>The <b>broker settlement or remittance</b> detail — the line items and the reason for any deduction.</li>
<li>Your <b>factoring agreement</b> and its fee schedule.</li>
<li>The factor’s <b>reserve and chargeback ledger</b> and the <b>funding statement</b> for the invoice.</li>
<li>The <b>bank deposit</b> itself.</li>
</ul>
<p>Line up <em>agreed</em> against <em>paid</em> on two tracks — the broker settlement against the rate confirmation, and the factoring funding against your agreement — and the gap lands in one track or the other, not a vague total.</p>

<h2>Why you keep the two apart</h2>
<p>A factoring fee is not a broker short-pay, and vice versa. Mix them and you can chase a broker over money your own factor kept, or write off a real short-pay as &ldquo;just the factoring fee.&rdquo; Keep two ledgers:</p>
<ul>
<li><b>Load vs broker settlement</b> — did the broker pay the rate confirmation amount, and is any deduction documented?</li>
<li><b>Invoice vs factoring deposit</b> — did the factor advance and settle according to your agreement?</li>
</ul>
<p>A gap in either ledger is a <b>flag to pull the paperwork</b>, not proof that anyone did anything wrong. This page is a plain-English explainer, not legal, financial or accounting advice.</p>
`,
  cta: { title: 'Check both gaps with Haul Audit', text: 'Haul Audit reconciles what you were promised against what you were paid — on the broker settlement <b>and</b> the factoring deposit — and keeps the two ledgers separate, so a factoring fee never hides a broker short-pay. It runs in your browser; the numbers you enter are not uploaded. Free to use.', href: TOOL, label: 'Open Haul Audit' },
  related: [
    { href: '/rate-con-checker/', title: 'Rate Con Checker', text: 'Paste a rate confirmation; 20 checks on detention, TONU, lumper, setoff and payment terms before you haul.' },
    { href: '/learn/rate-con/', title: 'Rate confirmation terms', text: 'Plain-English reference on the clauses a broker settlement turns on.' },
  ],
  sources: SOURCES, checked: CHECKED, ogImage: '/og.png',
  disclaimer: 'General educational information only — not legal, accounting, tax or financial advice. A variance is a reason to pull the paperwork, not proof of wrongdoing. Confirm every amount against your own rate confirmation, broker settlement and factoring agreement.',
};

export const ARTICLES = [EN];
export const HUB = { title: 'Factoring fee vs broker short-pay', path: EN.path, text: 'Why a factoring deduction and a broker short-pay look alike on a deposit, and how to tell them apart.' };
