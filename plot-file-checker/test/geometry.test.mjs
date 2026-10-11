// Unit tests for the plot file checker core (geometry, swap detection, parsing, fixes).
// Run: node --test plot-file-checker/test/geometry.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const core = html.match(/<script id="pfc-core">([\s\S]*?)<\/script>/)[1];
const ctx = vm.createContext({});
vm.runInContext(core, ctx);
const P = ctx.PFC;
const R = P.EARTH_RADIUS_M;
const degPerKm = 1000 / (R * Math.PI / 180); // degrees of latitude in 1 km on this sphere

const J = (x) => JSON.parse(JSON.stringify(x)); // values from the vm realm
const deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const close = (a, b, tolRel, msg) => assert.ok(Math.abs(a - b) <= Math.abs(b) * tolRel, `${msg}: got ${a}, expected ~${b}`);
const sq = (lon, lat, dLon, dLat) => [[lon, lat], [lon + dLon, lat], [lon + dLon, lat + dLat], [lon, lat + dLat], [lon, lat]];

test('1 km x 1 km square at the equator is about 100 ha', () => {
  const ha = P.geomAreaHa({ type: 'Polygon', coordinates: [sq(0, 0, degPerKm, degPerKm)] });
  close(ha, 100, 0.001, 'equator square');
});

test('1 km x 1 km square at 60 degrees N (longitude scaled) is about 100 ha', () => {
  const dLon = degPerKm / Math.cos(60.0045 * Math.PI / 180);
  const ha = P.geomAreaHa({ type: 'Polygon', coordinates: [sq(10, 60, dLon, degPerKm)] });
  close(ha, 100, 0.005, '60N square');
});

test('1 x 1 degree cell matches the exact spherical formula R^2 * dLon * (sin lat2 - sin lat1)', () => {
  const exact = R * R * (Math.PI / 180) * Math.sin(Math.PI / 180) / 10000;
  close(P.geomAreaHa({ type: 'Polygon', coordinates: [sq(0, 0, 1, 1)] }), exact, 1e-9, '1 degree cell');
});

test('area ignores winding and subtracts holes', () => {
  const outer = sq(0, 0, 2 * degPerKm, 2 * degPerKm);
  const hole = sq(0.5 * degPerKm, 0.5 * degPerKm, degPerKm, degPerKm).reverse();
  close(P.geomAreaHa({ type: 'Polygon', coordinates: [outer.slice().reverse()] }), 400, 0.002, 'reversed');
  close(P.geomAreaHa({ type: 'Polygon', coordinates: [outer, hole] }), 300, 0.002, 'with hole');
});

test('winding: counter-clockwise detection', () => {
  const ring = sq(-1.6, 6.7, 0.001, 0.001);
  assert.equal(P.isCCW(ring), true);
  assert.equal(P.isCCW(ring.slice().reverse()), false);
  assert.ok(P.planarArea(ring.slice(0, -1)) > 0);
});

test('self-intersection: bowtie, pinch and spike are found; clean shapes pass', () => {
  const bowtie = [[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]];
  const x = P.ringSelfIntersections(bowtie);
  assert.equal(x.length, 1);
  close(x[0][0], 0.5, 1e-9, 'cross x'); close(x[0][1], 0.5, 1e-9, 'cross y');
  assert.equal(P.ringSelfIntersections(sq(0, 0, 1, 1)).length, 0);
  assert.equal(P.ringSelfIntersections([[0, 0], [1, 0], [0.5, 1], [0, 0]]).length, 0);
  // figure-8 touching at one vertex (2,1)
  assert.ok(P.ringSelfIntersections([[0, 0], [2, 1], [4, 0], [4, 2], [2, 1], [0, 2], [0, 0]]).length > 0);
  // spike going back along an edge
  assert.ok(P.ringSelfIntersections([[0, 0], [2, 0], [1, 0], [1, 1], [0, 0]]).length > 0);
  // concave but valid
  assert.equal(P.ringSelfIntersections([[0, 0], [4, 0], [4, 4], [2, 1], [0, 4], [0, 0]]).length, 0);
});

test('overlap: overlapping squares yes, neighbours sharing an edge no', () => {
  const a = sq(0, 0, 1, 1).slice(0, -1), b = sq(0.5, 0.5, 1, 1).slice(0, -1), c = sq(1, 0, 1, 1).slice(0, -1);
  assert.equal(P.ringsOverlap(a, b), true);
  assert.equal(P.ringsOverlap(a, c), false);
  assert.equal(P.ringsOverlap(a, sq(0.2, 0.2, 0.3, 0.3).slice(0, -1)), true); // contained
});

const plot = (lon, lat, props = {}) => ({ props, geom: { type: 'Point', coordinates: [lon, lat] }, minDec: 6, maxDec: 6 });

test('swap detection: obvious cases', () => {
  // Ghana plots written lat, lon with no country: all swapped consistently
  let r = P.detectSwaps([plot(6.7, -1.6), plot(6.71, -1.61)], {});
  deq(r.map((x) => x && x.state), ['swap', 'swap']);
  // correct Ghana plots: nothing
  r = P.detectSwaps([plot(-1.6, 6.7)], {});
  assert.equal(r[0], null);
  // one swapped plot among correct Côte d'Ivoire plots
  r = P.detectSwaps([plot(-6.59, 5.78), plot(-6.58, 5.79), plot(5.77, -6.6)], {});
  deq(r.map((x) => x && x.state), [null, null, 'swap']);
  // Uganda swapped
  r = P.detectSwaps([plot(0.35, 32.6)], {});
  assert.equal(r[0].state, 'swap'); assert.equal(r[0].country, 'UG');
  // Indonesia swapped: latitude out of range
  assert.equal(P.detectSwaps([plot(-7.0, 110.0)], {})[0].state, 'swap');
  // ProducerCountry makes it obvious
  assert.equal(P.detectSwaps([plot(9.0, 38.7, { ProducerCountry: 'ET' })], {})[0].state, 'swap');
  assert.equal(P.detectSwaps([plot(9.0, 38.7)], { country: 'ET' })[0].state, 'swap');
});

test('swap detection: ambiguous cases are never auto-swapped', () => {
  // Italy (a real wood plot) would land in Ethiopia if swapped: only "maybe"
  const it = P.detectSwaps([plot(10.0, 45.0)], {})[0];
  assert.notEqual(it && it.state, 'swap');
  // Ethiopia swapped without a country lands in the Mediterranean: flag, do not fix
  assert.equal(P.detectSwaps([plot(9.0, 38.7)], {})[0].state, 'maybe');
  // Stated country but plot elsewhere and not a swap
  assert.equal(P.detectSwaps([plot(-1.6, 6.7, { ProducerCountry: 'CI' })], {})[0].state, 'outside');
});

test('decimal counting', () => {
  assert.equal(P.decimalsOfStr('-6.589400'), 6);
  assert.equal(P.decimalsOfStr('5.1'), 1);
  assert.equal(P.decimalsOfStr('7'), 0);
  assert.equal(P.decimalsOfStr('1e-7'), 7);
});

test('country codes', () => {
  assert.equal(P.countryCode("Côte d'Ivoire"), 'CI');
  assert.equal(P.countryCode('Cote d’Ivoire'), 'CI');
  assert.equal(P.countryCode('CIV'), 'CI');
  assert.equal(P.countryCode('ouganda'), 'UG');
  assert.equal(P.countryCode('gh'), 'GH');
  assert.equal(P.countryCode('Atlantis'), null);
});

const codes = (list, plot) => list.filter((x) => plot === undefined || x.plot === plot).map((x) => x.code);

test('messy sample: expected problems, fixes and leftovers', () => {
  const s = P.SAMPLES.messy;
  const res = P.analyze(P.parse(s.text, s.name), { size: s.text.length });
  const fx = codes(res.fixes);
  for (const c of ['F_CRS', 'F_CLOSE', 'F_PAD', 'F_SWAP', 'F_REWIND', 'F_DUP', 'F_ALTITUDE', 'F_AREA_TEXT', 'F_COUNTRY', 'F_ALIAS']) assert.ok(fx.includes(c), 'missing fix ' + c);
  assert.ok(codes(res.fixes, 1).includes('F_SWAP'));
  assert.ok(!codes(res.fixes, 3).includes('F_REWIND'), 'never rewinds a self-crossing ring');
  const errPlots = [...new Set(res.after.filter((x) => x.code[0] === 'E' && x.plot >= 0).map((x) => x.plot))].sort();
  deq(errPlots, [3, 4, 5, 6]);
  assert.ok(codes(res.after, 3).includes('E_SELF_INTERSECT'));
  assert.ok(codes(res.after, 4).includes('E_POINT_OVER_4HA'));
  assert.ok(codes(res.after, 5).includes('E_ZERO'));
  assert.ok(codes(res.after, 6).includes('E_LINE'));
  assert.ok(codes(res.after, 0).includes('W_OVERLAP') && codes(res.after, 7).includes('W_OVERLAP'));
  // before-check saw the raw problems
  for (const c of ['E_UNCLOSED', 'E_PRECISION', 'E_SWAPPED', 'I_WINDING', 'W_DUP_VERTEX', 'E_COUNTRY_CODE', 'W_PROP_ALIAS']) assert.ok(codes(res.before).includes(c), 'before missing ' + c);
  // fixed geometry
  const p1 = res.plots[0].geom.coordinates[0];
  deq(p1[0], p1[p1.length - 1]);
  const p2 = res.plots[1].geom.coordinates[0];
  assert.ok(p2.every(([lon, lat]) => lon < -6 && lat > 5), 'plot 2 swapped back');
  assert.ok(P.isCCW(p2));
  const p3 = res.plots[2].geom.coordinates[0];
  assert.ok(P.isCCW(p3)); assert.equal(p3.length, 5);
  assert.equal(res.plots[0].props.ProducerCountry, 'CI');
  assert.equal(res.plots[0].props.Area, 2.1);
  assert.equal(res.plots[4].props.Area, 6.5);
  deq(res.plots[4].geom.coordinates, [-6.585, 5.772]);
  // serialized output: valid JSON, 6 decimals, one feature per plot (none unreadable)
  const out = P.serialize(res.plots, {});
  const fc = JSON.parse(out.text);
  assert.equal(fc.features.length, 8);
  assert.match(out.text, /\[-6\.590120,5\.780340\]/);
  const ex = P.serialize(res.plots, { exclude: new Set([3, 4, 5, 6]) });
  assert.equal(JSON.parse(ex.text).features.length, 4);
});

test('clean sample: no errors or warnings, nothing to fix', () => {
  const s = P.SAMPLES.clean;
  const res = P.analyze(P.parse(s.text, s.name), { size: s.text.length });
  deq(codes(res.after).filter((c) => c[0] !== 'I'), []);
  deq(codes(res.before).filter((c) => c[0] !== 'I'), []);
  deq(codes(res.fixes), []);
  const ha = res.plots.map((p) => P.geomAreaHa(p.geom));
  assert.ok(ha[0] > 3 && ha[0] < 5, 'plot A about 4 ha: ' + ha[0]);
});

test('CSV with lat/lon columns, semicolons and decimal commas; grouped corners', () => {
  const pts = P.parse('nom;pays;latitude;longitude;superficie\nA;CI;5,780001;-6,590001;1,2\nB;CI;5,79;-6,58;3', 'f.csv');
  assert.equal(pts.format, 'csv'); assert.equal(pts.plots.length, 2);
  deq(pts.plots[0].geom.coordinates, [-6.590001, 5.780001]);
  assert.equal(pts.plots[1].minDec, 2);
  const grouped = P.parse('plot_id,lat,lon\nP1,6.700000,-1.620000\nP1,6.700000,-1.619000\nP1,6.701000,-1.619000\nP2,6.71,-1.61', 'g.csv');
  assert.equal(grouped.plots.length, 2);
  assert.equal(grouped.plots[0].geom.type, 'Polygon');
  const res = P.analyze(grouped, {});
  assert.ok(codes(res.fixes, 0).includes('F_CLOSE'));
  assert.ok(codes(res.fixes).includes('F_CONVERTED'));
});

test('KoBo/ODK geoshape column (latitude first)', () => {
  const r = P.parse('name,plot_shape\nX,"6.700000 -1.620000 0 5;6.700000 -1.619000 0 5;6.701000 -1.619000 0 5;6.700000 -1.620000 0 5"', 'k.csv');
  assert.equal(r.plots[0].geom.type, 'Polygon');
  deq(r.plots[0].geom.coordinates[0][0], [-1.62, 6.7]);
});

test('WKT lines and CSV WKT column', () => {
  const r = P.parse('POLYGON ((-1.620000 6.700000, -1.619000 6.700000, -1.619000 6.701000, -1.620000 6.700000))\nPOINT (-1.610000 6.710000)', 'w.wkt');
  assert.equal(r.format, 'wkt'); assert.equal(r.plots.length, 2);
  assert.equal(r.plots[1].geom.type, 'Point');
  const c = P.parse('id,wkt\n1,"MULTIPOLYGON (((0 0, 1 0, 1 1, 0 0)),((2 2, 3 2, 3 3, 2 2)))"', 'c.csv');
  assert.equal(c.plots[0].geom.type, 'MultiPolygon'); assert.equal(c.plots[0].geom.coordinates.length, 2);
});

test('unsupported and broken files', () => {
  assert.throws(() => P.parse('', 'farms.zip'), (e) => e.code === 'E_UNSUPPORTED');
  assert.throws(() => P.parse('PK\u0003\u0004xx', 'farms.bin'), (e) => e.code === 'E_UNSUPPORTED');
  assert.throws(() => P.parse('{"type":"FeatureCollection",', 'x.geojson'), (e) => e.code === 'E_PARSE');
  assert.throws(() => P.parse('a,b\n1,2', 'x.csv'), (e) => e.code === 'E_PARSE');
});

test('projected coordinates, holes, closed line and GeometryCollection', () => {
  const fc = (geom, props = {}) => JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: props, geometry: geom }] });
  let res = P.analyze(P.parse(fc({ type: 'Point', coordinates: [650123.12, 745001.55] }), 'a.geojson'), {});
  assert.ok(codes(res.after).includes('E_PROJECTED'));
  const outer = sq(-1.62, 6.70, 0.004, 0.004), hole = sq(-1.619, 6.701, 0.001, 0.001).reverse();
  res = P.analyze(P.parse(fc({ type: 'Polygon', coordinates: [outer, hole] }), 'h.geojson'), {});
  assert.ok(codes(res.after).includes('E_HOLES'));
  res = P.analyze(P.parse(fc({ type: 'LineString', coordinates: sq(-1.62, 6.7, 0.002, 0.002) }), 'l.geojson'), {});
  assert.ok(codes(res.fixes).includes('F_LINE_TO_POLY'));
  assert.equal(res.plots[0].geom.type, 'Polygon');
  assert.ok(!codes(res.after).includes('E_LINE'));
  res = P.analyze(P.parse(fc({ type: 'GeometryCollection', geometries: [{ type: 'Polygon', coordinates: [sq(-1.62, 6.7, 0.002, 0.002)] }, { type: 'Polygon', coordinates: [sq(-1.61, 6.7, 0.002, 0.002)] }] }), 'gc.geojson'), {});
  assert.equal(res.plots[0].geom.type, 'MultiPolygon');
  res = P.analyze(P.parse(fc({ type: 'GeometryCollection', geometries: [{ type: 'Point', coordinates: [-1.6, 6.7] }, { type: 'Polygon', coordinates: [sq(-1.62, 6.7, 0.002, 0.002)] }] }), 'gc2.geojson'), {});
  assert.ok(codes(res.after).includes('W_GC_MIXED'));
  // NaN / string coordinates are never written to the output
  res = P.analyze(P.parse(fc({ type: 'Point', coordinates: ['x', 6.7] }), 'n.geojson'), {});
  assert.ok(codes(res.after).includes('E_BAD_COORD'));
  assert.equal(P.serialize(res.plots, {}).omitted, 1);
});

// ---- Rules checked against the EU Information System documentation (opened 11 Oct 2026):
// https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html
// https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/validation-rules.html

test('official EU sample (Type I, FAZENDA TABOAO II) passes with no errors or warnings', () => {
  // Copied from the EU GeoJSON file description. Some values have 5 decimals because trailing zeros were dropped.
  const text = JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { ProductionPlace: 'FAZENDA TABOAO II', Area: 2.39, ProducerCountry: 'BR' }, geometry: { type: 'Polygon', coordinates: [[[-48.186023,-22.880156],[-48.186128,-22.880023],[-48.186271,-22.879937],[-48.186509,-22.879844],[-48.186677,-22.879827],[-48.186853,-22.879906],[-48.187031,-22.880049],[-48.187185,-22.88015],[-48.187214,-22.880164],[-48.187169,-22.880216],[-48.187148,-22.880317],[-48.187223,-22.880431],[-48.187365,-22.880416],[-48.187428,-22.880321],[-48.187456,-22.88036],[-48.187496,-22.88055],[-48.187491,-22.88091],[-48.187622,-22.881404],[-48.187712,-22.881757],[-48.187831,-22.88206],[-48.187887,-22.88214],[-48.187745,-22.882094],[-48.187763,-22.882069],[-48.18777,-22.882054],[-48.187776,-22.882034],[-48.187779,-22.882013],[-48.187779,-22.881992],[-48.187775,-22.881971],[-48.187768,-22.881951],[-48.187758,-22.881932],[-48.187745,-22.881916],[-48.187729,-22.881901],[-48.187711,-22.88189],[-48.187692,-22.881881],[-48.187671,-22.881875],[-48.187399,-22.881809],[-48.186554,-22.881342],[-48.186573,-22.881321],[-48.186581,-22.881262],[-48.186504,-22.881222],[-48.186498,-22.881225],[-48.18644,-22.881271],[-48.186319,-22.881194],[-48.186338,-22.881162],[-48.18631,-22.881087],[-48.186335,-22.881001],[-48.186286,-22.880875],[-48.186036,-22.88084],[-48.186046,-22.880804],[-48.186046,-22.880447],[-48.186023,-22.880156]]] } }] });
  const res = P.analyze(P.parse(text, 'eu.geojson'), { size: text.length });
  assert.ok(!codes(res.before).includes('E_PRECISION'), 'trailing zeros dropped by JSON are not a precision error');
  assert.ok(!codes(res.fixes).includes('F_PAD'));
  deq(res.after.filter((x) => x.code[0] !== 'I').map((x) => x.code), []);
});

test('coordinates are truncated to 6 decimals like the EU system, and truncation duplicates are removed', () => {
  assert.equal(P.t6(-5.8227394567), -5.822739);
  assert.equal(P.t6(144.2567074567), 144.256707);
  assert.equal(P.t6(2.3488), 2.3488);
  assert.equal(P.t6(0.29), 0.29);
  assert.equal(P.t6(-0.0000004), 0);
  assert.equal(P.t6(1.9999999), 1.999999);
  // EU example: these two points become the same point after truncation
  const ring = [[-1.6, 6.7], [-1.6, 6.701], [-1.5992391234, 6.7012567071234], [-1.5992394567, 6.7012567074567], [-1.599, 6.7], [-1.6, 6.7]];
  const text = JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring.map(([a, b]) => [a, b])] } }] }).replace(/(-1\.6|6\.7|6\.701|-1\.599)(?=[,\]])/g, (m) => Number(m).toFixed(6));
  const res = P.analyze(P.parse(text, 't.geojson'), {});
  assert.ok(codes(res.fixes).includes('F_TRUNC'));
  assert.ok(codes(res.fixes).includes('F_DUP'));
  const out = res.plots[0].geom.coordinates[0];
  assert.equal(out.length, 5);
  deq(out[2], [-1.599239, 6.701256]);
});

test('EU limits: 25 MB per DDS, Area of a point, producers per commodity', () => {
  const pt = (props) => ({ props, geom: { type: 'Point', coordinates: [-5.123456, 6.123456] }, minDec: 6, maxDec: 6 });
  assert.ok(codes(P.checkAll([pt({})], { size: 26e6 }, {}, 'after')).includes('E_FILE_SIZE'));
  assert.ok(codes(P.checkAll([pt({})], { size: 21e6 }, {}, 'after')).includes('W_FILE_SIZE'));
  assert.ok(!codes(P.checkAll([pt({})], { size: 12e6 }, {}, 'after')).some((c) => /FILE_SIZE/.test(c)));
  assert.ok(codes(P.checkAll([pt({ Area: 0 })], { size: 1 }, {}, 'after')).includes('E_POINT_AREA_SMALL'));
  assert.ok(!codes(P.checkAll([pt({ Area: 0.0001 })], { size: 1 }, {}, 'after')).includes('E_POINT_AREA_SMALL'));
  assert.ok(codes(P.checkAll([pt({ Area: 4.5 })], { size: 1 }, {}, 'after')).includes('E_POINT_OVER_4HA'));
  assert.ok(codes(P.checkAll([pt({})], { size: 1 }, {}, 'after')).includes('I_POINT_DEFAULT_AREA'));
  // "Area": "3" is read as 0 by the EU system: flagged, then stored as a number
  const text = JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { Area: '3' }, geometry: { type: 'Point', coordinates: [-5.123456, 6.123456] } }] });
  const res = P.analyze(P.parse(text, 'a.geojson'), {});
  assert.ok(codes(res.before).includes('W_AREA_TEXT'));
  assert.equal(res.plots[0].props.Area, 3);
  const many = Array.from({ length: 1001 }, (_, k) => pt({ ProducerName: 'Farmer ' + k, ProducerCountry: 'CI' }));
  assert.ok(codes(P.checkAll(many, { size: 1 }, {}, 'before')).includes('W_PRODUCERS'));
  assert.ok(!codes(P.checkAll(many.slice(0, 1000), { size: 1 }, {}, 'before')).includes('W_PRODUCERS'));
});

test('GeometryCollection is accepted; lines inside it are not', () => {
  const fc = (geom) => JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: geom }] });
  let res = P.analyze(P.parse(fc({ type: 'GeometryCollection', geometries: [{ type: 'Point', coordinates: [-1.6, 6.7] }, { type: 'Point', coordinates: [-1.61, 6.7] }] }), 'g.geojson'), {});
  assert.ok(codes(res.before).includes('I_GC'));
  assert.equal(res.plots[0].geom.type, 'MultiPoint');
  res = P.analyze(P.parse(fc({ type: 'GeometryCollection', geometries: [{ type: 'Point', coordinates: [-1.6, 6.7] }, { type: 'LineString', coordinates: [[-1.6, 6.7], [-1.61, 6.71]] }] }), 'g.geojson'), {});
  assert.ok(codes(res.after).includes('E_LINE'));
  // polygons inside a mixed collection are still checked (holes here)
  const outer = sq(-1.62, 6.70, 0.004, 0.004), hole = sq(-1.619, 6.701, 0.001, 0.001).reverse();
  res = P.analyze(P.parse(fc({ type: 'GeometryCollection', geometries: [{ type: 'Point', coordinates: [-1.6, 6.7] }, { type: 'Polygon', coordinates: [outer, hole] }] }), 'g.geojson'), {});
  assert.ok(codes(res.after).includes('W_GC_MIXED') && codes(res.after).includes('E_HOLES'));
});
