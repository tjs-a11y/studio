// EUDR plot file errors (English). Facts only from the EU Information System help pages (opened Oct 11, 2026)
// and the checker's documented behaviour in /plot-file-checker/README.md.
const H = 'https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/';
export const SRC = {
  geo: { label: 'EU Information System, "GeoJSON File Description" (updated 17 August 2026)', url: H + 'geojson-description.html' },
  val: { label: 'EU Information System, "API and UI Validation Rules"', url: H + 'validation-rules.html' },
  faq: { label: 'EU Information System, operator FAQ', url: H + 'faq.html' },
  dds: { label: 'EU Information System, Due Diligence Statement V3 API reference', url: H + 'api/due-diligence-statement-v3.html' },
  home: { label: 'EU Information System, operator API reference home', url: H + 'index.html' },
  tool: { label: 'Quickwell EUDR Plot File Checker, rule table and documentation', url: '/plot-file-checker/' },
};
const GEO = `<a href="${SRC.geo.url}" rel="noopener">GeoJSON File Description</a>`;
const VAL = `<a href="${SRC.val.url}" rel="noopener">Validation Rules</a>`;

export const SECTION = {
  path: '/learn/eudr/', alt: '/fr/learn/eudr/', altLang: 'fr',
  name: 'EUDR plot file errors',
  h1: 'EUDR plot file errors, and how to fix each one',
  title: 'EUDR GeoJSON Errors Explained: Plot File Problems and How to Fix Them',
  description: 'The common reasons an EUDR geolocation (GeoJSON) file is rejected by the EU Information System: swapped coordinates, decimals, open or self-crossing polygons, holes, points over 4 ha, file size, property names. One page each.',
  lang: 'en', crumbs: [{ name: 'Quickwell', path: '/' }, { name: 'Learn', path: '/learn/' }],
  lede: 'Plot geolocation files for the EU Deforestation Regulation (EUDR) are GeoJSON files with strict rules. Each page below explains one common error, what the EU Information System says about it, and how to fix it.',
  hubText: 'GeoJSON errors that block a due diligence statement, in English and French.',
  intro: `<p>Under Regulation (EU) 2023/1115, operators placing cattle, cocoa, coffee, oil palm, rubber, soya or wood products on the EU market submit a due diligence statement (DDS) in the EU Information System, with the geolocation of the plots where the commodity was produced (<a href="${SRC.home.url}" rel="noopener">EU Information System documentation</a>). The geolocation is uploaded as a GeoJSON file, and the system checks it against technical rules published in its ${GEO} and ${VAL} pages.</p>
<p>These pages explain each rule in plain English, for exporters, cooperatives and consultants who prepare plot files. Every fact comes from those official pages; where the EU documentation is silent, the page says so. The pages don't cover deforestation risk itself, only whether the file is technically acceptable.</p>`,
  groups: [
    { title: 'Coordinates', slugs: ['coordinate-system-wgs84', 'swapped-coordinates', 'six-decimal-places'] },
    { title: 'Polygon shape', slugs: ['unclosed-polygon', 'self-intersecting-polygon', 'polygon-holes'] },
    { title: 'Geometry types and points', slugs: ['point-area-over-4-hectares', 'linestring-not-accepted', 'geometrycollection'] },
    { title: 'File and properties', slugs: ['property-names', 'file-size-limit'] },
  ],
  outro: '<p class="note">Checked against the EU Information System help pages on October 11, 2026. Application dates for the regulation are not covered here; check the European Commission\'s official timeline.</p>',
  sources: [SRC.geo, SRC.val, SRC.faq, SRC.dds, SRC.home, SRC.tool],
  cta: { title: 'Check a plot file for free', text: 'Drop a GeoJSON, KML or CSV file into the EUDR Plot File Checker. It flags every problem on this list, fixes the safe ones (closing rings, decimals, property names, obvious swaps) and gives you a corrected GeoJSON. In English, French or Spanish; nothing is uploaded.', href: '/plot-file-checker/', label: 'Open the Plot File Checker' },
  disclaimer: 'Not legal advice. These pages explain the technical file rules published by the EU Information System; they do not guarantee that a file or a due diligence statement will be accepted, and they say nothing about whether a plot is deforestation-free. Check the official documentation, which can change.',
};

export const PAGES = [
{ slug: 'coordinate-system-wgs84', alt: '/fr/learn/eudr/coordinate-system-wgs84/', h1: 'Wrong coordinate system: EUDR files must be WGS 84 longitude/latitude', short: 'Projected coordinates, a crs member, or values out of range.',
  title: 'EUDR GeoJSON Coordinate System: WGS 84 (EPSG:4326) Only, and What to Do If Yours Isn\'t',
  description: 'The EU Information System accepts plot coordinates only in WGS 84 (EPSG:4326), in decimal degrees, longitude first. How to spot projected (metre) coordinates, out-of-range values and 0,0 points, and how to convert.',
  lede: 'The EU Information System reads plot coordinates in one coordinate system only: WGS 84 (EPSG:4326), in decimal degrees. Coordinates in metres, or from a national grid, are not converted for you.',
  body: `
<h2>What the EU documentation says</h2>
<p>The ${GEO} says GeoJSON uses the World Geodetic System 1984 (WGS 84) datum with longitude and latitude in decimal degrees, and that the first production version of the system supports that standard exclusively. If your coordinates are in another system, they must be converted to WGS 84 (EPSG:4326) before upload. Support for other systems is "deferred for future versions". The same rules apply to the web interface and to the API.</p>
<p>Coordinates must also be in range: latitude between -90 and 90, longitude between -180 and 180. An "invalid coordinate range" is one of the common errors the EU page lists, and the ${VAL} require latitude and longitude values to be in range.</p>
<h2>How to recognize the problem</h2>
<ul>
<li><b>Large numbers</b>, like <code>[512340.25, 732118.90]</code>. These are projected coordinates in metres (for example a UTM zone or a national grid), not degrees.</li>
<li><b>A <code>crs</code> member</b> at the top of the file naming something other than WGS 84, often left by GIS software.</li>
<li><b>Points at 0,0</b>, in the Gulf of Guinea. That usually means a GPS fix that failed and wrote zeros, not a real plot.</li>
<li><b>Values over 90</b> in the latitude position. Sometimes that's a projection problem; sometimes it's <a href="/learn/eudr/swapped-coordinates/">swapped coordinates</a>.</li>
</ul>
<h2>How to fix it</h2>
<ol>
<li>Find out which coordinate system the data was collected or stored in. Your mapping app or GIS project settings will say.</li>
<li>In QGIS (free), open the layer, then use "Export, Save Features As", choose GeoJSON and set the CRS to <b>EPSG:4326 - WGS 84</b>. The export reprojects the coordinates.</li>
<li>Check a few plots on a map after export: they should land on the farms, not in the sea.</li>
<li>Remove points at 0,0 and any plot with missing coordinates, and re-collect those plots.</li>
</ol>
<h2>What the Plot File Checker does</h2>
<p>The checker treats a <code>crs</code> member that declares WGS 84 as a warning and removes it in the fixed file; a <code>crs</code> naming any other system is an error, because reprojection needs GIS software. Coordinates that look like metres, or are out of range, are errors. Points at 0,0, NaN or missing values are errors, and unreadable ones are left out of the fixed file. The checker doesn't reproject, by design: guessing the source system could move every plot to the wrong place.</p>
<h2>Why accuracy matters here</h2>
<p>The EU FAQ defines geolocation for EUDR as latitude/longitude coordinates with at least 6 decimal digits (<a href="${SRC.faq.url}" rel="noopener">FAQ</a>). Six decimals of a degree is about 0.11 m on the ground at the equator (<b>estimate</b>: roughly 111 km per degree × 0.000001), so a datum or projection error of tens of metres is far larger than the precision the file claims. Convert once, carefully, from the original data.</p>`,
  sources: [SRC.geo, SRC.val, SRC.faq, SRC.tool], related: ['swapped-coordinates', 'six-decimal-places', 'property-names'] },

{ slug: 'swapped-coordinates', alt: '/fr/learn/eudr/swapped-coordinates/', h1: 'Swapped coordinates: latitude and longitude in the wrong order', short: 'GeoJSON wants longitude first; spreadsheets often put latitude first.',
  title: 'EUDR GeoJSON Swapped Coordinates: Longitude Comes First',
  description: 'In GeoJSON, each position is [longitude, latitude]. Files built from spreadsheets often reverse it, putting plots in the wrong country or the sea. How to spot swapped EUDR coordinates and fix them safely.',
  lede: 'In GeoJSON, every position is written longitude first, then latitude. Files assembled from spreadsheets or GPS exports often reverse the order, which can put a cocoa farm in the Indian Ocean or another country.',
  body: `
<h2>The rule</h2>
<p>The EU ${GEO} says a position is an array of numbers with at least two elements, and that the order must be <b>longitude, latitude</b> for coordinates in the EPSG:4326 system. That's the opposite of how most people say coordinates aloud ("5.3° N, 4.0° W") and how many spreadsheets store them (a latitude column, then a longitude column).</p>
<h2>What swapped coordinates look like</h2>
<p>A plot near Abidjan, Côte d'Ivoire is at about latitude 5.3, longitude -4.0. In GeoJSON that is <code>[-4.0, 5.3]</code>. If it's written <code>[5.3, -4.0]</code>, the system reads longitude 5.3 and latitude -4.0: a point in the Atlantic south of Nigeria. Nothing in the file is "wrong" as numbers; it's in the wrong place.</p>
<p>Sometimes the swap is impossible to miss: Ethiopian coffee at latitude around 7 and longitude around 38 becomes latitude 38, which is in the Mediterranean region. Sometimes it's subtle: near the equator and the prime meridian, both orders can land on land. Ghana and Côte d'Ivoire, where many cocoa plots sit at latitudes 5 to 8 and longitudes -8 to 0, are the classic case.</p>
<h2>How to check your own file</h2>
<ol>
<li>Open the file on a map (QGIS, geojson.io or any GIS viewer) and look at where the plots are.</li>
<li>Compare with the ProducerCountry property, if present. A plot labelled CI that appears in the sea or in another country is a red flag.</li>
<li>Look at the numbers: a value above 90 or below -90 in the second position can't be a latitude.</li>
</ol>
<h2>How to fix it</h2>
<p>If the whole file is swapped, export it again from the source with the columns mapped correctly: longitude to X, latitude to Y. Don't "fix" plots one by one unless you know which ones are wrong, because a file can mix correct and swapped plots when data came from several collectors.</p>
<h2>What the Plot File Checker does</h2>
<p>The checker uses rough country outlines to decide whether a plot is swapped. It swaps a plot automatically only in clear cases: the latitude is out of range in the given order only; the plot's ProducerCountry (or the country you pick) contains the swapped point but not the original; or, with no country given, the original point falls in no known producing region and the swapped point falls in the file's main producer country. When both orders are plausible, it marks the plot as "possibly swapped" and asks you to choose the country, then fixes it. It also warns about any plot that lies outside its stated ProducerCountry.</p>
<h2>Prevent it next season</h2>
<p>When you set up a data collection form or spreadsheet template, name the columns <code>longitude</code> and <code>latitude</code> explicitly, not "X/Y" or "coord1/coord2", and test one known plot end to end before the campaign starts.</p>`,
  sources: [SRC.geo, SRC.tool], related: ['coordinate-system-wgs84', 'six-decimal-places', 'property-names'] },

{ slug: 'six-decimal-places', alt: '/fr/learn/eudr/six-decimal-places/', h1: 'Decimal places: at least 6, and what truncation does to your polygons', short: 'Too few decimals, and duplicates created by truncation.',
  title: 'EUDR Coordinates: 6 Decimal Places Minimum, and Truncation Duplicates',
  description: 'EUDR geolocation needs at least 6 decimal digits, and the EU Information System truncates anything beyond 6. Why too few decimals fail, how truncation can create duplicate points, and what to do.',
  lede: 'EUDR geolocation must use at least 6 decimal places. The EU Information System also cuts anything beyond 6 decimals, which can quietly create duplicate points and invalid shapes.',
  body: `
<h2>What the EU documentation says</h2>
<ul>
<li>The <a href="${SRC.faq.url}" rel="noopener">FAQ</a> defines geolocation as latitude/longitude coordinates "with a minimum of 6 decimal digits". The DDS API reference repeats it: coordinates must have a minimum of 6 decimal digits.</li>
<li>The ${GEO} says the system <b>truncates coordinate points to 6 decimal places</b> before storing, that sending more is "superfluous/wasteful", and that in extreme cases it may even produce invalid geometries where the original was valid. The ${VAL} say the same.</li>
<li>Its list of common errors includes "duplicate coordinates due to truncation to 6 decimals", with an example: <code>-5.8227391234, 144.2567071234</code> and <code>-5.8227394567, 144.2567074567</code> both become <code>-5.822739, 144.256707</code>.</li>
</ul>
<h2>Too few decimals</h2>
<p>A coordinate like <code>-4.02, 5.31</code> has two decimals: it locates a point only to about a kilometre. Files often lose decimals when a spreadsheet column is formatted to show 2 or 4 places and then saved as CSV, or when a phone app exports rounded values. Re-exporting won't bring the lost precision back; you need the original data or a new GPS reading.</p>
<p>One subtlety: JSON writers drop trailing zeros, so <code>-49.00683</code> may really be <code>-49.006830</code>. The EU's own sample file contains values like that. A fair test looks at the longest value in a plot, not at every single number.</p>
<h2>Too many decimals</h2>
<p>Sending 10 or 15 decimals is harmless by itself, but because of truncation two corners that were 0.0000003 degrees apart become the same point. A polygon with repeated corners, or with corners that collapse into a line, can then become invalid. The fix is to truncate to 6 decimals yourself and then remove consecutive duplicate points, so you can check the result before the system does.</p>
<h2>What the Plot File Checker does</h2>
<ul>
<li>Fewer than 6 decimals (judged on the longest value in each plot): an error. The fixed file writes 6 decimals, but the checker still warns about low GPS precision if the data had 4 decimals or fewer, because padding with zeros doesn't add accuracy.</li>
<li>More than 6 decimals: truncated to 6, as the EU system does. Duplicates this creates are removed and the plot is re-checked for shape problems.</li>
<li>Repeated consecutive points: a warning, removed in the fixed file.</li>
</ul>
<h2>Good practice</h2>
<p>Keep the raw GPS data with full precision in your own records, and produce the upload file from it with exactly 6 decimals. Format spreadsheet coordinate columns as text or with at least 6 decimals so nothing is rounded when saving.</p>`,
  sources: [SRC.faq, SRC.dds, SRC.geo, SRC.val, SRC.tool], related: ['self-intersecting-polygon', 'unclosed-polygon', 'coordinate-system-wgs84'] },

{ slug: 'unclosed-polygon', alt: '/fr/learn/eudr/unclosed-polygon/', h1: 'Unclosed polygon: the first and last point must be the same', short: 'Open rings and polygons with too few corners.',
  title: 'EUDR GeoJSON "Open" Polygon Error: Closing the Ring',
  description: 'Every EUDR plot polygon must be closed: the first and last coordinate pair must be identical, and a polygon needs at least four positions. Why polygons come out open and how to close them.',
  lede: 'A polygon in an EUDR plot file must be a closed shape: its last coordinate pair must repeat the first. "Open" polygons are on the EU\'s list of common GeoJSON errors.',
  body: `
<h2>What the EU documentation says</h2>
<p>The ${GEO} defines a Polygon as at least four pairs of coordinates representing an enclosed area, and notes that "the first and last point's coordinates of polygons are the same (they coincide geographically to close the shape)". Its list of common errors includes "Open polygons. All polygons must represent closed shapes (i.e. the 1st coordinate pair same as the last)".</p>
<p>So a triangle needs four positions (three corners plus the first one again), and a four-cornered field needs five.</p>
<h2>Why polygons come out open</h2>
<ul>
<li><b>Walked boundaries.</b> A field agent walks the plot with a GPS app and stops a few metres before the starting point. The app saves the corners as recorded.</li>
<li><b>Spreadsheet conversion.</b> One row per corner, converted to GeoJSON by a script that doesn't add the closing point.</li>
<li><b>Lines instead of polygons.</b> Some apps save a walked boundary as a LineString. That's a different error; see <a href="/learn/eudr/linestring-not-accepted/">LineString not accepted</a>.</li>
</ul>
<h2>How to fix it</h2>
<p>Closing a ring is safe when the plot is otherwise sound: copy the first coordinate pair to the end of the ring. In QGIS, the "Fix geometries" tool or simply re-saving a polygon layer as GeoJSON closes rings. If you edit the file by hand, the closing pair must match the first pair exactly, to every decimal.</p>
<p>Before closing, look at the gap. If the last point is far from the first, closing it draws a straight line across the field and may cut off part of the plot, or cross another edge and create a <a href="/learn/eudr/self-intersecting-polygon/">self-intersection</a>. A large gap usually means the boundary wasn't finished and should be re-mapped.</p>
<h2>Too few corners</h2>
<p>A ring with fewer than three distinct corners can't enclose an area; neither can corners that all lie on one line. The EU page lists "coordinate shapes representing straight lines" among the common errors. These can't be fixed by editing; the plot needs to be mapped again, or submitted as a point if it is 4 hectares or less (see <a href="/learn/eudr/point-area-over-4-hectares/">points and the 4 ha rule</a>).</p>
<h2>What the Plot File Checker does</h2>
<ul>
<li>Ring not closed: an error, closed automatically in the fixed file.</li>
<li>Fewer than 3 distinct corners, or a flat shape: an error, not fixable automatically.</li>
<li>A closed LineString: turned into a Polygon and marked "check this", because the checker can't know whether the line was meant as a boundary.</li>
</ul>
<p>After closing, the checker re-runs the shape tests, so a ring that becomes self-crossing when closed is still reported.</p>`,
  sources: [SRC.geo, SRC.tool], related: ['self-intersecting-polygon', 'linestring-not-accepted', 'polygon-holes'] },

{ slug: 'self-intersecting-polygon', alt: '/fr/learn/eudr/self-intersecting-polygon/', h1: 'Self-intersecting polygon: crossing lines, figure-eights and spikes', short: 'Figure-8 shapes, overlapping sides and spikes are rejected.',
  title: 'EUDR Self-Intersecting Polygon Error: Figure-Eights, Crossing Lines and Spikes',
  description: 'The EU Information System rejects plot polygons whose edges cross (figure-eight shapes), fold back over themselves or form spikes. Why these shapes happen, why they can\'t be auto-fixed, and how to re-map them.',
  lede: 'A plot polygon whose boundary crosses itself, like a figure eight, is not accepted by the EU Information System. Neither are shapes whose sides overlap or fold back into a spike.',
  body: `
<h2>What the EU documentation says</h2>
<p>The ${GEO} says that "shapes with crossing lines (like a figure eight for example) are not supported and will not be processed". Its list of common errors starts with "coordinate lines crossing (i.e. figure eight shapes or intersecting polygon lines)" and "overlapping sides: internal overlap or holes where part of the polygon folds inward ... are not accepted by the system". The ${VAL} add, more generally, that geolocation data cannot contain invalid geometry such as invalid polygons.</p>
<h2>How these shapes happen</h2>
<ul>
<li><b>Corners out of order.</b> Points recorded clockwise for half the field and counter-clockwise for the rest, or sorted by ID instead of walking order, make edges cross.</li>
<li><b>GPS jitter.</b> Standing still while the GPS logs several points can produce a tiny loop or a spike where the boundary goes out and back on itself.</li>
<li><b>Closing an unfinished boundary.</b> A straight closing line across a half-walked plot can cut through another edge.</li>
<li><b>Truncation.</b> Rarely, cutting coordinates to 6 decimals makes two nearby corners collide; see <a href="/learn/eudr/six-decimal-places/">decimal places</a>.</li>
</ul>
<h2>Why it shouldn't be fixed automatically</h2>
<p>Software can "repair" a self-crossing polygon, for example by splitting it into two pieces or rebuilding it around its outer edge. But each repair is a guess about where the real boundary is, and the result may include land that isn't part of the farm or leave out land that is. For a deforestation declaration, a plausible-looking wrong boundary is worse than an error message. The safe fix is to correct the point order from the field notes, or re-map the plot.</p>
<h2>How to find and fix it</h2>
<ol>
<li>Open the file in QGIS and run "Check validity" (Vector, Geometry Tools). It lists the location of each self-intersection.</li>
<li>Zoom to the location. If two corners are simply in the wrong order, reorder them; if a spike comes from GPS jitter at one corner, delete the extra points.</li>
<li>If you can't tell what the boundary should be, mark the plot for re-mapping.</li>
<li>Run the check again before exporting.</li>
</ol>
<h2>What the Plot File Checker does</h2>
<p>Self-intersections, figure-eight pinches and spikes are reported as errors and are <b>never fixed</b> by the checker; the plot is flagged for re-mapping. A self-crossing ring is never rewound or rebuilt. You can download the fixed file with plots that still have errors left out, so the clean plots aren't held up while the problem ones are re-mapped.</p>`,
  sources: [SRC.geo, SRC.val, SRC.tool], related: ['unclosed-polygon', 'polygon-holes', 'six-decimal-places'] },

{ slug: 'polygon-holes', alt: '/fr/learn/eudr/polygon-holes/', h1: 'Polygons with holes are not accepted: the two-halves workaround', short: 'Doughnut shapes must be split into two polygons.',
  title: 'EUDR Polygon With Holes Error: Why Doughnut Plots Fail and the Workaround',
  description: 'The EU Information System does not accept polygons with holes (doughnut shapes). Why plots end up with holes and the official workaround: describe the plot as two half-doughnut polygons.',
  lede: 'A GeoJSON polygon can describe a hole, such as a farm that surrounds a house compound or a protected patch. The EU Information System does not accept polygons with holes.',
  body: `
<h2>What the EU documentation says</h2>
<p>The ${GEO} says: "Polygons with holes (i.e., doughnut shapes) ... are not supported and will not be processed. If a doughnut shape is needed, it can be defined by combining two half-doughnut shaped polygons." Its list of common errors mentions coordinate shapes with holes, with the workaround "two half-moon shapes", and again "polygons with holes inside", where the user is shown an error message.</p>
<h2>How a hole looks in GeoJSON</h2>
<p>A GeoJSON Polygon is an array of rings. The first ring is the outer boundary; any further rings are holes. So this is a polygon with a hole:</p>
<pre>{"type":"Polygon","coordinates":[
  [[-4.010,5.300],[-4.000,5.300],[-4.000,5.310],[-4.010,5.310],[-4.010,5.300]],
  [[-4.006,5.304],[-4.004,5.304],[-4.004,5.306],[-4.006,5.306],[-4.006,5.304]]
]}</pre>
<p>(Shown with 3 decimals for readability; a real file needs at least 6.) Many GIS tools create holes automatically when you subtract one area from another, for example removing a village or a river from a field.</p>
<h2>How to fix it</h2>
<p><b>Option 1: two halves.</b> Split the shape along a line through the hole into two polygons without holes, and put them in a MultiPolygon (or two features with the same producer details). Together they cover the same land as the doughnut. In QGIS, the "Split features" tool on an editable layer does this; draw the split line across the whole shape, through the hole.</p>
<p><b>Option 2: ask whether the hole matters.</b> If the excluded area is tiny, or was removed for convenience, check with whoever is responsible for the declaration whether the plot should simply be described by its outer boundary. That's a substantive choice about what land is declared, not a formatting decision, so don't make it silently.</p>
<h2>What the Plot File Checker does</h2>
<p>A polygon with holes is reported as an <b>error</b> and isn't changed. Splitting the shape correctly needs a decision about where to cut, and dropping the hole changes the declared area, so neither is done automatically.</p>
<h2>Related checks after splitting</h2>
<ul>
<li>Each half must be a valid, closed polygon on its own; see <a href="/learn/eudr/unclosed-polygon/">unclosed polygon</a>.</li>
<li>The two halves will share an edge. The checker reports overlapping plots as warnings; touching along an edge is normal for a split plot, but true overlaps should be investigated.</li>
<li>If you give an Area property, it should match the total of both halves.</li>
</ul>`,
  sources: [SRC.geo, SRC.tool], related: ['self-intersecting-polygon', 'unclosed-polygon', 'geometrycollection'] },

{ slug: 'point-area-over-4-hectares', alt: '/fr/learn/eudr/point-area-over-4-hectares/', h1: 'Points and the 4-hectare rule: when a plot needs a polygon', short: 'A point with Area over 4 ha is an error (except cattle).',
  title: 'EUDR Point vs. Polygon: The 4 Hectare Rule and the Area Property',
  description: 'In EUDR geolocation, a single point may stand for a plot of up to 4 hectares; larger plots need a polygon, except for cattle. How the EU Information System reads the Area property, its 4 ha default and its minimum.',
  lede: 'A plot can be described by a single point only if it is 4 hectares or smaller. Above that, the EU Information System expects a polygon, except for cattle.',
  body: `
<h2>What the EU documentation says</h2>
<ul>
<li>The <a href="${SRC.faq.url}" rel="noopener">FAQ</a> and the DDS API reference: polygons are required for plots of land greater than 4 hectares, except for cattle, where point coordinates for the establishment suffice.</li>
<li>The ${VAL}: when a point is provided, the area is mandatory. If no value is given, the system enters <b>4 (ha) by default</b>. If the commodity is not cattle and the value is <b>higher than 4 ha, the system raises an error</b>. When provided, the area must be <b>at least 0.0001 ha</b>.</li>
<li>The ${GEO}: the optional <code>Area</code> property is the area in hectares of a Point geometry, and if it isn't provided it's set to 4 ha. It also warns that <code>"Area": "3"</code> (a number in quotes) is read as <b>0</b>, because a quoted value isn't recognized as a number.</li>
</ul>
<h2>What this means for a plot file</h2>
<ul>
<li>A 2.5 ha cocoa plot can be a Point with <code>"Area": 2.5</code>.</li>
<li>A 7 ha coffee plot needs a Polygon (or MultiPolygon). A Point with <code>"Area": 7</code> is an error.</li>
<li>A point with no Area is treated as 4 ha. That passes, but it may misstate the plot size.</li>
<li><code>"Area": 0</code>, or <code>"Area": "2.5"</code> (text, read as 0), falls below the 0.0001 ha minimum.</li>
</ul>
<p>The EU page also suggests using single points for plots under 4 hectares, rather than polygons, as a way to keep file size down; see <a href="/learn/eudr/file-size-limit/">file size limit</a>.</p>
<h2>How to fix it</h2>
<ol>
<li>For any point whose Area is over 4, map the plot boundary and replace the point with a polygon.</li>
<li>Write Area as a number without quotes: <code>"Area": 2.5</code>.</li>
<li>Use hectares, not square metres or acres. 25,000 m² is 2.5 ha; an Area of 25000 would be read as 25,000 ha.</li>
<li>If a point has no measured area, consider recording one rather than relying on the 4 ha default.</li>
</ol>
<h2>What the Plot File Checker does</h2>
<ul>
<li>Point with Area over 4 ha: error (the message mentions the cattle exception).</li>
<li>Point with no Area: info, noting the 4 ha default.</li>
<li>Point with Area under 0.0001 ha, including 0: error.</li>
<li>Area written as text: warning, turned into a number in the fixed file.</li>
<li>For polygons, an Area that differs from the computed area by more than 25% and more than 0.5 ha: warning. Polygons under 100 m² or over 5,000 ha are also flagged for a second look.</li>
</ul>`,
  sources: [SRC.faq, SRC.dds, SRC.val, SRC.geo, SRC.tool], related: ['property-names', 'file-size-limit', 'geometrycollection'] },

{ slug: 'linestring-not-accepted', alt: '/fr/learn/eudr/linestring-not-accepted/', h1: 'LineString and MultiLineString are not accepted for plots', short: 'Lines don\'t describe a production place.',
  title: 'EUDR GeoJSON LineString Error: Lines Are Not Valid Plot Shapes',
  description: 'The EU Information System does not accept LineString or MultiLineString geometries for production places. Why GPS apps export lines, and how to turn a walked boundary into a valid polygon.',
  lede: 'A LineString is a path, not an area. The EU Information System does not accept LineString or MultiLineString geometries as production places.',
  body: `
<h2>What the EU documentation says</h2>
<p>The ${GEO} lists the geometry types used for production places (Point, MultiPoint, Polygon, MultiPolygon, and collections of them) and then states: "geometry types of 'LineString' and 'MultiLineString' do not represent valid geocoordinate shapes for declaring production places and will not be accepted/processed." Its common-errors list repeats it: "Invalid geometry types (i.e. LineString)". The DDS API reference lists the supported types as Point, MultiPoint, Polygon, MultiPolygon and GeometryCollection.</p>
<h2>Why files contain lines</h2>
<ul>
<li><b>Track recording.</b> Many GPS and field apps record a walk as a track (a line). Walking around a field produces a line that follows the boundary, but it's still a line.</li>
<li><b>KML exports.</b> KML files from mapping tools often store boundaries as LineStrings or paths.</li>
<li><b>Roads and rivers.</b> A file may contain lines that were never meant to be plots: access roads, streams or the edge of a forest drawn for reference.</li>
</ul>
<h2>How to fix it</h2>
<p><b>If the line is a walked boundary</b> and its end comes back to its start, it can become a polygon: use the same coordinates as the outer ring, and make sure the last point equals the first. In QGIS, "Lines to polygons" (Vector, Geometry Tools) does this for a whole layer. Then look at each result on a map to confirm it's really the plot.</p>
<p><b>If the line doesn't close</b>, the boundary walk was incomplete. Closing it with a straight line may cut through the field or across another edge; re-map instead. See <a href="/learn/eudr/unclosed-polygon/">unclosed polygon</a>.</p>
<p><b>If the line is a road or river</b>, delete it from the upload file. Reference features belong in your own GIS project, not in the DDS geolocation.</p>
<h2>What the Plot File Checker does</h2>
<ul>
<li>LineString or MultiLineString: an error.</li>
<li>A closed line (its last point is identical to its first, with at least four points) is converted to a Polygon in the fixed file and marked "check this", because the checker can't know whether it was meant to be a boundary.</li>
<li>A GeometryCollection that contains a line is an error; see <a href="/learn/eudr/geometrycollection/">GeometryCollection</a>.</li>
<li>KML Placemarks with LineStrings are read and reported the same way.</li>
</ul>
<h2>For next season</h2>
<p>Set your field app to record plots as polygons (or "areas") rather than tracks, if it allows. If it only records tracks, add a step to your process that converts and checks them before the data reaches the exporter.</p>`,
  sources: [SRC.geo, SRC.dds, SRC.tool], related: ['unclosed-polygon', 'geometrycollection', 'self-intersecting-polygon'] },

{ slug: 'geometrycollection', alt: '/fr/learn/eudr/geometrycollection/', h1: 'GeometryCollection in EUDR files: accepted, but check what\'s inside', short: 'Mixed or line-containing collections cause problems.',
  title: 'EUDR GeoJSON GeometryCollection: When It Works and When It Fails',
  description: 'The EU Information System accepts GeometryCollection, but a collection containing lines, or mixing points and polygons, causes errors and confusion. How to replace a GeometryCollection with MultiPolygon or MultiPoint.',
  lede: 'A GeometryCollection groups several geometries into one feature. The EU Information System accepts it, but what\'s inside still has to follow every other rule, and mixed collections are a common source of problems.',
  body: `
<h2>What the EU documentation says</h2>
<p>The ${GEO} defines GeometryCollection as "two or more geometries" and notes that any geometry type other than GeometryCollection must have a <code>coordinates</code> member (a collection instead has a list of geometries). The DDS API reference lists GeometryCollection among the supported types, alongside Point, MultiPoint, Polygon and MultiPolygon. LineString and MultiLineString are not accepted anywhere, including inside a collection.</p>
<h2>Where GeometryCollections come from</h2>
<ul>
<li>KML Placemarks with several geometries (a MultiGeometry, for example a plot boundary plus a centre point). The Plot File Checker, for one, reads such a Placemark as a GeometryCollection.</li>
<li>GIS "merge" or "collect" operations on mixed layers.</li>
<li>Tools that store a polygon and its label point together.</li>
</ul>
<h2>The problems to look for</h2>
<ul>
<li><b>A line inside</b>: the collection contains a LineString, which isn't valid for a production place. That's an error.</li>
<li><b>Points mixed with polygons</b>: a plot described by both its boundary and a point. Which one is the plot? A point inside a polygon of the same plot adds nothing, and a point with no Area is treated as 4 ha.</li>
<li><b>Invalid members</b>: each polygon in the collection must itself be closed, without holes and without self-intersections.</li>
</ul>
<h2>The cleaner alternative</h2>
<p>If every member is the same kind, use the matching multi-type instead:</p>
<ul>
<li>several polygons for one producer's plot or plots: <b>MultiPolygon</b>;</li>
<li>several points: <b>MultiPoint</b>.</li>
</ul>
<p>Or give each plot its own Feature in the FeatureCollection, with its own properties. Separate features are easier to check, and each can carry its own ProductionPlace name and Area.</p>
<h2>What the Plot File Checker does</h2>
<ul>
<li>A collection of only polygons, or only points: info. The checker merges it into a MultiPolygon or MultiPoint in the fixed file.</li>
<li>A collection mixing points and polygons: a warning, left for you to decide which geometry describes the plot.</li>
<li>A collection containing a line: an error.</li>
<li>Member polygons are checked exactly like any polygon: closure, decimals, holes, self-intersection.</li>
</ul>
<h2>Before you upload</h2>
<p>Open the file on a map and click a few collection features. If you see a boundary with a dot in the middle, or a path along a road, clean the feature so that only the plot geometry remains. Then save and check the file again: removing a member can leave a collection with a single geometry, which is simpler to write as that geometry on its own.</p>`,
  sources: [SRC.geo, SRC.dds, SRC.tool], related: ['linestring-not-accepted', 'polygon-holes', 'point-area-over-4-hectares'] },

{ slug: 'property-names', alt: '/fr/learn/eudr/property-names/', h1: 'Property names: ProducerName, ProducerCountry, ProductionPlace, Area', short: 'Case-sensitive names and 2-letter country codes.',
  title: 'EUDR GeoJSON Properties: ProducerName, ProducerCountry, ProductionPlace and Area',
  description: 'The EU Information System reads four optional GeoJSON properties, with case-sensitive names: ProducerName, ProducerCountry (ISO 2-letter code), ProductionPlace and Area. Common naming mistakes and how to fix them.',
  lede: 'The EU Information System reads four optional properties on each plot. Their names are case-sensitive, and anything else is ignored, so "pays" or "productionplace" silently carries no information.',
  body: `
<h2>What the EU documentation says</h2>
<p>The ${GEO} lists the optional properties the system processes:</p>
<div class="tbl"><table>
<tr><th>Property</th><th>Meaning</th></tr>
<tr><td><code>ProducerName</code></td><td>Optional producer name for the geometry</td></tr>
<tr><td><code>ProducerCountry</code></td><td>Country of production, as an ISO 2-letter code</td></tr>
<tr><td><code>ProductionPlace</code></td><td>Optional name of the production place (recommended)</td></tr>
<tr><td><code>Area</code></td><td>Area in hectares, for Point geometries</td></tr>
</table></div>
<p>Any other syntactically valid property is ignored. The page lists "invalid property names (e.g. ... incorrect property keyword case: 'productionplace' instead of 'ProductionPlace')" and "invalid producer country ISO2 code" among the common errors. It also notes that <code>"Area": "3"</code> in quotes is read as 0.</p>
<h2>Type I and Type II files</h2>
<p>The EU describes two variants with the same structure. A <b>Type I</b> file is used through the API and at producer level in the web interface. A <b>Type II</b> file, imported at commodity level in the web interface, contains several producers grouped by ProducerName and ProducerCountry, and must include <b>ProducerCountry on every feature</b>. The system also recommends always including ProductionPlace.</p>
<h2>Common mistakes</h2>
<ul>
<li><b>Translated or local names</b>: <code>pays</code>, <code>superficie</code>, <code>nom_producteur</code>, <code>country</code>.</li>
<li><b>Wrong case</b>: <code>producerCountry</code>, <code>PRODUCERNAME</code>, <code>area</code>.</li>
<li><b>Country names instead of codes</b>: <code>"Côte d'Ivoire"</code>, <code>"Ghana"</code>, or 3-letter codes like <code>CIV</code>. The value should be the 2-letter code, for example <code>CI</code>, <code>GH</code>, <code>CM</code>, <code>ET</code>, <code>BR</code>.</li>
<li><b>Lower-case codes</b>: <code>ci</code> instead of <code>CI</code>.</li>
<li><b>Area as text or in the wrong unit</b>; see <a href="/learn/eudr/point-area-over-4-hectares/">the 4 ha rule</a>.</li>
</ul>
<h2>How to fix it</h2>
<p>Rename the columns in your source spreadsheet to the exact names above before converting, or rename the fields in QGIS (layer properties, Fields). Replace country names with 2-letter codes. Then open the GeoJSON in a text editor and check one feature by eye.</p>
<h2>What the Plot File Checker does</h2>
<ul>
<li>Recognized aliases and wrong case (<code>pays</code>, <code>superficie</code>, <code>producer_name</code>, <code>productionplace</code> and others): a warning, renamed to the official names in the fixed file.</li>
<li>ProducerCountry that isn't a 2-letter code: an error, converted to the ISO 2-letter code when the country is recognizable.</li>
<li>ProducerCountry missing on some plots only: a warning.</li>
<li>A plot that lies outside its stated ProducerCountry: a warning, which often reveals <a href="/learn/eudr/swapped-coordinates/">swapped coordinates</a>.</li>
</ul>
<h2>A minimal correct feature</h2>
<pre>{"type":"Feature",
 "properties":{"ProducerName":"Coop Example","ProducerCountry":"CI",
               "ProductionPlace":"Plot 12","Area":2.5},
 "geometry":{"type":"Point","coordinates":[-4.012345,5.312345]}}</pre>
<p>This example is fictional. Note the exact capitalization of each name, the 2-letter country code, the number without quotes for Area, and longitude before latitude. Properties beyond these four can stay in your own records; the system ignores them, so they only add to file size.</p>`,
  sources: [SRC.geo, SRC.tool], related: ['point-area-over-4-hectares', 'swapped-coordinates', 'file-size-limit'] },

{ slug: 'file-size-limit', alt: '/fr/learn/eudr/file-size-limit/', h1: 'File size and volume limits: 25 MB per statement, 1,000 producers per commodity', short: 'The 25 MB limit and producer-count limits.',
  title: 'EUDR GeoJSON File Size Limit (25 MB) and Producer Limits',
  description: 'The EU Information System limits geolocation data to 25 MB per due diligence statement, and producers to 1,000 per commodity and 10,000 per statement. How to shrink a plot file without losing accuracy.',
  lede: 'The EU Information System caps the geolocation data in one due diligence statement at 25 MB, all GeoJSON files together. It also limits how many producers one statement can list.',
  body: `
<h2>What the EU documentation says</h2>
<ul>
<li>The ${GEO}: "The system has a file size limit of 25 Mb for individual DDS submissions, which includes the total size of uploaded GeoJSON files." Files over the limit are on its list of common errors.</li>
<li>The ${VAL}: the total size of geolocation data per DDS "cannot exceed a certain amount (presently set to 25Mb)". The total number of producers per commodity cannot exceed 1,000, and per DDS cannot exceed 10,000.</li>
<li>Other common errors the page lists for files in general: invalid file format (for example PDF or plain text), syntax errors such as a missing bracket, and password-protected files.</li>
</ul>
<h2>The EU's own advice for large files</h2>
<p>The GeoJSON page recommends two workarounds, while noting that operators must obtain geolocation data that is as granular as possible:</p>
<ol>
<li><b>Fewer points on straight edges.</b> Use two points to define a straight line instead of logging coordinates every 5 to 10 metres along it.</li>
<li><b>Points for small plots.</b> Use a single geolocation point for plots under 4 hectares rather than a polygon.</li>
</ol>
<h2>Other ways files get too big</h2>
<ul>
<li><b>Excess decimals.</b> The system keeps only 6 decimals, so 15-decimal coordinates waste space; see <a href="/learn/eudr/six-decimal-places/">decimal places</a>.</li>
<li><b>Altitude and extra values.</b> A third number (altitude) in every position. The EU format allows more than two values in a position, but only longitude and latitude are used.</li>
<li><b>Pretty-printing.</b> Indentation and line breaks can double a file's size. Compact JSON is just as valid.</li>
<li><b>Unused properties.</b> Every property not on the official list is ignored by the system but still counts toward size.</li>
<li><b>GPS track logs.</b> A boundary walked with a point every second can have thousands of near-identical corners.</li>
</ul>
<h2>Simplifying safely</h2>
<p>GIS tools can simplify polygons (remove points that barely change the shape). Use a small tolerance and check the result: simplification that moves the boundary by several metres changes what land is declared, and can create self-intersections in narrow plots.</p>
<h2>What the Plot File Checker does</h2>
<ul>
<li>File over 25 MB (read as 25,000,000 bytes): an error. Over 20 MB: a warning.</li>
<li>More than 1,000 distinct producers (ProducerName plus ProducerCountry), or more than 10,000 plots: a warning, as a prompt to check how the file will be split across statements.</li>
<li>The fixed file is written compactly with 6 decimals, without altitude, one feature per line, which usually makes it much smaller.</li>
</ul>`,
  sources: [SRC.geo, SRC.val, SRC.tool], related: ['six-decimal-places', 'point-area-over-4-hectares', 'property-names'] },
];
