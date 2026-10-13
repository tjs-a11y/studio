# Test fixtures: SAMPLE DATA, NOT REAL PRICES

Every file in this folder is **made up for tests**. The files are shaped like the real downloads
(ECB XML, U.S. Treasury CSV, FRED CSV, World Bank xlsx) so the parsers can be tested offline, but
**every number is invented**. They must never be copied into `commodities/data/` or shown as prices.
`fetch.mjs --fixtures` marks its output `"sample": true`, and the page then shows a "SAMPLE DATA" banner.
