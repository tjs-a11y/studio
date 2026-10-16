// Run: node --test permit-watch/test/
// Uses the TEST fixture in scripts/fixtures (fake records, never published).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { deflateRawSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDaily, mergeWindow, buildOutputs, rssFeed, unzip, ymd, coordsFrom, godriveRequest, download, DISTRICTS } from '../scripts/update.mjs';
import { COUNTIES, slugify } from '../scripts/counties.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, '..', 'scripts', 'fixtures', 'daf420.test.dat');
const fixtureText = () => readFile(FIXTURE, 'latin1');

test('county table: 254 counties, odd codes 001-507, unique slugs', () => {
  const codes = Object.keys(COUNTIES).sort();
  assert.equal(codes.length, 254);
  codes.forEach((c, i) => assert.equal(c, String(i * 2 + 1).padStart(3, '0')));
  assert.equal(new Set(Object.values(COUNTIES).map(slugify)).size, 254);
  assert.equal(COUNTIES['329'], 'Midland'); assert.equal(COUNTIES['317'], 'Martin'); assert.equal(COUNTIES['311'], 'McMullen');
});

test('parses root, permit, field and GIS records', async () => {
  const ps = parseDaily(await fixtureText());
  assert.equal(ps.length, 5);
  const a = ps.find((p) => p.permit === '0990001');
  assert.deepEqual(
    { county: a.county, district: a.district, operator: a.operator, lease: a.lease, well: a.well, issued: a.issued, received: a.received, api: a.api, survey: a.survey, abstract: a.abstract, lat: a.lat, lon: a.lon, horizontal: a.horizontal, status: a.status, type: a.type, depth: a.depth },
    { county: 'Midland', district: '08' /* internal code 10 in the file */, operator: 'TEST OPERATOR ONE LLC', lease: 'TEST FIXTURE LEASE ALPHA', well: '1H', issued: '2026-10-08', received: '2026-10-01', api: '42-329-99901', survey: 'T&P RR CO / TEST SURVEY', abstract: 'A-0999', lat: 31.912345, lon: -102.012345, horizontal: true, status: 'Approved', type: 'Drill', depth: 11250 });
});

test('drops fields that fail validation', async () => {
  const ps = parseDaily(await fixtureText());
  const c = ps.find((p) => p.permit === '0990003');
  assert.equal(c.api, undefined, 'API not starting with the county code is dropped');
  assert.equal(c.survey, undefined, 'survey only read when the location format flag is N');
  const e = ps.find((p) => p.permit === '0990005');
  assert.equal(e.issued, undefined); assert.equal(e.depth, undefined); assert.equal(e.lat, undefined); assert.equal(e.status, 'Pending');
  assert.equal(ymd('00000000'), null); assert.equal(ymd('20261332'), null);
  assert.equal(coordsFrom('14 1.5 2.5'), null, 'coordinates outside Texas are ignored');
  assert.deepEqual(coordsFrom('14 102.0123456 31.9123456'), { lat: 31.912346, lon: -102.012346 }, 'unsigned longitude');
  assert.deepEqual(coordsFrom('14001020123456000319123456'), { lat: 31.912346, lon: -102.012346 }, 'implied decimal point');
  assert.equal(DISTRICTS['07'], '6E'); assert.equal(DISTRICTS['10'], '08'); assert.equal(DISTRICTS['14'], '10'); assert.equal(DISTRICTS['12'], undefined);
  assert.equal(parseDaily('garbage\n01ABCDEFG\n').length, 0);
});

test('30-day window, newest first, newer file wins', async () => {
  const ps = parseDaily(await fixtureText());
  const w = mergeWindow([], ps, '2026-10-11', 30);
  assert.deepEqual(w.map((p) => p.permit), ['0990003', '0990002', '0990001', '0990005']);
  const updated = { ...ps[0], operator: 'CHANGED' };
  assert.equal(mergeWindow(ps, [updated], '2026-10-11', 30).find((p) => p.permit === '0990001').operator, 'CHANGED');
});

test('writes latest.json, 254 county files and 254 RSS feeds', async () => {
  const out = await mkdtemp(path.join(tmpdir(), 'pw-'));
  try {
    const permits = parseDaily(await fixtureText());
    const r = await buildOutputs({ permits, outDir: out, today: '2026-10-11', sourceName: 'fixture', siteUrl: 'https://example.com', days: 30 });
    assert.equal(r.total, 4);
    const latest = JSON.parse(await readFile(path.join(out, 'data', 'latest.json'), 'utf8'));
    assert.equal(latest.count, 4); assert.equal(latest.dataDate, '2026-10-11');
    assert.equal((await readdir(path.join(out, 'feeds'))).length, 254);
    assert.equal((await readdir(path.join(out, 'data', 'county'))).length, 254);
    const mid = JSON.parse(await readFile(path.join(out, 'data', 'county', 'midland.json'), 'utf8'));
    assert.equal(mid.count, 2);
    const feed = await readFile(path.join(out, 'feeds', 'midland.xml'), 'utf8');
    assert.match(feed, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss version="2.0">/);
    assert.equal((feed.match(/<item>/g) || []).length, 2);
    assert.match(feed, /T&amp;P RR CO/); assert.doesNotMatch(feed, /T&P/);
    assert.match(feed, /<link>https:\/\/example.com\/permit-watch\/\?county=midland<\/link>/);
    const empty = await readFile(path.join(out, 'feeds', 'anderson.xml'), 'utf8');
    assert.equal((empty.match(/<item>/g) || []).length, 0); assert.match(empty, /<\/rss>/);
    // second run with the same data changes nothing (so the daily job makes no empty commits)
    const r2 = await buildOutputs({ permits, outDir: out, today: '2026-10-11', sourceName: 'fixture', siteUrl: 'https://example.com', days: 30 });
    assert.equal(r2.changed, 0);
  } finally { await rm(out, { recursive: true, force: true }); }
});

test('reads the daily file out of a zip', async () => {
  const data = Buffer.from(await fixtureText(), 'latin1'), comp = deflateRawSync(data), name = Buffer.from('daf420.dat');
  const { crc32 } = await import('node:zlib');
  const crc = crc32(data);
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8); local.writeUInt32LE(crc, 14); local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
  const cen = Buffer.alloc(46); cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(8, 10); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(comp.length, 20); cen.writeUInt32LE(data.length, 24); cen.writeUInt16LE(name.length, 28); cen.writeUInt32LE(0, 42);
  const cdOff = 30 + name.length + comp.length, cdLen = 46 + name.length;
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(cdLen, 12); end.writeUInt32LE(cdOff, 16);
  const zip = Buffer.concat([local, name, comp, cen, name, end]);
  assert.equal(unzip(zip)['daf420.dat'].toString('latin1'), data.toString('latin1'));
});

test('page county list matches the script county list', async () => {
  const html = await readFile(path.join(here, '..', 'index.html'), 'utf8');
  const m = /const COUNTIES = (\{[\s\S]*?\});/.exec(html);
  assert.ok(m, 'COUNTIES block in index.html');
  assert.deepEqual(JSON.parse(m[1].replace(/'/g, '"').replace(/,\s*\}/, '}')), COUNTIES);
});

test('no test fixture data in the published data or feeds', async () => {
  for (const dir of ['data', 'feeds']) {
    const root = path.join(here, '..', dir);
    if (!existsSync(root)) continue;
    const walk = async (d) => { for (const e of await readdir(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) await walk(f); else assert.doesNotMatch(await readFile(f, 'utf8'), /TEST FIXTURE|TEST OPERATOR|0990001/, f); } };
    await walk(root);
  }
});

test('rssFeed escapes XML', () => {
  const x = rssFeed('Test', 'test', [{ permit: '0000001', issued: '2026-10-01', operator: 'A&B <x>', lease: '"Q"' }], '');
  assert.match(x, /A&amp;B &lt;x&gt;/); assert.match(x, /&quot;Q&quot;/);
});

test('finds the daf420.dat download request on a Public GoDrive page', () => {
  // Trimmed copy of the structure of the RRC page (2026-10-11): file names are command links.
  const row = (i, name) => `<tr data-ri="${i}" data-rk="${8187 + i}"><td><a id="fileTable:${i}:j_id_2f" href="#" class="ui-commandlink ui-widget" onclick="PrimeFaces.addSubmitParam('fileList',{'fileTable:${i}:j_id_2f':'fileTable:${i}:j_id_2f'}).submit('fileList');return false;">${name}</a></td></tr>`;
  const html = `<form id="SimpleHeaderForm" name="SimpleHeaderForm" method="post" action="/x"><input type="hidden" name="javax.faces.ViewState" value="HDR" /></form>
<form id="fileList" name="fileList" method="post" action="/webclient/godrive/PublicGoDrive.xhtml"><table>${row(0, 'daf420.dat.01-01-2018')}${row(1, 'daf420.dat')}</table>
<input type="hidden" id="fileTable_selection" name="fileTable_selection" value="" /><input type="hidden" name="fileList_SUBMIT" value="1" /><input type="hidden" name="javax.faces.ViewState" id="v:4" value="VS+1/=" /></form>`;
  const r = godriveRequest(html, 'https://mft.rrc.texas.gov/link/abc');
  assert.equal(r.action, 'https://mft.rrc.texas.gov/webclient/godrive/PublicGoDrive.xhtml');
  assert.deepEqual(r.fields, { fileTable_selection: '', fileList_SUBMIT: '1', 'javax.faces.ViewState': 'VS+1/=', fileList: 'fileList', 'fileTable:1:j_id_2f': 'fileTable:1:j_id_2f' });
  assert.throws(() => godriveRequest('<html></html>', 'https://x/'), /no file named daf420.dat/);
});

test('download retries network failures with waits, but not a changed page layout', async () => {
  const waits = [], logs = [];
  let calls = 0;
  const flaky = async () => { calls++; if (calls < 3) { const e = new TypeError('fetch failed'); e.cause = { code: 'ECONNRESET' }; throw e; } return Buffer.from('ok'); };
  const got = await download('https://x/', { once: flaky, waits: [1, 2, 3], sleep: async (ms) => { waits.push(ms); }, log: (m) => logs.push(m) });
  assert.equal(got.toString(), 'ok'); assert.equal(calls, 3); assert.deepEqual(waits, [1, 2]); assert.match(logs[0], /attempt 1 failed \(ECONNRESET\)/);
  calls = 0;
  await assert.rejects(download('https://x/', { once: async () => { calls++; throw new Error('fetch failed'); }, waits: [1, 1], sleep: async () => {}, log: () => {} }), /fetch failed/);
  assert.equal(calls, 3, 'gives up after the last wait');
  calls = 0;
  await assert.rejects(download('https://x/', { once: async () => { calls++; throw new Error('RRC download page has no file named daf420.dat'); }, waits: [1, 1], sleep: async () => {}, log: () => {} }), /no file named/);
  assert.equal(calls, 1, 'layout errors fail at once');
});
