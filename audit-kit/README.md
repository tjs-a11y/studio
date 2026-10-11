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
- 49 CFR Part 385 Subpart D (new entrant program, 385.307 / 385.308 / 385.319 / 385.325): https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B/part-385/subpart-D
- FMCSA FAQ, "What would cause a motor carrier to fail a new entrant safety audit?": https://www.fmcsa.dot.gov/faq/what-would-cause-motor-carrier-fail-new-entrant-safety-audit-ss-385321
- 2008 final rule, which sets the 51% threshold for 395.8(a) and 396.17(a): https://www.federalregister.gov/documents/2008/12/16/E8-29253/new-entrant-safety-assurance-process
- Parts 382 (drug and alcohol), 383 (CDL), 387 (insurance), 390, 391 (driver qualification), 395 (HOS), 396 (maintenance): https://www.ecfr.gov/current/title-49/subtitle-B/chapter-III/subchapter-B

### Rules encoded (49 CFR 385.321(b))
| # | Cite | Rule | Trigger |
|---|---|---|---|
| 1 | 382.115(a) | No drug and alcohol testing program (domestic) | single occurrence |
| 2 | 382.115(b) | No drug and alcohol testing program (foreign-domiciled) | single |
| 3 | 382.201 | Using a driver known to be at 0.04 alcohol or higher | single |
| 4 | 382.211 | Using a driver who refused a required test | single |
| 5 | 382.215 | Using a driver known to have tested positive for drugs | single |
| 6 | 382.305 | No random testing program | single |
| 7 | 383.3(a) / 383.23(a) | Knowingly using a driver without a valid CDL | single |
| 8 | 383.37 | Using a driver whose CDL is suspended, revoked, canceled or disqualified | single |
| 9 | 387.7(a) | Insurance below the minimum (property) | single |
| 10 | 387.31(a) | Insurance below the minimum (passenger) | single |
| 11 | 391.15(a) | Knowingly using a disqualified driver | single |
| 12 | 391.11(b)(4) | Knowingly using a physically unqualified driver | single |
| 13 | 395.8(a) | No record of duty status | 51% of records |
| 14 | 396.9(c)(2) | Operating an out-of-service vehicle before repairs | single |
| 15 | 396.11(a)(3) | Not correcting out-of-service defects listed on a DVIR | single |
| 16 | 396.17(a) | Using a vehicle not periodically inspected | 51% of records |

Re-verify this table against the current eCFR text before a paid launch. The subsection of the 383.37 row is cited without a paragraph letter, because secondary sources disagree on (a) versus (b).
