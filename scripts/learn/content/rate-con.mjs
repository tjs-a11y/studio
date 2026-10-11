// Rate confirmation glossary. Every "what the checker does" statement matches the rule code in /rate-con-checker/index.html.
// Regulatory facts come only from 49 CFR text read on eCFR. No market rates are stated as facts.
import { ecfr, cfr } from './common.mjs';

const TOOL = { label: 'Quickwell Rate Con Checker, rule list (the 20 checks this glossary describes)', url: '/rate-con-checker/' };

export const SECTION = {
  path: '/learn/rate-con/',
  name: 'Rate con glossary',
  h1: 'Rate confirmation glossary: the terms that cost truckers money',
  title: 'Rate Confirmation Glossary for Truckers: TONU, Detention, Lumper, Setoff and More',
  description: 'Plain-English definitions of rate confirmation terms: detention, TONU, layover, lumper, setoff, quick pay, factoring and NOA, double brokering, claims and more, with what to ask a broker before you sign.',
  lang: 'en', crumbs: [{ name: 'Quickwell', path: '/' }, { name: 'Learn', path: '/learn/' }], termSet: true,
  lede: 'A rate confirmation is short, but a few lines in it decide whether a load makes money. This glossary explains each term in plain English, what the wording usually means, and what to ask the broker to change before you sign.',
  intro: `<p>Each entry covers one term carriers run into on broker rate cons: what it means, the wording to look for, what the <a href="/rate-con-checker/">Rate Con Checker</a> flags, and a sentence you can send the broker. Where a federal rule is relevant (hours of service, broker records, the broker bond, the cargo claims process), the entry quotes it from the Code of Federal Regulations and links to it. Where something is a business practice rather than a rule, such as factoring or quick pay, the entry says so.</p>
<p>The Rate Con Checker runs 20 rules over a pasted rate con, in your browser, and grades it. Every "what the checker flags" note in this glossary describes those rules exactly, including their default thresholds (for example: detention under $50 an hour, more than 2 free hours, payment terms over 30 days, a single fine of $500 or more). Those defaults are settings you can change in Pro, not industry standards.</p>
<p>Start with <a href="/learn/rate-con/rate-confirmation/">what a rate con is</a> if you're new to brokered freight. Otherwise jump to the term you're looking at.</p>`,
  cta: { title: 'Check a rate con in seconds', text: 'Paste a broker rate confirmation into the Rate Con Checker. It flags missing detention or TONU, fines, setoff, long payment terms and more, and drafts a fix request. Three free checks a day; nothing is uploaded.', href: '/rate-con-checker/', label: 'Open the Rate Con Checker' },
};

export const TERMS = [
// ---------------------------------------------------------------------------------------------
{ slug: 'rate-confirmation', term: 'Rate confirmation (rate con)', short: 'The load-level contract you sign with a broker.',
  title: 'What Is a Rate Confirmation? How to Read a Rate Con Before You Sign',
  description: 'A rate confirmation is the load-by-load contract between a carrier and a broker. Learn what it should contain, why the signed paper beats the phone call, and what to check first.',
  lede: 'A rate confirmation, or "rate con", is the short contract a freight broker sends a carrier for one load. It sets the price, the stops and the rules you agree to when you sign it.',
  body: `
<h2>What a rate con is</h2>
<p>When a broker books your truck, the price you agree on the phone is only a starting point. The broker then emails a rate confirmation. Once you sign and return it, that document is what both sides point to when there is a dispute about pay, waiting time, fines or a damaged load. Many brokers also have a longer broker-carrier agreement you signed when you set up with them; the rate con usually adds load-specific terms on top of it, and it can say that its own terms win where the two conflict.</p>
<p>Under federal rules a broker is a person who, for compensation, arranges or offers to arrange truck transportation by an authorized motor carrier (${cfr('371.2')}). The broker is not the shipper and is not your customer's agent in the same way a dispatcher is. That is why the paperwork between you matters: it is the only place your pay terms are written.</p>

<h2>What a complete rate con usually shows</h2>
<ul>
<li><b>Who:</b> broker legal name, MC and USDOT numbers, a phone number and an email address you can verify.</li>
<li><b>The load:</b> load or reference number, commodity, weight, equipment type, and for a reefer the temperature setting.</li>
<li><b>Where and when:</b> each pickup and delivery address with a set appointment or first-come, first-served window.</li>
<li><b>Money:</b> line haul, fuel (separate or all-in), and the accessorials: detention, layover, TONU, lumper, extra stops, driver assist.</li>
<li><b>Payment:</b> how many days after paperwork you get paid, what paperwork is needed, and any quick-pay fee.</li>
<li><b>Fine print:</b> fines or deductions, tracking requirements, claims handling, setoff, indemnity and where disputes are decided.</li>
</ul>

<h2>The signed paper beats the phone call</h2>
<p>The most common surprise is simple: the total on the rate con is lower than the number you agreed by phone, or an accessorial you discussed is missing. Read the total line before anything else. If it is wrong, ask for a corrected copy before you sign; a promise to "fix it on the back end" is not in writing.</p>
<p>Federal rules also give you a record to check after the fact. A broker must keep a record of each brokered shipment for three years, including the compensation it received and the freight charges it collected, and each party to the transaction has the right to review that record (${cfr('371.3')}).</p>

<h2>How the Rate Con Checker reads a rate con</h2>
<p>The checker runs 20 rules over the text you paste. It looks for the total rate and compares it with the rate you agreed (if you type it in), checks detention, TONU, layover and lumper language, finds fines and their dollar amounts, flags setoff and claims deductions, and reads payment terms. Each finding is marked red flag, flag, not found, OK or note. The score starts at 100 and drops 15 points per red flag, 6 per flag and 4 per item not found; 90 and up is an A. The grade is a quick reading aid, not a judgment of the broker.</p>
<p>The pages in this glossary explain each term the checker looks for, what the wording usually means, and what you can ask the broker to change.</p>`,
  related: ['detention', 'tonu', 'payment-terms', 'broker-verification'], sources: [ecfr('371.2', 'broker definition'), ecfr('371.3', 'broker records and right to review'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'detention', term: 'Detention', short: 'Pay for waiting past the free time at a shipper or receiver.',
  title: 'Detention Pay on a Rate Con: Free Time, Hourly Rate and Proof',
  description: 'What detention means on a rate confirmation, how free time and the hourly rate work, why waiting time eats your hours of service, and the exact wording to ask a broker for.',
  lede: 'Detention is what a broker pays the carrier when the truck is held at a shipper or receiver longer than the free time written on the rate con. If the rate con says nothing, you may wait for free.',
  body: `
<h2>How detention works</h2>
<p>Most rate cons that include detention set three things: <b>free time</b> (the hours the facility gets before detention starts), an <b>hourly rate</b> after that, and a <b>proof rule</b> (how arrival and departure are recorded). Some also cap the total, pay only in full-hour steps, or require the driver to call the broker before the free time runs out. Each of those details changes what you actually get paid.</p>
<p>Detention is set by the contract, not by a published rate. That is why the wording matters more than the dollar figure: "$40/hr after 2 hours" with no proof rule can turn into nothing if the receiver's sign-out sheet shows a different time.</p>

<h2>Why waiting costs more than the wait</h2>
<p>Waiting at a dock is not free time for the driver. Under the federal hours-of-service rules, on-duty time includes all time at a shipper's or carrier's facility waiting to be dispatched, and all time attending a truck while it is loaded or unloaded (${cfr('395.2', 'on-duty time, 49 CFR 395.2')}). A property-carrying driver also may not drive after the 14th consecutive hour after coming on duty (${cfr('395.3')}). So three hours at a receiver can mean three fewer hours to reach the next load, even if the clock on the rate con never started.</p>

<h2>Wording to look for</h2>
<ul>
<li><b>"Detention: $X/hr after Y hours free"</b>: the clean version. Check when "free" starts: arrival, appointment time, or check-in.</li>
<li><b>"With broker approval"</b> or <b>"must be requested within 24 hours"</b>: conditions that can cancel the pay if you miss a step. Put a reminder on your phone.</li>
<li><b>"Detention paid only if the shipper pays"</b>: your pay depends on someone you don't have a contract with.</li>
<li><b>No mention at all</b>: the facility can hold you as long as it likes without anyone owing you anything under this paper.</li>
</ul>

<h2>What the Rate Con Checker flags</h2>
<p>If the word "detention" never appears, the checker marks a <b>red flag</b>. If detention is mentioned without an hourly rate, it is a <b>flag</b>. If there is a rate, the checker compares it with your minimums: by default it flags a rate under $50 an hour or more than 2 free hours. Those defaults are settings, not industry standards; Pro users set their own numbers.</p>

<h2>What to ask for</h2>
<blockquote>Please add detention of $[rate]/hr after [N] hours free, starting at check-in, paid in 15-minute increments.</blockquote>
<p>Then protect the proof: get in and out times on the bill of lading or the facility's sign-out sheet, keep your ELD location record, and send the broker a message with a timestamp when you arrive and when the free time ends.</p>`,
  related: ['layover', 'fcfs-vs-appointment', 'accessorial', 'driver-assist'], sources: [ecfr('395.2', 'definition of on-duty time'), ecfr('395.3', '14-hour limit'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'tonu', term: 'TONU (truck ordered, not used)', short: 'A flat fee when a load is cancelled after you are dispatched.',
  title: 'TONU Meaning in Trucking: Truck Ordered Not Used Fee Explained',
  description: 'TONU means truck ordered, not used: a flat fee a broker pays when a load is cancelled after the carrier is dispatched. What to look for in the wording and how to make it enforceable.',
  lede: 'TONU stands for "truck ordered, not used". It is a flat fee the broker pays when a load you were booked on is cancelled after you have been dispatched or have already arrived at the shipper.',
  body: `
<h2>Why TONU exists</h2>
<p>Once a truck is dispatched, the carrier has spent money: deadhead miles, fuel, driver hours, and often another load turned down. If the shipper cancels, the freight never moves and the line haul is never earned. TONU is the only pay that trip will produce. Without it in writing, the usual answer to "who pays for my empty miles?" is nobody.</p>

<h2>What makes a TONU clause worth something</h2>
<ul>
<li><b>A fixed dollar amount.</b> "TONU: $X" is clear. "TONU may be paid" or "TONU at broker discretion" is a promise to think about it.</li>
<li><b>A clear trigger.</b> Does it apply once you are dispatched, only once you arrive, or only if you are "on site and checked in"? A narrow trigger means a cancellation an hour before arrival pays nothing.</li>
<li><b>No dependency on the shipper.</b> Some clauses say TONU is paid only if the shipper pays the broker. That puts your pay in a contract you are not part of.</li>
<li><b>Proof you can produce.</b> Keep the dispatch time, your location record and the cancellation message. A text that says "load cancelled" with a timestamp is often the whole case.</li>
</ul>

<h2>TONU versus layover and detention</h2>
<p>TONU covers a load that never moves. Detention covers waiting past free time on a load that does move. Layover covers being held overnight or into the next day. One trip can involve more than one of them, for example a long wait followed by a cancellation, and a rate con can address each separately.</p>

<h2>What the Rate Con Checker flags</h2>
<p>If the rate con has no TONU language (it looks for "TONU" or "truck ordered not used"), the checker marks a <b>flag</b>. If TONU appears near words like "discretion", "may be paid" or "if approved", it is also a <b>flag</b>, because the fee may never be paid. If TONU is written with a dollar amount, the checker shows the amount as OK.</p>

<h2>What to ask for</h2>
<blockquote>Please add a TONU of $[amount] if the load is cancelled after dispatch.</blockquote>
<p>The checker's fix-request message suggests $250 as a starting number. That figure is a placeholder you can change, not a market rate: what is reasonable depends on how far you deadheaded and what you gave up to take the load. Ask for the amount in writing before you roll, because once you are dispatched you have less leverage.</p>

<h2>If a load is cancelled</h2>
<p>Ask for the cancellation in writing, send your TONU invoice with the rate con attached, and keep both. If the broker refuses, your signed rate con with a fixed TONU amount is what turns an argument into an unpaid invoice you can pursue.</p>`,
  related: ['layover', 'detention', 'accessorial', 'rate-confirmation'], sources: [TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'layover', term: 'Layover', short: 'Pay when the truck is held overnight or into the next day.',
  title: 'Layover Pay in Trucking: What It Covers and How to Write It on a Rate Con',
  description: 'Layover pay compensates a carrier when a truck is held overnight or a load is pushed to the next day. How it differs from detention, how it interacts with hours of service, and what to ask for.',
  lede: 'Layover is a daily payment for a truck that is held overnight, or whose pickup or delivery is pushed to another day, through no fault of the carrier.',
  body: `
<h2>When layover applies</h2>
<p>Typical cases: the receiver can't unload today and gives a new appointment tomorrow; the shipper's freight isn't ready and the pickup moves a day; or a load is held for paperwork. The truck sits, the driver can't take another load, and the day's revenue is gone. Layover pays for that lost day. Detention, by contrast, pays by the hour for waiting within the same day.</p>
<p>The difference matters because some rate cons pay detention but are silent on layover. A truck can sit through the night, start fresh the next morning, and the broker can argue that detention "reset". A separate layover line removes that argument.</p>

<h2>How layover connects to hours of service</h2>
<p>Under federal hours-of-service rules, a property-carrying driver needs 10 consecutive hours off duty before driving again, may not drive after the 14th hour on duty, and may not drive after 60 hours in 7 days or 70 hours in 8 days, depending on the carrier's schedule (${cfr('395.3')}). A day held at a receiver is often logged off duty, which can actually help the driver's hours, but it still costs the carrier a day of revenue. Layover pay is about money, not legality.</p>

<h2>Wording to look for</h2>
<ul>
<li><b>"Layover: $X per day"</b>, ideally with what counts as a day (each calendar day, or each 24 hours after the original appointment).</li>
<li><b>Exclusions</b>: "no layover if the carrier missed the appointment" is fair; "layover at broker discretion" is not a commitment.</li>
<li><b>Proof</b>: the receiver's rescheduled appointment, in writing, is the key document. Ask for it by email.</li>
<li><b>Interaction with detention</b>: does detention stop when layover starts? Does it restart the next morning? Clear rate cons say.</li>
</ul>

<h2>What the Rate Con Checker flags</h2>
<p>The checker searches for the word "layover". If it is there, it marks layover as addressed (OK). If not, it shows <b>not found</b>, which lowers the score by 4 points. It doesn't judge the amount, because layover amounts vary with equipment and lane.</p>

<h2>What to ask for</h2>
<blockquote>Please add layover of $[amount]/day if the truck is held overnight.</blockquote>
<p>The checker's message uses $250 per day as an editable placeholder, not a quoted market rate. Whatever number you choose, ask for it before the load, not after the receiver turns you away. Once you're sitting in a lot, your leverage is gone.</p>

<h2>Keep the paper trail</h2>
<p>Save the original appointment, the message that moved it, your arrival time and the new appointment. If layover is paid "upon proof", that set of four timestamps is the proof.</p>`,
  related: ['detention', 'tonu', 'fcfs-vs-appointment', 'accessorial'], sources: [ecfr('395.3', 'hours-of-service limits'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'lumper', term: 'Lumper fee', short: 'Unloading fees paid at the dock, and who pays them back.',
  title: 'Lumper Fees on a Rate Con: Who Pays and How Reimbursement Works',
  description: 'A lumper is a third-party crew that unloads trucks at a warehouse. Learn how lumper fees are paid, the rate con wording that makes them your cost, and how to get reimbursed quickly.',
  lede: 'A lumper is a third-party crew a receiver uses to unload trucks. The carrier often has to pay the lumper at the dock, so the question that matters is whether, and how fast, the broker pays it back.',
  body: `
<h2>How lumper payments usually work</h2>
<p>At many grocery and retail warehouses the driver doesn't unload, and neither do the receiver's employees: a lumper service does, and it wants payment before the truck leaves. The broker typically provides the money (often through a fuel-card check code or a direct payment) or asks the carrier to pay and send the receipt for reimbursement. Either way, the rate con decides who ends up bearing the cost.</p>
<p>Lumper charges vary a lot by facility and load. The Rate Con Checker's help text gives $100 to $400 as an illustration of the range drivers report; treat that as anecdotal, not a measured average.</p>

<h2>Wording that changes who pays</h2>
<ul>
<li><b>"Lumper reimbursed with receipt"</b>: the normal arrangement. Check the deadline for sending the receipt and whether reimbursement is paid with the freight bill (net 30 or longer) or separately.</li>
<li><b>"Broker will provide lumper payment"</b> or a fuel-card check code: the best case, since you aren't floating the money.</li>
<li><b>"Carrier is responsible for lumper fees"</b> or <b>"lumper at carrier's expense"</b>: you pay and keep the cost. Price the load accordingly or ask for it to be removed.</li>
<li><b>Silence</b>: no one has agreed to anything. Ask before you go if the receiver uses lumpers.</li>
</ul>

<h2>Unloading time is on-duty time</h2>
<p>Even when a lumper does the work, the driver is usually waiting with the truck. Federal rules count time attending a vehicle being loaded or unloaded, and time giving or receiving receipts for the shipment, as on-duty time (${cfr('395.2', 'on-duty time, 49 CFR 395.2')}). Long lumper lines therefore cost hours as well as dollars; that's where detention terms come in.</p>

<h2>What the Rate Con Checker flags</h2>
<ul>
<li>Lumper near "carrier is responsible", "at carrier's cost or expense" or "not reimbursed": <b>red flag</b>.</li>
<li>Lumper mentioned without reimbursement language: <b>flag</b>.</li>
<li>Lumper with "reimburse", "paid by broker", "advance", Comchek or EFS nearby: <b>OK</b>.</li>
<li>No lumper mention: a <b>note</b> reminding you to ask, since many loads don't need one.</li>
</ul>

<h2>What to ask for</h2>
<blockquote>Please confirm lumper fees are reimbursed in full within 24 hours of receiving the receipt.</blockquote>
<p>Get the receipt with the lumper company's name, the amount, the date and the load or PO number. Photograph it before you leave the dock and send it the same day. A receipt sent a week late is the easiest one for a broker to dispute.</p>`,
  related: ['accessorial', 'detention', 'driver-assist', 'quick-pay'], sources: [ecfr('395.2', 'on-duty time includes loading and unloading'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'accessorial', term: 'Accessorial charges', short: 'Everything paid on top of line haul: detention, layover, TONU, lumper, stops.',
  title: 'Accessorial Charges in Trucking: The Extras That Belong on Your Rate Con',
  description: 'Accessorials are the charges on top of line haul: detention, layover, TONU, lumper, extra stops, driver assist and more. Why they must be written on the rate con and how to get them paid.',
  lede: 'An accessorial is any charge on top of the line-haul rate: detention, layover, TONU, lumper, extra stops, driver assist, tarping and similar extras. If an accessorial isn\'t on the rate con, getting paid for it becomes a negotiation after the fact.',
  body: `
<h2>Line haul versus accessorials</h2>
<p>Line haul is the price for moving the freight from A to B. Accessorials pay for the things that happen around the move: waiting, extra stops, unloading help, cancellations, special equipment. On a good rate con each one has its own line with an amount or a formula. On a weak one they are missing, or covered by a single sentence such as "accessorials must be approved in advance".</p>

<h2>Common accessorials</h2>
<div class="tbl"><table>
<tr><th>Accessorial</th><th>What it pays for</th></tr>
<tr><td><a href="/learn/rate-con/detention/">Detention</a></td><td>Waiting past free time, by the hour</td></tr>
<tr><td><a href="/learn/rate-con/layover/">Layover</a></td><td>A truck held overnight or to another day</td></tr>
<tr><td><a href="/learn/rate-con/tonu/">TONU</a></td><td>A load cancelled after dispatch</td></tr>
<tr><td><a href="/learn/rate-con/lumper/">Lumper</a></td><td>Third-party unloading fees, reimbursed</td></tr>
<tr><td><a href="/learn/rate-con/driver-assist/">Driver assist</a></td><td>Driver loading, unloading or counting freight</td></tr>
<tr><td>Stop-off charge</td><td>Each extra pickup or delivery stop</td></tr>
<tr><td><a href="/learn/rate-con/fuel-surcharge/">Fuel surcharge</a></td><td>Fuel cost, when listed apart from line haul</td></tr>
</table></div>

<h2>Why "approved in advance" matters</h2>
<p>Many rate cons say accessorials are paid only if the carrier requests them during the load, sometimes within a fixed time, and only with proof. That's not unreasonable on its face, but it means a driver who doesn't call at the right moment can lose the charge. Find the rule, write down the deadline and the contact, and send requests in writing so you have a timestamp.</p>

<h2>Checking what the broker was paid</h2>
<p>Federal rules require a broker to keep a record of each brokered shipment for three years, showing among other things the compensation it received for the brokerage service and the freight charges it collected, and they give each party to the transaction the right to review that record (${cfr('371.3')}). Carriers sometimes ask for this record when they believe the shipper paid an accessorial that was never passed on.</p>

<h2>What the Rate Con Checker looks at</h2>
<p>The checker doesn't add up accessorials as a group. It checks the main ones individually: detention, TONU, layover, lumper, driver labor and fuel. Each has its own finding, so a rate con with a good line haul but no accessorial language will collect several flags and a lower grade. That's deliberate: missing accessorials are where much of a load's real cost hides.</p>

<h2>Practical habit</h2>
<p>Before you sign, list each accessorial you expect for this load: likely wait times, number of stops, whether the receiver uses lumpers, whether the driver has to touch freight. Then check each one against the paper. Whatever isn't written, ask for in one message before you dispatch.</p>`,
  related: ['detention', 'tonu', 'lumper', 'driver-assist'], sources: [ecfr('371.3', 'broker records and right to review'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'fuel-surcharge', term: 'Fuel surcharge (FSC)', short: 'A separate fuel line versus an all-in rate.',
  title: 'Fuel Surcharge on a Rate Con: All-In Rate vs. Separate FSC Line',
  description: 'What a fuel surcharge (FSC) line means on a broker rate confirmation, how it differs from an all-in rate, and how to compare loads fairly per mile when fuel is included.',
  lede: 'A fuel surcharge (FSC) is a separate line that pays for fuel on top of the line-haul rate. On many spot loads there is no separate line: the rate is "all-in", and fuel is your problem.',
  body: `
<h2>Two ways to pay for fuel</h2>
<p><b>Separate fuel line.</b> The rate con shows line haul and fuel surcharge as two amounts. When the surcharge follows a published schedule tied to diesel prices, the carrier is protected if fuel rises between booking and delivery. On a single spot load the surcharge is often just a fixed number, which mostly matters for how the total is presented and taxed in your books.</p>
<p><b>All-in rate.</b> The rate con says "fuel included", "all-in" or shows fuel as $0. Everything is in one number. That isn't wrong, but you have to do the fuel math yourself before you accept.</p>

<h2>How to compare loads fairly</h2>
<p>Compare every load on the same basis: total pay divided by total miles, including deadhead. A load at a high line-haul rate plus a small fuel line and a load at a slightly higher all-in rate can pay the same. The Rate Con Checker does this for you when you type loaded and deadhead miles: it shows the all-in rate per loaded mile and per total mile, and Pro users can set a minimum rate per mile that turns a cheap load into a red flag.</p>

<h2>Wording to look for</h2>
<ul>
<li><b>"FSC: $X"</b> or <b>"Fuel: $X"</b> next to the line haul: a separate fuel line.</li>
<li><b>"Fuel surcharge: included"</b>, <b>"all-in"</b>: no separate fuel money.</li>
<li><b>"FSC per [schedule]"</b> or a percentage: ask which schedule and which week's diesel price it uses.</li>
<li><b>Fuel advances</b>: a different thing. An advance is a loan against your pay, usually with a fee, not extra money.</li>
</ul>

<h2>What the Rate Con Checker flags</h2>
<p>Fuel never costs points. If the checker finds "fuel surcharge", "fuel SC" or "FSC" followed by a dollar amount and not followed by "included", "incl" or "all-in", it marks the fuel line OK. If it finds fuel marked as included, or no fuel line at all, it adds a <b>note</b> saying the rate is all-in, so you remember to compare per mile. It doesn't suggest a fix-request line for fuel, because an all-in rate is a pricing choice, not a contract defect.</p>

<h2>The total is what gets paid</h2>
<p>Whatever the split, the number that matters is the total carrier pay on the signed rate con. Check that the line haul plus fuel plus any listed accessorials add up to the total shown, and that the total matches what you agreed by phone. Arithmetic errors happen, and the checker's "rate matches what you agreed" rule exists for exactly that reason.</p>`,
  related: ['rate-confirmation', 'accessorial', 'quick-pay', 'payment-terms'], sources: [TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'quick-pay', term: 'Quick pay', short: 'Faster payment in exchange for a fee.',
  title: 'Quick Pay in Trucking: What the Fee Really Costs You',
  description: 'Quick pay lets a carrier get paid by the broker in days instead of 30 to 45 days, for a percentage fee. How to calculate the true cost, what to read in the terms, and how it compares with factoring.',
  lede: 'Quick pay is a broker\'s offer to pay you faster than the standard terms, usually within a few days of paperwork, in exchange for a percentage taken off the invoice.',
  body: `
<h2>How quick pay works</h2>
<p>A rate con might say "Net 30 from receipt of POD. Quick pay available at 3%." If you choose quick pay, the broker pays sooner and keeps 3% of the invoice. On a $2,000 load that is $60. The question is whether getting the money roughly a month earlier is worth that.</p>

<h2>Turning the fee into a yearly rate</h2>
<p>A small percentage over a short time is an expensive loan. A simple way to see it (an <b>estimate</b>, ignoring compounding): divide the fee by the number of days you gain, then multiply by 365.</p>
<ul>
<li>3% to be paid 28 days sooner: 3 ÷ 28 × 365 ≈ <b>39% a year</b>.</li>
<li>5% to be paid 40 days sooner: 5 ÷ 40 × 365 ≈ <b>46% a year</b>.</li>
</ul>
<p>That doesn't make quick pay wrong. If cash is what keeps the truck moving, a known fee can beat a missed fuel stop or a late truck payment. But it is worth knowing the real price, and comparing it with factoring or a line of credit.</p>

<h2>What to read in the quick-pay terms</h2>
<ul>
<li><b>When the clock starts</b>: from receipt of "clean" paperwork, which the broker defines.</li>
<li><b>Whether the fee is on the full invoice</b> or only line haul, and whether accessorials paid later also lose the fee.</li>
<li><b>Whether quick pay is automatic</b> unless you opt out. Some setups default to it.</li>
<li><b>Whether it conflicts with your factoring company.</b> If you've assigned your invoices (a notice of assignment), the broker must pay the factor, not you.</li>
</ul>

<h2>What the Rate Con Checker flags</h2>
<p>The quick-pay fee is read as part of the payment-terms rule. If the checker finds "quick pay" followed by a percentage, it adds the fee to the payment-terms finding. With otherwise acceptable terms, a quick-pay fee <b>above 3%</b> turns the finding into a <b>flag</b>. Payment terms of 45 days or more are a red flag regardless of quick pay, because the fee then works as a charge for being paid on time.</p>

<h2>Payment records</h2>
<p>Federal rules require brokers to record, for each shipment, the freight charges they collected and the date they paid the carrier, and to keep the record for three years; each party has the right to review it (${cfr('371.3')}). If you think you were charged a quick-pay fee you didn't choose, that record is a place to start.</p>

<h2>What to ask for</h2>
<blockquote>Please confirm payment within [N] days of receiving POD/BOL, with no quick-pay fee.</blockquote>`,
  related: ['payment-terms', 'factoring-noa', 'setoff', 'rate-confirmation'], sources: [ecfr('371.3', 'broker records: freight charges collected and date paid to carrier'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'factoring-noa', term: 'Factoring and notice of assignment (NOA)', short: 'Selling your invoices, and telling the broker who to pay.',
  title: 'Freight Factoring and the Notice of Assignment (NOA) Explained',
  description: 'How freight factoring works, what a notice of assignment (NOA) does, why a broker may refuse to pay you directly, and the rate con clauses that interact with factoring.',
  lede: 'Factoring means selling your freight invoices to a factoring company for cash now. The notice of assignment (NOA) is the letter that tells the broker to pay the factor instead of you.',
  body: `
<h2>How factoring works</h2>
<p>You deliver the load and send the paperwork to your factoring company. The factor advances most of the invoice to you within a day or two, then collects the full amount from the broker on the broker's normal terms. When the broker pays, the factor keeps its fee and, under many agreements, releases any reserve it held back. The details (advance percentage, fee, reserve, who absorbs a broker's non-payment) are in your factoring agreement, not in any federal rule.</p>
<p><b>Recourse</b> factoring means you owe the money back if the broker doesn't pay. <b>Non-recourse</b> usually covers only a broker's insolvency, not disputes about the load. Read the definition in your own agreement; the words are used loosely.</p>

<h2>What the NOA does</h2>
<p>An NOA is a letter, usually signed by you and the factor, telling the broker that your invoices have been assigned and must be paid to the factor's account. After a broker receives it, paying you directly may not clear its debt to the factor, so many brokers will refuse direct payment, or quick pay, until the NOA is released. That is a common source of confusion when a carrier changes factoring companies: the old NOA has to be released in writing before the broker will pay the new one.</p>

<h2>Rate con clauses that interact with factoring</h2>
<ul>
<li><b>Setoff</b>: if a broker may deduct claims from "any amount owed to carrier", it may try to deduct them from invoices you've sold. Your factor will care, and your factoring agreement may make it your problem. See <a href="/learn/rate-con/setoff/">setoff</a>.</li>
<li><b>Claims deductions</b>: the same issue, specifically for cargo claims. See <a href="/learn/rate-con/cargo-claims/">cargo claims</a>.</li>
<li><b>Quick pay</b>: often unavailable on factored invoices, or available only to the factor.</li>
<li><b>Paperwork deadlines</b>: "invoices must be received within X days" applies to the factor too. A late upload can turn into a fine or a lost invoice.</li>
<li><b>Credit approval</b>: factors check broker credit. If your factor won't buy invoices from a broker, that's useful information before you book.</li>
</ul>

<h2>What the Rate Con Checker does and doesn't do</h2>
<p>The checker has no factoring rule: it doesn't read NOA language. But three of its rules matter directly to factored carriers: the <b>setoff</b> rule (any "set-off" or "offset" wording is a red flag), the <b>claims</b> rule (claims deductible from freight pay is a red flag) and the <b>payment terms</b> rule (45 days or more is a red flag). Factors price their fees partly on how long brokers take to pay, so long terms cost factored carriers too.</p>

<h2>Practical steps</h2>
<p>Send each new broker your NOA before the first load, ask them to confirm they've updated the remit-to, and keep that confirmation. When you leave a factor, get a written release and send it to every broker you work with.</p>`,
  related: ['quick-pay', 'payment-terms', 'setoff', 'cargo-claims'], sources: [TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'double-brokering', term: 'Double brokering', short: 'A carrier re-brokering a load it agreed to haul.',
  title: 'Double Brokering: What It Is and How to Spot It on a Rate Con',
  description: 'Double brokering is when a load is passed on to another carrier without authority or consent. What federal rules say about brokers, the $75,000 broker bond, and warning signs on a rate con.',
  lede: '"Double brokering" is the trucking name for a load that gets passed on again: a carrier, or someone posing as one, takes a load and hands it to another carrier without the authority or the shipper\'s or broker\'s consent. The truck that hauls it often doesn\'t get paid.',
  body: `
<h2>Why it is a problem</h2>
<p>In the usual scheme, a party books a load from a real broker, re-posts it to a load board at a lower rate, and books a second carrier, sometimes using another company's name and MC number. The real broker pays the first party, who disappears. The carrier that actually hauled the freight is left with a signed rate con from a company that has no money and may not exist.</p>

<h2>What the federal definition says</h2>
<p>Federal rules define a broker as a person who, for compensation, arranges or offers to arrange transportation of property by an authorized motor carrier. Motor carriers are not brokers when they arrange transportation of shipments they are authorized to transport <em>and</em> have accepted and legally bound themselves to transport (${cfr('371.2')}). A broker may not offer brokerage service in any name other than the one its registration is issued in, and may not represent its operation as a carrier (${cfr('371.7')}).</p>
<p>A registered property broker must also have a $75,000 surety bond (Form BMC-84) or trust fund (Form BMC-85) in effect; FMCSA won't register a broker until it is, and it exists to pay shippers or motor carriers if the broker fails to carry out its contracts (${cfr('387.307')}). A party without broker authority has no such bond behind it.</p>

<h2>Warning signs on a rate con</h2>
<ul>
<li>The company name, MC number, phone or email on the rate con don't match the public FMCSA record for that MC.</li>
<li>Contact uses a free email domain (Gmail, Yahoo, Outlook) while claiming to be an established brokerage.</li>
<li>The "broker" is listed as a carrier, or the rate con has a carrier's MC but asks you to haul under its name.</li>
<li>Pressure to sign within minutes, no load number from the shipper, or instructions not to contact the shipper or receiver.</li>
<li>A rate well above the lane's going rate with fast-pay promises.</li>
</ul>

<h2>What the Rate Con Checker flags</h2>
<p>The checker's <b>broker identity</b> rule pulls the MC and DOT numbers from the text and gives you one-click links to the FMCSA SAFER record. A free email domain in the rate con is a <b>red flag</b>; no MC or DOT number at all is a <b>flag</b>. Its <b>sign-by</b> rule flags demands to sign within a set number of minutes or hours. None of this proves fraud; it tells you what to verify.</p>

<h2>How to protect yourself</h2>
<p>Call the broker on the phone number in the FMCSA record, not the one on the email, and confirm the load number. Check that the authority is active and a bond or trust is on file. If anything doesn't match, don't haul it until it does. If you've already delivered and aren't paid, the broker's bond or trust fund is one avenue; claims rules and deadlines are in 49 CFR 387.307.</p>`,
  related: ['broker-verification', 'sign-by-deadline', 'rate-confirmation', 'setoff'], sources: [ecfr('371.2', 'broker definition'), ecfr('371.7', 'misrepresentation'), ecfr('387.307', 'broker $75,000 surety bond or trust fund'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'setoff', term: 'Setoff (offset) clause', short: 'Taking money from one load\'s pay to cover another.',
  title: 'Setoff and Offset Clauses in Broker Rate Cons: What They Allow',
  description: 'A setoff or offset clause lets a broker deduct money it claims you owe from pay on other loads, including disputed claims. Why it is risky, wording to watch for, and what to ask for instead.',
  lede: 'A setoff (or offset) clause lets the broker take money it says you owe, for example a cargo claim or a fine, out of the pay for this load or any other load. The money can be taken before anyone has agreed the claim is valid.',
  body: `
<h2>What a setoff clause looks like</h2>
<blockquote>Broker may offset any amounts owed to broker by carrier against freight charges due to carrier on this or any other shipment, including cargo claims.</blockquote>
<p>The key words are "offset", "set-off", "against any amounts due" and "this or any other shipment". Together they let a broker hold back your pay on a clean load to cover a dispute on a different one.</p>

<h2>Why it matters</h2>
<ul>
<li><b>Earned pay becomes collateral.</b> You can deliver three loads on time and still be paid nothing because of a claim on a fourth.</li>
<li><b>The broker decides the amount.</b> Unless the clause limits it, the broker can set off the amount it claims, not an amount anyone has proven or agreed.</li>
<li><b>It reaches factored invoices.</b> If you factor, a setoff against "amounts due to carrier" can collide with your factoring agreement, which may require you to make the factor whole.</li>
<li><b>It flips who has to sue.</b> Without setoff, a broker with a claim has to pursue you. With setoff, you have to pursue the broker to recover your own freight pay.</li>
</ul>

<h2>How claims are supposed to work</h2>
<p>Federal claims rules for carriers describe a written claim process: a claim must identify the shipment, assert liability and ask for a specific or determinable amount; notes on a delivery receipt or an inspection report alone don't count as a claim (${cfr('370.3')}). A carrier must acknowledge a claim within 30 days and pay, decline or make a firm settlement offer within 120 days (${cfr('370.5')}, ${cfr('370.9')}). A setoff clause lets money move before that process runs. See <a href="/learn/rate-con/cargo-claims/">cargo claims</a> for more.</p>

<h2>What the Rate Con Checker flags</h2>
<p>Any "set-off", "setoff" or "offset" wording is a <b>red flag</b> (15 points off the score), whatever surrounds it. The checker is strict on purpose: setoff is one of the most common ways carriers lose pay they've already earned. A separate claims rule also flags claims deductible "from freight" even when the word "offset" isn't used.</p>

<h2>What to ask for</h2>
<blockquote>Please strike the setoff/offset language. Any claim should be handled separately, not taken from freight pay.</blockquote>
<p>If the broker won't strike it, narrower versions are better than nothing: limit setoff to this load only, to amounts both parties have agreed in writing, or to final judgments. Get any change in a revised rate con, not an email that says "don't worry about it".</p>`,
  related: ['cargo-claims', 'fines-deductions', 'factoring-noa', 'indemnity'], sources: [ecfr('370.3', 'filing of claims'), ecfr('370.5', 'acknowledgment of claims'), ecfr('370.9', 'disposition of claims'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'fines-deductions', term: 'Fines, deductions and chargebacks', short: 'Penalties taken out of your pay.',
  title: 'Rate Con Fines and Chargebacks: Late Fees, Paperwork Fines and Deductions',
  description: 'Fines and chargebacks on rate confirmations: late-delivery penalties, missing-paperwork deductions, tracking fines. How to find every dollar amount before you sign and what to ask a broker to remove.',
  lede: 'Many rate cons list fines that are taken out of your pay: late delivery, missed check calls, tracking gaps, missing paperwork, late invoices. Each one may look small; together they can wipe out a load\'s profit.',
  body: `
<h2>Where fines hide</h2>
<p>Fines are usually in the fine print below the rates, or in a "carrier requirements" block that's the same on every load. Common examples:</p>
<ul>
<li>Late pickup or delivery, per hour or as a flat amount.</li>
<li>Missing or late bill of lading (BOL) or proof of delivery (POD).</li>
<li>Tracking not active or turned off; see <a href="/learn/rate-con/tracking-apps/">tracking requirements</a>.</li>
<li>Missed <a href="/learn/rate-con/check-calls/">check calls</a>.</li>
<li>Re-consignment, unapproved stops, or "service failure".</li>
<li>Chargebacks passed through from the shipper or receiver.</li>
</ul>

<h2>Add them up before you sign</h2>
<p>Read the fines as if every one applied. In the checker's sample rate con, a $250 tracking fine, $150 per hour late and a $100 paperwork deduction appear in three different paragraphs. One bad day at a receiver could cost more than the load's margin. Knowing the total turns a vague worry into a number you can negotiate.</p>

<h2>Fines versus actual losses</h2>
<p>A fine is a fixed amount set in advance. An actual loss is a cost someone can show, such as a receiver's documented charge for a missed appointment. Many carriers accept being responsible for documented losses they caused while pushing back on fixed penalties. Asking "what loss does this fine cover?" is a fair question.</p>

<h2>What the Rate Con Checker flags</h2>
<p>The checker looks for "fine", "penalty", "deduct", "chargeback" or "withhold" within a short distance of a dollar amount, on either side. It lists how many fines it found, the largest, and the total if all applied.</p>
<ul>
<li>Largest fine at or above your maximum (default <b>$500</b>; Pro users set their own): <b>red flag</b>.</li>
<li>Fines found below that: <b>flag</b>.</li>
<li>Penalty language with no dollar amount: <b>flag</b>, because you can't price it.</li>
<li>None found: OK.</li>
</ul>
<p>Text extraction isn't perfect. A fine written as "two hundred fifty dollars", or split across lines in a PDF, can slip past. Always read the fine print yourself.</p>

<h2>What to ask for</h2>
<blockquote>Please remove or cap the fines listed above. I can't agree to deductions that aren't tied to an actual documented loss.</blockquote>
<p>If a fine stays, ask for the condition to be specific. "Late" should mean after the appointment time plus a grace period, measured by the facility's check-in record, not "late in broker's judgment". And check whether fines can be taken from other loads; if so, that's a <a href="/learn/rate-con/setoff/">setoff</a> problem too.</p>`,
  related: ['setoff', 'tracking-apps', 'check-calls', 'cargo-claims'], sources: [TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'check-calls', term: 'Check calls', short: 'Status updates the broker requires during the load.',
  title: 'Check Calls on a Rate Con: Requirements, Penalties and Safe Practice',
  description: 'Check calls are the status updates a broker requires during a load. What rate cons typically demand, how check-call penalties work, and the federal hand-held phone and texting rules drivers must follow.',
  lede: 'A check call is a status update the broker expects at set points: loaded, departed, at a set time each day, arrived. Some rate cons tie missed check calls to fines.',
  body: `
<h2>What rate cons ask for</h2>
<p>Requirements vary: a call or message at pickup, at departure, once each morning, two hours before delivery, and on arrival. Some brokers accept an automatic tracking link instead; others want both. The useful details to pin down are who to contact, by what method (call, text, app, email), and what happens if the person doesn't answer.</p>

<h2>When check calls become a penalty</h2>
<p>A requirement to keep the broker informed is reasonable. A fixed fine for each missed call is different: it is charged even when the load is on time and nothing went wrong. Check-call fines are also hard to dispute, because the broker's own log is usually the only record. If you must make check calls, make them by text or in the broker's app so you have a timestamp.</p>

<h2>Check calls and the phone rules</h2>
<p>Federal rules prohibit a commercial driver from texting while driving and from using a hand-held mobile phone while driving, and they prohibit motor carriers from allowing or requiring either (${cfr('392.80')}, ${cfr('392.82')}). "Driving" includes being temporarily stopped in traffic or at a light; it doesn't include being pulled off the road where the truck can safely stay. A driver convicted twice within three years of the texting or hand-held phone rule is disqualified from driving a CMV for 60 days, and for 120 days after three or more (${cfr('391.15')}). A check-call schedule should leave room to stop safely, or use automatic tracking instead.</p>

<h2>What the Rate Con Checker flags</h2>
<p>The checker looks for "check call" near words like "fine", "penalty", "deduct" or a dollar amount. If they appear together, it's a <b>flag</b>. A check-call requirement without a penalty is just a <b>note</b>, since keeping the broker informed is normal.</p>

<h2>What to ask for</h2>
<blockquote>Please remove penalties for check calls.</blockquote>
<p>If the broker needs updates, offer a tracking link or a fixed number of messages at stops. Those are easier to prove than phone calls and don't pull the driver onto the phone while moving.</p>

<h2>Keep your own record</h2>
<p>Save every update you send, with the time. If a fine shows up on your settlement, your messages and your ELD location history are the evidence that the update was made, or that the load was on time anyway.</p>`,
  related: ['tracking-apps', 'fines-deductions', 'fcfs-vs-appointment', 'sign-by-deadline'], sources: [ecfr('392.80', 'texting prohibition'), ecfr('392.82', 'hand-held mobile phone'), ecfr('391.15', 'disqualification for texting and hand-held phone convictions'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'tracking-apps', term: 'Tracking app requirements', short: 'MacroPoint, Trucker Tools, FourKites, project44, and the fines tied to them.',
  title: 'Tracking App Requirements on Rate Cons (MacroPoint, Trucker Tools, FourKites)',
  description: 'Why brokers require tracking apps like MacroPoint, Trucker Tools, FourKites or project44, how tracking fines work, and what to ask for so a tracking gap doesn\'t cost you an on-time load.',
  lede: 'Many brokers require the driver to stay on a tracking app or link for the whole load. That\'s often reasonable. The problem is a fixed fine for a "tracking failure" that is charged even when the load arrives on time.',
  body: `
<h2>Why brokers ask for tracking</h2>
<p>Shippers want to know where their freight is without calling anyone. Tracking platforms let the broker share the truck's location from the driver's phone or the truck's ELD. For the carrier, a working tracking link can replace most <a href="/learn/rate-con/check-calls/">check calls</a>, which is a real time saver.</p>

<h2>Where it goes wrong</h2>
<ul>
<li><b>Phone apps drop out</b>: dead zones, battery saver, an operating-system update or the app being closed can stop pings without the driver noticing.</li>
<li><b>"Must remain on tracking for the entire load"</b> makes any gap a breach, even an hour in a dead zone.</li>
<li><b>Flat fines</b> ("failure to track will result in a $250 fine") are charged per load, not per hour late, and are independent of whether the freight was on time.</li>
<li><b>Privacy</b>: some apps keep tracking after delivery unless the load is closed. Check the app's settings and close the load when you're done.</li>
</ul>

<h2>Practical setup</h2>
<p>If the broker supports ELD-based tracking, it's usually more reliable than a phone app. If you use the phone, exempt the app from battery optimization, keep the phone charging, and screenshot the "tracking active" screen at pickup. If tracking drops, message the broker right away with your location so the gap is documented.</p>

<h2>Phones and the driver</h2>
<p>Tracking shouldn't require handling the phone while driving. Federal rules prohibit texting and using a hand-held mobile phone while driving a commercial motor vehicle, and prohibit carriers from allowing or requiring it (${cfr('392.80')}, ${cfr('392.82')}). Set up tracking before you roll.</p>

<h2>What the Rate Con Checker flags</h2>
<p>The checker recognizes MacroPoint, Trucker Tools, FourKites, project44 (or "P44"), "tracking app", "tracking link" and "must track". A tracking requirement on its own is a <b>note</b>. A tracking requirement near "fine", "penalty", "deduct" or a dollar amount is a <b>flag</b>, and the dollar amount also counts in the <a href="/learn/rate-con/fines-deductions/">fines</a> rule. The checker doesn't object to tracking itself.</p>

<h2>What to ask for</h2>
<blockquote>Please remove the fine tied to tracking. I'll provide check calls on request.</blockquote>
<p>A middle ground some carriers accept: no fine if the load is on time, or a fine only after the broker has asked for a location and not received one within a set time.</p>`,
  related: ['check-calls', 'fines-deductions', 'sign-by-deadline', 'broker-verification'], sources: [ecfr('392.80', 'texting prohibition'), ecfr('392.82', 'hand-held mobile phone'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'fcfs-vs-appointment', term: 'FCFS vs. appointment', short: 'First-come, first-served windows versus set appointment times.',
  title: 'FCFS vs. Appointment on a Rate Con: Scheduling Terms Explained',
  description: 'FCFS (first come, first served) means arrive any time within a window; an appointment is a set time. Why mixed scheduling terms on a rate con cause missed loads, fines and unpaid waiting.',
  lede: 'FCFS means "first come, first served": the facility loads or unloads trucks in arrival order during set hours. An appointment is a fixed time slot. Each works; a rate con that mixes both for the same stop invites trouble.',
  body: `
<h2>The two scheduling types</h2>
<p><b>FCFS (first come, first served).</b> The rate con gives a window, such as "FCFS 0700–1500". You can arrive any time in that window and wait your turn. There's no late fine for arriving at 1400, but there's also no promise of when you'll be done, and detention may only start after a long free period, or not at all.</p>
<p><b>Appointment.</b> The rate con gives a time, such as "Appt 10/14 0800". You must be there on time, often checked in some minutes early. If you're late you can be refused or rescheduled, and a late fine may apply. In return, detention usually starts from the appointment time if the facility is slow.</p>

<h2>Why mixed terms are a red flag for planning</h2>
<p>The checker's sample rate con says "10/14 0800 appointment. FCFS 0700-1500." Which is it? If the driver plans for the window and arrives at 1000, the broker can say the 0800 appointment was missed. If the driver plans for 0800 and waits until 1400, the broker can say it was FCFS, so no detention. Ask which one governs before you plan the trip.</p>

<h2>Scheduling and hours of service</h2>
<p>Time waiting at a facility to be loaded, or attending a truck being loaded or unloaded, counts as on-duty time (${cfr('395.2', 'on-duty time, 49 CFR 395.2')}), and a property-carrying driver may not drive after the 14th hour following 10 hours off duty (${cfr('395.3')}). A long FCFS wait early in the day can leave too few hours to make the next appointment legally. That's worth pricing in.</p>

<h2>What the Rate Con Checker flags</h2>
<p>If the text contains both "FCFS" (or "first come, first served") and "appointment" (or "appt"), the checker marks a <b>flag</b>: mixed scheduling terms. If only one appears, it shows a <b>note</b> saying which. The checker can't tell which stop each term belongs to, so on a multi-stop load with an FCFS pickup and an appointment delivery, the flag is a prompt to confirm, not proof of a problem.</p>

<h2>What to ask for</h2>
<blockquote>Please confirm whether pickup/delivery is a set appointment or FCFS, and the hours.</blockquote>
<p>Also ask: when does detention start for this stop (appointment time, or check-in for FCFS)? And who makes or changes the appointment: the broker, the shipper, or you through the facility's scheduling system?</p>`,
  related: ['detention', 'layover', 'check-calls', 'fines-deductions'], sources: [ecfr('395.2', 'on-duty time'), ecfr('395.3', '14-hour limit'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'reefer-temperature', term: 'Reefer temperature clause', short: 'The temperature setting and mode for refrigerated loads.',
  title: 'Reefer Temperature on a Rate Con: Set Point, Continuous vs. Cycle',
  description: 'For refrigerated loads, the rate con should state the temperature set point and whether the unit runs continuous or cycle. Why a missing temperature turns a rejected load into the carrier\'s problem.',
  lede: 'On a refrigerated ("reefer") load, the rate con should state the required temperature and whether the unit runs continuously or in cycle mode. If it doesn\'t, a rejection at the receiver can become the carrier\'s word against everyone else\'s.',
  body: `
<h2>What a good temperature clause includes</h2>
<ul>
<li><b>Set point</b>, in degrees with the unit, such as "34°F" or "-10°F".</li>
<li><b>Mode</b>: <em>continuous</em> (the unit runs all the time and keeps air moving) or <em>cycle</em> / start-stop (the unit shuts off when the set point is reached). Many fresh products need continuous; many frozen loads allow cycle.</li>
<li><b>Pre-cool</b>: whether the trailer must be pre-cooled before loading.</li>
<li><b>Pulp temperature</b> expectations at pickup, if the shipper loads product warmer than the set point.</li>
<li><b>Download</b>: whether the receiver or broker may ask for a reefer unit download as proof.</li>
</ul>

<h2>Why it matters</h2>
<p>When a receiver rejects a reefer load for temperature, the first question is what temperature was ordered. If the rate con, the bill of lading and the shipper's instructions disagree, or none says anything, the carrier can't show it followed instructions. Write the set point on the BOL at pickup too, and take a photo of the reefer display with the product loaded.</p>
<p>A temperature problem often turns into a cargo claim. Federal claim rules say a written claim must identify the shipment, assert liability and ask for a specific or determinable amount; notations of damage on a delivery receipt, alone, are not a claim (${cfr('370.3')}). Your temperature records are central to answering one; see <a href="/learn/rate-con/cargo-claims/">cargo claims</a>.</p>

<h2>What the Rate Con Checker flags</h2>
<p>The checker treats a load as reefer if the text mentions "reefer", "refrigerated", "frozen" or "temperature controlled". It then looks for a number followed by °F, F or "degrees".</p>
<ul>
<li>Reefer load with a temperature found: <b>OK</b>, showing the temperature.</li>
<li>Reefer load with no temperature: <b>flag</b>.</li>
<li>Not a reefer load: a <b>note</b>.</li>
</ul>
<p>The checker reads only the first temperature it finds and only Fahrenheit. It doesn't check the mode (continuous or cycle), so read that yourself. A rate con that gives a range ("33–36°F") will show the first number.</p>

<h2>What to ask for</h2>
<blockquote>Please write the required temperature and whether it's continuous or cycle.</blockquote>
<p>If the shipper's paperwork at pickup differs from the rate con, call the broker before you leave the dock and get the correction in writing. Don't haul a reefer load on conflicting instructions.</p>
<h2>Records worth keeping</h2>
<p>Keep the reefer unit's temperature log for the trip, a photo of the display at pickup and at delivery, and any pulp readings taken. If the load is refused, ask the receiver to write the reason and the readings on the delivery receipt, and send the broker your records the same day. A clear record usually settles the question faster than any clause.</p>`,
  related: ['cargo-claims', 'indemnity', 'setoff', 'rate-confirmation'], sources: [ecfr('370.3', 'filing of claims'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'cargo-claims', term: 'Cargo claims and liability', short: 'Loss or damage claims, and whether they come out of your pay.',
  title: 'Cargo Claims on a Rate Con: Liability, Deductions and the Claims Process',
  description: 'How cargo claims work for carriers: the federal claim filing and response timelines (30 and 120 days), cargo value versus your insurance limit, and rate con clauses that deduct claims from freight pay.',
  lede: 'A cargo claim is a demand for payment for freight that was lost, damaged or delayed. The rate con matters in two ways: how much the load is worth compared with your cargo insurance, and whether the broker can take a claim out of your pay.',
  body: `
<h2>The federal claims process</h2>
<p>Federal rules set a minimum process for claims against motor carriers for loss, damage, injury or delay to cargo:</p>
<ul>
<li>A claim must be <b>in writing</b>, identify the shipment, assert liability and ask for a specific or determinable amount of money. Notes of shortage or damage on a delivery receipt, inspection reports and similar documents, standing alone, are not a claim (${cfr('370.3')}).</li>
<li>The carrier must <b>acknowledge</b> a proper claim in writing within <b>30 days</b> of receiving it, unless it pays or declines it within that time, and must open a claim file (${cfr('370.5')}).</li>
<li>The carrier must <b>pay, decline or make a firm compromise offer</b> in writing within <b>120 days</b>; if it can't, it must send a written status update then and every 60 days after (${cfr('370.9')}).</li>
</ul>
<p>These rules describe how claims against carriers are processed. They don't decide who is liable, and the time limits for filing come from the bill of lading or contract.</p>

<h2>Cargo value and your insurance</h2>
<p>Some rate cons state a cargo value. If it's higher than your cargo policy's limit, a total loss could leave you paying the difference. Federal minimum insurance rules cover public liability (for example $750,000 for for-hire carriers of non-hazardous property in vehicles of 10,001 lbs or more, ${cfr('387.9')}); cargo coverage is a separate policy with its own limit and exclusions. Check the commodity against your policy's exclusions too.</p>

<h2>Claims taken from freight pay</h2>
<p>The riskiest clause lets the broker deduct a claim from your freight charges, sometimes before the claim is proven or before your insurer has looked at it. When combined with <a href="/learn/rate-con/setoff/">setoff</a> language, the deduction can come from pay on other loads.</p>

<h2>What the Rate Con Checker flags</h2>
<ul>
<li>"Claim" within a short distance of "deduct", "withhold", "offset" or "from freight": <b>red flag</b>.</li>
<li>Otherwise, a stated cargo value over <b>$100,000</b>: <b>flag</b>, reminding you to check your cargo insurance covers it.</li>
<li>Neither: OK.</li>
</ul>

<h2>What to ask for</h2>
<blockquote>Please remove language allowing claims to be deducted from freight charges.</blockquote>
<p>At pickup, note the seal number, count and condition on the BOL; at delivery, get any exceptions written specifically. Photos of the load, the seal and (for reefers) the temperature display are the evidence that answers most claims.</p>`,
  related: ['setoff', 'reefer-temperature', 'indemnity', 'fines-deductions'], sources: [ecfr('370.3', 'filing of claims'), ecfr('370.5', 'acknowledgment within 30 days'), ecfr('370.9', 'disposition within 120 days'), ecfr('387.9', 'minimum public liability levels'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'payment-terms', term: 'Payment terms (net 30, net 45)', short: 'How many days after paperwork you get paid.',
  title: 'Net 30 vs. Net 45 on a Rate Con: Payment Terms for Carriers',
  description: 'What net 30, net 45 and similar payment terms mean on a broker rate confirmation, when the clock starts, what "clean paperwork" means, and how long terms cost a carrier in cash flow.',
  lede: '"Net 30" means the broker pays 30 days after it receives what it considers complete paperwork. Net 45 or longer means you finance the broker\'s customer for a month and a half.',
  body: `
<h2>When the clock starts</h2>
<p>Read the trigger, not just the number. Common versions:</p>
<ul>
<li><b>From delivery</b>: the most favorable to the carrier, and the least common.</li>
<li><b>From receipt of POD</b> (proof of delivery) or BOL.</li>
<li><b>From receipt of "clean" or "original" paperwork</b>: the broker decides what's clean. A missing signature, a blurry scan or an unrecorded lumper receipt can reset the clock.</li>
<li><b>From receipt of invoice</b>: paperwork plus your invoice, in the broker's format or portal.</li>
</ul>
<p>Some rate cons add a deadline for sending paperwork (for example within a set number of days of delivery), with a fine or a loss of payment if it's late. Find that line too.</p>

<h2>What long terms cost</h2>
<p>A carrier doing several loads a week on net 45 has six or seven weeks of revenue outstanding at any time, while fuel, insurance and truck payments are due on their own schedule. That's why <a href="/learn/rate-con/quick-pay/">quick pay</a> and <a href="/learn/rate-con/factoring-noa/">factoring</a> exist, and both cost money. Shorter terms are worth real money even at the same rate.</p>

<h2>A record you can ask for</h2>
<p>Brokers must keep, for each shipment, the freight charges they collected and the date they paid the carrier, keep that record for three years, and allow each party to the transaction to review it (${cfr('371.3')}).</p>

<h2>What the Rate Con Checker flags</h2>
<p>The checker reads "net 30", "net-45" and phrases like "payment within 30 days". Then:</p>
<ul>
<li><b>45 days or more</b>: <b>red flag</b>.</li>
<li>More than your maximum (default <b>30 days</b>; Pro users set their own): <b>flag</b>.</li>
<li>Within your maximum: OK, unless a quick-pay fee over 3% is offered, which is a <b>flag</b>.</li>
<li>No terms found: <b>not found</b>.</li>
</ul>
<p>The checker reads the first matching number. If a rate con says "net 30 for factored carriers, net 45 otherwise", read the sentence yourself.</p>

<h2>What to ask for</h2>
<blockquote>Please confirm payment within [N] days of receiving POD/BOL, with no quick-pay fee.</blockquote>
<p>Then make the paperwork boring: scan the signed BOL and POD the day of delivery, include lumper and detention proof in the same email or upload, and keep the confirmation. Clean, same-day paperwork is the best defense against a clock that "hasn't started yet".</p>
<h2>When payment is late</h2>
<p>Track each invoice's due date. When one passes, send a short written reminder with the load number, the date the paperwork was received and the amount. If the broker says something is missing, ask exactly what, in writing. A late-paying broker on one load is worth noting before you book the next one.</p>`,
  related: ['quick-pay', 'factoring-noa', 'setoff', 'rate-confirmation'], sources: [ecfr('371.3', 'broker records: freight charges collected and date paid to carrier'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'indemnity', term: 'Indemnity clause', short: 'Who pays when someone sues, and whether it is mutual.',
  title: 'Indemnity Clauses in Broker-Carrier Rate Cons: One-Way vs. Mutual',
  description: 'An indemnity clause decides who pays if a claim or lawsuit arises from a load. Why one-way, carrier-only indemnity is risky, what mutual wording looks like, and what to ask for.',
  lede: 'An indemnity clause says one party will pay for the other\'s losses and legal costs if a claim arises. In many rate cons it runs one way: the carrier indemnifies the broker, but not the other way around.',
  body: `
<h2>What indemnity means in practice</h2>
<p>"Carrier shall indemnify and hold broker harmless from any and all claims" means that if someone sues the broker over this load, the broker can ask you to pay its defense and any judgment. That's broad: "any and all claims" can include claims that are partly the broker's own fault, such as a bad pickup address, wrong load information, or a broker employee's instruction.</p>
<p>Indemnity is different from insurance. Your liability policy covers your own liability to others under its terms; whether it also covers a promise to indemnify someone else depends on the policy wording. Ask your insurance agent whether "contractual liability" is covered.</p>

<h2>One-way versus mutual</h2>
<p><b>One-way:</b> only the carrier promises to indemnify. <b>Mutual:</b> each party indemnifies the other for losses caused by its own negligence or breach. A common mutual pattern reads: "Each party shall indemnify the other to the extent of its own negligence or breach of this agreement." That splits risk by fault instead of by who drafted the contract.</p>

<h2>Wording to look for</h2>
<ul>
<li><b>"Any and all claims ... arising out of or related to"</b>: very broad scope.</li>
<li><b>"Regardless of fault"</b> or <b>"including broker's negligence"</b>: you'd pay even for the broker's mistakes.</li>
<li><b>"Defend"</b>: a duty to pay lawyers from day one, not just to reimburse at the end.</li>
<li><b>"To the extent caused by"</b>: limits indemnity to your share of fault. That's the language you want.</li>
</ul>

<h2>What the Rate Con Checker flags</h2>
<p>If the text mentions indemnity ("indemnify", "indemnification"), the checker looks for signs of mutuality anywhere in the text: "mutual", "each party", "both parties" or "the parties shall". If it finds one, indemnity is marked OK; if not, it's a <b>flag</b>: indemnity appears one-way. No indemnity language at all is a <b>note</b>.</p>
<p>This is a rough test. "Each party" elsewhere in the document can make a one-way clause look mutual, and a clause can be mutual in substance without those words. Read the clause itself.</p>

<h2>What to ask for</h2>
<blockquote>Please make the indemnity mutual.</blockquote>
<p>If the broker says the clause is in its master broker-carrier agreement and can't change per load, ask for a copy of that agreement and read it before the first load, not after a claim.</p>`,
  related: ['arbitration-venue', 'cargo-claims', 'setoff', 'rate-changes'], sources: [TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'arbitration-venue', term: 'Arbitration and venue clauses', short: 'Where and how disputes are decided.',
  title: 'Arbitration and Venue Clauses on Rate Cons: Where Disputes Get Decided',
  description: 'Rate cons often say disputes go to binding arbitration or a court in the broker\'s home county. What governing law, venue and arbitration clauses mean for a small carrier chasing an unpaid load.',
  lede: 'Many rate cons say which state\'s law applies, where any lawsuit must be filed, or that disputes go to binding arbitration instead of court. For a small carrier owed one load\'s pay, that can decide whether collecting is worth the trip.',
  body: `
<h2>Three different clauses</h2>
<p><b>Governing law</b> ("governed by the laws of the State of Illinois") picks which state's contract law applies. On its own it doesn't say where you'd have to go.</p>
<p><b>Venue or jurisdiction</b> ("exclusive venue in Cook County, Illinois") says where a lawsuit must be filed. If you're in Georgia, collecting $2,000 might mean hiring a lawyer in Illinois.</p>
<p><b>Arbitration</b> ("any dispute shall be resolved by binding arbitration") replaces court with a private arbitrator. Arbitration can be faster, but it has filing fees, the rules may be chosen by the drafter, appeals are very limited, and it may be required in a specific city.</p>

<h2>Why it matters for small claims</h2>
<p>Most carrier-broker disputes are about a few hundred to a few thousand dollars: unpaid detention, a disputed fine, a short-paid invoice. Small-claims court near you is often the most practical remedy. A clause that requires arbitration or a distant court can make that impossible, which gives the broker leverage in any negotiation.</p>

<h2>Wording to look for</h2>
<ul>
<li><b>"Binding arbitration"</b>, <b>"AAA"</b>, <b>"JAMS"</b>: mandatory arbitration.</li>
<li><b>"Exclusive"</b> venue: you can't file anywhere else.</li>
<li><b>"Prevailing party shall recover attorneys' fees"</b>: raises the stakes both ways.</li>
<li><b>"Carrier waives jury trial"</b> or <b>class-action waivers</b>.</li>
</ul>

<h2>What the Rate Con Checker flags</h2>
<p>Any "arbitration" or "arbitrate" wording is a <b>flag</b>: mandatory arbitration language found. Governing-law, venue or jurisdiction language without arbitration is a <b>note</b> showing the clause, since choosing a law or court is common and not harmful in itself. The checker can't tell whether the chosen place is near you, so check the county and state.</p>

<h2>What to ask for</h2>
<blockquote>Please allow disputes to be handled in my home state, without mandatory arbitration.</blockquote>
<p>Large brokers rarely change these clauses on a single load. Still, knowing they're there helps you decide how much credit to extend: on a broker whose terms send every dispute to a distant arbitrator, shorter payment terms or quick pay may be worth more to you.</p>
<h2>Where these clauses live</h2>
<p>Dispute clauses are often not on the one-page rate con at all but in the broker-carrier agreement you signed at setup, which the rate con incorporates "by reference". If the rate con says it's subject to the broker's terms and conditions, ask for those terms and read the dispute section once. It applies to every load you haul for that broker, so it's worth ten minutes the first time.</p>`,
  related: ['indemnity', 'setoff', 'rate-changes', 'payment-terms'], sources: [TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'driver-assist', term: 'Driver assist / driver unload', short: 'When the driver must load, unload or count freight.',
  title: 'Driver Assist and Driver Unload on a Rate Con: Is It Paid?',
  description: 'Driver assist, driver unload, tailgate and freight-count requirements mean the driver works the dock. What the terms mean, how they affect hours of service, and how to make sure the work is paid.',
  lede: '"Driver assist", "driver unload", "tailgate" or "driver count" means the driver does physical work at the dock: moving freight, unloading to the tail of the trailer, or counting pieces. It\'s work, and it should be priced.',
  body: `
<h2>What the terms usually mean</h2>
<ul>
<li><b>Driver assist</b>: the driver helps the facility's crew load or unload.</li>
<li><b>Driver unload / hand unload</b>: the driver unloads the whole trailer, sometimes by hand, piece by piece.</li>
<li><b>Tailgate</b>: the driver moves freight to the back of the trailer so the receiver can take it off.</li>
<li><b>Driver count</b>: the driver counts pieces and signs for the count, which also shifts responsibility for shortages.</li>
</ul>
<p>Terms vary by company, so ask what the specific facility expects. "Driver assist" at one receiver is ten minutes; at another it's two hours with a pallet jack.</p>

<h2>Hours of service</h2>
<p>All time loading or unloading a truck, supervising or assisting, or attending a truck being loaded or unloaded is on-duty time under federal hours-of-service rules (${cfr('395.2', 'on-duty time, 49 CFR 395.2')}). Two hours of hand unloading uses two hours of the driver's 14-hour window (${cfr('395.3')}). That's time not driving, which is a second cost on top of the labor.</p>

<h2>Count and sign</h2>
<p>If the driver counts and signs for a piece count, the BOL is the driver's statement. If the load is shipper-loaded and sealed, many carriers write "SLC" (shipper load and count) or "shipper load, carrier count not verified" on the BOL rather than accepting a count they couldn't check. A driver-count requirement on the rate con conflicts with that habit, so settle it before pickup.</p>

<h2>What the Rate Con Checker flags</h2>
<p>The checker looks for "driver assist", "driver unload", "driver load", "driver count", "tailgate", "hand unload" and "driver must/to load, unload or count".</p>
<ul>
<li>No driver labor found: OK.</li>
<li>Driver labor with a dollar amount nearby: a <b>note</b>, labor appears to be paid.</li>
<li>Driver labor with no pay listed: <b>flag</b>.</li>
</ul>
<p>"Appears to be paid" is a text match: a nearby dollar amount might belong to something else. Confirm the amount is for the labor.</p>

<h2>What to ask for</h2>
<blockquote>Please add pay for driver assist/unload, or confirm no driver labor is required.</blockquote>
<p>Also ask whether a lumper is available instead; see <a href="/learn/rate-con/lumper/">lumper fees</a>. If the driver can't safely do the work (injury, no equipment), say so before dispatch.</p>
<h2>Equipment and damage</h2>
<p>Hand unloading also raises the chance of damaged freight and injuries. Ask whether a pallet jack is provided or must be on the truck, and note any damage you find before you start moving freight. If the driver breaks down pallets or restacks freight at the receiver's request, write that on the delivery receipt so a later shortage or damage claim reflects what really happened.</p>`,
  related: ['lumper', 'detention', 'accessorial', 'cargo-claims'], sources: [ecfr('395.2', 'on-duty time includes loading and unloading'), ecfr('395.3', '14-hour limit'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'rate-changes', term: 'Rate adjustment clause', short: 'Language that lets the broker change the rate after you sign.',
  title: 'Rate "Subject to Change" Clauses: When the Agreed Rate Isn\'t Fixed',
  description: 'Some rate cons let the broker adjust or reduce the rate after signing. What "rate subject to change" wording looks like, why it undermines the whole contract, and what to ask for.',
  lede: 'A rate confirmation exists to fix the price. A clause like "rate subject to change" or "broker reserves the right to adjust the rate" undoes that: the number you signed is no longer the number you\'ll be paid.',
  body: `
<h2>What the clause looks like</h2>
<ul>
<li>"Rate is subject to change based on final shipper billing."</li>
<li>"Broker reserves the right to adjust charges for service failures."</li>
<li>"Rate may be reduced if the carrier fails to meet any requirement herein."</li>
</ul>
<p>Some of these are really fines in disguise (a reduction for a service failure), and some let the broker pass shipper disputes straight through to you. Either way, the total you agreed is no longer fixed.</p>

<h2>Why it matters</h2>
<p>Everything else on a rate con depends on the rate being fixed: your per-mile math, your fuel plan, whether the load was worth the deadhead. A one-sided adjustment right means the broker can shift losses to you after the freight has moved, when you have no way to refuse the load.</p>
<p>There is a record you can check. Brokers must keep, for each shipment, the compensation they received for brokerage, the freight charges collected and the date they paid the carrier, keep it for three years, and let each party to the transaction review it (${cfr('371.3')}). If a rate was cut "because the shipper paid less", that record is relevant.</p>

<h2>Legitimate adjustments</h2>
<p>Not every change is unfair. Adding a stop, a re-consignment, or detention after the fact are changes both sides agree to, ideally on a revised rate con. The problem is a unilateral right to reduce. A fair version names the specific events, says the change must be in writing, and works both ways.</p>

<h2>What the Rate Con Checker flags</h2>
<p>The checker marks a <b>red flag</b> when "rate" is followed shortly by "subject to change", "may be adjusted", "may be reduced" or "may be changed", or when the text says the broker "reserves the right to adjust, reduce or change". Its separate "rate matches what you agreed" rule finds the total and, if you typed the phone rate, gives a red flag when they differ by more than 50 cents.</p>

<h2>What to ask for</h2>
<blockquote>Please confirm the rate is fixed and cannot be adjusted after signing.</blockquote>
<p>If the broker means "we'll deduct for documented service failures", ask for those to be listed as specific amounts, so they can be judged like any other <a href="/learn/rate-con/fines-deductions/">fine</a>.</p>`,
  related: ['rate-confirmation', 'fines-deductions', 'setoff', 'indemnity'], sources: [ecfr('371.3', 'broker records and right to review'), TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'sign-by-deadline', term: 'Sign-by deadline', short: 'Pressure to sign within minutes.',
  title: 'Rate Con "Must Be Signed Within 30 Minutes": How to Handle Sign-By Pressure',
  description: 'Short sign-by deadlines on rate confirmations push carriers to sign without reading. Why they appear, why they also show up in fraud, and a fast routine for reading a rate con in five minutes.',
  lede: 'Some rate cons say they must be signed and returned within a few minutes or the load goes to someone else. Sometimes that\'s real competition for freight; sometimes it\'s pressure designed to stop you reading.',
  body: `
<h2>Why short deadlines exist</h2>
<p>Spot freight moves fast. A broker with a hot load may really need an answer quickly, and a carrier who hesitates loses it. But the deadline is on the paperwork, not just the phone call: the rate con itself says "must be signed within 30 minutes". That gives you half an hour to read terms that may include fines, setoff and claims deductions.</p>
<p>Urgency is also a common feature of fraud: a party posing as a broker wants the load moving before anyone checks its MC number. A tight deadline isn't proof of anything, but it's a reason to make your checks fast rather than skip them.</p>

<h2>A five-minute reading routine</h2>
<ol>
<li><b>Total rate</b>: does it match what you agreed? (One minute.)</li>
<li><b>Broker identity</b>: does the MC/DOT match the company name on FMCSA's public record? Is the email on the company's own domain? See <a href="/learn/rate-con/broker-verification/">broker verification</a>.</li>
<li><b>Money terms</b>: detention, TONU, lumper, payment terms.</li>
<li><b>Fine print</b>: search the text for "fine", "deduct", "offset", "claim", "adjust", "arbitration".</li>
<li><b>Stops and times</b>: appointment or FCFS, and reefer temperature if it applies.</li>
</ol>
<p>Pasting the text into the Rate Con Checker does steps 1, 3 and 4 and most of 2 and 5 in a few seconds, and it runs in your browser, so the rate con isn't uploaded anywhere.</p>

<h2>What the Rate Con Checker flags</h2>
<p>The checker looks for phrases like "must be signed", "sign and return", "signed within" or "return signed", followed by a number of minutes or hours. If it finds one, it's a <b>flag</b>: "Must be signed within N minutes. Read it all first." It doesn't suggest a fix-request line, because the deadline isn't a term you negotiate; it's a reason to read faster.</p>

<h2>If you need more time</h2>
<p>Say so: "I'll sign as soon as I've read it; give me ten minutes." A legitimate broker who wants your truck will usually wait. If the answer is "sign now or lose it", you've learned something about how disputes on this load would go.</p>
<h2>Signing doesn't end the reading</h2>
<p>If you did sign quickly, read the rest of the rate con before the truck rolls. If something unacceptable turns up, raise it in writing right away; a change agreed before pickup is far easier than a dispute after delivery. Save the signed copy with the load file either way.</p>`,
  related: ['broker-verification', 'double-brokering', 'rate-confirmation', 'fines-deductions'], sources: [TOOL] },

// ---------------------------------------------------------------------------------------------
{ slug: 'broker-verification', term: 'Broker MC/DOT verification', short: 'Checking the broker is who the rate con says it is.',
  title: 'How to Verify a Freight Broker\'s MC and DOT Number Before You Haul',
  description: 'Before hauling for a broker, check its MC and USDOT numbers on FMCSA\'s public record, its authority and bond, and its contact details. Warning signs on a rate con and what federal rules require of brokers.',
  lede: 'Every broker rate con should carry the broker\'s MC number and usually its USDOT number. Checking them against FMCSA\'s public record takes a minute and is the first defense against fraud and double brokering.',
  body: `
<h2>What to check</h2>
<ul>
<li><b>Name match</b>: the legal name and DBA on the rate con match the FMCSA record for that MC.</li>
<li><b>Authority type and status</b>: the record shows broker authority, and it's active.</li>
<li><b>Bond or trust</b>: a property broker must have a $75,000 surety bond (Form BMC-84) or trust fund (Form BMC-85) in effect; FMCSA won't register a broker until it is (${cfr('387.307')}).</li>
<li><b>Contact details</b>: call the phone number on the FMCSA record, not the one in the email, and confirm the load number and the person who sent it.</li>
<li><b>Email domain</b>: established brokerages normally use their own domain. A free webmail address claiming to be a large broker is a classic warning sign.</li>
</ul>

<h2>What federal rules require of brokers</h2>
<p>A broker is a person who, for compensation, arranges or offers to arrange transportation by an authorized motor carrier (${cfr('371.2')}). It may not offer brokerage in any name other than the one on its registration, and may not represent its operation as a carrier; its advertising must show that it's a broker (${cfr('371.7')}). It must keep a record of each transaction for three years, which each party may review (${cfr('371.3')}).</p>
<p>If a bond or trust payment drops the fund below $75,000, the surety must notify FMCSA, and the broker's authority can be suspended unless the fund is restored (${cfr('387.307')}). A broker whose bond is in trouble is a broker to be careful with.</p>

<h2>What the Rate Con Checker flags</h2>
<p>The broker identity rule extracts the MC number (5 to 7 digits after "MC") and the DOT number (5 to 8 digits after "DOT" or "USDOT") and shows links that open the FMCSA SAFER snapshot for each. Then:</p>
<ul>
<li>Broker email on a free domain (Gmail, Yahoo, Hotmail, Outlook, AOL, iCloud, Proton, Live, MSN): <b>red flag</b>.</li>
<li>No MC or DOT number found: <b>flag</b>.</li>
<li>Numbers found: a <b>note</b> with the links, because the checker can't verify them itself.</li>
</ul>
<p>The checker doesn't look anything up; it runs entirely in your browser. Clicking a link opens FMCSA's site in a new tab.</p>

<h2>Make it a habit</h2>
<p>Check every new broker, and recheck brokers you haven't used in a while. Authority, bonds and contact details change, and fraudsters reuse real companies' names and numbers. The minute it takes is the cheapest insurance in trucking.</p>`,
  related: ['double-brokering', 'sign-by-deadline', 'rate-confirmation', 'payment-terms'], sources: [ecfr('371.2', 'broker definition'), ecfr('371.3', 'broker records'), ecfr('371.7', 'misrepresentation'), ecfr('387.307', 'broker surety bond or trust fund'), TOOL] },
];
