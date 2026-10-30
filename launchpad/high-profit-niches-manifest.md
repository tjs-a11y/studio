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

## Pre-launch Telemetry Cold Storage — Baseline (2026-10-29)

**Freeze window:** No backend/API changes and no merge to the production default branch before 2026-11-03. This entry is committed only to branch `telemetry/prelaunch-cold-storage-2026-10-29`; it is not a production deployment.

### Baseline telemetry health

| Check | Observation | Status |
|---|---|---|
| `js/pro.js` outbound tier click events | Static source review found an anonymous `/api/event` payload with `event: "upgrade"` inside `Studio.upgrade()`. No `click_operator` or `click_manager` event names were present in the reviewed file. | **FAIL — requested click events not implemented in reviewed source** |
| Operator/manager tier CTAs on the three B2B pages | Source links use `href="#pricing"` / in-page navigation; no click telemetry handler was visible in the reviewed page excerpts. | **FAIL — no click event verified** |
| Expected payload coverage | Required pairs are `port-watcher`, `hydro-flow`, `scale-audit` × `click_operator`, `click_manager`. No evidence that these six events are currently emitted. | **BLOCKED / not instrumented** |
| `/api/stats` interest counters | The prior read-only attempt could not access `https://quickwell.app/api/stats`; existence/value of `port-watcher.interest`, `hydro-flow.interest`, and `scale-audit.interest` is unverified. | **BLOCKED — unknown, not zero** |
| Vercel route-specific analytics | Prior query for 2026-10-22 through 2026-10-29 returned no rows for filtered route pageviews/custom events. This does not establish zero visitors or zero demand. | **UNKNOWN / not instrumented or not returned** |
| Google Search Console traction | No authenticated GSC query data was available during this check. No impressions, clicks, CTR, or average positions are asserted. | **BLOCKED — connection/data unavailable** |
| Runtime event delivery / fire-and-forget reliability | No browser interaction test, network request capture, or automated test run was performed in this check. | **NOT RUN** |
| Test suite / build checks | `npm test` and `node scripts/sitemap.mjs` were not run in this check. | **NOT RUN** |

### Required GSC queries

Track exact-query data independently from Vercel analytics:
- `FMC Part 541 container billing rules drayage`
- `fracking water meter CSV flow-rate reconciliation`
- `timber mill scale ticket cull deduction verification`

### Daily evidence record template

For each shift, append a new dated record with: retrieval timestamp and timezone; source URL/system; exact query/event/counter name; query window; observed count or `UNKNOWN/BLOCKED`; comparison window; source link or evidence reference; test status; blockers; and the commit SHA containing the log. Keep raw business inputs and personal identifiers out of telemetry and logs. Never interpret missing rows as zero demand.

### Freeze compliance

As of this baseline, no code or API files were changed. The only repository change for this task is this cold-storage log on a non-production branch. Do not merge or deploy it before the freeze lift on 2026-11-03.


---

## Quickwell Community Watch & Acquisition Gate Log — 2026-10-29

**Run timestamp:** 2026-10-29 19:03 America/Chicago  
**Observed production source commit:** `dbc09a8f0aa12694a6f76017ee3866a74631cdd5`  
**Community search window:** 2026-10-20 through 2026-10-29 inclusive.  
**Repository log branch:** `telemetry/prelaunch-cold-storage-2026-10-29`  
**Policy:** passive public research only; no posts, replies, DMs, account creation, or external outreach.

### Community signals (indexed search snippets; thread pages were not opened live in this run)

Four newly surfaced, relevant public discussion candidates were retained by topic and URL only. No usernames, handles, contact details, or consumer profiles were retained. Search-engine raw row counts were not exposed consistently, so they are **UNKNOWN** rather than estimated.

1. **Freight/accessorial exposure** — Reddit, r/FreightBrokers, “What is a shipper ‘red flag’ that makes you run away from a quote request immediately?”, dated 2026-10-18. URL: https://www.reddit.com/r/FreightBrokers/comments/1x9fts9/what_is_a_shipper_red_flag_that_makes_you_run/ . Snippet: a tight appointment window can create “$2,000 in detention/layover headaches for a $50 margin.” Relevance: written appointment/accessorial terms and detention exposure. Best matching guide: https://quickwell.app/guides/trucking-settlement-disputes.html. Draft direction: clarify appointment windows, free time, notice requirements, evidence, approval authority, and written detention/layover rates before dispatch. No Quickwell link because current community promotion rules were not verified.
2. **Lease renewal/early termination** — Reddit, r/Tenant, “How can I get out of this renewal lease?”, dated 2026-10-22. URL: https://www.reddit.com/r/Tenant/comments/1xcsmpx/how_can_i_get_out_of_this_renewal_lease/ . Snippet concerns a signed renewal and an early-termination clause. Draft direction: review termination, assignment/subletting, notice, buyout and mitigation language; jurisdiction and the exact lease matter; preserve written communications and consult local tenant legal aid. No product link or legal conclusion.
3. **Post-expiration rent dispute** — Reddit, r/Renters, “[CA] Lease Expired, But Landlord Says We Still Owe Rent”, dated 2026-10-27. URL: https://www.reddit.com/r/Renters/comments/1xggknw/ca_lease_expired_but_landlord_says_we_still_owe/ . Snippet concerns a demand for rent after move-out tied to a claimed notice period. Draft direction: compare the lease notice clause, written notice/acknowledgment, move-out timeline and local California tenant guidance; ask for an itemized written basis and obtain qualified local advice. No product link.
4. **Repair documentation** — Reddit, r/NYCapartments, “Rent stabilized unit - landlord refusing to do repairs!”, dated 2026-10-27. URL: https://www.reddit.com/r/NYCapartments/comments/1xgs5h1/rent_stabilized_unit_landlord_refusing_to_do/ . Snippet concerns recurring leaks and an upcoming renewal. Draft direction: keep dated photos, written repair requests, replies and 311/HPD reference numbers; ask the local housing agency about the proper inspection/complaint route. No product link.

**Dedupe:** previously alerted threads re-surfaced in search and were not counted as new: r/OwnerOperators detention/rate-con discussion (2026-10-22), r/HotShotTrucking broker nonpayment discussion (2026-10-25), and r/mineralrights “Mineral Royalty Decimal Miscalculations” (2026-10-27). The mineral-rights thread remains relevant but is not a new alert. No new qualifying royalty-decimal thread was found in the searched results. The specified TheTruckersReport Freight Broker Forum, Freight Relocators Owner Operators, r/Truckers, r/Trucking, Mineral Rights Forum categories, and GoHaynesvilleShale searches yielded no additional newly qualified thread in the accessible indexed results. United Mineral Network was excluded. All community candidates are **snippet-only, not live-open confirmed**; re-open the thread and check current rules before any human-approved response.

### Pre-launch telemetry

| Check | Result |
|---|---|
| `js/pro.js` | Blob SHA `ed6b2b8691dada808bade8fa8c7331b615df2c89`. It emits an anonymous `upgrade` event with tool/plan, but contains no `click_operator` or `click_manager` hooks. |
| Port Watcher page | Blob SHA `157ee7ffa728b5e561218d42e2aa61fb70019d54`; no requested click event or `/api/event` handler found in source. Tier buttons are in-page anchors. **FAIL**. |
| Hydro Flow page | Blob SHA `53c5a38b456f380f1fc4a53551a9fb07f878064d`; same finding. **FAIL**. |
| Scale Audit page | Blob SHA `3e238970f151e6bc8a0e2c0a2017d3ef43b2e56d`; same finding. **FAIL**. |
| `api/event.js` | Blob SHA `6699559890ccfc9b017c456084b81cc099a11203`. Accepted event names are `check`, `waitlist`, `outbound`, `upgrade`; allowed non-catalog site is only `northstar`, with target `freightsidekick`. The required B2B tool IDs and `click_operator`/`click_manager` event names would be rejected by the current API contract. **FAIL / API contract mismatch**. |
| `api/stats.js` | Blob SHA `1381be3e6877d52a7afc6da1a82a0f357e7ee31a`. It reports catalog-tool checks/upgrades/subscriptions and the `northstar:freightsidekick` outbound pair; it does not define `port-watcher.interest`, `hydro-flow.interest`, or `scale-audit.interest`. It returns `enabled:false` when KV/Upstash credentials are absent. Live configuration and endpoint response remain **UNKNOWN/BLOCKED**. |
| Vercel Web Analytics, 2026-10-22 through 2026-10-29 | Filtered route pageviews for `/port-watcher/`, `/hydro-flow/`, `/scale-audit/` returned 0; custom event count for `click_operator` and `click_manager` returned 0. This is the observed Vercel analytics result only, **not evidence of zero market demand**. |
| Google Search Console | No connected/authenticated GSC query data available. Impressions, clicks, CTR, and positions are **UNKNOWN/BLOCKED**. Exact-query list retained in the prior monitoring instructions. |
| Live `/api/stats` | Not successfully retrieved through the available read-only interface. Do not infer counter values. |

### Local processing / quota privacy gate

- Haul Audit source and Royalty Check source each define `FREE_PER_DAY = 3`, store the daily counter in tool-specific `localStorage`, key the date using local year/month/day, keep results visible after the third check, and show a $15/month Pro modal. Source-level check only; runtime interaction was **NOT RUN**.
- Their anonymous check payload is only `{tool, event:"check"}`; `js/pro.js` upgrade payload is `{tool, event:"upgrade", plan}`. No calculation inputs or file contents appear in these payloads.
- Year-End Vendor Check source exists at canonical `https://quickwell.app/vendor-check/` (not `/year-end-vendor-check/`), blob SHA `afc45b2942f3b25d0fc8b7bbe60be5e2081437cd`. The source reads CSV/text files in-browser and its check event contains only tool/event labels. The live page was not confirmed open in this run, so no promotional claim is approved yet.
- Bill Radar, Before You Sign, Fair Price, Proof, and Fuelgauge pages were live-opened and their current copy states on-device processing. Bill Radar is a user-input forecast; the page says its monthly watch/roll-off email feature is “Coming soon,” not active. Proof's current marketing wording about an “untouched original” must not be repeated as a guarantee; describe only local timestamp/fingerprint evidence if needed.

### Stripe checkout release gate

`api/checkout.js` blob SHA `d448f5c568b7a3298221476197506a1af5c65303` hard-codes `haul-audit__pro__month` and `royalty-check__pro__month`, rejects invalid plan/interval combinations, requires an active lookup result, and checks recurring monthly interval/count. However, it does **not** fail closed on `price.unit_amount !== 1500` or `price.currency !== "usd"`. Stripe-side existence/active status/amount/currency could not be verified with authenticated Stripe access. **BLOCKED**.

**Post-freeze minimal guard proposal (not implemented):** for these two fixed SKUs require `price.type === "recurring"`, `price.unit_amount === 1500`, `price.currency === "usd"`, `price.recurring.interval === "month"`, and `interval_count === 1`; reject otherwise with 409. Test exact $15 USD/month pass; missing price; wrong amount below/above $15; wrong currency; one-time price; yearly price; interval_count other than 1; wrong plan; wrong interval; and arbitrary/fallback lookup attempts. Do not change API files or deploy before the freeze lift.

### Sitemap, build, and test gate

- `sitemap.xml` references `sitemap-main.xml`, `sitemap-briefs.xml`, and `sitemap-learn.xml`. Static source counts: 57 main URLs, 52 briefs URLs, 95 learn URLs. `/vendor-check/` is included in the main sitemap and its page canonical matches that URL. The main generator `scripts/sitemap.mjs` reads canonical links for main pages and indexes other root `sitemap-*.xml` files; source for generating the briefs/learn maps was not located through the available file search, so exhaustive path/canonical validation remains **BLOCKED**.
- A repository checkout was attempted, but `git clone --depth 1 https://github.com/tjs-a11y/studio.git /tmp/studio` failed with exit code 128 because this runtime could not resolve `github.com`. Therefore `npm test`, `node scripts/sitemap.mjs`, full link checks, and browser/runtime tests were **NOT RUN**. IndexNow handshake was not checked in this run; search-engine indexing is **UNKNOWN**.

### Acquisition tracks A–G

**A — FMCSA new authority:** Official FMCSA Open Data documentation confirms daily modern MOTUS operating-authority datasets and a daily `Motus AuthHist` change feed. The historical Daily Decisions page now covers only 2022-09-27 through 2026-05-15. The current daily data records could not be retrieved and cross-checked in this run. Qualified carriers: 0; verified contacts: 0; outreach drafts/sent: 0. No carrier names or authority grants are asserted. Official sources: https://www.fmcsa.dot.gov/registration/fmcsa-data-dissemination-program and https://www.fmcsa.dot.gov/registration/daily-fmcsa-registration-decisions-letters-certificates-permits-and-licenses .
**B — Texas permits:** RRC's official download page identifies a nightly Drilling Permit Master and Trailer daily file with permit numbers, issue/amend/extend dates, lease/location and coordinates. The file retrieval timed out; no approved permits from the last 7 days were extracted, so raw/unique permit counts are **UNKNOWN**, not zero. No interactive high-volume scraping was performed. Source: https://www.rrc.texas.gov/resource-center/research/data-sets-available-for-download/ . RRC explicitly warns automated high-volume queries may degrade its query system: https://www.rrc.texas.gov/resource-center/research/research-queries/ .
**C — Small fleets/dispatch firms:** No approved connected B2B CRM/prospecting source was available and no fresh public-company contact-page shortlist was completed. Identified/verified prospects: 0; personalized drafts: 0; sent/accepted/bounced/replied/opt-outs: 0. No bulk or automated outreach.
**D — 1099/vendor check:** IRS official guidance confirms the $2,000 reporting threshold for Form 1099-NEC services and certain other payments made after 2025-12-31; payment type and exceptions still matter. Sources: https://www.irs.gov/faqs/small-business-self-employed-other-business/form-1099-nec-independent-contractors/form-1099-nec-independent-contractors and https://www.irs.gov/irb/2026-19_IRB . Correct source canonical is `/vendor-check/`; live behavior not verified in this run, so do not promote yet.
**E — Bill Radar:** CPUC's SDG&E TY2028 General Rate Case A.26-06-015 is an active **request**, filed 2026-06-15, seeking an 8.1% increase over the authorized 2027 revenue requirement, requested for 2028-01-01; it is not an approved rate change. Source: https://webproda.cpuc.ca.gov/industries-and-topics/electrical-energy/electric-rates/general-rate-case/san-diego-gas-and-electric-grc-proceedings . No newly confirmed effective rate order was established in this run.
**F — Before You Sign:** Live page confirmed; source states contract text stays in-browser and it is not legal advice. No promotional links added to lease discussions because current community rules were not verified.
**G — Fair Price/Proof:** Both live pages confirmed and state on-device processing. No new suitable active repair/contractor/moving estimate question was found in the accessible result set; no promotion or claims about quote padding, fraud, legality, or guaranteed authenticity.

### Funnel and run status

- Newly surfaced relevant community candidates: 4 (snippet-only, not live-open confirmed); previously alerted duplicates suppressed: 3.
- Educational response drafts prepared: 4; promotional links included in drafts: 0; posts/replies/DMs published: 0.
- Carrier prospects: 0; verified business contacts: 0; outreach drafts: 0; sent/accepted/bounced/replied/opt-outs: 0.
- Texas permit records extracted: 0; qualifying permit count: **UNKNOWN** because source retrieval timed out.
- Vercel filtered pageviews: 0 observed; required click events: 0 observed; this does not prove zero demand.
- GSC impressions/clicks/CTR/positions, live stats counters, Stripe-side price state, live vendor-check behavior, indexing, and IndexNow status: **UNKNOWN/BLOCKED**.
- Production code/API files changed: **0**. Production merges/deployments performed: **0**. Freeze remains intact through 2026-11-02 inclusive.


---

## Pre-launch Telemetry Daily Vector — 2026-10-29

**Retrieved:** 2026-10-29 19:23:43 America/Chicago  
**Production project:** `quickwell.app` / Vercel project `prj_kJzxHJOsGda7XJ24vTbYwPUA3I0N`  
**Observation windows:** last 7 days = 2026-10-22 19:23:43–2026-10-29 19:23:43 America/Chicago; prior 7 days = 2026-10-15 19:23:43–2026-10-22 19:23:43 America/Chicago.

### Aggregate measurements

| Source / metric | Last 7 days | Prior 7 days | Interpretation |
|---|---:|---:|---|
| Vercel site-wide visitors / pageviews (route dimension returned blank route) | 18 / 20 | 43 / 132 | Overall project traffic only; cannot attribute to a niche. |
| Vercel pageviews for `/port-watcher/` | no row | no row | No path record returned; not evidence of zero demand. |
| Vercel pageviews for `/hydro-flow/` | no row | no row | No path record returned; not evidence of zero demand. |
| Vercel pageviews for `/scale-audit/` | no row | no row | No path record returned; not evidence of zero demand. |
| Vercel custom events on the three B2B routes | no rows | no rows | No valid event numerator; CTR velocity cannot be calculated. |

Vercel queries used route-filtered `requestPath` and `eventName` dimensions. Aggregate site totals were returned with an empty `route` dimension; they are not route-level traffic.

### `/api/stats` snapshot

Source: `metrics/stats.json` (blob `1ba1de20bc867811b5a9ddb3cbc521dc806b7d98`), fetched timestamp `2026-10-29T17:03:29.449Z`, endpoint `https://quickwell.app/api/stats`, `enabled:true`.

- `total_checks=0`; `total_subs=0`.
- Haul Audit: `checks=0`, `upgrade_clicks=1`, `subs=0`.
- Royalty Check: `checks=0`, `upgrade_clicks=1`, `subs=0`.
- `port-watcher`, `hydro-flow`, and `scale-audit` are absent from the returned tool map. Their `.interest` counters are **UNKNOWN / not instrumented**, not zero.
- The two upgrade clicks are purchase-intent events, not paid conversions.

### Search Console and path discovery

- GSC exact-query impressions/clicks/CTR/position for the three required freight, water-volume, and timber queries: **BLOCKED**; no authenticated query-data connector/export was available.
- `sitemap-main.xml` contains all three B2B landing URLs, and root `sitemap.xml` indexes `sitemap-main.xml`. This verifies sitemap inclusion only, not Google indexing.
- No indexing status is asserted.

### Source-level launch gates

| Gate | Evidence | Status |
|---|---|---|
| Tier-click hooks | `js/pro.js` emits generic `upgrade`, not `click_operator` / `click_manager`; the three landing pages do not load `js/pro.js` and their tier CTAs are in-page `#pricing` anchors. | **FAIL** |
| Event API support | `api/event.js` accepts `check`, `waitlist`, `outbound`, `upgrade`; no prelaunch tool IDs or requested tier events are accepted. | **BLOCKED** |
| Stats counters | `api/stats.js` enumerates catalog tools only; no prelaunch `.interest` counters. | **BLOCKED** |
| Local daily quota | Haul Audit and Royalty Check use localStorage and the visitor's local calendar date; results remain visible. | **PASS — source review only** |
| Saved-history gating | Both pages write every free check into localStorage history even when `PRO=false`; saved-history feature is not properly gated. | **FAIL** |
| Checkout lookup keys | Code pins Haul Audit to `haul-audit__pro__month` and Royalty Check to `royalty-check__pro__month`, monthly only. | **PASS — source review only** |
| Checkout price guard | Code checks active recurring monthly interval but not `unit_amount=1500` and `currency=usd`; Stripe-side price configuration was not accessible. | **BLOCKED** |
| Referral attribution | Client accepts only a short `?ref=` label (1–40 alphanumeric/underscore/hyphen), stores it in sessionStorage, and checkout code passes it to Session and subscription/payment-intent metadata. No entered commercial data is included. | **PASS — source review only** |
| Runtime/build/tests | No checked-out Studio repository/runtime was available; `npm test`, `node scripts/sitemap.mjs`, and `node scripts/learn/build.mjs --check` were not run. | **NOT RUN** |

### Niches and next evidence

No defensible niche ranking by CTR velocity: all three routes lack returned route-level visits and click events, and no denominator/numerator pair exists. Keep the three tied as **undetermined**. Next action after freeze: implement and test the six anonymous tier-click events, expose aggregate interest counters, and fix free-history persistence plus the $15 USD checkout price guard.

**Freeze:** intact. No production source/API files were changed for this record. This log remains on `telemetry/prelaunch-cold-storage-2026-10-29`; do not merge or deploy before 2026-11-03.

**Implementation prepared:** [Draft Studio PR #4](https://github.com/tjs-a11y/studio/pull/4) contains the proposed tier-click instrumentation, aggregate interest counters, daily history capture, Pro-only local history, monthly-only UI, and $15 USD checkout guard. It remains draft and unmerged. Vercel created a preview for the latest branch commit (still BUILDING, target=null) and a prior branch preview is READY; neither has a production alias. Tests are added but `npm test` was not run in this environment.

**Preview refresh:** after the final regression-test assertion commit `c380a5d0d8e229447d2464e00b28179f9c4413c1`, Vercel created a new preview that was still BUILDING at retrieval; the immediately prior preview for `eca141346c2dcf6de0a33cff89a31c96342468fe` was READY. Both have `target=null`; no production alias.

**Production separation check:** the latest READY Vercel production deployment remains on `main` at commit `dbc09a8f0aa12694a6f76017ee3866a74631cdd5`; the B2B PR branch appears only in preview deployments with `target:null`. The production `api/event.js` and `js/pro.js` blobs remain unchanged from the baseline reviewed in this shift.
