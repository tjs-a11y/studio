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


---

## 2026-10-30 — Morning telemetry / traction cold-storage record

**Retrieval timestamp:** 2026-10-30 09:02 America/Chicago (14:02 UTC)  
**Repository source:** `tjs-a11y/studio`, default branch at `4ee69abcb09c59950295db96629b547f072ab065`; comparison source: draft PR #4, `refs/pull/4/head`.  
**Code-freeze status:** INTACT. This is a log-only commit on `ops/cold-storage-2026-10-30-morning`; no API or production code changed.

| Check | Source / window | Observed result | Status |
|---|---|---|---|
| Port Watcher page discovery | `port-watcher/index.html`, current main | Canonical `https://quickwell.app/port-watcher/`; Vercel Web Analytics script present. | PASS — source |
| Hydro Flow page discovery | `hydro-flow/index.html`, current main | Canonical `https://quickwell.app/hydro-flow/`; Vercel Web Analytics script present. | PASS — source |
| Scale Audit page discovery | `scale-audit/index.html`, current main | Canonical `https://quickwell.app/scale-audit/`; Vercel Web Analytics script present. | PASS — source |
| Required tier-click events on production source | Current main pages + `js/pro.js` | The three current-main pages do not contain `data-tier-click` tier labels and do not load `/js/pro.js`. | FAIL — production source |
| Tier-click implementation in PR #4 | PR #4 source: `js/pro.js`, all three landing pages, `api/event.js` | Exact anonymous `{tool,event}` payload for `click_operator` / `click_manager`; server rejects extra fields for these events. | PASS — static source review; not production |
| Aggregate interest counters | PR #4 `api/stats.js` | PR source exposes total and UTC-day `interest`, `click_operator`, and `click_manager` counters for all three routes. Current main does not expose these counters. | PASS — PR source; production BLOCKED |
| PR regression tests | PR #4 `test/b2b-launch-gates.test.mjs` | Regression tests exist for payload allow-list, counters, checkout price guard, browser event hooks, page labels and local history gating. Not executed in this shift. | BLOCKED — runtime test evidence |
| Vercel Web Analytics counts | Required windows: 2026-10-23–29 vs 2026-10-16–22; exact route filters | Route-level pageviews, visitors and custom events were not retrieved in this shift. | UNKNOWN — not queried |
| `/api/stats` live snapshot | Retrieval timestamp above; aggregate interest counters | Live endpoint was not queried. Current-main `api/stats.js` source has no pre-launch interest vector. Do not interpret missing fields as zero. | BLOCKED / UNKNOWN |
| Google Search Console | Exact three CEO queries; last 7 days vs previous 7 days | No authenticated GSC query export/connection available in this shift. | BLOCKED — impressions/clicks/CTR/position UNKNOWN |
| Search/index status | Three exact landing routes | Canonical and sitemap presence were not independently rechecked against a search-engine index. | UNKNOWN — no indexing claim |
| Stripe configuration | Haul Audit / Royalty Check monthly lookup keys | PR #4 source pins `haul-audit__pro__month` and `royalty-check__pro__month`, and rejects prices not recurring monthly, USD 1500 minor units. Authenticated Stripe-side prices not verified. | PASS — source guard; live config BLOCKED |

**Comparable niche ranking:** Not rankable. No route-level event counts and no comparable click-through denominator were retrieved.  
**Observed counts:** UNKNOWN for all three routes and all six tier-click events; no zero is inferred.  
**Source URLs:**  
- https://github.com/tjs-a11y/studio/commit/4ee69abcb09c59950295db96629b547f072ab065  
- https://github.com/tjs-a11y/studio/pull/4  
- https://quickwell.app/port-watcher/  
- https://quickwell.app/hydro-flow/  
- https://quickwell.app/scale-audit/  

**Smallest next action:** after the 2026-11-03 freeze lift, run the PR regression suite in a checked-out environment, obtain authenticated Stripe-side price verification, then request review/merge only if every release gate passes. Until then, keep PR #4 draft and do not deploy the backend changes.
