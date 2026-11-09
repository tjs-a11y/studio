# Quickwell ClickBank integration

## Current scope
- Manual offer import using the supplied HopLink destination URLs.
- Eight offer records; duplicate PhytoMem One and Water Freedom System URLs are retained as alternate variants.
- Server-side redirect at `GET /api/clickbank?id=<offer-id>`.
- Public metadata endpoint at `GET /api/clickbank-catalog`; it returns only offers whose `enabled` flag is explicitly true.
- Anonymous aggregate click counters in Upstash Redis, when configured. No IP, email, referrer, user-agent, or visitor identifier is stored.
- Redirect continues if analytics storage is unavailable.

## Draft-only publishing gate
All offers start with `enabled: false`. They are intentionally absent from the public catalog and cannot redirect until reviewed and explicitly enabled in `api/_lib/clickbank-offers.js`.

Before enabling an offer, verify its live vendor page, actual deliverables, price/continuity terms, refund policy, claims, and current ClickBank affiliate terms. Supplement offers require additional health-claims review. Do not describe vendor claims as independently verified outcomes.

## ClickBank API key
The `CLICKBANK_API_KEY` environment variable is not read by this first release. This implementation uses the manually supplied affiliate destinations and does not assume the ClickBank API key provides Marketplace product discovery. Keep the key in Vercel Sensitive environment variables; never put it in source code or a browser response.

## Metrics
Redis keys:
- `count:quickwell:clickbank:<offer-id>:clicks`
- `count:quickwell:clickbank:<offer-id>:clicks:YYYY-MM-DD`

These are outbound click counts, not orders, sales, commissions, or conversions. Reconcile sales and commissions against ClickBank reporting.
