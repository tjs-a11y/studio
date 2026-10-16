# Quickwell Briefs

Short daily news briefs on quickwell.app, one per audience, at `/news/<desk>/<date>/`.
Desks, sources and CTA rules live in `desks.mjs`. The freight brief runs separately in the
northstar-delivery repo; the Commodity Desk has its own data-only brief at `/commodities/brief/`.

| Desk | Audience | Promotes | Status |
|---|---|---|---|
| `small-business` | Owners, freelancers, bookkeepers | Vendor Check, Saver | on (9 items on 2026-10-16) |
| `eudr` | EUDR exporters and importers | EUDR Plot File Checker | on; publishes only on days with EUDR news (0 items on 2026-10-16) |
| `scams` | Consumers and their families | Shield, Spare Key | on (8 items on 2026-10-16) |
| `household-money` | Households | Saver, Pilot | on (5 items on 2026-10-16) |
| `caregivers` | Older adults and caregivers | Footsure | on; publishes on days with 2+ aging stories (1 on 2026-10-16) |
| `texas-minerals` | Texas mineral owners | Permit Watch | off until Permit Watch has live data |

## How a run works
1. Fetch each desk's public feeds (RSS, Federal Register API). Sponsored, podcast and video items,
   items older than 7 days and items outside a feed's topic filter are dropped.
2. Skip the desk for the day if it has fewer fresh items than `minItems`, if today's brief exists,
   or if this month's logged Claude spend plus a worst case would pass `BRIEFS_MONTHLY_BUDGET_USD` ($15 default).
3. Claude (claude-opus-5-5) writes a bulleted brief as JSON that cites item ids. The fact check rejects
   unknown ids, numbers not in the sources, and links or product names written by the model. One rewrite.
4. CTAs are added by code: a tool whose trigger matches an item, placed after that story; the desk's
   default tool when nothing matches; Riddlebound on Fridays and Saturdays; all repeated in the footer.
   Every CTA is labeled "Our product" and each brief ends with a bold disclosure.
5. Pages, desk index, `/news/` hub and `sitemap-briefs.xml` are written; the workflow pushes and pings IndexNow.

Every Claude call is logged with its tokens and cost in `data/usage.json`. `.vercelignore` keeps this
folder off the public site.

Feed addresses were chosen with `node briefs/probe.mjs` (workflow mode `probe`), which reports which
candidate feeds return fresh items from GitHub's network.

## Commands
```bash
cd briefs && npm ci && npm test
node briefs/run.mjs --mode=sources            # free: what each feed returns today
node briefs/run.mjs --mode=dry --desk=scams   # write one brief, publish nothing
node briefs/run.mjs --mode=publish            # what the daily workflow runs
```
