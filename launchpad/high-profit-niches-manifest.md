# High-Profit Niches Manifest
**Status:** Functional specification — roadmap candidate  
**Repository path:** `launchpad/high-profit-niches-manifest.md`  
**Operating principle:** Local-first, privacy-preserving automation  
**Pricing model:** Recurring subscription; prices below are proposed launch prices, not validated market pricing.

## Engineering Constitution: Local Execution Only

All calculations, parsing, matching, filtering, and audit outputs MUST execute on the user's device. Customer operational data must not be uploaded to a vendor-controlled server for processing.

- **Local processing:** Parse source files, calculate metrics, apply rules, and generate reports in a local application/runtime.
- **Data boundaries:** Raw records, identifiers, documents, emails, weights, meter readings, lease allocations, and derived operational results remain on the user's device by default.
- **No silent egress:** No background upload, telemetry containing operational data, third-party analytics payloads, or remote AI processing. Any optional network action must be explicit, narrowly scoped, and disabled by default.
- **Credentials:** Store mail and integration credentials in the operating system's secure credential store where available. Never put secrets in logs or configuration files committed to source control.
- **Auditability:** Provide a local rule log showing input source, timestamp, rule/version, match rationale, and resulting decision. Keep configurable retention and local deletion controls.
- **Failure-safe behavior:** Invalid, incomplete, ambiguous, or conflicting data must be flagged for review rather than silently discarded or treated as a confirmed finding.
- **Automation boundary:** “Zero-human-input” means recurring processing after initial setup, permissions, mappings, and rules are configured. It does not mean bypassing consent, access controls, legal requirements, or human review of exceptions.
- **External dependencies:** Remote sources may be read only when explicitly configured and authorized. Where source access requires a service connection, the app should retrieve only what is necessary and perform all subsequent analysis locally. If the strict local-only requirement cannot be met for a workflow, that workflow must not be represented as compliant.

## Shared Subscription Model

| Tier | Price | Intended customer | Proposed entitlement |
|---|---:|---|---|
| Single-User Operator | **$49/month** | Individual operator, owner, auditor, or analyst | One licensed user/device profile; local automated jobs; local reports and exports |
| Multi-User Corporate/Trust | **$249/month** | Business, corporate group, or trust administration team | Multiple authorized users; shared rule templates and team configuration; local-first deployment options |

**Commercial notes**
- Prices are proposed recurring list prices, billed monthly; taxes and payment processing terms are separate.
- Define seat/device limits, concurrent use, support, updates, and permitted deployment topology in the product terms before launch.
- Do not imply that a subscription fee includes third-party utility, email, port, terminal, mill, or data-provider fees.
- No revenue, margin, demand, or competition claims are guaranteed by this specification; validate willingness to pay and the competitive landscape before launch.

---

## Niche A — Port Watcher
**Vertical:** Intermodal drayage carriers  
**Problem focus:** Container turnaround visibility and demurrage chargeback filtering  
**Primary user:** Drayage dispatcher, carrier operations manager, or billing/reconciliation operator

### Objective
Run a background process on the customer's device to assemble container event timelines from authorized local/imported records, estimate dwell and turnaround intervals, and flag potential demurrage or detention charges that do not match the carrier's configured rules or supporting evidence.

### Inputs
- Locally imported terminal/port event exports, EDI extracts, CSV/XLSX files, PDFs, or other documented formats.
- Container, booking, chassis, shipment, appointment, ingate/outgate, empty-return, and delivery identifiers where available.
- Customer-entered or imported terminal free-time rules, cutoff times, holidays, tariffs, and contract terms.
- Carrier dispatch and proof-of-delivery records.

### Processing and rules
1. Normalize supported timestamps and time zones while preserving original values.
2. Match records using configured identifiers and transparent fallback rules.
3. Build a per-container event timeline and calculate configured turnaround/dwell intervals.
4. Apply versioned free-time, cutoff, calendar, and rate rules to estimate potential exposure.
5. Compare invoices/charge lines with event evidence and flag duplicates, unsupported dates, inconsistent container IDs, or rule mismatches.
6. Assign an explainable result: **supported**, **potential discrepancy**, or **insufficient evidence**. Never automatically assert fraud or submit a dispute without explicit authorization.

### Outputs
- Local container timeline and turnaround report.
- Potential demurrage/detention discrepancy queue with evidence and calculation trace.
- CSV/PDF export for authorized billing or dispute workflows.
- Local audit log of rule version and each decision.

### Acceptance criteria
- Re-running the same input set with the same rules produces deterministic results.
- Every calculated interval identifies its source timestamps, time zone, and applied rule.
- Missing or contradictory event data is flagged, not guessed.
- The application functions on local files without uploading operational records.

### Key risks / dependencies
Terminal event definitions, tariff changes, local time zones, late EDI messages, and source-format variation can materially affect accuracy. Support only documented formats and customer-authorized sources; make rules inspectable and versioned.

---

## Niche B — Hydro Flow
**Vertical:** Volumetric water-right holders and water-allocation administrators  
**Problem focus:** Local flow-meter monitoring against regional utility or district lease allocations  
**Primary user:** Water-right holder, agricultural operator, allocation manager, or trust administrator

### Objective
Monitor locally available flow-meter readings, compare calculated usage and rate-of-flow totals with configured lease/allocation limits and time windows, and alert the user locally to apparent overuse, underuse, missing readings, or approaching allocation thresholds.

### Inputs
- Locally imported meter readings or explicitly authorized meter-gateway exports.
- Meter ID, units, calibration metadata, timestamps, and quality flags.
- User-supplied or authorized district/utility allocation schedules, lease terms, limits, seasonal windows, and carryover rules.
- Mapping between meters, parcels/wells, rights, accounts, and lease records.

### Processing and rules
1. Validate timestamps, units, meter identity, and monotonicity/rollover rules.
2. Normalize units to a configured canonical unit while retaining original values.
3. Calculate interval and cumulative volume, with explicit handling for gaps, resets, and suspect readings.
4. Compare usage against the applicable allocation, lease, seasonal, and reporting-period rules.
5. Generate local threshold alerts and a traceable reconciliation report.
6. Mark readings as **valid**, **suspect**, or **incomplete**; never silently interpolate missing readings into compliance determinations.

### Outputs
- Local flow and cumulative-volume dashboard.
- Allocation utilization by right, meter, parcel, lease, and reporting period.
- Threshold alerts, exception reports, and CSV/PDF exports.
- Reconciliation trace showing source readings, conversion factors, and rule version.

### Acceptance criteria
- Every total is reproducible from retained source readings and disclosed conversions.
- Missing data, meter resets, unit ambiguity, and calibration concerns are visible exceptions.
- Allocation rules are effective-dated and can be reviewed before activation.
- No claim of legal water-right compliance is made solely from an automated estimate.

### Key risks / dependencies
Water-right rules, lease structures, reporting periods, meter calibration, and district data availability vary by jurisdiction. Require customer confirmation of applicable terms; treat outputs as operational monitoring, not legal advice or an official allocation determination.

---

## Niche C — Scale Audit
**Vertical:** Timber harvesters, log haulers, and timber procurement operations  
**Problem focus:** Email attachment processing and reconciliation of mill scale tickets against delivery/log-weight records  
**Primary user:** Logging business owner, timber accounting clerk, procurement manager, or auditor

### Objective
Process authorized email attachments locally, extract ticket and delivery fields from supported file types, cross-reference mill scale tickets with log-weight/delivery records, and flag missing tickets, duplicate ticket numbers, mismatched loads, dates, destinations, or weights.

### Inputs
- Email attachments obtained through a customer-authorized local mail client/export or a specifically approved connector.
- PDF, CSV, XLSX, image, and text formats only where the parser/OCR support is documented.
- Delivery/load logs, truck and trailer IDs, driver/load IDs, timber tract, species/grade where present, mill, gross/tare/net weights, timestamps, and ticket identifiers.
- Customer-defined tolerance thresholds, weight units, and matching rules.

### Processing and rules
1. Import or watch a designated local folder/mail export; do not transmit attachments to external OCR or AI services.
2. Parse structured files locally. For scans/images, use on-device OCR only; flag low-confidence fields for review.
3. Normalize identifiers, units, dates, and weight fields while retaining raw extracted values and source locations.
4. Match scale tickets to delivery logs using exact identifiers first, then transparent configurable composite rules.
5. Apply customer-defined weight tolerances and detect duplicates, unmatched deliveries, missing tickets, inconsistent net weights, and out-of-window dates.
6. Produce an explainable match status: **matched**, **variance**, **duplicate candidate**, **unmatched**, or **low-confidence extraction**.

### Outputs
- Local ticket-to-delivery reconciliation ledger.
- Exception queue with source-file references and field-level differences.
- Daily/weekly variance summaries and CSV/PDF exports.
- Local audit log and reproducible match rationale.

### Acceptance criteria
- Source email/attachment content remains on the device during parsing and matching.
- Each extracted field can be traced to its source file and page/row where technically available.
- Matching thresholds are configurable, versioned, and visible.
- Low-confidence OCR and ambiguous matches are never auto-certified as correct.
- Re-importing the same source files does not silently duplicate records.

### Key risks / dependencies
Scanned ticket quality, handwritten fields, inconsistent mill formats, duplicate identifiers, scale calibration, and differing weight conventions can reduce match confidence. Keep original files, support a documented format matrix, and route ambiguous cases to an exception queue.

---

## Cross-Product Architecture Requirements

- **Local-first runtime:** Desktop application or locally hosted runtime controlled by the customer. Web UI, if used, must not require sending business records to a remote processing service.
- **Storage:** Local database/files with encryption-at-rest where supported, access controls, backup/export, and deletion procedures.
- **Parsing:** Prefer deterministic parsers and explicit schemas. Any OCR must run on-device; no remote OCR/LLM API for customer records.
- **Rule engine:** Versioned, testable, inspectable rules with fixture-based tests and reproducible calculations.
- **Scheduling:** Local background jobs with visible status, configurable cadence, pause/resume, and retry limits.
- **Observability:** Local logs by default; redact sensitive values. Diagnostic sharing must be opt-in and scrubbed.
- **Security:** Least privilege, secure credential storage, dependency scanning, signed updates where supported, and documented threat model.
- **Interoperability:** CSV/XLSX/PDF import/export with explicit supported-version documentation. Preserve originals and record provenance.
- **Accessibility:** Keyboard navigation, accessible labels, readable exception states, and screen-reader-compatible reports.
- **Billing isolation:** Subscription entitlement checks must not upload operational data. If online license verification is used, send only the minimum license/account metadata, not customer files, calculations, or business records.
- **Testing:** Unit tests for calculations and parsers; fixtures for daylight-saving transitions, malformed records, duplicate files, unit conversion, missing fields, OCR confidence, and adversarially inconsistent input; regression tests for every rule change.

## Release Gates

A niche is not launch-ready until it has:
1. A documented customer interview/problem-validation record and competitor review.
2. A supported-input-format matrix and sample fixtures with permission to use them.
3. A local-only data-flow review demonstrating no operational-data egress.
4. Deterministic calculation and parser tests with auditable results.
5. Threat model, credential handling, retention/deletion, and backup documentation.
6. A defined exception-handling path and clear limitations for legal, billing, or compliance decisions.
7. Tested subscription entitlements for the $49/month and $249/month tiers.
8. Pilot acceptance criteria, error-rate targets, and a support/incident process.

**Roadmap principle:** Validate the pain and source-data access before committing to implementation. “Low competition,” “high margin,” and “zero-human-input” are hypotheses to test, not established market facts.


## 2026-10-31 — Weekend acquisition / telemetry cold-storage

- **Retrieved:** 2026-10-31 09:04 CDT (14:04 UTC).
- **Quickwell Vercel Web Analytics, exact 7-day windows:** 2026-10-24 14:04 UTC–2026-10-31 14:04 UTC = **23 pageviews**; prior 2026-10-17 14:04 UTC–2026-10-24 14:04 UTC = **121 pageviews**. Current referrers: **2 Google pageviews, 21 with no recorded referrer**; prior: **2 Google, 119 no referrer**. These are pageviews/referrer classifications, not unique users, conversions, or Search Console metrics. Source: Vercel Web Analytics for project `studio`.
- **Pre-launch niche routes:** Vercel pageview query returned no rows for `/port-watcher`, `/hydro-flow`, or `/scale-audit` in either exact 7-day window. Treat as 0 observed pageviews in this analytics query, not proof of no demand. Custom-event query returned no events.
- **Latest available /api/stats snapshot:** `metrics/stats.json`, fetched 2026-10-30 16:48:24 UTC from `https://quickwell.app/api/stats`; `enabled:true`, `total_checks:0`, `total_subs:0`; `haul-audit.upgrade_clicks:1`, `royalty-check.upgrade_clicks:1`; other catalog tool check/upgrade/sub counters in this snapshot were 0. Snapshot is one day older than this retrieval. Direct read from the automation host is documented as 403; use the committed workflow snapshot rather than inventing a live read.
- **Telemetry gate — FAIL/BLOCKED:** source review of `port-watcher/index.html`, `hydro-flow/index.html`, `scale-audit/index.html`, and `js/pro.js` found no `click_operator` / `click_manager` event handlers or required exact payloads. `api/stats.js` builds keys only from catalog tool IDs; the three pre-launch tools are not in `catalog/tools.json`, so no dedicated interest counters are exposed there. Backend/API freeze remains intact through 2026-11-02; no API edits or production merges made.
- **Haul Audit / Royalty Check privacy quota source review:** both pages use per-tool `localStorage` counters keyed by the visitor's local calendar date, show remaining checks, and keep computed results visible after the third check. Pro gates saved history/export features rather than calculation results. Source review only; runtime behavior not tested in a browser this shift.
- **Referral attribution — source PASS:** `js/pro.js` accepts only a 1–40 character alphanumeric/underscore/hyphen `?ref=` label, stores it in session storage, and passes it to `/api/checkout`; `api/checkout.js` copies it to Checkout Session and subscription/payment-intent metadata. No customer-entered operational data is used for attribution.
- **Stripe gate — BLOCKED:** `api/checkout.js` contains the exact lookup keys `haul-audit__pro__month` and `royalty-check__pro__month` and checks recurring monthly interval, but does not fail closed on amount/currency mismatch. Authenticated Stripe-side price verification is unavailable. Do not claim checkout is verified; no API changes before freeze lift.
- **GSC — BLOCKED:** no authenticated Search Console connector/export available. Impressions, clicks, CTR, average position and index status for the three niche queries are UNKNOWN, not zero.
- **Source checks:** FMCSA Data Dissemination Program documents Motus Carrier and Motus AuthHist feeds for new authorizations/status changes (retrieved 2026-10-31): https://www.fmcsa.dot.gov/registration/fmcsa-data-dissemination-program. RRC lists a nightly Drilling Permit Master and Trailer daily file and its included fields (retrieved 2026-10-31): https://www.rrc.texas.gov/resource-center/research/data-sets-available-for-download/. IRS current guidance confirms the 1099-NEC $2,000 threshold for payments made in 2026 and distinguishes other payment types (retrieved 2026-10-31): https://www.irs.gov/businesses/small-businesses-self-employed/am-i-required-to-file-a-form-1099-or-other-information-return. No new carrier prospect list or named mineral-owner list generated.
- **Books:** only CEO-selected titles reviewed: `Mastering Cryptocurrency Trading`, `Mastering the Crypto Market`, and `Mediterranean Diet Recipes Book`. Dedicated landing pages and Book JSON-LD exist; no attributable sales/royalty data available to rank them. No other book promoted in this run.
- **Indexing/deployment:** no production deployment or IndexNow submission initiated from this non-production branch. Search-result visibility is not a substitute for GSC indexing status.
- **Verification:** repository source inspection complete; tests/build and browser runtime tests **NOT RUN** (no checked-out runtime/dependencies available through connected repository actions). **Code freeze intact.**
- **Next concrete action:** add the missing pre-launch click telemetry and amount/currency validation only after 2026-11-03, with tests and authenticated Stripe verification; connect GSC or import an export for query-level measurement.


## 2026-10-31 — Acquisition execution follow-up (cold storage)

- **Studio review branch / PR:** `growth/weekend-discovery-2026-10-31`; draft PR #7: https://github.com/tjs-a11y/studio/pull/7. Latest preview deployment for commit `b32a634df43b5ee7c0d02d6757a9280d41b75443` is Vercel READY at https://studio-glyyoue6g-tjs-a11ys-projects.vercel.app (preview only). Route-level preview checks are BLOCKED by Vercel Deployment Protection; no Vercel CLI available in this runtime. PR #5 was closed as superseded; PR #7 contains the weekend sitemap fix plus the new consumer and IRS work.
- **Consumer search content staged:** five unique guides (leftovers/dinner, reading an electricity bill, recurring charges, suspicious texts, comparing estimates). Each has a canonical URL, Article JSON-LD, primary-source links, tool CTA, disclaimer and the verified local-browser privacy sentence. Guide hub schema, sitemap-main, SEO test, llms-full and homepage metadata updated. Not in production; not indexed by evidence.
- **Bill Radar evidence:** EIA Electric Power Monthly Table 5.3 (released 2026-10-23) reports U.S. residential average 18.16¢/kWh for August 2026 vs 17.57¢ August 2025; 2026 value preliminary. Source: https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_03. Fixed-plan copy now says contract/market-specific; no universal price-jump claim. No state/utility tariff order or municipal rate notice was researched in this shift; no rate-change claim published.
- **Year-End Vendor Check / 1099:** production-branch source review confirms CSV parsing is client-side and the only fetch is an anonymous `{tool,event}` check counter; no CSV/row content is sent. Route-level live test was not available from this runtime. Review branch adds IRS official sources and explains the 2026 $2,000 threshold for covered services and many rent categories, while preserving $10 royalties and $600 gross proceeds paid to attorneys as separate thresholds; paper 1099-MISC deadline for 2026 payments is adjusted to March 1, 2027 because February 28 is Sunday. IRS sources: https://www.irs.gov/businesses/small-businesses-self-employed/am-i-required-to-file-a-form-1099-or-other-information-return and https://www.irs.gov/publications/p1099.
- **FMCSA Track A:** source documentation reviewed: https://www.fmcsa.dot.gov/registration/fmcsa-data-dissemination-program. Current MOTUS rows downloaded this shift: UNKNOWN / not retrieved; current authority verification: NOT RUN; qualified carrier prospects: 0; verified business contacts: 0; outreach drafts: 0; sent/accepted/bounced/replied/opt-outs: 0. This is not a claim that no new authorities exist.
- **Texas RRC Track B:** daily Drilling Permit Master/Trailer file availability reviewed: https://www.rrc.texas.gov/resource-center/research/data-sets-available-for-download/. File rows downloaded this shift: UNKNOWN / not retrieved; deduped permits and qualified operators: UNKNOWN; named private mineral-owner data compiled: 0. No claim that no permits were filed.
- **Fleet Track C:** no approved CRM/prospecting connector or verified public business contact list used this shift. Qualified business prospects: 0; verified contacts: 0; outreach drafts: 0; sent/accepted/bounced/replied/opt-outs: 0. No cold email or message sent.
- **Community research:** r/OwnerOperators recent discussion reviewed: https://www.reddit.com/r/OwnerOperators/comments/1x6si3s/here_im_in_cali_with_a_reefer_load_my_deliver_was/ (posted Oct 15, replies through Oct 20; receiver delay/reefer compensation). Additional rate-confirmation clause discussion: https://www.reddit.com/r/OwnerOperators/comments/1wgo255/clauses_i_check_on_every_rate_con_now_after_page/ (Sep 15; pre-approval/detention clauses). TheTruckersReport and Freight Relocators searches returned older historical threads, not current October 2026 discussions. One context-specific Haul Audit reply draft prepared; posts/replies/DMs: 0.
- **Global consumer tracks:** no current utility order, tenant-resource discussion or consumer repair thread was researched in this shift. Response drafts for Bill Radar, Before You Sign, Fair Price/Proof: 0. The five consumer SEO guides are not community replies.
- **Books:** only the three CEO-selected book pages were reviewed; all have Book structured data and Books2Read universal links. Retailer sales/royalty data: UNKNOWN; no title ranking. Three-book copy pack prepared. Bitcoin Halving caption marked withdrawn/out of scope.
- **Distribution assets:** Quickwell consumer pack, selected-three-books pack, and one freight-thread reply draft saved in MONAD HQ `marketing/tiktok-pack/2026-10-31/`. Ready-to-publish assets: 3 files; published/sent: 0. Referral labels are on direct tool links so checkout metadata can attribute channel when a customer upgrades.
- **Pre-launch niches:** Port Watcher, Hydro Flow and Scale Audit pageviews 0 observed in both Vercel 7-day windows; custom-event query returned no rows; no dedicated `*.interest` counters in the latest stats snapshot; GSC impressions/clicks/CTR/position UNKNOWN because no authenticated GSC connection/export. No rank inferred from missing telemetry.
- **Release / indexing:** no production deployment, merge, IndexNow submission or Google indexing claim. Vercel preview READY only. `node scripts/learn/build.mjs --check`, repository tests and browser runtime checks NOT RUN (no local checkout/runtime/dependencies). Backend/API code freeze remains intact through 2026-11-02 inclusive.
- **Next concrete action:** after the freeze lifts, implement and test the exact pre-launch `click_operator`/`click_manager` telemetry, fail-closed Stripe amount/currency checks, and then run the full build/test suite before considering production release; connect GSC for query-level indexing and performance evidence.
