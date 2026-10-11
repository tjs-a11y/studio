// Texas RRC oil and gas districts: one page per district (13, including 6E).
// Facts from rrc.texas.gov pages opened on 2026-10-11 (county table, locations, formation pages, monthly
// drilling summaries for July-September 2026, EDI filing requirements, District 6E field rules index, OGA049M manual).
import { COUNTIES_BY_DISTRICT as C } from './texas-data.mjs';

const R = 'https://www.rrc.texas.gov';
const S = {
  counties: { label: 'RRC, "Oil & Gas Counties and Associated Districts"', url: R + '/about-us/locations/oil-gas-counties-districts/' },
  loc: { label: 'RRC, "Locations" (district offices)', url: R + '/about-us/locations/' },
  map: { label: 'RRC, Oil and Gas Division district boundaries map (January 2020, PDF)', url: R + '/media/3bkhbut0/districts_color_8x11.pdf' },
  jul: { label: 'RRC, Summary of Drilling Permits, Completions and Plugging Reports, July 2026 (PDF)', url: R + '/media/ybsd0h33/july-2026.pdf' },
  aug: { label: 'RRC, Summary of Drilling Permits, Completions and Plugging Reports, August 2026 (PDF)', url: R + '/media/j4int1g5/august-2026.pdf' },
  sep: { label: 'RRC, Summary of Drilling Permits, Completions and Plugging Reports, September 2026 (PDF)', url: R + '/media/hwxputje/september-2026.pdf' },
  monthly: { label: 'RRC, Monthly Drilling, Completion and Plugging Summaries', url: R + '/oil-and-gas/research-and-statistics/drilling-information/monthly-drilling-completion-and-plugging-summaries/' },
  queries: { label: 'RRC, Research Queries (Drilling Permit W-1 Query, GIS Viewer)', url: R + '/resource-center/research/research-queries/' },
  edi: { label: 'RRC, Production Report (Form PR) EDI filing requirements (lists the 13 district codes, PDF)', url: R + '/media/oo2ors1p/edifilingrequirements.pdf' },
  d6e: { label: 'RRC, Field Rules Index, District 6E prior to 2019', url: R + '/hearings/dockets/oil-gas-proposals-for-decision-and-orders/field-rules-index/field-rules-index-prior-to-2019/district-6e-prior-to-2019/' },
  manual: { label: 'RRC, Drilling Permit Master Plus Latitudes and Longitudes (OGA049M) manual (PDF)', url: R + '/media/zgccdjpi/drillingpermitmasterpluslatitudeslongitudes_oga049m_july1.pdf' },
  permian: { label: 'RRC, Permian Basin', url: R + '/oil-and-gas/major-oil-and-gas-formations/permian-basin/' },
  eagle: { label: 'RRC, Eagle Ford Shale', url: R + '/oil-and-gas/major-oil-and-gas-formations/eagle-ford-shale/' },
  barnett: { label: 'RRC, Barnett Shale', url: R + '/oil-and-gas/major-oil-and-gas-formations/barnett-shale/' },
  hay: { label: 'RRC, Haynesville/Bossier Shale', url: R + '/oil-and-gas/major-oil-and-gas-formations/haynesville-bossier-shale/' },
  gw: { label: 'RRC, Granite Wash', url: R + '/oil-and-gas/major-oil-and-gas-formations/granite-wash/' },
};
const a = (src, text) => `<a href="${src.url}" rel="noopener">${text}</a>`;
const slugify = (n) => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pw = (n) => `<a href="/permit-watch/?county=${slugify(n)}">${n}</a>`;
const list = (xs) => xs.length === 1 ? xs[0] : xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1);

// RRC "Affected Counties" lists, mapped to the county table's spelling (De Witt -> DeWitt, Dimmitt -> Dimmit, Shackleford -> Shackelford).
const FORM = {
  permian: { name: 'Permian Basin', src: S.permian, text: 'an oil-and-gas-producing area of West Texas and southeastern New Mexico that the RRC says is best represented in its production figures as districts 7C, 08 and 8A, with formations such as the Spraberry, Wolfcamp, Bone Spring, San Andres and Clear Fork', counties: 'Andrews Bailey Borden Brewster Cochran Coke Concho Cottle Crane Crockett Crosby Culberson Dawson Dickens Ector Edwards El_Paso Fisher Floyd Gaines Garza Glasscock Hale Hockley Howard Hudspeth Irion Jeff_Davis Kent Kimble King Lamb Loving Lubbock Lynn Martin Menard McCulloch Midland Mitchell Motley Nolan Pecos Presidio Reagan Real Reeves Runnels Schleicher Scurry Sterling Stonewall Sutton Terrell Terry Tom_Green Upton Val_Verde Ward Winkler Yoakum' },
  eagle: { name: 'Eagle Ford Shale', src: S.eagle, text: 'a Cretaceous shale that the RRC describes as running from the Mexican border into East Texas within districts 1 through 6, roughly 50 miles wide and 400 miles long, at depths between 4,000 and 12,000 feet', counties: 'Atascosa Bastrop Bee Brazos Burleson DeWitt Dimmit Fayette Frio Gonzales Grimes Karnes La_Salle Lavaca Lee Leon Live_Oak Madison Maverick McMullen Milam Robertson Walker Washington Webb Wilson Zavala' },
  barnett: { name: 'Barnett Shale', src: S.barnett, text: 'one of the largest onshore natural gas fields in the United States, designated by the RRC as the Newark, East (Barnett Shale) field and lying in districts 5, 7B and 9', counties: 'Archer Bosque Clay Comanche Cooke Coryell Dallas Denton Eastland Ellis Erath Hamilton Hill Hood Jack Johnson Montague Palo_Pinto Parker Shackelford Somervell Stephens Tarrant Wise Young' },
  hay: { name: 'Haynesville/Bossier Shale', src: S.hay, text: 'a gas-producing shale more than 10,000 feet deep in East Texas (District 6) and western Louisiana; in 2009 the RRC consolidated the Haynesville/Bossier field discoveries in this area into the Carthage (Haynesville Shale) field', counties: 'Angelina Gregg Harrison Marion Nacogdoches Panola Rusk Sabine San_Augustine Shelby' },
  gw: { name: 'Granite Wash', src: S.gw, text: 'a tight sand play in the Texas Panhandle (District 10) and western Oklahoma, about 160 miles long and 30 miles wide, at depths of 11,000 to 15,400 feet, developed with horizontal drilling', counties: 'Armstrong Briscoe Carson Castro Childress Collingsworth Dallam Deaf_Smith Donley Gray Hall Hansford Hartley Hemphill Hutchinson Lipscomb Moore Ochiltree Oldham Parmer Potter Randall Roberts Sherman Swisher Wheeler' },
};
for (const f of Object.values(FORM)) f.list = f.counties.split(' ').map((c) => c.replace(/_/g, ' '));

// Original drilling permits approved (W-1, excluding amended), of which new drills, and holes plugged, from the RRC monthly summaries.
const ORDER = ['01', '02', '03', '04', '05', '06', '7B', '7C', '08', '8A', '09', '10'];
const STATS = {
  permits: { Jul: [78, 47, 32, 9, 9, 51, 13, 72, 288, 52, 37, 5], Aug: [67, 24, 42, 10, 9, 35, 22, 71, 306, 56, 40, 13], Sep: [105, 42, 31, 13, 16, 47, 16, 69, 345, 44, 26, 5] },
  newDrill: { Jul: [76, 45, 23, 8, 3, 44, 6, 70, 275, 37, 20, 5], Aug: [66, 24, 34, 8, 4, 29, 20, 63, 290, 20, 25, 11], Sep: [101, 36, 27, 11, 11, 43, 14, 69, 323, 24, 20, 5] },
  plugged: { Jul: [165, 12, 48, 19, 12, 48, 79, 88, 246, 68, 96, 60], Aug: [47, 19, 37, 21, 4, 22, 70, 72, 213, 70, 98, 36], Sep: [49, 19, 49, 31, 14, 36, 67, 101, 270, 80, 101, 44] },
};
const TOTALS = { permits: { Jul: 693, Aug: 695, Sep: 759 } };
for (const [k, m] of Object.entries(STATS.permits)) if (m.reduce((s, x) => s + x, 0) !== TOTALS.permits[k]) throw new Error('permit stats do not add up for ' + k);

const OFFICES = {
  'San Antonio': { addr: '112 E. Pecan Street, Suite 705, San Antonio, TX 78205', phone: '210-227-1313', email: 'san_antonio@rrc.texas.gov' },
  Houston: { addr: '1919 N Loop West, Suite 620, Houston, TX 77008', phone: '713-869-5001', email: 'Houston@rrc.texas.gov' },
  'Corpus Christi': { addr: '10320 I-37, Corpus Christi, TX 78410', phone: '361-242-3113', email: 'Corpus_Christi@rrc.texas.gov' },
  Henderson: { addr: '100 Bane Blvd, Henderson, TX 75652', phone: '903-655-1840', email: 'kilgore@rrc.texas.gov' },
  Abilene: { addr: '1969 Industrial Blvd., Abilene, TX 79602', phone: '325-692-0404', email: 'Abilene@rrc.texas.gov' },
  'San Angelo': { addr: '622 South Oakes St, Suite J, San Angelo, TX 76903', phone: '325-657-7450', email: 'san_angelo@rrc.texas.gov' },
  Midland: { addr: '10 Desta Dr, Suite 500 E, Midland, TX 79705', phone: '432-684-5581', email: 'midland@rrc.texas.gov' },
  Lubbock: { addr: '6302 Iola Avenue, Suite 600, Lubbock, TX 79424', phone: '806-698-6509', email: 'DOLubbock8A@rrc.texas.gov' },
  'Wichita Falls': { addr: '5800 Kell Blvd, Suite 300, Wichita Falls, TX 76310', phone: '940-723-2153', email: 'wichita_falls@rrc.texas.gov' },
  Pampa: { addr: '200 West Foster, Room 300, Pampa, TX 79065', phone: '806-665-1653', email: 'pampa@rrc.texas.gov' },
};

const D = {
  '01': { office: 'San Antonio', shares: '02', note: 'District 01 is the largest district by county count: 33 counties stretching from the Hill Country and the Austin area (Travis, Williamson, Hays) to the Rio Grande (Maverick, Val Verde) and south to McMullen and La Salle. Most of its permit activity in the summer of 2026 was in its share of the Eagle Ford trend. Three of its western counties, Edwards, Real and Val Verde, also appear on the RRC\'s Permian Basin county list.' },
  '02': { office: 'San Antonio', shares: '01', note: 'District 02 is a compact district of 10 counties between San Antonio and the Gulf coast, including Victoria, Goliad, Refugio and Calhoun. Five of them, Bee, DeWitt, Karnes, Lavaca and Live Oak, are on the RRC\'s Eagle Ford county list.' },
  '03': { office: 'Houston', note: 'District 03 covers 29 counties around Houston and the upper Gulf coast, from Matagorda and Brazoria to Jefferson, Orange and Newton on the Louisiana line, and inland to Brazos, Grimes and Walker. Eight of them are on the RRC\'s Eagle Ford county list. Coastal counties border state waters; the RRC publishes separate offshore county codes, which Permit Watch does not track.' },
  '04': { office: 'Corpus Christi', note: 'District 04 covers 15 counties of the lower Gulf coast and South Texas, from Nueces and San Patricio down to Cameron and Hidalgo in the Rio Grande Valley, and west to Webb, Zapata and Duval. Webb County is the district\'s one county on the RRC\'s Eagle Ford list.' },
  '05': { office: 'Henderson', shares: '06', note: 'District 05 runs through North-Central and East Texas, including the Dallas-Fort Worth core counties of Dallas and Tarrant, and south through McLennan, Limestone and Robertson. Six of its counties (Bosque, Dallas, Ellis, Hill, Johnson, Tarrant) are on the RRC\'s Barnett Shale list, and Leon and Robertson are on its Eagle Ford list.' },
  '06': { office: 'Henderson', shares: '05', note: 'District 06 covers 23 East Texas counties along the Louisiana and Arkansas lines, from Bowie in the northeast corner to Angelina and Sabine in the Piney Woods. Ten of them are on the RRC\'s Haynesville/Bossier county list. The counties of the East Texas Field are assigned to District 06 in the RRC\'s county table, but leases in that field are filed under the separate District 6E; see the 6E page.' },
  '7B': { office: 'Abilene', note: 'District 7B covers 24 counties of West-Central Texas around Abilene, from Haskell and Stonewall in the north to San Saba and Lampasas in the south, and east to Hood, Parker and Somervell near Fort Worth. Eleven are on the RRC\'s Barnett Shale list, and Fisher, Nolan and Stonewall are on its Permian Basin list.' },
  '7C': { office: 'San Angelo', note: 'District 7C covers 14 counties around San Angelo, from Coke and Runnels south to Sutton and Terrell. Every one of its 14 counties is on the RRC\'s Permian Basin list, and the RRC names 7C as one of the three districts that best represent Permian production, along with 08 and 8A.' },
  '08': { office: 'Midland', note: 'District 08 is the RRC\'s Midland district: 20 counties of the Permian Basin and the Trans-Pecos, including Midland, Ector, Martin, Howard, Reeves, Loving, Ward and Pecos, and west to El Paso and Hudspeth. All 20 are on the RRC\'s Permian Basin list. It approved more original drilling permits than any other district in each of July, August and September 2026.' },
  '8A': { office: 'Lubbock', note: 'District 8A covers 21 counties of the South Plains around Lubbock, from Bailey and Cochran on the New Mexico line east to Kent, King and Cottle, and south to Gaines, Dawson and Borden. All 21 are on the RRC\'s Permian Basin list.' },
  '09': { office: 'Wichita Falls', note: 'District 09 covers 15 counties of North Texas around Wichita Falls, along the Red River and south to Denton, Wise and Jack. Eight of them are on the RRC\'s Barnett Shale list.' },
  '10': { office: 'Pampa', note: 'District 10 is the Texas Panhandle: 26 counties from Dallam and Lipscomb on the Oklahoma line south to Parmer, Castro, Swisher, Briscoe and Childress. Every one of them is on the RRC\'s Granite Wash county list. Over July to September 2026 combined it had the fewest original drilling permits of the 12 districts in the RRC report (23), and six times as many plugging reports (140).' },
};

const sumOf = (k, i) => ['Jul', 'Aug', 'Sep'].reduce((s, m) => s + STATS[k][m][i], 0);
function statsBlock(code) {
  const i = ORDER.indexOf(code);
  const row = (label, k) => `<tr><td>${label}</td>${['Jul', 'Aug', 'Sep'].map((m) => `<td>${STATS[k][m][i]}</td>`).join('')}<td><b>${sumOf(k, i)}</b></td></tr>`;
  const all = 693 + 695 + 759, mine = sumOf('permits', i), share = (100 * mine / all);
  const rank = ORDER.map((c, j) => sumOf('permits', j)).sort((x, y) => y - x).indexOf(mine) + 1;
  return `<h2>Recent permit activity</h2>
<p>From the RRC's monthly summaries of drilling permits, completions and plugging reports processed, for this district:</p>
<div class="tbl"><table>
<tr><th>2026</th><th>Jul</th><th>Aug</th><th>Sep</th><th>3 months</th></tr>
${row('Original drilling permits approved', 'permits')}
${row('of which new drills', 'newDrill')}
${row('Holes plugged', 'plugged')}
</table></div>
<p>Statewide, the RRC approved ${all.toLocaleString('en-US')} original drilling permits in those three months, so District ${code} accounted for about <b>${share < 1 ? share.toFixed(1) : Math.round(share)}%</b> (<b>estimate</b>: ${mine} ÷ ${all.toLocaleString('en-US')}), ranking ${rank} of the 12 districts the report lists. "Original" permits exclude amended permits; plugging counts are reports processed, not wells plugged that month. Monthly numbers swing, so use them as a sense of scale, not a forecast.</p>`;
}

function page(code) {
  const d = D[code], o = OFFICES[d.office], counties = C[code], slug = 'district-' + code.toLowerCase();
  const forms = Object.values(FORM).map((f) => ({ f, in: f.list.filter((c) => counties.includes(c)) })).filter((x) => x.in.length);
  return {
    slug, h1: `RRC District ${code} (${d.office}): counties, drilling permits and how to watch them`, crumbName: `District ${code}`,
    short: `${counties.length} counties · ${d.office} office`,
    title: `Texas RRC Oil & Gas District ${code} (${d.office}): Counties, Permits, How to Watch`,
    description: `Railroad Commission of Texas oil and gas District ${code}: all ${counties.length} counties, the ${d.office} district office, major formations, permit counts for July–September 2026, and how to follow new drilling permits.`,
    lede: `District ${code} is one of the 13 oil and gas districts of the Railroad Commission of Texas (RRC), the state agency that issues drilling permits. It covers ${counties.length} counties and is served by the RRC's ${d.office} district office.`,
    body: `
<h2>What's in District ${code}</h2>
<p>${d.note}</p>
${forms.map(({ f, in: xs }) => `<p>${a(f.src, f.name)}: ${f.text}. The RRC lists ${xs.length} of this district's counties among its affected counties: ${list(xs)}.</p>`).join('\n')}
<h2>Counties in District ${code}</h2>
<p>The RRC's county table assigns these ${counties.length} counties to District ${code}. Each name opens that county in Permit Watch:</p>
<p>${counties.map(pw).join(' · ')}</p>
${statsBlock(code)}
<h2>How to watch new permits in District ${code}</h2>
<ul>
<li><b>Permit Watch</b>: pick a county above to see permits from the RRC's daily drilling permit file, filter by survey, abstract, operator or lease, and subscribe to that county's free RSS feed. Permit Watch is new: until its first daily data load runs, county pages show "first data load pending".</li>
<li><b>RRC Drilling Permit (W-1) Query</b>: the official search, listed on the RRC's ${a(S.queries, 'Research Queries')} page. The RRC asks that it be used by people, not automated tools.</li>
<li><b>RRC Public GIS Viewer</b>: a map of wells and permits, on the same Research Queries page.</li>
</ul>
<p>In the RRC's daily permit file, the district is the one the operator reported on the W-1 application, stored as an internal code (${a(S.manual, 'OGA049M manual')}).</p>
<h2>District office</h2>
<p>RRC ${d.office} office${d.shares ? ` (shared with District ${d.shares})` : ''}: ${o.addr}. Phone ${o.phone}. Email ${o.email}. Source: the RRC ${a(S.loc, 'Locations')} page.</p>`,
    sources: [S.counties, S.loc, ...forms.map((x) => x.f.src), S.jul, S.aug, S.sep, S.queries, S.manual],
    related: [],
  };
}

const p6e = {
  slug: 'district-6e', h1: 'RRC District 6E: the East Texas Field district', crumbName: 'District 6E', short: 'East Texas Field · no counties of its own in the county table',
  title: 'Texas RRC District 6E: The East Texas Field (Gregg, Rusk, Upshur, Smith, Cherokee)',
  description: 'RRC oil and gas District 6E covers the East Texas Field, in Gregg, Rusk, Upshur, Cherokee and Smith counties. Why it has no counties of its own in the RRC county table, how 6E shows up in permit data, and how to watch permits there.',
  lede: 'District 6E is the odd one out among the Railroad Commission of Texas\'s 13 oil and gas districts. It isn\'t a set of counties: it\'s used for the East Texas Field, and those counties otherwise belong to District 06.',
  body: `
<h2>Thirteen districts, twelve on the county map</h2>
<p>The RRC's production reporting rules list 13 valid oil and gas district codes: 01, 02, 03, 04, 05, 06, 6E, 7B, 7C, 08, 8A, 09 and 10 (${a(S.edi, 'Form PR filing requirements')}). But the RRC's ${a(S.counties, 'county table')} assigns every one of the 254 Texas counties to one of the other 12; no county is listed under 6E. The ${a(S.map, 'district boundaries map')} also shows 12 county-based districts.</p>
<p>The same filing document adds that "leases in district 6E will be rejected if filed in district 06". So 6E is real for filings, even though it has no counties of its own.</p>
<h2>What 6E covers</h2>
<p>The RRC's ${a(S.d6e, 'District 6E field rules index')} lists orders on the special field rules for the <b>East Texas Field</b>, described in those orders as lying in <b>Gregg, Rusk, Upshur, Cherokee and Smith counties</b>. All five are assigned to District 06 and the Henderson office in the county table. The RRC's Eagle Ford page calls the Eagle Ford the source rock for "the giant East Texas Field" (${a(S.eagle, 'RRC, Eagle Ford Shale')}).</p>
<p>In practice: a well in one of these counties may be in District 06 or in District 6E, depending on whether it is in the East Texas Field. The county alone doesn't tell you.</p>
<h2>6E in permit data</h2>
<p>In the RRC's daily drilling permit file, the district is stored as an internal two-digit code, as reported by the operator on the W-1 application. The ${a(S.manual, 'OGA049M manual')} maps code 07 to District 6E, 06 to District 06, and codes 08 to 14 to 7B, 7C, 08, 8A, (8B, reserved and not in use), 09 and 10. Permit Watch decodes these codes, so a permit filed under 6E shows as 6E.</p>
<p>The RRC's monthly drilling summaries have no separate 6E column; they list 12 districts. The report doesn't say how 6E permits are counted, so this page doesn't give 6E statistics. For context, District 06 had 51, 35 and 47 original drilling permits approved in July, August and September 2026 (${a(S.sep, 'RRC monthly summaries')}).</p>
<h2>The five counties</h2>
<p>Each name opens that county in Permit Watch, where 6E and 06 permits appear together and can be told apart by district:</p>
<p>${['Cherokee', 'Gregg', 'Rusk', 'Smith', 'Upshur'].map(pw).join(' · ')}</p>
<h2>How to watch new permits</h2>
<ul>
<li><b>Permit Watch</b>: choose one of the counties above for its permit list and free RSS feed (first data load pending until the daily update starts).</li>
<li><b>RRC Drilling Permit (W-1) Query</b> and the <b>Public GIS Viewer</b>, both on the RRC's ${a(S.queries, 'Research Queries')} page. Search by district 6E, or by lease or operator.</li>
</ul>
<h2>District office</h2>
<p>The RRC ${a(S.loc, 'Locations')} page lists no separate office for 6E. The five counties are served by the Henderson office in the county table: ${OFFICES.Henderson.addr}, phone ${OFFICES.Henderson.phone}, email ${OFFICES.Henderson.email}.</p>`,
  sources: [S.edi, S.counties, S.map, S.d6e, S.eagle, S.manual, S.sep, S.queries, S.loc], related: [],
};

const ALL = ['01', '02', '03', '04', '05', '06', '6E', '7B', '7C', '08', '8A', '09', '10'];
const pages = ALL.map((c) => (c === '6E' ? p6e : page(c)));
// Related: neighbouring codes in the list, plus the shared-office district.
pages.forEach((p, i) => {
  const near = [pages[i - 1], pages[i + 1]].filter(Boolean).map((q) => q.slug);
  const code = ALL[i], sh = D[code] && D[code].shares;
  if (sh) near.unshift('district-' + sh.toLowerCase());
  if (code === '06') near.unshift('district-6e');
  if (code === '6E') near.unshift('district-06');
  p.related = [...new Set(near)].filter((s) => s !== p.slug).slice(0, 3);
});

export const SECTION = {
  path: '/learn/texas-drilling-permits/',
  name: 'Texas RRC districts',
  h1: 'Texas drilling permits by RRC district',
  title: 'Texas RRC Oil & Gas Districts: Counties, Drilling Permits and District Offices',
  description: 'All 13 Railroad Commission of Texas oil and gas districts (01–10, 6E, 7B, 7C, 8A): the counties in each, district offices, major formations, recent permit counts and how to watch new drilling permits.',
  lang: 'en', crumbs: [{ name: 'Quickwell', path: '/' }, { name: 'Learn', path: '/learn/' }],
  lede: 'The Railroad Commission of Texas (RRC) runs oil and gas regulation through 13 districts. Each page below lists a district\'s counties, its office, the major formations the RRC associates with it, recent permit numbers, and how to follow new permits.',
  hubText: 'All 13 oil and gas districts: counties, offices, permit counts.',
  intro: `<h2>Why districts matter to mineral owners</h2>
<p>Every Texas drilling permit (Form W-1) carries a district. District offices handle field operations, inspections and local questions, and RRC statistics are reported by district. If you own minerals or land in a county, knowing its district tells you which office to call and how busy the area is.</p>
<p>The RRC's production filing rules list 13 district codes: 01 to 10, plus 6E, 7B, 7C and 8A (there is no 07 or 8B in use) (${a(S.edi, 'RRC Form PR filing requirements')}). Twelve of them divide up the state's 254 counties; 6E is used for the East Texas Field and has no counties of its own in the RRC's county table.</p>
<h2>Districts at a glance</h2>
<div class="tbl"><table><tr><th>District</th><th>Office</th><th>Counties</th><th>Original permits, Jul–Sep 2026</th></tr>
${['01', '02', '03', '04', '05', '06', '7B', '7C', '08', '8A', '09', '10'].map((c) => `<tr><td><a href="/learn/texas-drilling-permits/district-${c.toLowerCase()}/">${c}</a></td><td>${D[c].office}</td><td>${C[c].length}</td><td>${sumOf('permits', ORDER.indexOf(c))}</td></tr>`).join('')}
<tr><td><a href="/learn/texas-drilling-permits/district-6e/">6E</a></td><td>Henderson (East Texas Field counties)</td><td>none in the county table</td><td>not reported separately</td></tr>
</table></div>
<p class="note">Permit counts are original W-1 drilling permits approved, from the RRC monthly summaries for July, August and September 2026 (statewide 2,147).</p>`,
  groups: [{ title: 'All districts', slugs: pages.map((p) => p.slug) }],
  outro: '<p class="note">Per-county pages are planned once Permit Watch has collected real permit data for each county; until then, each county links to its Permit Watch view.</p>',
  sources: [S.counties, S.loc, S.map, S.edi, S.jul, S.aug, S.sep, S.monthly, S.queries],
  cta: { title: 'Watch new permits in your county', text: 'Permit Watch lists new Texas drilling permits by county from the RRC\'s daily permit file, with filters for survey, abstract and operator, and a free RSS feed for every county. Free.', href: '/permit-watch/', label: 'Open Permit Watch' },
  disclaimer: 'Not legal or investment advice. This page summarizes public Railroad Commission of Texas information; Quickwell is not affiliated with the RRC. Always check the official RRC record before acting on a permit.',
};
export const PAGES = pages;
