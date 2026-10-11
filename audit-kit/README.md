# New Authority Audit Kit (`audit-kit`)

A single static page (`index.html`) for brand-new US trucking carriers facing the FMCSA New Entrant Safety Audit in their first year.

## Free: "Will you pass your new entrant audit?"
- Three setup questions: does any truck need a CDL, freight or passengers, US or foreign-domiciled. These mark which of the 16 rules apply.
- One Yes / No / Not sure question per automatic-fail rule in 49 CFR 385.321(b).
- The result is a pass-risk level (HIGH if any No, MEDIUM if any Not sure or unanswered, LOW otherwise) and a readiness percentage. It lists every rule at risk with what to fix and the CFR cite.
- Answers are saved in `localStorage` (`auditkit:*` keys, wrapped in try/catch).
- A watermarked sample page (sample company and data) previews the kit.

## Paid: the Kit ($39 one-time)
Unlocked by `Studio.init({ tool: 'audit-kit', onChange })` when `s.pro` is true. The buy button calls `Studio.upgrade('kit', 'once')`, and errors show inline.

The buyer fills in a company profile: legal name, USDOT, MC, address, authority grant date, insurance expiry, DER and consortium. They also add a drivers list (name, CDL state, CDL expiry, med card expiry, hire date) and a vehicles list (unit #, type, year/make, VIN, last annual inspection). The browser then generates:
1. DQ file checklist plus a cover sheet for each driver, with expiry warnings.
2. Drug and alcohol kit: policy template, consortium/TPA enrollment checklist, pre-employment test log, Clearinghouse query log.
3. HOS/ELD records checklist plus a supporting-documents retention log.
4. A maintenance file per unit (schedule, repair log, annual inspection, roadside OOS) plus a DVIR log.
5. Insurance and registration checklist (MCS-90, BOC-3, UCR, MCS-150, accident register, IRP/IFTA, 2290, hazmat).
6. Audit-day binder: table of contents, document request list, "what the auditor asks" prep sheet, and a 30/60/90-day timeline dated from the grant date.
7. Expiry calendar (CDL, med card, annual MVR and Clearinghouse query, annual inspections, insurance, MCS-150 month from the USDOT digits, UCR, approximate 12- and 18-month new entrant dates). It exports as `.ics` (Blob download, 30-day reminders), and a copy-to-clipboard fallback is offered too.

Every document is a printable page. "Print / Save as PDF" prints the open document. "Print all" and "Download all as .html" are also available.

## Privacy
Everything runs in the browser. The profile and answers stay in this browser's local storage, and "Clear my data" removes them. The only network calls are the shared billing calls in `/js/pro.js`.

## Disclaimer
This is educational, not legal advice, and it does not guarantee passing the audit. FMCSA rules change, so confirm on fmcsa.dot.gov and ecfr.gov.

## Sources
- 49 CFR 385.321 (the 16 automatic-fail regulations): https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-385/subpart-D/section-385.321
- 49 CFR Part 385 Subpart D (new entrant program: 385.307 18-month monitoring and audit after generally at least 3 months; 385.308 expedited audits; 385.319(c) notice within 45 days, 60-day (or 45-day) corrective action; 385.325 revocation on day 61 (or 46)): https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-385/subpart-D
- FMCSA FAQ, "What would cause a motor carrier to fail a new entrant safety audit?": https://www.fmcsa.dot.gov/faq/what-would-cause-motor-carrier-fail-new-entrant-safety-audit-ss-385321
- 2008 final rule that created the table (73 FR 76489, Dec. 16, 2008, as cited in the eCFR): https://www.federalregister.gov/documents/2008/12/16/E8-29253/new-entrant-safety-assurance-process
- Parts 382 (drug and alcohol), 383 (CDL), 387 (insurance), 390 (MCS-150 schedule is 390.19T; 390.19 is the suspended Mexico-domiciled version), 391 (driver qualification), 395 (HOS), 396 (maintenance): https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B
- Verified against the eCFR API (Title 49 up to date as of Oct 7, 2026), e.g. https://www.ecfr.gov/api/versioner/v1/full/2026-10-07/title-49.xml?part=385&section=385.321
- Not in the regulation text: the 12-month target for completing the audit (it comes from federal law and FMCSA practice). The page labels it approximate.

### Rules encoded (49 CFR 385.321(b), checked against eCFR up to date as of Oct 7, 2026)
The official table has 16 rows. Row 1 covers 382.115(a) (domestic) and 382.115(b) (foreign); the page asks one of the two, based on the setup answer, so at most 16 questions apply. Questions are numbered by official row.

| Row | Cite | Rule | Trigger |
|---|---|---|---|
| 1 | 382.115(a) / 382.115(b) | Failing to implement a drug and alcohol testing program (domestic / foreign carriers) | single occurrence |
| 2 | 382.201 | Using a driver known to have an alcohol content of 0.04 or greater | single |
| 3 | 382.211 | Using a driver who refused a required test | single |
| 4 | 382.215 | Using a driver known to have tested positive for drugs | single |
| 5 | 382.305 | Failing to implement a random testing program | single |
| 6 | 383.3(a) / 383.23(a) | Knowingly using a driver without a valid CDL | single |
| 7 | 383.37(b) | Knowingly using a driver whose CLP/CDL is disqualified by a State, who lost the right to drive a CMV in a State, or who is disqualified | single |
| 8 | 383.51(a) | Knowingly letting a disqualified driver drive a CMV (as defined in 383.5) | single |
| 9 | 387.7(a) | Operating without the required minimum financial responsibility | single |
| 10 | 387.31(a) | Operating a passenger vehicle without the required minimum financial responsibility | single |
| 11 | 391.15(a) | Knowingly using a disqualified driver | single |
| 12 | 391.11(b)(4) | Knowingly using a physically unqualified driver (CMV as defined in 390.5) | single |
| 13 | 395.8(a) | Failing to require a record of duty status | 51% or more of examined records |
| 14 | 396.9(c)(2) | Operating a vehicle declared out of service before repairs | single |
| 15 | 396.11(a)(3) | Not correcting out-of-service defects listed on a DVIR before operating | single |
| 16 | 396.17(a) | Using a CMV not periodically inspected | 51% or more of examined records |

Recheck this table against the current eCFR before each paid launch.
