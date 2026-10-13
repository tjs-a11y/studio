// Parsers against SAMPLE fixtures shaped like the real downloads (numbers are made up; see fixtures/README.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseEcbXml, parseTreasuryCsv, parseFredCsv, parsePinkSheet, parseCsv, readXlsxSheet } from '../scripts/sources.mjs';
import { SERIES } from '../js/core.js';

const fx = (n, bin) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), bin ? undefined : 'utf8');

test('ECB: days newest first, every currency, USD present', () => {
  const { days } = parseEcbXml(fx('ecb-hist-90d.sample.xml'));
  assert.deepEqual(days.map((d) => d.date), ['2026-10-12', '2026-10-09', '2026-10-08']);
  assert.equal(Object.keys(days[0].eur).length, 29);
  assert.ok(days[0].eur.USD > 0 && days[0].eur.JPY > 100);
});

test('ECB: double quotes and the single-day file work too; junk is refused', () => {
  const daily = `<?xml version="1.0"?><gesmes:Envelope xmlns:gesmes="x" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref"><Cube><Cube time="2026-10-12"><Cube currency="USD" rate="1.1"/><Cube currency="GBP" rate="0.86"/></Cube></Cube></gesmes:Envelope>`;
  assert.deepEqual(parseEcbXml(daily).days[0], { date: '2026-10-12', eur: { USD: 1.1, GBP: 0.86 } });
  assert.throws(() => parseEcbXml('<html>Service unavailable</html>'), /ECB/);
  assert.throws(() => parseEcbXml('<gesmes:Envelope><Cube></Cube></gesmes:Envelope>'), /no dated rates/);
  assert.throws(() => parseEcbXml('<gesmes:Envelope><Cube><Cube time="2026-10-12"><Cube currency="GBP" rate="0.86"/></Cube></Cube></gesmes:Envelope>'), /USD/);
});

test('Treasury: columns matched by name, dates converted, newest first', () => {
  const { days } = parseTreasuryCsv(fx('treasury-2026.sample.csv'));
  assert.equal(days[0].date, '2026-10-09');
  assert.equal(days[0].yields['10y'], 4.10);
  assert.equal(days[0].yields['1.5m'], 4.01);
  assert.equal(Object.keys(days[0].yields).length, 14);
});

test('Treasury: reordered or missing columns and blank cells are fine; wrong files are refused', () => {
  const csv = 'Date,"30 Yr","10 Yr","2 Yr","3 Mo"\n10/08/2026,4.7,4.08,,3.99\n10/09/2026,4.71,4.1,3.62,3.98\n';
  const { days } = parseTreasuryCsv(csv);
  assert.equal(days[0].date, '2026-10-09');
  assert.deepEqual(days[1].yields, { '30y': 4.7, '10y': 4.08, '3m': 3.99 });
  assert.throws(() => parseTreasuryCsv('<!doctype html><html>'), /Treasury/);
  assert.throws(() => parseTreasuryCsv('Date,"1 Mo"\n10/09/2026,4\n'), /10 Yr/);
  assert.throws(() => parseTreasuryCsv('Date,"2 Yr","10 Yr"\nyesterday,1,2\n'), /bad date/);
});

test('FRED: "." gaps dropped, id checked, both header styles', () => {
  const { points } = parseFredCsv(fx('fred-DCOILBRENTEU.sample.csv'), 'DCOILBRENTEU');
  assert.equal(points.length, 5);
  assert.deepEqual(points.at(-1), ['2026-10-12', 66.9]);
  assert.equal(parseFredCsv('DATE,DCOILWTICO\n2026-10-09,61.7\n', 'DCOILWTICO').points.length, 1);
  assert.throws(() => parseFredCsv(fx('fred-DCOILWTICO.sample.csv'), 'DCOILBRENTEU'), /expected DCOILBRENTEU/);
  assert.throws(() => parseFredCsv('observation_date,X\n2026-10-09,.\n', 'X'), /no values/);
});

test('CSV reader handles quotes, commas and CRLF', () => {
  assert.deepEqual(parseCsv('a,"b,c","d ""e"""\r\n1,2,3\r\n'), [['a', 'b,c', 'd "e"'], ['1', '2', '3']]);
});

test('xlsx reader: written by openpyxl, shared strings, sheet picked by name', () => {
  const rows = readXlsxSheet(fx('pink-sheet.sample.xlsx', true), 'Monthly Prices');
  assert.match(rows[0][0], /SAMPLE DATA/);
  assert.equal(rows[4][1], 'Crude oil, average');
  assert.equal(rows[5][1], '($/bbl)');
  assert.equal(rows[6][0], '2025M01');
  assert.throws(() => readXlsxSheet(fx('pink-sheet.sample.xlsx', true), 'Annual Prices'), /no sheet/);
  assert.throws(() => readXlsxSheet(Buffer.from('not a zip at all, just text'), 'x'), /zip/);
});

test('World Bank Pink Sheet: every catalog series found, units checked, gaps skipped', () => {
  const wb = parsePinkSheet(fx('pink-sheet.sample.xlsx', true));
  const wbIds = SERIES.filter((s) => s.source === 'worldbank').map((s) => s.id);
  assert.deepEqual(Object.keys(wb.series).sort(), wbIds.slice().sort());
  assert.deepEqual(wb.missing, []);
  assert.equal(wb.lastMonth, '2026-09');
  assert.equal(wb.series.gold.unit, 'ozt');
  assert.equal(wb.series.gold.points[0][0], '2025-01');
  assert.equal(wb.series.tin.points.length, 20, 'the "…" month is skipped');
  assert.ok(wb.series.potash, '"Potassium chloride **" matches despite the footnote stars');
  assert.ok(wb.series.urea, '"Urea " matches despite the trailing space');
});

test('World Bank: a column whose unit changed is left out rather than mis-scaled', (t) => {
  // Rebuild the fixture with gold in $/kg using the same generator, in a temp dir.
  const py = readFileSync(new URL('./fixtures/make-pink-sheet.py', import.meta.url), 'utf8').replace('("Gold", "($/troy oz)", 3500.0)', '("Gold", "($/kg)", 112000.0)');
  let buf;
  try { buf = execFileSync('python3', ['-c', `${py.replace('wb.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), "pink-sheet.sample.xlsx"))', 'import io,sys\nb=io.BytesIO(); wb.save(b); sys.stdout.buffer.write(b.getvalue())').replace('print("wrote pink-sheet.sample.xlsx")', '')}`]); }
  catch (e) { t.skip('python3 with openpyxl not available'); return; }
  const wb = parsePinkSheet(buf);
  assert.ok(!wb.series.gold);
  assert.ok(wb.missing.includes('gold'));
});
