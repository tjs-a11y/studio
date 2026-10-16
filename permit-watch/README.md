# Permit Watch — Texas

A free page that lists new Texas drilling permits by county, filters them by survey, abstract, operator, lease or distance from a point, and gives every county a free RSS feed so people can get phone or email alerts through any RSS app. Built for mineral and royalty owners.

- Page: `/permit-watch/` (`index.html`, one self-contained file, no external requests except same-site JSON)
- Data: `data/latest.json` (all counties, last 30 days), `data/county/<slug>.json` (one per county, all 254)
- Feeds: `feeds/<slug>.xml` (RSS 2.0, one per county, all 254; newest 100 items)

Until the first successful update creates `data/latest.json`, the page says "First data load pending" and shows no permits.

## Data source

Railroad Commission of Texas (RRC), **Drilling Permit Master and Trailer – Daily File (includes latitudes and longitudes)**, listed on the RRC's "Data Sets Available for Download" page. It is an ASCII fixed-width file named `daf420.dat`, listed unzipped on the RRC's MFT ("GoDrive") file server (the script also accepts a zip), updated nightly. It holds the current month, cumulative; the script merges each day's file into the previous `latest.json` to keep a rolling 30 days.

Layout: RRC publication OGA049M, "Drilling Permit Master Plus Latitudes and Longitudes", the manual the data-sets page links for this file: <https://www.rrc.texas.gov/media/zgccdjpi/drillingpermitmasterpluslatitudeslongitudes_oga049m_july1.pdf>. Records are 510 bytes. Each permit is a record `01` (permit #, county code, lease, district, operator, received date, application status) followed by trailer records: `02` (well #, depth, application type, issued and spud dates, survey/abstract/section/block, horizontal flag, API #), `03` (field #), `14` (surface lon/lat), `15` (bottom-hole lon/lat). County codes are the odd-numbered codes 001–507 (`scripts/counties.mjs`, matches the manual's county table; offshore codes 600–715 are skipped).

**Format checked against the manual (2026-10-11), not yet against a real file.** Every offset in `scripts/update.mjs` was re-derived from the manual, with the 1-based POS and the 0-based slice side by side in the code. Notes:
- The manual's record-02 listing prints the record id twice (POS 1 and POS 3), so every printed 02 position is 2 too high. The script subtracts that; the API # (POS 505, 8 digits) then ends exactly at byte 510. A public parser calibrated on real files uses the same 02 offsets.
- The district field holds the RRC's internal code, not the district name: 07 = 6E, 08 = 7B, 09 = 7C, 10 = 08, 11 = 8A, 13 = 09, 14 = 10 (manual, DA-DISTRICT). Fixed on 2026-10-11; before that, district 08 permits would have shown as "10" and 7B as "08".
- Status code `O` (Other) added. Application types follow the codes valid after 1994 (01 drill, 05 other, 07 re-enter, 09 field transfer, 14 recompletion, 15 reclass).
- Coordinates are NAD27 (manual II.75), longitude first, 12 columns with 7 decimals. The manual's picture is unsigned, so the parser accepts a longitude with or without a minus sign and an implied decimal point.
- Each guide value is still validated (API must start with the county code, survey only when the location-format flag is `N`, coordinates inside Texas, real dates) and left out when it doesn't pass, so a wrong offset hides a field instead of showing garbage.

After the first real run, open `data/latest.json` and spot-check a few permits against the RRC's Drilling Permit (W-1) Query, especially district, API #, survey and abstract.

Download: the data-sets page links the daily file as <https://mft.rrc.texas.gov/link/5f07cc72-2e79-4df8-ade1-9aeb792e03fc> (checked 2026-10-11). That opens a "Public GoDrive" listing with `daf420.dat` (the current file, listed unzipped at 813.66 KB, modified 10/10/26 9:45:47 AM) and dated archive copies (`daf420.dat.MM-DD-YYYY`). Each name is a link that submits the listing's form; `download()` finds the row named exactly `daf420.dat` and submits that link. If the RRC changes the page, set the repo variable `RRC_DAF420_URL` or fix `godriveRequest()` in `scripts/update.mjs`.

## RRC terms (checked 2026-10-11)

- Data-sets page (<https://www.rrc.texas.gov/resource-center/research/data-sets-available-for-download/>): "The following data sets are available from the Railroad Commission of Texas at free of charge." and "The conversion of the data and choice of conversion tools is the responsibility of the user." Questions: publicassist@rrc.texas.gov.
- Site policies (<https://www.rrc.texas.gov/site-policies/>), Disclaimer: "Unless otherwise noted on an individual document, file, web page, or other website item, RRC grants permission to copy and distribute the information on its website for noncommercial use, as long as the content remains unaltered and is not presented in a misleading way. The RRC has no restrictions on linking to our website as long as a fee is not charged to access our material. However, we would appreciate acknowledgment of any items you use and request that you link to us in the proper context"
- Site policies, Privacy and Security: "the RRC does not consent to access to its computer system by “robots,” denial of service attacks, or any other automated process that results in severe degradation of system performance." and "The RRC reserves the right to block, in its sole discretion and without notice, any access to, or use of, its computer services that may compromise computer service to others".
- Research queries page (<https://www.rrc.texas.gov/resource-center/research/research-queries/>): automated tools on the online query system get the session ended. This job does not touch the query system.
- `https://www.rrc.texas.gov/robots.txt` is empty (no rules). `mft.rrc.texas.gov/robots.txt` could not be fetched (TLS connection reset).

Reading: one download a day of a file the RRC publishes for bulk download, free, is consistent with these terms (the robots sentence targets automated access that degrades performance). Reuse is less clear: the blanket permission covers **noncommercial** use of **unaltered** content. This page reformats the data (filters, feeds), and a paid tier would be commercial. Get written OK from publicassist@rrc.texas.gov before charging for anything, and keep the "Source: Railroad Commission of Texas" credit and link.

## How updates run

`.github/workflows/permit-watch.yml` runs daily at 13:15 UTC (and on demand via "Run workflow"):
1. runs the parser tests,
2. `node permit-watch/scripts/update.mjs` downloads, parses and writes `data/` and `feeds/` (only files whose content changed),
3. commits as "Update Texas permit data" using the default `GITHUB_TOKEN` (`contents: write`). No changes means no commit.

The RRC file server sometimes resets connections, so a failed download is retried 3 times, each from a fresh session, after 15 s, 1 min and 3 min (a changed page layout is not retried). The job's time limit is 25 minutes to fit the retries. If the download or parse still fails, the script exits non-zero and writes nothing; the run fails and GitHub notifies the repo owner. The page keeps showing the last good data.

Optional repo variables: `PERMIT_WATCH_SITE_URL` (e.g. `https://your-domain`, so feed items link back to the page; otherwise they link to the RRC W-1 Query), `RRC_DAF420_URL` (override the download link).

Run locally: `node permit-watch/scripts/update.mjs` (needs network access to `mft.rrc.texas.gov`; behind an HTTPS proxy on Node 22.21+, add `NODE_USE_ENV_PROXY=1`), or `--file path/to/daf420.dat|.zip` to use a file you downloaded by hand. Options: `--out <dir>`, `--today YYYY-MM-DD`, `--days 30`.

## Tests

- `node --test permit-watch/test/*.test.mjs`: parser, validation, district codes, coordinate formats, the GoDrive download-page parser, 30-day window, zip reading, outputs (254 feeds and county files), XML escaping, page county list matches the script's, and a guard that no fixture data ever appears in `data/` or `feeds/`.
- `permit-watch/test/page.e2e.mjs`: Playwright browser test (pending state and populated state, phone and desktop, light and dark, saved watches, blocked storage, the site's CSP). The populated state routes the JSON request to fixture data inside the browser. Run with `PLAYWRIGHT_DIR=<dir with node_modules/playwright> CHROMIUM=<chromium path> SHOT_DIR=<dir> node permit-watch/test/page.e2e.mjs`.
- `scripts/fixtures/daf420.test.dat` is a **made-up TEST fixture** shaped like the documented layout. It is for tests only and must never be published.

## Limits

- Data may lag the RRC site by up to a day; history starts on the first successful run.
- No stable per-permit RRC URL was verified, so each permit links to the RRC W-1 Query with its permit number to search.
- The pending-permits file (`dp_drilling_permit_pending_*.txt`, twice daily) is not used yet; it would give earlier signals.
- RRC permission covers noncommercial use only (see "RRC terms" above). Confirm commercial reuse in writing before charging for anything built on this data.
- Another public project reports the RRC blocking an IP it judged to be automated traffic on this file server. This job downloads once a day with a descriptive User-Agent; if it gets blocked, contact the RRC rather than retrying harder.
- The paid tier ("Same-day email alerts", $9/month) is shown as coming soon only. It needs an email-sending service and a place to store each subscriber's watches, neither of which exists yet. The page collects no email and takes no payment.
- Not affiliated with the RRC. Not legal or investment advice.

## Changelog
- 2026-10-16: Download retries (3 more attempts, 15 s / 1 min / 3 min, fresh session each time; layout errors fail at once); workflow time limit 15 → 25 min. Checked tonight: the RRC data-sets page and the GoDrive link load, the live listing still shows `daf420.dat` plus dated archives, and `godriveRequest()` built a valid download request from the live page. The file download itself failed with TLS resets (5 tries), so the parser is still **not verified against a real file**.
- 2026-10-11: First build; offsets checked against manual OGA049M.

