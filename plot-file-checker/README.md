# EUDR Plot File Checker (`plot-file-checker`)

A free, browser-only tool for cocoa and coffee exporters, cooperatives and their consultants. It checks farm plot geolocation files before they go to an EU buyer or into the EU Information System (TRACES) under the EU Deforestation Regulation (EU) 2023/1115, and fixes the problems that are safe to fix. The UI is in English and French: it follows `navigator.language`, and a toggle switches it, with the choice saved in localStorage.

This is a free demand test. It passes at **300 files checked and 25 waitlist sign-ups**.

## What it does
- **Reads:** GeoJSON (FeatureCollection, Feature or bare geometry), KML (Placemark Point/Polygon/LineString/MultiGeometry, with ExtendedData), CSV (lat/lon columns, one row per corner grouped by a plot ID, a WKT column, or a KoBo/ODK geoshape column `lat lon alt acc;…`; `,` `;` and tab delimiters, decimal commas) and WKT text. It does not read shapefiles (.zip/.shp), KMZ or Excel; it says so and explains how to export them.
- **Shows:** a verdict, summary counts, an SVG outline map with no external tiles, the issues still open grouped by rule, the fixes applied, and a plot table.
- **Downloads:** the fixed GeoJSON FeatureCollection (WGS 84, lon/lat, 6 decimals, one feature per line), with an option to leave out plots that still have errors, plus a CSV issue report (UTF-8 BOM so Excel shows accents correctly). Both can also be copied to the clipboard, with a visible-text fallback if copying fails.
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
| Fewer than 6 decimals | error | Written with 6 decimals; still warns about low GPS precision if ≤ 4 decimals |
| More than 6 decimals | – | Rounded to 6 (the EU system truncates to 6) |
| Altitude values | – | Removed |
| Coordinates 0,0 / NaN / missing | error | – (excluded from the output if unreadable) |
| LineString / MultiLineString | error | A closed line becomes a Polygon (marked "check this") |
| GeometryCollection | warn / error | Merged into MultiPolygon/MultiPoint if all members are the same kind |
| Ring not closed | error | Closed |
| Repeated consecutive points | warn | Removed |
| < 3 distinct corners / flat shape | error | – |
| Self-intersection, figure-8 pinch, spike | error | **Never fixed**; flagged for re-mapping. A self-crossing ring is never rewound. |
| Polygon holes | error | – |
| Clockwise outer ring (RFC 7946 right-hand rule) | warn | Rewound |
| Point with Area > 4 ha | error | – (hint mentions the cattle exemption) |
| Point without Area | info | – (system defaults to 4 ha) |
| Area as text / not a number / doesn't match the polygon (>25 % and >0.5 ha) | warn | Text turned into a number |
| Polygon < 100 m² or > 5,000 ha | warn | – |
| Property aliases (`pays`, `superficie`, `producer_name`, …) | warn | Renamed to ProducerName / ProducerCountry / ProductionPlace / Area |
| ProducerCountry not a 2-letter code (`Côte d'Ivoire`, `CIV`, `ci`) | error | Converted to ISO-2 |
| ProducerCountry missing on some plots | warn | – |
| Overlapping plots / identical plots / point inside another plot | warn | – |
| File > 10 MB, > 10,000 plots | warn | – |

**Swap detection** uses rough country bounding boxes. A plot is auto-swapped only in three cases: latitude is out of range only in the given order; the plot's ProducerCountry (or the country picked in the UI) contains the swapped point but not the original; or, with no country given, the original point falls in none of the known regions and the swapped point falls in the file's dominant producer country. A plot whose original point could be in Europe or North Africa/Sahel, such as Italy versus a swapped Ethiopian plot, is only flagged as "maybe".

**Area** is geodesic on a sphere (R = 6,371,008.8 m), using the same formula as Turf.js and d3-geo.

## Privacy
Files are parsed and fixed entirely in the browser. Nothing in the file is sent anywhere: no coordinates, names or properties. The page makes two calls, both to `/api/event`, which may not exist yet; failures are ignored or shown to the user:
- after checking a user file (not a built-in sample): `{tool:'plot-file-checker', event:'check', plots:N}`, an anonymous count only.
- the waitlist form, which requires a consent tick: `{tool, event:'waitlist', email}`.

No external scripts, fonts, images or map tiles. It works under the studio CSP.

## Sources and confidence
- EU Information System, "GeoJSON file description": https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html. A copy of version 1.5 (5 May 2025) is at https://nli.gov.cz/wp-content/uploads/EUDR-EUDR-GEOJSON-FILE-DESCRIPTION-1.5_.pdf. **These pages could not be opened from the build environment**, because the network blocked them. The rules taken from them come from search-result excerpts of the official page: WGS 84 lon/lat order; Point, MultiPoint, Polygon and MultiPolygon accepted; LineString not accepted; holes and self-crossing shapes not processed; the optional properties ProducerName, ProducerCountry (ISO-2), ProductionPlace and Area (ha, for points, default 4); other properties ignored; coordinates truncated to 6 decimals.
- Regulation (EU) 2023/1115, Art. 2(28) (at least 6 decimal digits; polygons for plots over 4 ha, except cattle): https://eur-lex.europa.eu/eli/reg/2023/1115/oj. Stated from known text; not opened during the build.
- RFC 7946 (GeoJSON; right-hand rule, `crs` removed): https://www.rfc-editor.org/rfc/rfc7946
- File-size and plot-count limits are **not confirmed officially**. Vendors report about 10 MB (LiveEO TradeAware docs) to 25 MB (TraceX), and 10,000 plots per batch (osapiens). The tool only warns.
- The application dates (30 Dec 2026 for large and medium operators, 30 Jun 2027 for micro and small) are as reported in the opportunity research. The page tells users to check the official timeline.
- Whisp link (deforestation risk is out of scope): https://www.fao.org/transparent-supply-chains/news---events/news/detail/supporting-eudr-compliance-with-whisp/en

Review these rules monthly against the official page. A wrong rule could pass a bad file. The page never promises acceptance.

## Tests
```
node --test plot-file-checker/test/geometry.test.mjs        # 18 unit tests (area, winding, self-intersection, swaps, parsers, fixes)
PW_NODE_MODULES=<dir with playwright> CHROMIUM_PATH=<chrome> SHOT_DIR=<dir> node plot-file-checker/test/e2e.mjs   # 23 browser checks
```
The unit tests read the core straight out of `index.html` (`<script id="pfc-core">`), so there is no separate build.
