# EUDR Plot File Checker (`plot-file-checker`)

A free, browser-only tool for cocoa and coffee exporters, cooperatives and their consultants. It checks farm plot geolocation files before they go to an EU buyer or into the EU Information System (TRACES) under the EU Deforestation Regulation (EU) 2023/1115, and fixes the problems that are safe to fix. The UI is in English, French and Spanish (Spanish added 2026-10-16): it follows `?lang=en|fr|es` first, then the choice saved in localStorage, then `navigator.language`; the EN/FR/ES toggle switches it. Spanish names of producer countries in files ("Costa de Marfil", "Perú") also convert to ISO-2 codes. The learn pages and guides are in English and French only (Spanish ones not written yet).

This is a free demand test. It passes at **300 files checked and 25 waitlist sign-ups**.

## What it does
- **Reads:** GeoJSON (FeatureCollection, Feature or bare geometry), KML (Placemark Point/Polygon/LineString/MultiGeometry, with ExtendedData), CSV (lat/lon columns, one row per corner grouped by a plot ID, a WKT column, or a KoBo/ODK geoshape column `lat lon alt acc;…`; `,` `;` and tab delimiters, decimal commas) and WKT text. It does not read shapefiles (.zip/.shp), KMZ or Excel; it says so and explains how to export them.
- **Shows:** a verdict, summary counts, an SVG outline map with no external tiles, the issues still open grouped by rule, the fixes applied, and a plot table.
- **Downloads:** the fixed GeoJSON FeatureCollection (WGS 84, lon/lat, 6 decimals, one feature per line), with an option to leave out plots that still have errors, plus a CSV issue report (UTF-8 BOM so Excel shows accents correctly). Both can also be copied to the clipboard, with a visible-text fallback if copying fails.
- **Buyer summary (2026-10-15):** a one-page printout (or PDF via the print window) for the exporter's records or the EU buyer: file name, date, producer countries, the verdict and counts, the outline map, open issues and fixes by rule, and the SHA-256 fingerprint of the fixed GeoJSON exactly as downloaded (it follows "leave out plots with errors"), with the commands to check it on Windows, Mac and Linux. Samples are labelled as fictional. It states plainly that it is a format check only, not a deforestation or legality check. Built in the browser; nothing is sent.
- **Samples:** a messy sample (Côte d'Ivoire, 8 plots, one of each common problem) and a clean sample (Ghana, 4 plots). Both are fictional.

### Checks
| Rule | Severity | Auto-fix |
|---|---|---|
| Not GeoJSON / converted from KML, CSV, WKT | – | Converted to FeatureCollection |
| `crs` member (WGS 84) / other CRS declared | warn / error | Removed / – (reproject in QGIS) |
| Projected coordinates (metres) or out of range | error | – |
| Lat/lon swapped | error | Swapped, **only when obvious** (see below) |
| Possibly swapped, ambiguous | warn | – (user picks the country, then it is fixed) |
| Plot outside its stated ProducerCountry | warn | – |
| Fewer than 6 decimals (judged on the longest value in each plot, since JSON writers drop trailing zeros) | error | Written with 6 decimals; still warns about low GPS precision if ≤ 4 decimals |
| More than 6 decimals | – | Truncated to 6, as the EU system does before storing; duplicates this creates are removed and the result is re-checked |
| Altitude values | info | Removed (the EU format allows them; only lon/lat are used) |
| Coordinates 0,0 / NaN / missing | error | – (excluded from the output if unreadable) |
| LineString / MultiLineString | error | A closed line becomes a Polygon (marked "check this") |
| GeometryCollection (accepted by the EU system) | info / warn (mixed points and polygons) / error (contains a line) | Merged into MultiPolygon/MultiPoint if all members are the same kind; member polygons are checked like any polygon |
| Ring not closed | error | Closed |
| Repeated consecutive points | warn | Removed |
| < 3 distinct corners / flat shape | error | – |
| Self-intersection, figure-8 pinch, spike | error | **Never fixed**; flagged for re-mapping. A self-crossing ring is never rewound. |
| Polygon holes | error | – |
| Clockwise outer ring (RFC 7946 right-hand rule; the EU guidance has no winding rule) | info | Rewound |
| Point with Area > 4 ha | error | – (hint mentions the cattle exemption) |
| Point without Area | info | – (system defaults to 4 ha) |
| Point with Area < 0.0001 ha (incl. 0) | error | – |
| Area as text (EU reads `"3"` as 0) / not a number / doesn't match the polygon (>25 % and >0.5 ha) | warn | Text turned into a number |
| Polygon < 100 m² or > 5,000 ha | warn | – |
| Property aliases and wrong case (`pays`, `superficie`, `producer_name`, `productionplace`, …) | warn | Renamed to ProducerName / ProducerCountry / ProductionPlace / Area |
| ProducerCountry not a 2-letter code (`Côte d'Ivoire`, `CIV`, `ci`) | error | Converted to ISO-2 |
| ProducerCountry missing on some plots | warn | – |
| Overlapping plots / identical plots / point inside another plot | warn | – |
| File > 25 MB (EU limit per DDS, read as 25,000,000 bytes) / > 20 MB | error / warn | – |
| > 1,000 distinct producers (ProducerName + ProducerCountry) / > 10,000 plots | warn | – |

**Swap detection** uses rough country bounding boxes. A plot is auto-swapped only in three cases: latitude is out of range only in the given order; the plot's ProducerCountry (or the country picked in the UI) contains the swapped point but not the original; or, with no country given, the original point falls in none of the known regions and the swapped point falls in the file's dominant producer country. A plot whose original point could be in Europe or North Africa/Sahel, such as Italy versus a swapped Ethiopian plot, is only flagged as "maybe".

**Area** is geodesic on a sphere (R = 6,371,008.8 m), using the same formula as Turf.js and d3-geo.

## Privacy
Files are parsed and fixed entirely in the browser. Nothing in the file is sent anywhere: no coordinates, names or properties. The page makes two calls, both to `/api/event`, which may not exist yet; failures are ignored or shown to the user:
- after checking a user file (not a built-in sample): `{tool:'plot-file-checker', event:'check', plots:N}`, an anonymous count only.
- the waitlist form, which requires a consent tick: `{tool, event:'waitlist', email}`.

No external scripts, fonts, images or map tiles. It works under the studio CSP.

## Sources and confidence
Checked on 11 October 2026 against these official pages, all opened and read during that review:
- EU Information System, "GeoJSON File Description" (page dated "Updated 17 August 2026"): https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html. Confirms: WGS 84 (EPSG:4326), longitude then latitude; Point, MultiPoint, Polygon, MultiPolygon (and GeometryCollection is defined); LineString/MultiLineString not accepted; polygons closed, at least 4 positions; holes and crossing lines not processed; "overlapping sides"/spikes and straight-line shapes rejected; optional properties ProducerName, ProducerCountry (ISO-2), ProductionPlace, Area (ha, for points), case-sensitive, others ignored; ProducerCountry on every feature in a multi-producer (Type II) file; coordinates **truncated** to 6 decimals before storing (truncation can create duplicate points); point Area defaults to 4 ha; `"Area": "3"` (text) is read as 0; 25 MB limit per DDS for all GeoJSON files together. It sets no winding rule and no plot-count limit. The EU's own Type I sample has values like `-49.00683` (trailing zero dropped), which is why precision is judged on the longest value per plot.
- EU Information System, "Validation Rules": https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/validation-rules.html. Confirms: point Area defaults to 4 ha; a point with Area > 4 ha is an error unless the commodity is cattle; Area, when given, must be ≥ 0.0001 ha; coordinates in range, truncated to 6 decimals; no invalid geometry; geolocation data ≤ 25 Mb per DDS; ≤ 1,000 producers per commodity and ≤ 10,000 per DDS.
- EU Information System, DDS V3 API reference: https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/api/due-diligence-statement-v3.html, and FAQ: https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/faq.html. Confirm: at least 6 decimal digits; polygons for plots over 4 ha except cattle; supported types Point, MultiPoint, Polygon, MultiPolygon, GeometryCollection. The docs home page (https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/index.html) says the EUDR was amended by Regulation (EU) 2025/2650 (simplified declarations for micro or small primary operators in low-risk countries, which may use a postal address instead of geolocation).
- Regulation (EU) 2023/1115, Art. 2(28): https://eur-lex.europa.eu/eli/reg/2023/1115/oj. **Not opened**: EUR-Lex answers with a bot challenge that the build network blocks. The 6-decimal and 4-ha rules above are confirmed through the official EU Information System pages, not through the regulation text.
- **Application dates are unverified.** The page says 30 Dec 2026 (large and medium operators) and 30 Jun 2027 (micro and small). Neither the amending regulations (2024/3234, 2025/2650) on EUR-Lex nor the Commission's EUDR pages could be opened, and the pages that did open give no dates. The page tells users to check the official timeline.
- RFC 7946 (GeoJSON; right-hand rule, `crs` removed): https://www.rfc-editor.org/rfc/rfc7946
- Whisp link (deforestation risk is out of scope): https://www.fao.org/transparent-supply-chains/news---events/news/detail/supporting-eudr-compliance-with-whisp/en

Review these rules monthly against the official page. A wrong rule could pass a bad file. The page never promises acceptance.

## Tests
```
node --test plot-file-checker/test/geometry.test.mjs        # 22 unit tests (area, winding, self-intersection, swaps, parsers, fixes, EU limits, official EU sample)
node --test plot-file-checker/test/i18n.test.mjs            # 6 tests: every string, message, rule card, source and country in EN/FR/ES with matching {placeholders}
PW_NODE_MODULES=<dir with playwright> CHROMIUM_PATH=<chrome> SHOT_DIR=<dir> node plot-file-checker/test/e2e.mjs   # 34 browser checks (incl. Spanish toggle, Spanish phone browser, ?lang=es, Spanish CSV headers)
```
The unit tests read the core straight out of `index.html` (`<script id="pfc-core">`), so there is no separate build.

## Changelog
- 2026-10-16: Spanish UI (all strings, the 58 issue messages, rule cards, FAQ, buyer summary, CSV report headers), `?lang=` links, Spanish country names recognised in files. Translation is staff-written and not yet reviewed by a native speaker. No checker rule changed.
- 2026-10-15: Buyer summary (print / save as PDF) with a SHA-256 fingerprint of the fixed file. Sources re-checked: the EU Information System GeoJSON page still reads "Updated 17 August 2026"; its API index now describes V3 (Regulation (EU) 2025/2650: micro or small primary operators and simplified declarations). No rule in this checker changed.
- 2026-10-11: Checked against the EU Information System documentation (see Sources).
