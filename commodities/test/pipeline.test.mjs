// fetch.mjs end to end on SAMPLE fixtures (offline), plus the daily brief it generates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildBrief, briefHtml, DISCLAIMER, SERIES } from '../js/core.js';

const TOOL = new URL('..', import.meta.url).pathname;
const SCRIPT = join(TOOL, 'scripts', 'fetch.mjs');
const FIX = join(TOOL, 'test', 'fixtures');
const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
const tmp = () => mkdtempSync(join(tmpdir(), 'cdesk-'));
const json = (f) => JSON.parse(readFileSync(f, 'utf8'));

test('fixture run writes latest, history and brief; output is marked sample', () => {
  const out = tmp(), page = join(tmp(), 'brief.html');
  copyFileSync(join(TOOL, 'brief', 'index.html'), page);
  const r = run('--fixtures', FIX, '--out', out, '--today', '2026-10-13', '--brief-page', page);
  assert.equal(r.status, 0, r.stderr);
  const L = json(join(out, 'latest.json'));
  assert.equal(L.sample, true);
  assert.equal(L.series.length, SERIES.length);
  for (const row of L.series) {
    assert.ok(Number.isFinite(row.value) && row.asOf && ['daily', 'monthly'].includes(row.freq) && L.sources[row.source], `${row.id} lacks value/date/frequency/source`);
    assert.equal(row.freq, row.source === 'worldbank' ? 'monthly' : 'daily', `${row.id}: monthly data must never be labelled daily`);
    if (row.freq === 'monthly') assert.match(row.asOf, /^\d{4}-\d{2}$/);
  }
  assert.deepEqual(Object.values(L.sources).map((s) => s.status), ['ok', 'ok', 'ok', 'ok']);
  assert.equal(L.yields.asOf, '2026-10-09');
  assert.equal(L.yields.prevAsOf, '2026-10-08');
  assert.equal(L.fx.asOf, '2026-10-12');
  const brent = L.series.find((s) => s.id === 'brent');
  assert.deepEqual([brent.value, brent.asOf, brent.prev, brent.prevAsOf], [66.9, '2026-10-12', 65.2, '2026-10-09']);
  assert.ok(existsSync(join(out, 'history', 'gold.json')) && existsSync(join(out, 'history', 'fx-JPY.json')) && existsSync(join(out, 'history', 'ust-10y.json')));
  assert.equal(json(join(out, 'history', 'gold.json')).sample, true);
  assert.deepEqual(json(join(out, 'brief', 'index.json')).dates, ['2026-10-13']);
  const html = readFileSync(page, 'utf8');
  assert.match(html, /<!-- brief:start -->\n<p class="briefdate" data-date="2026-10-13">Brief for Oct 13, 2026<\/p>[\s\S]*SAMPLE DATA[\s\S]*<!-- brief:end -->/);
});

test('a failing source keeps its last good data and is marked stale; nothing new means nothing written', () => {
  const out = tmp(), fix = tmp();
  cpSync(FIX, fix, { recursive: true });
  assert.equal(run('--fixtures', fix, '--out', out, '--today', '2026-10-13').status, 0);
  const first = json(join(out, 'latest.json'));
  // Same inputs again: no new data, so no files change.
  const mtime = statSync(join(out, 'latest.json')).mtimeMs;
  const again = run('--fixtures', fix, '--out', out, '--today', '2026-10-14');
  assert.equal(again.status, 0); assert.match(again.stdout, /No new data/);
  assert.equal(statSync(join(out, 'latest.json')).mtimeMs, mtime);
  // Treasury now returns an error page; ECB has a new day.
  writeFileSync(join(fix, 'treasury-2026.sample.csv'), '<!doctype html><title>Service Unavailable</title>');
  writeFileSync(join(fix, 'ecb-hist-90d.sample.xml'), readFileSync(join(fix, 'ecb-hist-90d.sample.xml'), 'utf8').replace("<Cube time='2026-10-12'>", "<Cube time='2026-10-13'><Cube currency='USD' rate='1.2000'/></Cube>\n\t\t<Cube time='2026-10-12'>"));
  const r = run('--fixtures', fix, '--out', out, '--today', '2026-10-14');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /treasury failed, keeping last good data/);
  const L = json(join(out, 'latest.json'));
  assert.equal(L.sources.treasury.status, 'stale');
  assert.equal(L.sources.treasury.lastSuccess, first.sources.treasury.lastSuccess);
  assert.deepEqual(L.yields, first.yields, 'yields carried over unchanged');
  assert.equal(L.fx.asOf, '2026-10-13');
  assert.equal(L.series.length, first.series.length);
  const b = json(join(out, 'brief', '2026-10-14.json'));
  assert.deepEqual(b.stale.map((s) => s.source), ['treasury']);
  assert.match(briefHtml(b), /Not updated today: U\.S\. Treasury/);
});

test('an older file than we already have (stale cache) is refused', () => {
  const out = tmp(), fix = tmp();
  cpSync(FIX, fix, { recursive: true });
  assert.equal(run('--fixtures', fix, '--out', out, '--today', '2026-10-13').status, 0);
  writeFileSync(join(fix, 'fred-DHHNGSP.sample.csv'), 'observation_date,DHHNGSP\n2026-10-01,3.0\n');
  const r = run('--fixtures', fix, '--out', out, '--today', '2026-10-14');
  assert.match(r.stderr, /older than/);
  assert.equal(json(join(out, 'latest.json')).sources.eia.status, 'stale');
});

test('every source failing writes nothing and exits 1', () => {
  const out = tmp(), fix = tmp();
  for (const f of readdirSync(FIX)) writeFileSync(join(fix, f), 'garbage');
  const r = run('--fixtures', fix, '--out', out, '--today', '2026-10-13');
  assert.equal(r.status, 1);
  assert.deepEqual(readdirSync(out), []);
});

test('fixtures can never be written into the real data folder', () => {
  const r = run('--fixtures', FIX, '--today', '2026-10-13');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Refusing/);
});

test('no sample data ships: commodities/data holds only real output (or nothing yet)', () => {
  const data = join(TOOL, 'data');
  if (!existsSync(data)) return;
  const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  for (const f of walk(data).filter((x) => x.endsWith('.json'))) assert.notEqual(json(f).sample, true, `${f} is SAMPLE data`);
  assert.doesNotMatch(readFileSync(join(TOOL, 'brief', 'index.html'), 'utf8'), /SAMPLE DATA/);
});

// ---------------------------------------------------------------------------------------------
const latest = {
  generated: '2026-10-13T12:00:00Z', sample: false,
  sources: { eia: { status: 'ok' }, worldbank: { status: 'ok' }, treasury: { status: 'ok' }, ecb: { status: 'ok' } },
  series: [
    { id: 'brent', freq: 'daily', unit: 'bbl', source: 'eia', value: 70, prev: 68, asOf: '2026-10-12', prevAsOf: '2026-10-09' },
    { id: 'wti', freq: 'daily', unit: 'bbl', source: 'eia', value: 66, prev: 65, asOf: '2026-10-12', prevAsOf: '2026-10-09' },
    { id: 'henryhub', freq: 'daily', unit: 'mmbtu', source: 'eia', value: 3, prev: 3, asOf: '2026-10-12', prevAsOf: '2026-10-09' },
    { id: 'gold', freq: 'monthly', unit: 'ozt', source: 'worldbank', value: 3600, prev: 3500, asOf: '2026-09', prevAsOf: '2026-08' },
    { id: 'silver', freq: 'monthly', unit: 'ozt', source: 'worldbank', value: 45, prev: 40, asOf: '2026-09', prevAsOf: '2026-08' },
    { id: 'cocoa', freq: 'monthly', unit: 'kg', source: 'worldbank', value: 6, prev: 8, asOf: '2026-09', prevAsOf: '2026-08' },
  ],
  yields: { asOf: '2026-10-09', prevAsOf: '2026-10-08', tenors: [{ key: '3m', value: 4.3, prev: 4.3 }, { key: '2y', value: 4.2, prev: 4.1 }, { key: '10y', value: 4.0, prev: 4.05 }] },
  fx: { asOf: '2026-10-12', prevAsOf: '2026-10-09', eur: { USD: 1.2, JPY: 180, GBP: 0.9 }, prevEur: { USD: 1.2, JPY: 176.4, GBP: 0.9 } },
};

test('brief: movers, spreads, curve and FX computed from the data', () => {
  const b = buildBrief(latest, { date: '2026-10-13' });
  assert.deepEqual(b.daily.map((r) => r.id), ['brent', 'wti', 'henryhub']);
  assert.equal(b.spreads.find((s) => s.id === 'brent_wti').value, 4);
  assert.equal(b.spreads.find((s) => s.id === 'brent_wti').prev, 3);
  assert.equal(b.spreads.find((s) => s.id === 'gold_silver').value, 80);
  assert.equal(b.monthly.month, '2026-09');
  assert.deepEqual(b.monthly.movers.map((m) => m.id), ['cocoa', 'silver', 'gold']);
  assert.equal(b.curve.s2s10, -0.2);
  assert.equal(b.curve.biggest.key, '2y'); assert.equal(b.curve.biggest.bp, 10);
  assert.equal(b.fx.movers[0].ccy, 'JPY');
  const html = briefHtml(b);
  assert.match(html, /Brent crude oil<\/b> rose 2\.9% to \$70\.00 per barrel on Oct 12, 2026, from \$68\.00 on Oct 9, 2026/);
  assert.match(html, /Henry Hub natural gas<\/b> was unchanged to/);
  assert.match(html, /inverted curve/);
  assert.match(html, /Monthly averages: September 2026/);
  assert.match(html, /They are not today's prices/);
  assert.ok(html.includes(DISCLAIMER.replace(/'/g, '&#39;')) || html.includes(DISCLAIMER));
});

test('brief: same text for every reader and no advice language', () => {
  const html = briefHtml(buildBrief(latest, { date: '2026-10-13' }));
  assert.equal(html, briefHtml(buildBrief(JSON.parse(JSON.stringify(latest)), { date: '2026-10-13' })));
  const body = html.replace(DISCLAIMER, '');
  for (const w of [/\bbuy\b/i, /\bsell\b/i, /\bshould\b/i, /\btarget\b/i, /\bforecast\b/i, /\bexpect/i, /\brecommend/i, /\bopportunit/i, /\bbullish|bearish\b/i, /\bwill (rise|fall)\b/i, /\byou\b/i])
    assert.doesNotMatch(body, w);
  assert.match(html, /We do not hold funds or execute trades/);
});

test('brief: empty data says so instead of inventing anything', () => {
  const b = buildBrief({ generated: '2026-10-13T00:00:00Z', series: [], sources: {} });
  assert.match(briefHtml(b), /No data was available/);
});
