// FMCSA new entrant safety audit: one page per row of the 49 CFR 385.321(b) automatic-fail table (16 rows),
// exactly as listed in /audit-kit/README.md and verified against eCFR (Title 49 up to date as of Oct 7, 2026).
import { ecfr, cfr } from './common.mjs';

const T321 = ecfr('385.321', 'the 16 automatic-fail regulations');
const KIT = { label: 'Quickwell New Authority Audit Kit, rule table (built from the same eCFR text)', url: '/audit-kit/' };
const after = `<p>If an auditor finds this violation, the audit fails. FMCSA then has up to 45 days to send written notice, and you get 60 days from the notice date to fix the problem and prove it (45 days for certain passenger and hazmat carriers) before your new entrant registration is revoked (${cfr('385.319')}, ${cfr('385.325')}). The <a href="/learn/new-entrant-audit/">overview</a> explains the timeline.</p>`;

export const SECTION = {
  path: '/learn/new-entrant-audit/',
  name: 'New entrant audit',
  h1: 'The 16 violations that automatically fail an FMCSA new entrant safety audit',
  title: 'New Entrant Safety Audit Automatic Failures: All 16 Violations in 49 CFR 385.321',
  description: 'Every automatic-fail violation in the FMCSA new entrant safety audit (49 CFR 385.321(b)), one page each: what the rule says, the records involved, how to fix it, and the audit timeline.',
  lang: 'en', crumbs: [{ name: 'Quickwell', path: '/' }, { name: 'Learn', path: '/learn/' }],
  lede: 'A new carrier fails its FMCSA safety audit automatically if the auditor finds any one of 16 specific violations. Each page below explains one of them in plain English, with the regulation text, the records involved and how to fix it.',
  hubText: 'The 16 automatic-fail rules of 49 CFR 385.321(b).',
  intro: `<h2>How the new entrant program works</h2>
<p>A new US motor carrier is a "new entrant" and is monitored for 18 months. During that period FMCSA conducts a safety audit once the carrier has been operating long enough to have records to review, which the rule says will generally be at least 3 months, and the carrier must make all required records available to the certified auditor on request (${cfr('385.307')}).</p>
<p>A carrier can fail in two ways: a general lack of basic safety management controls (judged under Appendix A to Part 385), or a violation of any one of 16 regulations listed in 49 CFR 385.321(b). Those 16 fail the audit automatically. Fourteen fail on a single occurrence; two (hours-of-service records and periodic inspections) fail only when 51% or more of the examined records are in violation (${cfr('385.321')}).</p>
<h2>What happens after a failed audit</h2>
<p>FMCSA sends written notice no later than 45 days after the audit. Most carriers then have 60 days from the date of the notice to take the corrective actions it lists; passenger carriers (9 or more passengers including the driver, for compensation, or more than 15) and certain hazmat carriers have 45 days (${cfr('385.319')}). FMCSA may extend the 60-day period by up to 60 more days for a carrier making a good-faith effort, and the 45-day period by up to 10 days in limited cases (${cfr('385.323')}). Without an accepted response, registration is revoked and an out-of-service order takes effect on day 61 or day 46 from the notice date, and the carrier may not operate in interstate commerce (${cfr('385.325')}).</p>
<p>Rows 1 to 8 apply to drivers who need a CDL (and their employers). Row 10 applies only to passenger carriers. The rest apply to most interstate carriers. Row 1 covers two paragraphs, one for US carriers and one for foreign-domiciled carriers; only one of them applies to any carrier.</p>`,
  groups: [
    { title: 'Drug and alcohol testing (Part 382)', slugs: ['drug-alcohol-testing-program', 'alcohol-0-04', 'refused-test', 'positive-drug-test', 'random-testing'] },
    { title: 'Commercial driver\'s license (Part 383)', slugs: ['no-valid-cdl', 'disqualified-cdl-or-clp', 'cdl-disqualified-driver'] },
    { title: 'Insurance (Part 387)', slugs: ['insurance-property-carriers', 'insurance-passenger-carriers'] },
    { title: 'Driver qualification (Part 391)', slugs: ['disqualified-driver', 'medical-certificate'] },
    { title: 'Hours of service and maintenance (Parts 395 and 396)', slugs: ['hours-of-service-records', 'out-of-service-vehicle', 'dvir-defects', 'annual-inspection'] },
  ],
  outro: '<p class="note">Row numbers follow the official table in 49 CFR 385.321(b). The table was checked against the eCFR (Title 49 up to date as of October 7, 2026). Regulations change; recheck before relying on this list.</p>',
  sources: [T321, ecfr('385.307', '18-month monitoring, audit timing, records'), ecfr('385.319', 'notice and corrective action periods'), ecfr('385.323', 'extensions'), ecfr('385.325', 'revocation and out-of-service order'), KIT],
  cta: { title: 'Check yourself against all 16 rules', text: 'The free New Entrant Audit Self-Check asks one question per automatic-fail rule and shows what to fix. The $39 Audit Kit fills in your DQ files, drug and alcohol program, maintenance files and audit binder. Runs in your browser.', href: '/audit-kit/', label: 'Open the audit self-check' },
};

const p = (o) => ({ ...o, sources: [T321, ...o.sources, KIT] });

export const PAGES = [
p({ slug: 'drug-alcohol-testing-program', row: 1, h1: 'Row 1: No drug and alcohol testing program (49 CFR 382.115)', short: 'Row 1 · §382.115(a)/(b) · single occurrence',
  title: 'New Entrant Audit: Failing to Implement a Drug and Alcohol Testing Program (382.115)',
  description: 'Automatic-fail row 1 of the FMCSA new entrant audit: no DOT drug and alcohol testing program when CMV operations began (49 CFR 382.115). What the rule requires, records auditors look at, and how to fix it.',
  lede: 'Row 1 of the automatic-fail table is "failing to implement an alcohol and/or controlled substances testing program". One occurrence fails the audit.',
  body: `
<h2>What the rule says</h2>
<p>Under ${cfr('382.115')}, a US-domiciled employer must implement the Part 382 drug and alcohol requirements <b>on the date it begins commercial motor vehicle operations</b>; a foreign-domiciled employer must do so on the date it begins CMV operations in the United States. The 385.321 table lists these as 382.115(a) (domestic) and 382.115(b) (foreign) in the same row (${cfr('385.321')}).</p>
<h2>Who it applies to</h2>
<p>Part 382 applies to employers and drivers who operate a CMV in commerce and are subject to the commercial driver's license requirements of Part 383 (${cfr('382.103')}). In practice that means vehicles that need a CDL: for example a combination of 26,001 lbs or more, a single vehicle of 26,001 lbs or more, a vehicle designed for 16 or more passengers, or a vehicle placarded for hazmat (${cfr('383.5', 'CMV definition in 49 CFR 383.5')}). An owner-operator who employs only himself or herself must still be in a random testing pool of two or more covered employees, which in practice means joining a consortium (${cfr('382.103')}).</p>
<h2>What "implemented" looks like on paper</h2>
<ul>
<li>A pre-employment drug test with a verified negative result before each driver's first safety-sensitive work, unless the narrow exception applies (${cfr('382.301')}).</li>
<li>A full pre-employment query of the Drug and Alcohol Clearinghouse, and at least one query per year for every driver (${cfr('382.701')}).</li>
<li>Enrollment in a random testing pool (see <a href="/learn/new-entrant-audit/random-testing/">row 5</a>).</li>
<li>Records kept for the required periods: verified positives, results of 0.02 or greater and refusals for five years; collection-process records, including random-selection documents, for two years; negative results for one year (${cfr('382.401')}).</li>
</ul>
<p>Because the rule turns on the <em>start date</em>, a program set up a month after the first load is still a violation for that month. Auditors compare dates: when you began operating, when drivers started, and when the program and the first tests began.</p>
<h2>How to fix it</h2>
<ol>
<li>Join a consortium or third-party administrator (C/TPA) and get an enrollment certificate listing your company and every CDL driver.</li>
<li>Adopt a written drug and alcohol policy and give drivers a copy.</li>
<li>Register in the Clearinghouse, run full pre-employment queries, and keep the query records.</li>
<li>Pre-employment test anyone not already tested, and keep them off safety-sensitive work until a verified negative arrives.</li>
<li>File it all in a locked drug and alcohol file, separate from the driver qualification file.</li>
</ol>
<p>If you already operated without a program, fix it now and keep proof of the date it began; corrective action after a failed audit asks for evidence of the same items.</p>
${after}`,
  sources: [ecfr('382.115', 'starting date for testing programs'), ecfr('382.103', 'applicability'), ecfr('383.5', 'CMV definition for CDL purposes'), ecfr('382.301', 'pre-employment testing'), ecfr('382.401', 'retention of records'), ecfr('382.701', 'Clearinghouse queries')],
  related: ['random-testing', 'positive-drug-test', 'refused-test', 'alcohol-0-04'] }),

p({ slug: 'alcohol-0-04', row: 2, h1: 'Row 2: Using a driver with an alcohol concentration of 0.04 or greater (49 CFR 382.201)', short: 'Row 2 · §382.201 · single occurrence',
  title: 'New Entrant Audit: Using a Driver With Alcohol Concentration 0.04 or Greater (382.201)',
  description: 'Automatic-fail row 2 of the FMCSA new entrant audit: letting a driver known to have an alcohol concentration of 0.04 or greater perform safety-sensitive functions (49 CFR 382.201).',
  lede: 'Row 2 fails a new carrier that uses a driver known to have an alcohol concentration of 0.04 or greater to perform a safety-sensitive function. One occurrence is enough.',
  body: `
<h2>What the rule says</h2>
<p>${cfr('382.201')} has two halves. A driver may not report for duty or stay on duty in a safety-sensitive function with an alcohol concentration of 0.04 or greater. And <b>no employer having knowledge</b> that a driver has an alcohol concentration of 0.04 or greater may permit the driver to perform or continue to perform safety-sensitive functions. The audit row is about the employer half: "using a driver known to have an alcohol content of 0.04 or greater" (${cfr('385.321')}).</p>
<h2>How an auditor would know</h2>
<p>Usually from your own records. An alcohol test result of 0.04 or more from a random, post-accident or reasonable-suspicion test is a document the carrier must keep for five years (${cfr('382.401')}). The violation arises when the records show a result at or above 0.04 and other records, such as logs, dispatch records or bills of lading, show the driver kept driving or doing other safety-sensitive work afterwards without completing the return-to-duty process.</p>
<p>"Safety-sensitive" is broader than driving. It includes, for example, waiting to be dispatched, inspecting the truck, and loading or unloading. A driver with a 0.04 result who is told to "just help on the dock" is still in a safety-sensitive function.</p>
<h2>What must happen after a 0.04 result</h2>
<ul>
<li>Remove the driver from all safety-sensitive functions immediately.</li>
<li>The driver may not return until the return-to-duty process in 49 CFR Part 40, Subpart O is complete: evaluation by a substance abuse professional and a return-to-duty test, followed by follow-up testing (${cfr('382.503')}).</li>
<li>Report the violation to the Drug and Alcohol Clearinghouse as required; later employers will see it in their pre-employment query (${cfr('382.701')}).</li>
<li>Keep the test record and related documents for five years.</li>
</ul>
<p>Results from 0.02 to less than 0.04 are handled under a different rule (a 24-hour removal), but those records too must be kept for five years (${cfr('382.401')}).</p>
<h2>How to make this a non-issue</h2>
<ol>
<li>Write the removal step into your drug and alcohol policy and make sure whoever dispatches knows it.</li>
<li>Have the consortium or medical review officer notify you directly and promptly of any result.</li>
<li>Keep a simple log: date of result, date removed, SAP referral, return-to-duty test date, and follow-up schedule.</li>
<li>Check the Clearinghouse before every hire, so a driver with an unresolved violation never starts work for you.</li>
</ol>
<p>For a one-truck owner-operator the "employer" and the driver are the same person: you must comply with both halves of the rule (${cfr('382.103')}).</p>
${after}`,
  sources: [ecfr('382.201', 'alcohol concentration'), ecfr('382.401', 'retention of records'), ecfr('382.503', 'return to duty'), ecfr('382.701', 'Clearinghouse'), ecfr('382.103', 'applicability, self-employed drivers')],
  related: ['refused-test', 'positive-drug-test', 'drug-alcohol-testing-program', 'random-testing'] }),

p({ slug: 'refused-test', row: 3, h1: 'Row 3: Using a driver who refused a required drug or alcohol test (49 CFR 382.211)', short: 'Row 3 · §382.211 · single occurrence',
  title: 'New Entrant Audit: Using a Driver Who Refused a Required Test (382.211)',
  description: 'Automatic-fail row 3 of the FMCSA new entrant audit: letting a driver who refused a required Part 382 drug or alcohol test keep doing safety-sensitive work (49 CFR 382.211).',
  lede: 'Row 3 fails a new carrier that uses a driver who has refused to submit to a required alcohol or controlled substances test. A single occurrence fails the audit.',
  body: `
<h2>What the rule says</h2>
<p>Under ${cfr('382.211')}, no driver may refuse a required pre-employment drug test, post-accident test, random test, reasonable-suspicion test, return-to-duty test or follow-up test. And no employer may permit a driver who refuses such a test to perform or continue to perform safety-sensitive functions. The audit row: "using a driver who has refused to submit to an alcohol or controlled substances test required under part 382" (${cfr('385.321')}).</p>
<h2>What counts as a refusal</h2>
<p>Refusal is defined in the DOT testing procedures in 49 CFR Part 40 and covers more than saying no. Common examples drivers don't expect: not showing up for a test within a reasonable time after being told to go, leaving the collection site before the test is complete, failing to provide a sufficient specimen without a valid medical explanation, and an adulterated or substituted specimen. Read the definition in Part 40 with your consortium; this page doesn't list every case.</p>
<p>Random testing makes the timing rule especially important. A driver selected for a random test must proceed to the test site immediately once notified (or, if performing a safety-sensitive function other than driving, stop and go as soon as possible) (${cfr('382.305')}). Dispatching the driver on a run first can create both a missed test and a refusal problem.</p>
<h2>Records an auditor will see</h2>
<ul>
<li>Documentation of refusals, kept for five years (${cfr('382.401')}).</li>
<li>Random selection lists and notification records, kept for two years as collection-process records.</li>
<li>Logs, dispatch records and pay records showing whether the driver kept working after the refusal date.</li>
<li>Clearinghouse reports: a refusal is one of the violations reported there, and pre-employment queries look for it (${cfr('382.701')}).</li>
</ul>
<h2>What to do after a refusal</h2>
<ol>
<li>Remove the driver from all safety-sensitive work at once, the same as a positive test.</li>
<li>Document what happened: who notified the driver, when, what the driver said or did, and what the collector reported.</li>
<li>The driver may return only after the return-to-duty process in Part 40, Subpart O (${cfr('382.503')}).</li>
<li>Make sure the refusal is reported to the Clearinghouse as required.</li>
</ol>
<h2>Preventing the problem</h2>
<p>Most refusal problems are process problems. Give every driver written instructions on what happens when they're selected, record the time of notification, and make the rule "go straight to the clinic" non-negotiable. For new hires, a full Clearinghouse query will show a prior refusal that hasn't been resolved, so run it before the first load (${cfr('382.701')}).</p>
${after}`,
  sources: [ecfr('382.211', 'refusal to submit'), ecfr('382.305', 'random testing, proceed immediately'), ecfr('382.401', 'retention of records'), ecfr('382.503', 'return to duty'), ecfr('382.701', 'Clearinghouse')],
  related: ['positive-drug-test', 'random-testing', 'alcohol-0-04', 'drug-alcohol-testing-program'] }),

p({ slug: 'positive-drug-test', row: 4, h1: 'Row 4: Using a driver known to have tested positive for drugs (49 CFR 382.215)', short: 'Row 4 · §382.215 · single occurrence',
  title: 'New Entrant Audit: Using a Driver Who Tested Positive for Drugs (382.215)',
  description: 'Automatic-fail row 4 of the FMCSA new entrant audit: letting a driver known to have tested positive (or adulterated or substituted a specimen) perform safety-sensitive functions (49 CFR 382.215).',
  lede: 'Row 4 fails a new carrier that uses a driver known to have tested positive for a controlled substance. One occurrence fails the audit.',
  body: `
<h2>What the rule says</h2>
<p>Under ${cfr('382.215')}, a driver who tests positive, or has adulterated or substituted a specimen, may not report for duty, remain on duty or perform a safety-sensitive function. An employer <b>having knowledge</b> of such a result may not permit the driver to perform or continue to perform safety-sensitive functions. The audit row reads "using a driver known to have tested positive for a controlled substance" (${cfr('385.321')}).</p>
<h2>Where the knowledge comes from</h2>
<ul>
<li><b>Your own tests.</b> A verified positive reported to you by the medical review officer (MRO) or your consortium.</li>
<li><b>The Clearinghouse.</b> A full pre-employment query must be done before a driver's first safety-sensitive work, and it shows verified positives and other violations recorded by previous employers (${cfr('382.701')}).</li>
<li><b>The annual query.</b> At least one query per year for every driver; if a limited query shows information exists, a full query must follow within 24 hours or the driver comes off safety-sensitive work until it does (${cfr('382.701')}).</li>
</ul>
<p>Hiring a driver without running the pre-employment query doesn't avoid the problem: the query is itself required, and skipping it is a separate violation.</p>
<h2>Records involved</h2>
<p>Verified positive results must be kept for five years, along with documents the MRO sent you and documents a driver presented to dispute a result. Negative and cancelled results are kept for one year (${cfr('382.401')}). An auditor comparing the date of a positive with logs, dispatch or pay records can see whether the driver kept working.</p>
<h2>What to do after a verified positive</h2>
<ol>
<li>Remove the driver from all safety-sensitive functions immediately, including non-driving work like loading or vehicle inspections.</li>
<li>Give the driver the list of substance abuse professionals as Part 40 requires.</li>
<li>The driver may return only after completing the return-to-duty process in 49 CFR Part 40, Subpart O, including a negative return-to-duty test, followed by follow-up testing (${cfr('382.503')}).</li>
<li>Keep the records in your locked drug and alcohol file.</li>
</ol>
<h2>Owner-operators</h2>
<p>A self-employed driver is both the employer and the driver and must meet both sets of duties (${cfr('382.103')}). Your consortium will typically notify you of your own result; the rule still says you may not drive until the return-to-duty process is complete.</p>
<h2>Prevention</h2>
<p>Put the Clearinghouse query and the pre-employment test at the front of your hiring checklist, and don't dispatch a new driver until both are back clean. Write down who at your company receives MRO calls and what they do next.</p>
${after}`,
  sources: [ecfr('382.215', 'controlled substances testing'), ecfr('382.701', 'Clearinghouse queries'), ecfr('382.401', 'retention of records'), ecfr('382.503', 'return to duty'), ecfr('382.103', 'applicability')],
  related: ['refused-test', 'alcohol-0-04', 'random-testing', 'drug-alcohol-testing-program'] }),

p({ slug: 'random-testing', row: 5, h1: 'Row 5: No random drug and alcohol testing program (49 CFR 382.305)', short: 'Row 5 · §382.305 · single occurrence',
  title: 'New Entrant Audit: Failing to Implement Random Drug and Alcohol Testing (382.305)',
  description: 'Automatic-fail row 5 of the FMCSA new entrant audit: no random controlled substances and alcohol testing program (49 CFR 382.305). Pools, selection rules, rates and the records that prove it.',
  lede: 'Row 5 fails a new carrier that has not implemented a random controlled substances and alcohol testing program. It is separate from row 1: a carrier can have a policy and pre-employment tests and still fail here.',
  body: `
<h2>What the rule requires</h2>
<p>${cfr('382.305')} requires every employer to run random alcohol and drug testing, and every driver to submit to it. Key parts:</p>
<ul>
<li><b>Rates.</b> The base minimum annual rates in the rule are 10% of average driver positions for alcohol and 50% for drugs; FMCSA can raise or lower them based on industry data and publishes changes in the Federal Register, effective January 1 of the following year. Check the rate for the current year with your consortium.</li>
<li><b>Selection.</b> By a scientifically valid method, such as a random-number generator matched to driver IDs. Every driver must have an equal chance each time, and selected drivers must be tested during that selection period.</li>
<li><b>Unannounced and spread out.</b> Tests must be unannounced and spread reasonably through the year.</li>
<li><b>Go immediately.</b> A selected driver must proceed to the test site immediately after notification.</li>
<li><b>Pools.</b> Only covered drivers may be in the pool, and all covered drivers must be. A C/TPA may run selections in a larger pool, but the employer must make sure it tests at the required rate.</li>
</ul>
<h2>Owner-operators</h2>
<p>An employer who employs only himself or herself as a driver must be in a random pool of two or more covered employees (${cfr('382.103')}). A one-person company can't run its own random program; joining a consortium is the practical way to comply.</p>
<h2>Records that prove the program exists</h2>
<ul>
<li>The consortium enrollment certificate showing your company and each CDL driver in the pool.</li>
<li>Selection lists and notifications for each period, kept for two years as collection-process records (${cfr('382.401')}).</li>
<li>Test results: negatives for one year; positives, results of 0.02 or greater and refusals for five years (${cfr('382.401')}).</li>
<li>The annual calendar-year summary, kept for five years.</li>
</ul>
<p>A new driver who isn't added to the pool, or a pool that dropped your company when an invoice went unpaid, are common ways to slip out of compliance without noticing. Ask the consortium for your current roster each quarter and compare it with your driver list.</p>
<h2>How to fix it</h2>
<ol>
<li>Enroll with a consortium/TPA and add every CDL driver, including yourself if you drive.</li>
<li>Get written confirmation of enrollment with the date, and keep it.</li>
<li>Set up how you'll be notified of selections and how you'll send drivers immediately.</li>
<li>Keep paying the consortium; a lapsed membership can mean no random program.</li>
</ol>
${after}`,
  sources: [ecfr('382.305', 'random testing'), ecfr('382.103', 'applicability, self-employed drivers'), ecfr('382.401', 'retention of records')],
  related: ['drug-alcohol-testing-program', 'refused-test', 'positive-drug-test', 'alcohol-0-04'] }),

p({ slug: 'no-valid-cdl', row: 6, h1: 'Row 6: Knowingly using a driver without a valid CDL (49 CFR 383.3(a) / 383.23(a))', short: 'Row 6 · §383.3(a)/§383.23(a) · single occurrence',
  title: 'New Entrant Audit: Knowingly Using a Driver Without a Valid CDL (383.23)',
  description: 'Automatic-fail row 6 of the FMCSA new entrant audit: knowingly using a driver who does not possess a valid CDL (49 CFR 383.3(a), 383.23(a)). Class, endorsements, CLP limits and the records to keep.',
  lede: 'Row 6 fails a new carrier that knowingly uses a driver who does not possess a valid commercial driver\'s license. A single occurrence fails the audit.',
  body: `
<h2>What the rules say</h2>
<p>Part 383 applies to every person who operates a CMV in interstate, foreign or intrastate commerce and to their employers (${cfr('383.3')}). Under ${cfr('383.23')}, no person may operate a CMV without having passed the knowledge and skills tests for it, and, apart from narrow exceptions, without a CDL issued by the State or jurisdiction of domicile that meets federal standards. A holder of a commercial learner's permit (CLP) may operate only as the CLP allows.</p>
<p>The audit row: "knowingly using a driver who does not possess a valid CDL" (${cfr('385.321')}).</p>
<h2>Which vehicles need a CDL</h2>
<p>For CDL purposes a CMV is, among other things, a combination of 26,001 lbs or more gross combination weight rating (with a towed unit over 10,000 lbs), a single vehicle of 26,001 lbs or more, a vehicle designed to carry 16 or more passengers including the driver, or any vehicle used to carry hazmat that requires placards (${cfr('383.5', '49 CFR 383.5')}). That is narrower than the general FMCSA definition of a CMV, which starts at 10,001 lbs (${cfr('390.5')}). A carrier with trucks under 26,001 lbs and no placarded hazmat may not need CDL drivers at all.</p>
<h2>"Valid" includes class and endorsements</h2>
<p>A Class B license doesn't cover a Class A combination; a CDL without the tank, doubles/triples, passenger or hazmat endorsement doesn't cover loads that need one. Under the employer rules, using a driver whose license doesn't have the proper class or endorsements, or who violates a restriction on it, is prohibited too (${cfr('383.37')}). And driving without the proper class or endorsements is itself a serious traffic violation that can lead to disqualification on repeat convictions (${cfr('383.51')}).</p>
<h2>Records an auditor will compare</h2>
<ul>
<li>A copy of each driver's license in the driver qualification file, with class, endorsements, restrictions and expiry.</li>
<li>The motor vehicle record (MVR) obtained within 30 days of hire and at least every 12 months (${cfr('391.23')}, ${cfr('391.25')}).</li>
<li>Vehicle records (weights, configurations) and loads hauled, compared against each driver's class and endorsements.</li>
<li>Logs and dispatch records showing who drove what, and when, including any period after a license expired.</li>
</ul>
<h2>How to fix it</h2>
<ol>
<li>Build a simple table: driver, CDL class, endorsements, restrictions, expiry date, and the vehicles and loads each may run.</li>
<li>Check it before assigning a new vehicle type or a hazmat load.</li>
<li>Set calendar reminders 60 days before each expiry.</li>
<li>Take any driver with an expired or wrong-class license off CDL work immediately.</li>
</ol>
${after}`,
  sources: [ecfr('383.3', 'applicability'), ecfr('383.23', 'commercial driver\'s license'), ecfr('383.5', 'CMV definition for CDL purposes'), ecfr('390.5', 'general CMV definition'), ecfr('383.37', 'employer responsibilities'), ecfr('383.51', 'disqualification'), ecfr('391.23', 'pre-hire MVR'), ecfr('391.25', 'annual MVR')],
  related: ['disqualified-cdl-or-clp', 'cdl-disqualified-driver', 'disqualified-driver', 'medical-certificate'] }),

p({ slug: 'disqualified-cdl-or-clp', row: 7, h1: 'Row 7: Using a driver whose CDL or CLP is disqualified, or who lost the right to drive a CMV (49 CFR 383.37(b))', short: 'Row 7 · §383.37(b) · single occurrence',
  title: 'New Entrant Audit: Driver With a Disqualified CDL or Lost Driving Privileges (383.37(b))',
  description: 'Automatic-fail row 7 of the FMCSA new entrant audit: allowing a driver whose CDL or CLP is disqualified by a State, or who has lost the right to operate a CMV in a State, to drive (49 CFR 383.37(b)).',
  lede: 'Row 7 fails a new carrier that knowingly allows, requires, permits or authorizes a driver to operate a CMV while the driver\'s CDL or CLP is disqualified by a State, the driver has lost the right to operate a CMV in a State, or the driver is disqualified.',
  body: `
<h2>What the rule says</h2>
<p>${cfr('383.37')} lists the employer's duties under the CDL rules. Paragraph (b) prohibits an employer from allowing a driver to operate a CMV during any period in which the driver has a CLP or CDL disqualified by a State, has lost the right to operate a CMV in a State, or has been disqualified from operating a CMV. The standard is that the employer "knows or should reasonably know". That second phrase matters: not checking is not a defense.</p>
<h2>How this differs from rows 6 and 8</h2>
<ul>
<li><a href="/learn/new-entrant-audit/no-valid-cdl/">Row 6</a> is about a driver who doesn't hold a valid CDL at all, or not the right one.</li>
<li><b>Row 7</b> is about a driver whose license has been disqualified by a State or who lost CMV privileges in a State, including a State other than the one that issued the license.</li>
<li><a href="/learn/new-entrant-audit/cdl-disqualified-driver/">Row 8</a> is about drivers disqualified under the federal disqualification tables in 383.51.</li>
</ul>
<p>The physical license card can look fine while the driver's privileges are disqualified. That is why the rule focuses on what the employer knew or should have known from the driver's record.</p>
<h2>How carriers find out</h2>
<ul>
<li><b>Pre-hire MVR.</b> An inquiry to every State where the driver held a license in the past 3 years, within 30 days of hire, placed in the driver qualification file (${cfr('391.23')}).</li>
<li><b>Annual MVR and review.</b> At least once every 12 months, a new MVR from each licensing State and a documented review of whether the driver meets minimum requirements or is disqualified (${cfr('391.25')}).</li>
<li><b>Driver notice.</b> A driver who receives notice that a license or privilege has been revoked, suspended or withdrawn must tell the employing carrier before the end of the next business day (${cfr('391.15')}).</li>
</ul>
<p>Many carriers add a continuous license-monitoring service between annual checks. That's optional, but a once-a-year MVR can leave months where a suspension goes unnoticed.</p>
<h2>Records an auditor will look at</h2>
<p>The MVRs in each driver qualification file, the note of the annual review with the reviewer's name and date (${cfr('391.51')}), and logs or dispatch records for any period when a disqualification appears on the record.</p>
<h2>How to fix it</h2>
<ol>
<li>Pull a current MVR for every driver now and file it.</li>
<li>Write a short policy: drivers must report any notice the next business day; dispatch checks status before assigning loads.</li>
<li>Take any disqualified driver off CMV work immediately and document the date.</li>
<li>Calendar the annual MVR and review for each driver.</li>
</ol>
${after}`,
  sources: [ecfr('383.37', 'employer responsibilities'), ecfr('391.23', 'pre-hire MVR'), ecfr('391.25', 'annual inquiry and review'), ecfr('391.15', 'driver notice of license action'), ecfr('391.51', 'driver qualification file')],
  related: ['cdl-disqualified-driver', 'no-valid-cdl', 'disqualified-driver', 'medical-certificate'] }),

p({ slug: 'cdl-disqualified-driver', row: 8, h1: 'Row 8: Letting a driver disqualified under the CDL rules drive (49 CFR 383.51(a))', short: 'Row 8 · §383.51(a) · single occurrence',
  title: 'New Entrant Audit: Allowing a CDL-Disqualified Driver to Drive (383.51(a))',
  description: 'Automatic-fail row 8 of the FMCSA new entrant audit: knowingly allowing a driver disqualified under 49 CFR 383.51 to drive a CMV. The disqualifying offenses, periods and how carriers stay compliant.',
  lede: 'Row 8 fails a new carrier that knowingly allows, requires, permits or authorizes a driver who is disqualified to drive a commercial motor vehicle, as the CDL rules define it.',
  body: `
<h2>What the rule says</h2>
<p>${cfr('383.51')} (a) says a person required to have a CLP or CDL who is disqualified must not drive a CMV, and an employer must not knowingly allow, require, permit or authorize a disqualified driver to drive a CMV. The 385.321 table notes that this row refers to a driver operating a CMV as defined in 383.5, the CDL definition (${cfr('385.321')}).</p>
<h2>What disqualifies a CDL driver</h2>
<p>Section 383.51 sets out four tables. In outline:</p>
<ul>
<li><b>Major offenses</b> (Table 1), such as driving under the influence, an alcohol concentration of 0.04 or more in a CMV, refusing a State implied-consent test, leaving the scene of an accident, using a vehicle to commit a felony, or causing a fatality through negligent CMV operation. A first conviction in a CMV generally means 1 year (3 years if hauling placarded hazmat); a second means life, with limited reinstatement. Some felonies mean life without reinstatement.</li>
<li><b>Serious traffic violations</b> (Table 2), such as speeding 15 mph or more over the limit, reckless driving, improper lane changes, following too closely, texting or hand-held phone use while driving a CMV, and driving a CMV without the proper CLP/CDL, class or endorsements. Two convictions within 3 years mean 60 days; three or more mean 120 days.</li>
<li><b>Railroad-highway grade crossing offenses</b> (Table 3): at least 60 days for a first conviction, rising with repeats.</li>
<li><b>Out-of-service order violations</b> (Table 4).</li>
</ul>
<p>Convictions in a personal vehicle can also count for several offenses. The tables are detailed; use the regulation, not a summary, when a specific case comes up.</p>
<h2>How carriers find out</h2>
<p>Through the same records as <a href="/learn/new-entrant-audit/disqualified-cdl-or-clp/">row 7</a>: the pre-hire MVR covering 3 years (${cfr('391.23')}), the annual MVR and documented review (${cfr('391.25')}), and the driver's duty to report license actions by the end of the next business day (${cfr('391.15')}). A carrier that skips these checks may be found to have known what the records would have shown.</p>
<h2>Records an auditor will compare</h2>
<ul>
<li>MVRs and annual review notes in the driver qualification file (${cfr('391.51')}).</li>
<li>Roadside inspection reports and convictions listed on the driver's record.</li>
<li>Logs and dispatch records for dates inside any disqualification period.</li>
</ul>
<h2>How to fix it</h2>
<ol>
<li>Review every current MVR against the 383.51 tables, not just for suspensions.</li>
<li>Count serious traffic violations within 3-year windows; the second one is what triggers 60 days.</li>
<li>Remove a disqualified driver from all CDL driving, document the dates, and keep the record.</li>
<li>Tell drivers in writing that they must report any citation or conviction promptly.</li>
</ol>
${after}`,
  sources: [ecfr('383.51', 'disqualification of drivers'), ecfr('391.23', 'pre-hire MVR'), ecfr('391.25', 'annual inquiry and review'), ecfr('391.15', 'driver notice'), ecfr('391.51', 'driver qualification file')],
  related: ['disqualified-cdl-or-clp', 'disqualified-driver', 'no-valid-cdl', 'alcohol-0-04'] }),

p({ slug: 'insurance-property-carriers', row: 9, h1: 'Row 9: Operating without required minimum insurance (49 CFR 387.7(a))', short: 'Row 9 · §387.7(a) · single occurrence',
  title: 'New Entrant Audit: Operating Without Minimum Financial Responsibility (387.7(a))',
  description: 'Automatic-fail row 9 of the FMCSA new entrant audit: operating a motor vehicle without the required minimum levels of financial responsibility (49 CFR 387.7, limits in 387.9). Limits, MCS-90 and lapses.',
  lede: 'Row 9 fails a new carrier that operates a motor vehicle without having the required minimum levels of financial responsibility (liability insurance or a surety bond) in effect.',
  body: `
<h2>What the rule says</h2>
<p>Under ${cfr('387.7')} (a), no motor carrier may operate a motor vehicle until it has obtained, and has in effect, the minimum levels of financial responsibility in ${cfr('387.9')}. "In effect" is the important part: insurance that lapsed for a week, or a policy that didn't start until after the first load, is a violation for those days.</p>
<h2>The minimum levels</h2>
<div class="tbl"><table>
<tr><th>Type of carriage (vehicles of 10,001 lbs GVWR or more unless noted)</th><th>Minimum</th></tr>
<tr><td>For-hire, interstate or foreign: property (non-hazardous)</td><td>$750,000</td></tr>
<tr><td>Oil, hazardous waste, hazardous materials or substances listed in 172.101, not in the higher tier</td><td>$1,000,000</td></tr>
<tr><td>Certain bulk hazardous substances, bulk Division 1.1–1.3 explosives, bulk Division 2.3 Hazard Zone A, highway-route-controlled Class 7 and similar (also under 10,001 lbs for some)</td><td>$5,000,000</td></tr>
</table></div>
<p>This is a summary of the table in 387.9; check the exact wording for hazmat loads.</p>
<h2>Proof and continuity</h2>
<ul>
<li>Proof must be kept at your <b>principal place of business</b>: the MCS-90 endorsement issued by your insurer, an MCS-82 surety bond, or an FMCSA self-insurance authorization (${cfr('387.7')}).</li>
<li>Policies and endorsements must remain in effect continuously until terminated, and cancellation requires 35 days' written notice by either side.</li>
<li>The proof is public information and must be produced on reasonable request by a member of the public.</li>
<li>Foreign-domiciled carriers operating in the US must carry a legible English copy of the proof in each vehicle.</li>
</ul>
<h2>What an auditor will compare</h2>
<p>The policy declarations and MCS-90 (dates, limits, named insured), against your first operating date and the dates of loads, fuel receipts or logs. Gaps between policies, a policy issued under a different legal name than your USDOT registration, or limits below what your loads require are the usual problems.</p>
<h2>How to fix it</h2>
<ol>
<li>Confirm with your agent that the policy limit meets 387.9 for everything you haul, including any hazmat.</li>
<li>Get the MCS-90 and keep a copy in your office file, not just in the truck.</li>
<li>Check the named insured matches your FMCSA registration exactly.</li>
<li>Set renewal reminders well before expiry, and never run a load on a lapsed policy.</li>
</ol>
<p>Liability insurance is separate from cargo insurance, which brokers and shippers may require but which isn't part of this row.</p>
${after}`,
  sources: [ecfr('387.7', 'financial responsibility required'), ecfr('387.9', 'minimum levels')],
  related: ['insurance-passenger-carriers', 'annual-inspection', 'hours-of-service-records', 'out-of-service-vehicle'] }),

p({ slug: 'insurance-passenger-carriers', row: 10, h1: 'Row 10: Operating a passenger vehicle without required minimum insurance (49 CFR 387.31(a))', short: 'Row 10 · §387.31(a) · single occurrence',
  title: 'New Entrant Audit: Passenger Carrier Without Minimum Financial Responsibility (387.31(a))',
  description: 'Automatic-fail row 10 of the FMCSA new entrant audit: operating a passenger-carrying vehicle without the required minimum financial responsibility (49 CFR 387.31, limits in 387.33T). Limits and MCS-90B.',
  lede: 'Row 10 applies to passenger carriers. It fails a new entrant that operates a motor vehicle transporting passengers without the required minimum levels of financial responsibility in effect.',
  body: `
<h2>What the rule says</h2>
<p>Under ${cfr('387.31')} (a), no motor carrier may operate a motor vehicle transporting passengers until it has obtained, and has in effect, the minimum levels of financial responsibility set out for passenger carriers. The audit row is "operating a passenger carrying vehicle without having in effect the required minimum levels of financial responsibility" (${cfr('385.321')}).</p>
<h2>The minimum levels</h2>
<p>The current schedule for for-hire passenger carriers in interstate or foreign commerce is in ${cfr('387.33T')}: <b>$5,000,000</b> for any vehicle with a seating capacity of 16 passengers or more including the driver, and <b>$1,500,000</b> for any vehicle with a seating capacity of 15 passengers or less including the driver. (The eCFR shows section 387.33 as suspended since January 2017 and 387.33T as the section in force; the figures are the same.) Transit service providers operating under certain federal grants have a separate rule.</p>
<p>Seating capacity, not how many passengers you usually carry, sets the limit. A 15-passenger van and a 16-passenger shuttle fall on different sides of the line.</p>
<h2>Proof and continuity</h2>
<ul>
<li>Proof is kept at your principal place of business: the <b>MCS-90B</b> endorsement or an <b>MCS-82B</b> surety bond (${cfr('387.31')}).</li>
<li>Coverage must remain in effect continuously; cancellation requires 35 days' written notice.</li>
<li>The proof is public information and must be produced on reasonable request.</li>
<li>Carriers domiciled in Canada or Mexico must carry a legible English copy in each passenger vehicle.</li>
</ul>
<h2>Why passenger carriers have less time</h2>
<p>If a passenger carrier fails the audit for this or any other reason, the corrective-action period is 45 days rather than 60, for carriers using vehicles designed or used to transport 9 to 15 passengers for direct compensation or more than 15 passengers (${cfr('385.319')}). Revocation and the out-of-service order then take effect on day 46 (${cfr('385.325')}).</p>
<h2>What an auditor will compare</h2>
<p>The policy declarations and MCS-90B dates and limits against your vehicle list (seating capacities), your first operating date, and trip records. A policy written for the smaller vehicle class while a larger vehicle is in service is a common gap.</p>
<h2>How to fix it</h2>
<ol>
<li>List every vehicle with its seating capacity including the driver.</li>
<li>Confirm the policy limit covers the largest vehicle you operate.</li>
<li>Keep the MCS-90B in your office file, and renew well ahead of expiry.</li>
<li>Don't add a larger vehicle to service until the policy covers it.</li>
</ol>
${after}`,
  sources: [ecfr('387.31', 'financial responsibility required, passengers'), ecfr('387.33T', 'minimum levels, passenger carriers'), ecfr('385.319', '45-day corrective action'), ecfr('385.325', 'revocation')],
  related: ['insurance-property-carriers', 'medical-certificate', 'hours-of-service-records', 'annual-inspection'] }),

p({ slug: 'disqualified-driver', row: 11, h1: 'Row 11: Knowingly using a disqualified driver (49 CFR 391.15(a))', short: 'Row 11 · §391.15(a) · single occurrence',
  title: 'New Entrant Audit: Knowingly Using a Disqualified Driver (391.15(a))',
  description: 'Automatic-fail row 11 of the FMCSA new entrant audit: using a driver disqualified under 49 CFR 391.15, which applies to CDL and non-CDL drivers alike. Grounds, periods and the records that catch it.',
  lede: 'Row 11 fails a new carrier that knowingly uses a disqualified driver. Unlike rows 7 and 8, this rule is in Part 391, so it applies to drivers of CMVs that don\'t need a CDL too.',
  body: `
<h2>What the rule says</h2>
<p>${cfr('391.15')} (a): a driver who is disqualified shall not drive a commercial motor vehicle, and a motor carrier shall not require or permit a disqualified driver to drive one. Part 391 uses the general CMV definition, which starts at 10,001 lbs (${cfr('390.5')}), so a box truck driver without a CDL is covered.</p>
<h2>Grounds for disqualification under 391.15</h2>
<ul>
<li><b>Loss of driving privileges</b>: for as long as a license, permit or privilege to operate a CMV is revoked, suspended, withdrawn or denied, until restored.</li>
<li><b>Criminal and other offenses</b> committed on duty: driving a CMV under the influence of alcohol (including 0.04 or more) or of certain controlled substances, transporting or possessing them on duty, leaving the scene of an accident, or a felony involving a CMV. First offense: 1 year (6 months for some possession cases); a repeat within 3 years: 3 years.</li>
<li><b>Out-of-service order violations</b>: at least 90 days to 1 year for a first conviction, longer for repeats, with stricter periods for placarded hazmat and vehicles designed for more than 15 passengers.</li>
<li><b>Texting</b> or <b>hand-held phone</b> while driving a CMV: 60 days after a second conviction within 3 years, 120 days after a third.</li>
</ul>
<h2>The driver must tell you</h2>
<p>A driver who receives notice that a license, permit or privilege to operate a CMV has been revoked, suspended or withdrawn must notify the employing carrier before the end of the business day after receiving it (${cfr('391.15')}). Put that requirement in writing in your driver policy so nobody can say they didn't know.</p>
<h2>Records that catch it</h2>
<ul>
<li>The pre-hire MVR from each State where the driver held a license in the past 3 years, within 30 days of hire, and the investigation of the driver's safety performance with DOT-regulated employers over the past 3 years (${cfr('391.23')}).</li>
<li>The annual MVR and the documented review, with the reviewer's name and date (${cfr('391.25')}).</li>
<li>The driver qualification file holding them, kept for the period of employment plus 3 years (${cfr('391.51')}).</li>
</ul>
<p>An auditor compares those records with logs and dispatch history. A driver who drove during a suspension shown on the MVR in your own file is the clearest form of this violation.</p>
<h2>How to fix it</h2>
<ol>
<li>Pull current MVRs for all drivers, including non-CDL drivers of 10,001 lbs or more.</li>
<li>Do and document the annual review for each one.</li>
<li>Remove any disqualified driver from CMV driving and record the date.</li>
<li>Add next-business-day reporting to your written driver policy.</li>
</ol>
${after}`,
  sources: [ecfr('391.15', 'disqualification of drivers'), ecfr('390.5', 'CMV definition'), ecfr('391.23', 'investigation and inquiries'), ecfr('391.25', 'annual inquiry and review'), ecfr('391.51', 'driver qualification file')],
  related: ['cdl-disqualified-driver', 'disqualified-cdl-or-clp', 'medical-certificate', 'no-valid-cdl'] }),

p({ slug: 'medical-certificate', row: 12, h1: 'Row 12: Knowingly using a physically unqualified driver (49 CFR 391.11(b)(4))', short: 'Row 12 · §391.11(b)(4) · single occurrence',
  title: 'New Entrant Audit: Using a Driver Without a Valid Medical Certificate (391.11(b)(4))',
  description: 'Automatic-fail row 12 of the FMCSA new entrant audit: using a driver who is not physically qualified, usually one with no current DOT medical certificate (49 CFR 391.11(b)(4), 391.41, 391.45).',
  lede: 'Row 12 fails a new carrier that knowingly uses a physically unqualified driver. In practice it is usually about a missing or expired DOT medical certificate.',
  body: `
<h2>What the rule says</h2>
<p>A person is qualified to drive a CMV only if, among other things, the person is physically qualified under Subpart E of Part 391 (${cfr('391.11')} (b)(4)). A person subject to Part 391 must not operate a CMV unless medically certified as physically qualified to do so (${cfr('391.41')}). The 385.321 table says this row refers to a driver operating a CMV as defined in 390.5, which starts at 10,001 lbs, so non-CDL drivers are included (${cfr('385.321')}).</p>
<h2>How often drivers must be examined</h2>
<p>A driver must be examined and certified if never certified before, and again if not certified within the preceding 24 months; certain drivers need it every 12 months (for example drivers certified under the insulin-treated diabetes or vision standards), and a driver whose ability to perform normal duties has been impaired by injury or disease must be re-examined (${cfr('391.45')}). The medical examiner may certify for a shorter period, so read the expiry date on each certificate.</p>
<h2>What goes in the driver qualification file</h2>
<ul>
<li><b>Non-CDL drivers:</b> the medical examiner's certificate or a legible copy, and a note showing you verified the examiner is listed on the National Registry of Certified Medical Examiners (${cfr('391.51')} (b)(6), (b)(8)).</li>
<li><b>CDL drivers:</b> the CDLIS motor vehicle record from the current licensing State showing medical certification status. A non-excepted interstate CDL holder without medical certification status on the CDLIS record is designated "not-certified" (${cfr('391.51')}).</li>
<li>Any medical variance or Skill Performance Evaluation certificate, if the certification depends on one.</li>
</ul>
<p>Medical certificates and related records may be removed from the file 3 years after they were made (${cfr('391.51')} (d)).</p>
<h2>What an auditor compares</h2>
<p>Certificate and CDLIS dates against logs and dispatch records. The common failure is not a driver with a serious medical condition; it is a certificate that expired months ago while the driver kept running, or a CDL driver whose new certificate never reached the State, so the State record still shows not-certified.</p>
<h2>How to fix it</h2>
<ol>
<li>List every driver with certificate expiry date and, for CDL drivers, the status on the latest CDLIS MVR.</li>
<li>Book renewals 30 to 60 days ahead with an examiner on the National Registry.</li>
<li>For CDL drivers, make sure the driver submits the new certificate to the State and pull a new MVR to confirm.</li>
<li>Take any driver with an expired certificate off CMV driving until recertified.</li>
</ol>
${after}`,
  sources: [ecfr('391.11', 'general qualifications'), ecfr('391.41', 'physical qualifications'), ecfr('391.45', 'who must be examined'), ecfr('391.51', 'driver qualification file')],
  related: ['disqualified-driver', 'no-valid-cdl', 'hours-of-service-records', 'disqualified-cdl-or-clp'] }),

p({ slug: 'hours-of-service-records', row: 13, h1: 'Row 13: Failing to require a record of duty status (49 CFR 395.8(a))', short: 'Row 13 · §395.8(a) · 51% or more of records',
  title: 'New Entrant Audit: No Record of Duty Status / ELD Logs (395.8(a)) and the 51% Rule',
  description: 'Automatic-fail row 13 of the FMCSA new entrant audit: failing to require drivers to record duty status, with a 51% threshold (49 CFR 395.8(a)). ELDs, paper-log exceptions, short-haul and retention.',
  lede: 'Row 13 fails a new carrier that fails to require its drivers to make a record of duty status (RODS). Unlike most rows, it takes a pattern: violations in 51% or more of the records examined.',
  body: `
<h2>What the rule says</h2>
<p>Under ${cfr('395.8')} (a), a motor carrier subject to Part 395 must require each driver it uses to record duty status for each 24-hour period. The default method is an <b>electronic logging device (ELD)</b>. A carrier may let a driver record duty status manually (paper log on the standard grid) only in listed cases, including:</p>
<ul>
<li>a driver who needs a record of duty status on not more than 8 days in any 30-day period;</li>
<li>driveaway-towaway operations where the vehicle driven is part of the shipment, or the vehicle transported is a motor home or RV trailer;</li>
<li>a vehicle manufactured before model year 2000, as shown by the VIN.</li>
</ul>
<p>Drivers must submit their records to the carrier within 13 days, and the carrier must keep records of duty status and supporting documents for at least 6 months (${cfr('395.8')} (k)).</p>
<h2>The 51% threshold</h2>
<p>The 385.321 table says this violation "requires a violation threshold (51% or more of examined records) to trigger automatic failure" (${cfr('385.321')}). An auditor examines a sample of driver-days; if a majority have no required record, the audit fails automatically. Fewer violations can still count against you under the general safety-management review, so don't aim for 50%.</p>
<h2>Short-haul drivers</h2>
<p>A driver who stays within a 150 air-mile radius of the normal work reporting location, returns there and is released within 14 consecutive hours, and has the required off-duty time is exempt from 395.8 and 395.11 if the carrier keeps accurate time records for 6 months showing the time on duty, total hours, time released, and (for new or intermittent drivers) the preceding 7 days (${cfr('395.1')} (e)(1)). Those time records replace logs; without them, the exemption doesn't hold. Separate rules apply to non-CDL property carriers.</p>
<h2>What an auditor compares</h2>
<p>ELD records against supporting documents: fuel receipts, tolls, bills of lading, dispatch records. Missing days, a truck moving with no driver logged in, or days with no record at all are what count toward the threshold.</p>
<h2>How to fix it</h2>
<ol>
<li>Use an ELD on FMCSA's registered list in every truck that needs one, and have each driver log in under their own account.</li>
<li>If you rely on an exception (8-in-30, pre-2000 engine, short-haul), write down which one and keep the records it requires.</li>
<li>Collect supporting documents and keep logs and documents 6 months.</li>
<li>Review a week of logs every month for missing days and unassigned driving.</li>
</ol>
${after}`,
  sources: [ecfr('395.8', 'record of duty status'), ecfr('395.1', 'short-haul exception')],
  related: ['annual-inspection', 'dvir-defects', 'medical-certificate', 'out-of-service-vehicle'] }),

p({ slug: 'out-of-service-vehicle', row: 14, h1: 'Row 14: Operating a vehicle declared out of service before repairs (49 CFR 396.9(c)(2))', short: 'Row 14 · §396.9(c)(2) · single occurrence',
  title: 'New Entrant Audit: Operating an Out-of-Service Vehicle Before Repairs (396.9(c)(2))',
  description: 'Automatic-fail row 14 of the FMCSA new entrant audit: requiring or permitting operation of a CMV declared out of service before the repairs are made (49 CFR 396.9(c)(2)). Towing, certification and records.',
  lede: 'Row 14 fails a new carrier that requires or permits a commercial motor vehicle declared "out of service" at an inspection to be operated before the required repairs are made. One occurrence fails the audit.',
  body: `
<h2>What the rule says</h2>
<p>Authorized inspectors declare and mark "out of service" any vehicle that, because of its mechanical condition or loading, would likely cause an accident or breakdown, using an "Out-of-Service Vehicle" sticker. Under ${cfr('396.9')} (c)(2), no motor carrier may require or permit anyone to operate that vehicle, and no one may operate it, until all repairs required by the out-of-service notice are satisfactorily completed. No one may remove the sticker before then.</p>
<h2>"Operate" includes towing, with one exception</h2>
<p>The rule says operating includes towing the vehicle, except that an out-of-service vehicle may be towed away by a vehicle using a crane or hoist. In practice: either repair it where it sits (mobile repair), or move it with a wrecker that lifts it. Driving it "just to the next exit" or hooking a tractor to an out-of-service trailer and pulling it to the shop is a violation.</p>
<h2>After the roadside inspection</h2>
<ul>
<li>The driver must deliver a copy of the inspection report to the carrier on arrival at the next terminal or facility, or transmit it immediately if not arriving within 24 hours (${cfr('396.9')} (d)(1)).</li>
<li>The carrier must examine the report and correct the violations or defects (${cfr('396.9')} (d)(2), linked to ${cfr('396.11')} (a)(3)).</li>
<li>Within <b>15 days</b> of the inspection, the carrier must certify that all violations were corrected by signing the carrier section of the form, return it to the issuing State agency if asked, and keep a copy at its principal place of business or where the vehicle is housed for <b>12 months</b> (${cfr('396.9')} (d)(3)).</li>
</ul>
<h2>What an auditor compares</h2>
<p>Roadside inspection reports with out-of-service items, against repair invoices, tow receipts, logs, ELD movement and fuel receipts. A truck that shows movement after the out-of-service time with no repair or crane-tow record is the textbook violation.</p>
<h2>How to fix it</h2>
<ol>
<li>Give drivers a written rule: an out-of-service vehicle doesn't move until repaired or lifted onto a wrecker; call the office.</li>
<li>Keep repair invoices with the date, time and location that match the out-of-service item.</li>
<li>Sign and date the carrier certification on every inspection report within 15 days, and file it in that unit's maintenance file for 12 months.</li>
<li>Track inspection reports in a log so none is missed.</li>
</ol>
<p>This matters before the audit too: a new entrant found operating a vehicle placed out of service without taking the necessary corrective action, through a roadside inspection or any other means, may be subjected to an expedited safety audit or compliance review (${cfr('385.308')}).</p>
${after}`,
  sources: [ecfr('396.9', 'inspection, out-of-service vehicles'), ecfr('396.11', 'corrective action'), ecfr('385.308', 'expedited audits')],
  related: ['dvir-defects', 'annual-inspection', 'hours-of-service-records', 'insurance-property-carriers'] }),

p({ slug: 'dvir-defects', row: 15, h1: 'Row 15: Not fixing out-of-service defects on a driver vehicle inspection report (49 CFR 396.11(a)(3))', short: 'Row 15 · §396.11(a)(3) · single occurrence',
  title: 'New Entrant Audit: DVIR Defects Not Corrected Before Operating (396.11(a)(3))',
  description: 'Automatic-fail row 15 of the FMCSA new entrant audit: failing to correct out-of-service defects listed by a driver on a DVIR before the vehicle is operated (49 CFR 396.11(a)(3)). Reports, repairs, certification.',
  lede: 'Row 15 fails a new carrier that fails to correct out-of-service defects listed by a driver on a driver vehicle inspection report (DVIR) before the vehicle is operated again. One occurrence fails the audit.',
  body: `
<h2>What the rule says</h2>
<p>${cfr('396.11')} (a) has three steps:</p>
<ol>
<li><b>Report.</b> At the end of each day's work, the driver prepares a written report on each vehicle operated, covering at least service brakes and trailer brake connections, parking brake, steering, lights and reflectors, tires, horn, wipers, mirrors, coupling devices, wheels and rims, and emergency equipment. A report is required only if a defect or deficiency is found or reported. The driver signs it.</li>
<li><b>Repair.</b> Before requiring or permitting a driver to operate the vehicle, the carrier must repair any listed defect or deficiency likely to affect safe operation.</li>
<li><b>Certify.</b> The carrier must certify on the report that the defect has been repaired, or that repair is unnecessary, before the vehicle is operated again.</li>
</ol>
<p>The audit row is "failing to correct out-of-service defects listed by driver in a driver vehicle inspection report before the vehicle is operated" (${cfr('385.321')}).</p>
<h2>Exceptions and retention</h2>
<p>The DVIR rule in 396.11(a) doesn't apply to a private motor carrier of passengers (nonbusiness), a driveaway-towaway operation, or <b>any motor carrier operating only one commercial motor vehicle</b> (${cfr('396.11')} (a)(5)). Carriers it applies to must keep the report, the certification of repairs and the certification of the driver's review for <b>3 months</b> from the date the report was prepared. Reports may be electronic.</p>
<h2>What "out-of-service defect" means here</h2>
<p>The row targets defects serious enough to put the vehicle out of service, such as brake, steering, tire or coupling defects of the kind an inspector would place out of service. Minor items still need the repair-or-unnecessary certification, but the automatic fail is about the serious ones. When in doubt, treat a safety-related defect as serious and fix it before the next trip.</p>
<h2>What an auditor compares</h2>
<p>DVIRs listing defects against repair orders, parts invoices and the next days' logs or ELD movement. A report with a brake defect, no repair record and the truck running the next morning is the violation. A missing certification signature on a fixed defect is a paperwork problem; a missing repair is the automatic fail.</p>
<h2>How to fix it</h2>
<ol>
<li>Use a DVIR form or app that has a repair certification section, and require it to be signed before dispatch.</li>
<li>Make dispatch check the last DVIR for open defects before assigning the truck.</li>
<li>Keep repair invoices with the DVIR in the unit's file.</li>
<li>Keep DVIRs and certifications for at least 3 months.</li>
</ol>
${after}`,
  sources: [ecfr('396.11', 'driver vehicle inspection reports')],
  related: ['out-of-service-vehicle', 'annual-inspection', 'hours-of-service-records', 'insurance-property-carriers'] }),

p({ slug: 'annual-inspection', row: 16, h1: 'Row 16: Using a CMV not periodically inspected (49 CFR 396.17(a))', short: 'Row 16 · §396.17(a) · 51% or more of records',
  title: 'New Entrant Audit: Annual (Periodic) Inspection Missing (396.17(a)) and the 51% Rule',
  description: 'Automatic-fail row 16 of the FMCSA new entrant audit: using CMVs not periodically inspected, with a 51% threshold (49 CFR 396.17(a)). Every unit in a combination, qualified inspectors, proof on the vehicle, 14-month records.',
  lede: 'Row 16 fails a new carrier that uses commercial motor vehicles that have not had their periodic (annual) inspection. Like row 13, it needs a pattern: violations in 51% or more of the records examined.',
  body: `
<h2>What the rule says</h2>
<p>Every CMV must be inspected as ${cfr('396.17')} requires, covering at least the parts and accessories in Appendix A to Part 396. "CMV" includes <b>each vehicle in a combination</b>: for a tractor, semitrailer and full trailer, the tractor, the semitrailer and the full trailer (and converter dolly) must each be inspected. A carrier may not use a CMV unless each component has passed an inspection at least once in the preceding <b>12 months</b> and documentation of it is <b>on the vehicle</b>.</p>
<h2>The 51% threshold</h2>
<p>The 385.321 table says this violation requires a threshold of 51% or more of examined records to trigger automatic failure (${cfr('385.321')}). A carrier with two tractors and three trailers, of which three units have no current inspection, is over the line. Trailers are the usual blind spot.</p>
<h2>Proof on the vehicle</h2>
<p>The documentation may be the inspection report itself or a sticker or decal based on it that shows the inspection date, the name and address of the carrier or other entity where the report is kept, information identifying the vehicle if not clearly marked, and a certification that it passed a 396.17 inspection (${cfr('396.17')} (c)). Vehicles passing a State periodic inspection program that meets Appendix A are treated as meeting the annual requirement for 12 months from the end of the month inspected (${cfr('396.17')} (f)).</p>
<h2>Who may inspect</h2>
<p>A carrier may do the inspection itself or use a commercial garage, leasing company, truck stop or similar business as its agent, but the inspector must be qualified: understand the Part 393 and Appendix A criteria and have passed a federal or State training program or certificate, or have at least 1 year of qualifying training or experience. The carrier keeps evidence of the inspector's qualifications while the person does inspections and for 1 year after, except for State program inspections (${cfr('396.19')}).</p>
<h2>Records</h2>
<p>The inspector prepares a report identifying the inspector, carrier, date, vehicle, components inspected and results, with a certification. The original or a copy must be kept for <b>14 months</b> where the vehicle is housed or maintained and produced on demand (${cfr('396.21')}). For a leased trailer you didn't inspect, you're responsible for obtaining the last report on demand.</p>
<h2>How to fix it</h2>
<ol>
<li>List every power unit and trailer you use, including interchanged or leased trailers.</li>
<li>Get any unit without a current inspection inspected before its next use.</li>
<li>Put the decal or report on each unit, and file the report in its maintenance file for 14 months.</li>
<li>Calendar each unit's due date 11 months after its last inspection.</li>
</ol>
${after}`,
  sources: [ecfr('396.17', 'periodic inspection'), ecfr('396.19', 'inspector qualifications'), ecfr('396.21', 'periodic inspection recordkeeping')],
  related: ['dvir-defects', 'out-of-service-vehicle', 'hours-of-service-records', 'insurance-property-carriers'] }),
];
