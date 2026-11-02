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


## 2026-10-31 — specialist customer discovery sprint

- User explicitly authorized lifting the November 2 code freeze for this scoped growth sprint. No production deployment or merge was made.
- Opened specialist discovery PR #9: https://github.com/tjs-a11y/studio/pull/9
- Updated Haul Audit and Royalty Check search titles/descriptions, explanatory copy, FAQs, FAQPage structured data, and guide cross-links; surfaced both tools from the guides hub.
- Corrected usage measurement: each successful non-sample calculation now emits one anonymous `check` event (tool ID + event only). Prior behavior emitted only once per page session and undercounted repeat calculations.
- Removed unsupported yearly upgrade buttons from both monthly-only specialist tools.
- Added a fail-closed checkout condition requiring the exact lookup key, active recurring monthly price, `unit_amount=1500`, and `currency=usd`. Live Stripe price configuration remains unverified; checkout must remain blocked unless the Stripe record matches.
- Vercel preview for specialist branch was observed READY before the final metadata/workflow commits. Latest preview build status is pending at time of this log; re-check before review.
- Added a GitHub Actions validation workflow for specialist and consumer branches (`npm ci`, `npm test`, sitemap generator, learn-content check) and a focused specialist source-contract test. Workflow run results are not yet available.
- GSC query/page performance, production `/api/stats` counters, and Stripe subscription/revenue records remain UNKNOWN/BLOCKED without authenticated source access. Vercel pageviews, tool completions, upgrade clicks, paid subscriptions and revenue must remain separate metrics.
- Code changes are branch/PR only. No customer data, calculator inputs, personal information or ownership records are sent in telemetry.

## 2026-10-31 — consumer discovery release candidate

- Rebuilt the consumer guide work on current main after specialist discovery PR #9 merged, avoiding a stale branch base.
- Added five sourced household/money guides and their guide-hub, homepage and sitemap discovery links.
- Corrected guide disclaimers, referral-query CTA recognition in SEO tests, and a hard-coded Shield test path that prevented CI from running outside the original developer machine.
- Added repeatable growth-branch validation workflow: `npm ci`, `npm test`, sitemap generation, and learn-content build check.
- Weekend TikTok/YouTube campaign assets remain drafts; no public posts, DMs, or outbound messages sent.
- Release is blocked until CI and Vercel preview pass. No production deployment performed for this consumer batch.


## 2026-11-01 — nightly growth evidence (retrieved 2026-11-02T05:01Z)

### Repository and deployment baseline
- Studio main at start of run: `466a0bf01f2748eca4949bdc044cbdf4dd4e571f`.
- Current production Vercel deployment for Studio: READY at main commit `466a0bf01f2748eca4949bdc044cbdf4dd4e571f`; production target confirmed. No production code change made in this run.
- Evidence is recorded on non-production branch `ops/nightly-growth-evidence-2026-11-01` only. Code freeze remains intact through 2026-11-02 inclusive.

### Vercel Web Analytics — exact UTC windows
- Current 7 days: 2026-10-25T00:00:00Z through 2026-11-02T00:00:00Z.
- Previous 7 days: 2026-10-18T00:00:00Z through 2026-10-25T00:00:00Z.
- Project pageviews: 30 current vs 114 previous (-73.7%); these are pageviews, not unique people, tool completions, conversions or revenue.
- Current route groups: 13. Haul Audit: 1 pageview; Royalty Check: 1 pageview.
- `/port-watcher`, `/hydro-flow`, `/scale-audit`: no matching pageview rows in either 7-day window.
- Vercel custom-event aggregation for those three paths: no matching rows in current 7 days. No valid click-through denominator exists; do not rank these niches by CTR.
- The project-wide pageview aggregation is not a substitute for `/api/stats` tool-completion counters.

### Google Search Console
- Authenticated Search Console connector returned 0 rows for each exact query over the last 30 days:
  - `FMC Part 541 container billing rules drayage`
  - `fracking water meter CSV flow-rate reconciliation`
  - `timber mill scale ticket cull deduction verification`
- Page filter for the three prelaunch routes returned 0 rows in 2026-10-25 through 2026-10-31.
- This is no matching query/page performance data, not proof that a URL is absent from the index. URL inspection/indexing status remains UNKNOWN.

### Prelaunch telemetry and stats gates
- Source review: `js/pro.js` emits generic `upgrade` telemetry only; the three prelaunch pages do not contain the required `click_operator` / `click_manager` events.
- `api/event.js` accepts catalog tool IDs plus `plot-file-checker`; `port-watcher`, `hydro-flow`, and `scale-audit` are not in the catalog and would be rejected. Telemetry gate: FAIL.
- Public read-only `/api/stats` fetch was inaccessible; Vercel runtime-log query for `/api/stats` timed out. Exact counter names/counts and live KV state: BLOCKED/UNKNOWN.
- No API files changed. Keep the backend/API freeze intact until 2026-11-03; do not merge or deploy a telemetry fix before then.

### Haul Audit / Royalty Check privacy and checkout
- Source review confirms three free checks per visitor-local calendar day are counted in localStorage; calculated results are rendered before quota handling and remain visible. Successful checks send only `{tool: TOOL, event: 'check'}`, not calculation inputs.
- Main still persists free-check history in localStorage. PR #14 contains the minimal Pro-only history-write fix and a regression test; it remains open and unmerged. CI run #59: 355 tests, 354 pass, 0 fail, 1 skipped; `node scripts/sitemap.mjs` reported 83 main pages and all three sitemap indexes; `node scripts/learn/build.mjs --check` built 95 pages and passed.
- PR #12 CI run #52: 355 tests, 354 pass, 0 fail, 1 skipped; sitemap reported 83 main pages; learn build generated 96 pages and passed. PR #12 remains an open draft. PR #17 has no workflow run; do not treat its preview as a passing test.
- `api/checkout.js` hard-pins Haul Audit and Royalty Check to `haul-audit__pro__month` and `royalty-check__pro__month`, and fails closed unless the active price is recurring monthly, one interval, 1500 USD cents, currency USD. `js/pro.js` accepts only short anonymous `?ref=` labels in sessionStorage and passes the label to Checkout Session plus subscription/payment-intent metadata. Code-level check: PASS; authenticated live Stripe price verification: BLOCKED. No checkout or revenue claim.

### Primary-source watch — freight
- FMCSA information bulletin, 2026-10-16: all 50 states, Washington, D.C. and U.S. territories had implemented the revised standardized multi-level DataQs review process. DataQs states revised state-review requirements took effect 2026-09-18. Sources: https://www.fmcsa.dot.gov/newsroom/fmcsa-announces-all-50-states-have-implemented-reformed-dataqs-review-process-enhancing ; https://dataqs.fmcsa.dot.gov/
- CSA portal reports data current 2026-09-25, site updated 2026-10-05, next update week of 2026-11-09. No newer CSA release found in this check. Source: https://csa.fmcsa.dot.gov/
- No new guide generated; existing DataQs/new-entrant work is already in the repository/PR queue.

### Primary-source watch — Texas mineral / permits
- RRC proposed amendments to 16 TAC §§3.15 and 3.58 relating to SB 1150 were published 2026-10-23; comment deadline is 2026-11-13 at 5:00 p.m. CT. The RRC page explicitly says proposals are not adopted unless and until adoption is recorded. The proposal covers inactive “15/25 wells” (inactive at least 15 years and completed at least 25 years ago), plugging-extension options, testing and inactive-well transfers. Sources: https://www.rrc.texas.gov/general-counsel/rules/proposed-rules/ ; https://www.rrc.texas.gov/media/teiotqns/prop-amend-315-and-358-sb1150-100626-sign.pdf
- RRC drilling-permit master/trailer daily file listing showed `daf420.dat` last modified 2026-11-01 9:45:12 a.m. and 3.00 MB. RRC describes it as a current-month file that accumulates daily; pending-approval data is a separate twice-daily file. Dataset listing: https://www.rrc.texas.gov/resource-center/research/data-sets-available-for-download/
- The daily file was not downloaded/parsed in this run; permit rows, approved-permit counts, county/operator totals and qualified prospects are UNKNOWN. No owner-level prospect list created. No new article generated: the proposed rule is not a Royalty Check calculation issue, and the existing permit/spacing guide work is already queued for review.

### Community, outreach and books
- Public community search found an older r/OwnerOperators detention discussion dated 2026-03-03; no current high-intent thread was verified on TheTruckersReport or Freight Relocators in this check. Existing organic kit remains draft-only; no posts, replies, DMs or emails sent.
- Books hub GSC (last 30 days): 5 impressions, 0 clicks, all five query rows landed on the homepage; no title-specific page query rows. Draft2Digital sales/royalty data is not connected, so no sales-based book ranking or book-specific campaign was made.
- Separate completed book-hub fix this run: merged PR #1 in `tjs-a11y/tjs-a11y-books` at `d5f5cbb422e7de532ce7e7675c963c08b440a924`; removed literal `\\n` text from the homepage and sitemap. GitHub Pages build run #42 succeeded; IndexNow run #28 succeeded with HTTP 200 (submission accepted, not indexing confirmation). The books sitemap contains 20 URLs.

### Release and verification status
- Production release: NOT performed for Studio in this run.
- Quickwell IndexNow workflow run #41390560753 completed successfully on the production main commit: key file check passed and the script reported `IndexNow: 200 OK for 11 URLs` (submission accepted; not proof of search indexing).
- Sitemap source check on current main: `sitemap.xml` indexes `sitemap-main.xml`, `sitemap-briefs.xml`, and `sitemap-learn.xml`; `sitemap-main.xml` contains 84 URLs and `sitemap-learn.xml` contains 95 URLs. Search indexing: UNKNOWN; no URL Inspection result available.
- Tests/builds above are GitHub Actions results for the named PR heads, not a local run on main.
- Next action after the freeze lifts: add and test the exact prelaunch tier-click events and API allowlist, then re-run privacy/checkout/sitemap gates before any production release.


### Additional source-verified acquisition action — 2026-11-01
- Opened draft PR #18: https://github.com/tjs-a11y/studio/pull/18
- Updated `scripts/learn/content/1099.mjs` and `vendor-check/index.html` after checking the current IRS FAQ on 2026-11-01: https://www.irs.gov/faqs/small-business-self-employed-other-business/form-1099-nec-independent-contractors/form-1099-nec-independent-contractors
- Added the official IRS FAQ to the 2026 threshold source list; corrected stale wording that IRS material was inaccessible; distinguished the $2,000 covered-payment threshold, $10 royalty rule, and separate $5,000 consumer-product resale/commission category; disclosed that Vendor Check does not classify the latter. No calculator logic or API code changed.
- GitHub Actions validation run #100 succeeded: `npm test` = 354 tests, 353 pass, 0 fail, 1 skipped; `node scripts/sitemap.mjs` = 84 main pages and all three sitemap indexes; `node scripts/learn/build.mjs --check` = 95 pages, check passed.
- PR #18 remains draft/unmerged and is not deployed. It is content/source maintenance only; keep production release gates intact.

### Prelaunch path discovery verification
- Current main source check: `/port-watcher/`, `/hydro-flow/`, and `/scale-audit/` each exist as standalone HTML pages, have self-canonical URLs, are not marked noindex, and are included in `sitemap-main.xml`; `scripts/sitemap.mjs` contains all three routes. This confirms crawl-path configuration, not Google indexing.
- GSC still returned no page/query rows for these routes in the checked 7-day window; URL Inspection remains unavailable.
