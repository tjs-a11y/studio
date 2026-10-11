# Permit Watch — Texas

A free page that lists new Texas drilling permits by county, filters them by survey, abstract, operator, lease or distance from a point, and gives every county a free RSS feed so people can get phone or email alerts through any RSS app. Built for mineral and royalty owners.

- Page: `/permit-watch/` (`index.html`, one self-contained file, no external requests except same-site JSON)
- Data: `data/latest.json` (all counties, last 30 days), `data/county/<slug>.json` (one per county, all 254)
- Feeds: `feeds/<slug>.xml` (RSS 2.0, one per county, all 254; newest 100 items)

Until the first successful update creates `data/latest.json`, the page says "First data load pending" and shows no permits.

## Data source

Railroad Commission of Texas (RRC), **Drilling Permit Master and Trailer – Daily File (includes latitudes and longitudes)**, listed on the RRC's "Data Sets Available for Download" page. It is an ASCII fixed-width file named `daf420.dat`, served zipped from the RRC's MFT ("GoDrive") file server, updated nightly. It holds the current month, cumulative; the script merges each day's file into the previous `latest.json` to keep a rolling 30 days.

Layout: RRC publication OGA049M ("Drilling Permit Master Plus Latitudes and Longitudes"). Each permit is a record `01` (permit #, county code, lease, district, operator, received date) followed by trailer records: `02` (well #, depth, issued date, survey/abstract/section/block, API #), `03` (field), `14` (surface lat/lon), `15` (bottom-hole lat/lon). County codes are the odd-numbered Texas FIPS codes 001–507 (`scripts/counties.mjs`).

**Not verified against a real file yet.** The RRC hosts were blocked from the build machine, so:
- Record `01` positions and the `02` well #, depth, issued and spud dates follow a public open-source parser that was calibrated against real daily files.
- Status, application type, API #, survey, abstract, section, block, horizontal flag and field number come from the guide only. Each is validated (API must start with the county code, survey only when the location-format flag is `N`, coordinates must fall inside Texas, dates must be real) and left out when it doesn't pass, so a wrong offset hides a field instead of showing garbage.
- The download link and the MFT page flow (select the newest row, submit "Download", unzip) follow the same public parser. If the RRC changes it, set the repo variable `RRC_DAF420_URL` or fix `download()` in `scripts/update.mjs`.

After the first real run, open `data/latest.json` and spot-check a few permits against the RRC's Drilling Permit (W-1) Query, especially API #, survey and abstract.

## How updates run

`.github/workflows/permit-watch.yml` runs daily at 13:15 UTC (and on demand via "Run workflow"):
1. runs the parser tests,
2. `node permit-watch/scripts/update.mjs` downloads, parses and writes `data/` and `feeds/` (only files whose content changed),
3. commits as "Update Texas permit data" using the default `GITHUB_TOKEN` (`contents: write`). No changes means no commit.

If the download or parse fails, the script exits non-zero and writes nothing; the run fails and GitHub notifies the repo owner. The page keeps showing the last good data.

Optional repo variables: `PERMIT_WATCH_SITE_URL` (e.g. `https://your-domain`, so feed items link back to the page; otherwise they link to the RRC W-1 Query), `RRC_DAF420_URL` (override the download link).

Run locally: `node permit-watch/scripts/update.mjs` (needs network access to `mft.rrc.texas.gov`), or `--file path/to/daf420.dat|.zip` to use a file you downloaded by hand. Options: `--out <dir>`, `--today YYYY-MM-DD`, `--days 30`.

## Tests

- `node --test permit-watch/test/*.test.mjs`: parser, validation, 30-day window, zip reading, outputs (254 feeds and county files), XML escaping, page county list matches the script's, and a guard that no fixture data ever appears in `data/` or `feeds/`.
- `permit-watch/test/page.e2e.mjs`: Playwright browser test (pending state and populated state, phone and desktop, light and dark, saved watches, blocked storage, the site's CSP). The populated state routes the JSON request to fixture data inside the browser. Run with `PLAYWRIGHT_DIR=<dir with node_modules/playwright> CHROMIUM=<chromium path> SHOT_DIR=<dir> node permit-watch/test/page.e2e.mjs`.
- `scripts/fixtures/daf420.test.dat` is a **made-up TEST fixture** shaped like the documented layout. It is for tests only and must never be published.

## Limits

- Data may lag the RRC site by up to a day; history starts on the first successful run.
- No stable per-permit RRC URL was verified, so each permit links to the RRC W-1 Query with its permit number to search.
- The pending-permits file (`dp_drilling_permit_pending_*.txt`, twice daily) is not used yet; it would give earlier signals.
- The RRC's current terms for commercial reuse were not confirmed. Check them before charging for anything built on this data.
- Another public project reports the RRC blocking an IP it judged to be automated traffic on this file server. This job downloads once a day with a descriptive User-Agent; if it gets blocked, contact the RRC rather than retrying harder.
- The paid tier ("Same-day email alerts", $9/month) is shown as coming soon only. It needs an email-sending service and a place to store each subscriber's watches, neither of which exists yet. The page collects no email and takes no payment.
- Not affiliated with the RRC. Not legal or investment advice.
