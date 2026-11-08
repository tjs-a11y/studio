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


## 2026-11-07 — nightly acquisition and telemetry evidence (23:45 America/Chicago; 2026-11-08 05:45 UTC)

- **Customer-facing release:** Bill Radar privacy-safe share action merged in Studio PR #47. Production commit `2681bfe6a321e259c78b990ed39dfc727c53cfb9`; Vercel deployment `dpl_7uj1LoSY89vrZRkkNCMapndrNurR` reached READY with the `quickwell.app` alias. Share control appears after the forecast and uses Web Share with clipboard fallback. Fixed referral URL: `https://quickwell.app/bill-radar/?ref=share-bill-radar`. Static text only; it does not read or transmit kWh, rate, plan end date, forecast or other entered values. Post-release shares, visits and conversions are not yet measurable.
- **CI/deployment evidence:** GitHub Actions Quickwell validation run #309 (`42452074273`) passed on PR head `6f0038a57f442137ed975bb1ec57ff5b129a163f`: `npm ci` succeeded; `npm test` reported 413 pass / 0 fail; `node scripts/sitemap.mjs` succeeded (105 main pages; root sitemap indexes main, briefs, learn and SEO sitemaps); `node scripts/learn/build.mjs --check` succeeded (96 pages). Vercel preview checks passed. A non-failing log line noted missing optional Python module `openpyxl`. Local commands were NOT RUN because this runtime had no checked-out repo/dependency environment and outbound DNS was unavailable. Production deployment is verified by Vercel state/alias, not by a direct HTTP fetch.
- **Google Search Console source:** authenticated `sc-domain:quickwell.app`; retrieved 2026-11-08 05:45–05:49 UTC. Latest available daily row is 2026-11-06. Site-wide latest available six days (2026-11-01..06): **226 impressions / 2 clicks**. Comparable prior six days (2026-10-26..31): **274 impressions / 5 clicks**. Current priority-page filter (Shield, Saver, Bill Radar, Fair Price, Dinner; 2026-11-01..07) returned no rows. Prior 7-day page filter (2026-10-25..31) returned Saver only: **7 impressions, 0 clicks, average position 1**. Exact B2B query filters for `FMC Part 541 container billing rules drayage`, `fracking water meter CSV flow-rate reconciliation`, and `timber mill scale ticket cull deduction verification` returned no rows in either 7-day window. No query/page-level index verdict is inferred.
- **Sitemap status:** GSC reports `https://quickwell.app/sitemap.xml`: **299 submitted**, last submitted 2026-10-11, last downloaded 2026-11-06, **0 errors / 0 warnings**. The connector's `indexed` field is deprecated; URL-level indexing remains **UNKNOWN**. Submission/download is not indexing.
- **First-party funnel source:** latest recorded live `/api/stats` snapshot in MONAD-HQ ledger is 2026-11-07 22:18 UTC: **173 visits; 25 priority consumer opens** (Dinner 8, Fair Price 8, Saver 6, Bill Radar 3, Shield 0); **0 checks, 0 demos, 0 trials, 0 subscriptions** at that snapshot. This was not refreshed in this run. Studio `metrics/stats.json` is older (2026-11-07 16:36 UTC; 165 visits) and is stale, not current. Production KV env keys are configured, but direct `/api/stats` response could not be read from this runtime (container DNS unavailable; Vercel runtime-log query returned no logs). Current funnel counts are **UNKNOWN**.
- **Vercel Web Analytics:** attempted `vercel.analytics_pageview.count` and `vercel.analytics_event.count` for 2026-11-01..08; the connected Observability query endpoint returned HTTP 400 `bad_request` for both. Pageviews, custom events and referral counts are **UNKNOWN**, not zero. Vercel referrers are not substituted for GSC metrics.
- **Pre-launch interest instrumentation:** `js/va.js` emits `port-watcher.interest`, `hydro-flow.interest`, and `scale-audit.interest` with exactly `{tool,event}` on operator/manager CTA clicks. `api/stats.js` has no dedicated counters for those three routes. Their Vercel event counts remain **UNKNOWN** because the analytics query failed.
- **Privacy / quota source review:** Haul Audit and Royalty Check pages use `localStorage` counters keyed to the browser's local calendar date. Each non-sample calculation increments locally; results remain visible and subsequent calculations are not blocked after the third-check prompt. The $15/month Pro prompt describes saved local history and CSV export only. Anonymous check telemetry sends only `{tool,event:'check'}`; calculation inputs are not included.
- **Checkout source review:** `api/checkout.js` hard-codes `haul-audit__pro__month` and `royalty-check__pro__month`, and fails closed unless the active Stripe price is recurring monthly, one-month interval, exactly 1500 USD cents. `js/pro.js` accepts a short anonymous `?ref=` label, keeps it in tab-local `sessionStorage`, and passes it to checkout; the API attaches it to Checkout Session and subscription/payment-intent metadata. **Stripe-side price existence/active status was not verified** because no Stripe connector was available. Do not claim checkout is live/working from source inspection alone.
- **Distribution and sales:** no social posts, community replies, DMs, emails, partner outreach, ads, book listing changes, paid conversions or revenue were executed or observed in this run. No individual community data was collected.
- **Next concrete action:** restore an authorized read path for live `/api/stats` and Vercel Web Analytics queries; after a full post-deploy collection window, measure `share-bill-radar` source opens separately from checks and purchases.

**Source URLs:** https://quickwell.app/api/stats · https://quickwell.app/sitemap.xml · https://quickwell.app/bill-radar/ · https://github.com/tjs-a11y/studio/pull/47 · https://github.com/tjs-a11y/studio/actions/runs/42452074273 · https://vercel.com/tjs-a11ys-projects/studio/7uj1LoSY89vrZRkkNCMapndrNurR

- **IndexNow follow-through:** GitHub Actions run #42452175672 for production commit `2681bfe6a321e259c78b990ed39dfc727c53cfb9` completed successfully at 2026-11-08 05:51 UTC. The workflow confirmed the key file was live and logged `IndexNow: 200 OK for 301 URLs`. This is a successful IndexNow submission/acceptance handshake only; it does **not** prove Google or Bing indexed any URL.


## 2026-11-08 05:51–05:55 UTC — release correction and distribution handoff

- **Correction to the prior entry:** Studio PR #47 was merged at 05:48 UTC, but the repo operator immediately reverted the share-loop change under CEO Decision #33 (no more builds; acquisition first). Follow-on main commits: `75488698`, `a9fc32d4`, `9c9c155a2e53e5038d5fcb0609091f0e47c881be`. Current `main` is `9c9c155`; `bill-radar/index.html` contains no share control or `share-bill-radar` link. Do not reapply without a new CEO decision.
- **Actual production-domain mapping:** Vercel deployment `dpl_4uMHvh1WPafmeJbTrKRKa8wHpYvR` for current main is READY but has only the `studio-git-main` alias. Vercel's domain lookup for `quickwell.app` resolves to prior deployment `dpl_BmiAu4xvyLokydwCYYHMTR83v4VM` at commit `6a21f55521d3991ef5c8346812ad9f367d7c8ac3` (pre-share). Therefore the Bill Radar candidate did not become the custom-domain customer experience and is not a shipped acquisition improvement.
- **IndexNow:** run #42452416299 for revert commit `9c9c155` completed successfully; the workflow checked the key file and logged `IndexNow: 200 OK for 301 URLs`. Run #42452175672 for the temporary merge commit also logged `200 OK for 301 URLs`. Both are submission-acceptance handshakes only, not proof of indexing.
- **Replacement acquisition action:** reused the existing 2026-11-01 Saver video from the Quickwell TikTok Launch Pack; saved a caption, short voiceover and pinned comment to the existing Frameo Saver module at `https://frameo.ai/mcp/open/kXz5bPUT`. The link is `https://quickwell.app/saver/?ref=tiktok-saver`. No new video was generated, no Frameo credits were spent, and nothing was posted. Human approval/authorized account required.
- **SEO decision:** Saver's GSC page row in the prior week was 7 impressions, 0 clicks, average position 1; the current page filter and 28-day query-dimension request returned no rows. No title/meta change was made without a concrete query signal.
- **No external activity:** no posts, comments, DMs, emails, outreach, ads, listing changes, paid conversions or revenue.
