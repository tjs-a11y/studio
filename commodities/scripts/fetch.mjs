#!/usr/bin/env node
// WorldSource Commodity Desk: daily data update.
// Downloads four free public sources, parses them, and writes:
//   data/latest.json            the board (every number with source, as-of date and frequency)
//   data/history/<id>.json      price history per series (fx-<CCY>.json, ust-<tenor>.json too)
//   data/brief/<date>.json      the daily brief (+ latest.json and index.json)
//   brief/index.html            the brief, rendered into the page between <!-- brief:start --> and <!-- brief:end -->
// A source that fails keeps its last good numbers (marked "stale" with the date of its last success).
// If every source fails, nothing is written and the script exits 1. If no source has new data
// (weekends, holidays), nothing is written either, so the workflow makes no commit.
//
//   node commodities/scripts/fetch.mjs                       live run (network)
//   node commodities/scripts/fetch.mjs --fixtures <dir> --out <tmpdir> [--brief-page <file>]
//                                                            offline run on SAMPLE files (output marked "sample")
//   Options: --today YYYY-MM-DD (brief date; default: today in America/Chicago), --only ecb,treasury,eia,worldbank
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SERIES, SOURCES, TENORS, mergePoints, buildBrief, briefHtml, perUsd, fmtDate } from '../js/core.js';
import { parseEcbXml, parseTreasuryCsv, parseFredCsv, parsePinkSheet } from './sources.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TOOL = resolve(here, '..');
const REAL_DATA = join(TOOL, 'data');
const DAILY_MAX = 2600; // about 10 years of working days

// ---------------------------------------------------------------------------------------------
// Where each source lives. All can be overridden by environment variables (repo variables in the
// workflow) if an agency moves a file. Formats and URLs: see README "Needs a live check".
export const URLS = {
  ecb: () => process.env.ECB_URL || 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml',
  treasury: (year) => (process.env.TREASURY_URL || 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/{year}/all?type=daily_treasury_yield_curve&field_tdr_date_value={year}&page&_format=csv').replaceAll('{year}', String(year)),
  fred: (id, start) => `${process.env.FRED_URL || 'https://fred.stlouisfed.org/graph/fredgraph.csv'}?id=${id}${start ? `&cosd=${start}` : ''}`,
  worldbank: () => process.env.WB_PINK_URL || 'https://thedocs.worldbank.org/en/doc/5d903e848db1d1b83e0ec8f744e55570-0350012021/related/CMO-Historical-Data-Monthly.xlsx',
  worldbankPage: () => 'https://www.worldbank.org/en/research/commodity-markets',
};
const UA = `QuickwellCommodityDesk/1.0 (+${process.env.SITE_URL || 'https://quickwell.app'}/commodities/; daily, one request per file)`;

async function download(url, { binary = false, tries = 3 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' }, signal: AbortSignal.timeout(60000), redirect: 'follow' });
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
      return binary ? Buffer.from(await r.arrayBuffer()) : await r.text();
    } catch (e) { last = e; if (i < tries - 1) await new Promise((res) => setTimeout(res, 3000 * (i + 1))); }
  }
  throw last;
}

// ---------------------------------------------------------------------------------------------
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const FIX = opt('--fixtures') ? resolve(opt('--fixtures')) : null;
const OUT = resolve(opt('--out') || REAL_DATA);
const ONLY = opt('--only') ? opt('--only').split(',') : null;
const chicagoDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const TODAY = opt('--today') || chicagoDate();
const BRIEF_PAGE = opt('--brief-page') ? resolve(opt('--brief-page')) : FIX ? null : join(TOOL, 'brief', 'index.html');

if (FIX && OUT === REAL_DATA) { console.error('Refusing to write SAMPLE fixture data into the real data folder. Use --out <tmpdir>.'); process.exit(2); }

const readJson = (f, fallback) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch (e) { return fallback; } };
const fixture = (name, binary) => readFileSync(join(FIX, name), binary ? undefined : 'utf8');
const histFile = (id) => join(OUT, 'history', `${id}.json`);
const pending = new Map(); // file -> content, written only at the end
const put = (f, obj) => pending.set(f, JSON.stringify(obj) + '\n');

let prev = readJson(join(OUT, 'latest.json'), null);
if (prev && prev.sample && !FIX) { console.warn('Previous latest.json was SAMPLE data: ignoring it.'); prev = null; }
const nowIso = new Date().toISOString();
const latest = { generated: nowIso, sample: !!FIX, sources: {}, series: [], fx: null, yields: null };
const ok = [], failed = [];

function history(id, meta, newPts, max) {
  const old = readJson(histFile(id), null);
  const usable = old && !!old.sample === !!FIX ? old.points : []; // never mix sample and real points
  const points = mergePoints(usable, newPts, max);
  put(histFile(id), { id, ...meta, sample: !!FIX, points });
  return points;
}
const lastTwo = (pts) => ({ value: pts.at(-1)[1], asOf: pts.at(-1)[0], prev: pts.length > 1 ? pts.at(-2)[1] : null, prevAsOf: pts.length > 1 ? pts.at(-2)[0] : null });
const prevRows = (src) => (prev && prev.series ? prev.series.filter((r) => r.source === src) : []);
const sourceMeta = (k) => ({ name: SOURCES[k].name, url: SOURCES[k].url, frequency: SOURCES[k].freq, license: SOURCES[k].license });
function markOk(k, extra = {}) { latest.sources[k] = { ...sourceMeta(k), status: 'ok', lastSuccess: nowIso, ...extra }; ok.push(k); }
function markFailed(k, err) {
  const was = prev && prev.sources && prev.sources[k];
  latest.sources[k] = { ...sourceMeta(k), status: was && was.lastSuccess ? 'stale' : 'unavailable', lastSuccess: (was && was.lastSuccess) || null, error: String(err && err.message || err).slice(0, 300) };
  failed.push(k);
  console.error(`::warning::${k} failed, keeping last good data: ${err && err.message}`);
}
// Never let a source go backwards in time (a cached old file): treat that as a failure.
const notOlder = (k, asOf, prevAsOf) => { if (prevAsOf && asOf < prevAsOf) throw new Error(`${k}: newest date ${asOf} is older than the ${prevAsOf} we already have`); };

// ---------------------------------------------------------------------------------------------
async function runEia() {
  const rows = [];
  for (const s of SERIES.filter((x) => x.source === 'eia')) {
    const old = readJson(histFile(s.id), null);
    // First run: 10 years of history. After that: the last year again (FRED revises recent days).
    const lastDate = old && !old.sample && old.points && old.points.length ? old.points.at(-1)[0] : null;
    const start = lastDate ? `${Number(lastDate.slice(0, 4)) - 1}${lastDate.slice(4)}` : `${Number(TODAY.slice(0, 4)) - 10}${TODAY.slice(4)}`;
    const text = FIX ? fixture(`fred-${s.fred}.sample.csv`) : await download(URLS.fred(s.fred, start));
    const { points } = parseFredCsv(text, s.fred);
    if (points.at(-1)[0] > TODAY) throw new Error(`EIA/FRED ${s.fred}: date in the future`);
    const was = prevRows('eia').find((r) => r.id === s.id);
    notOlder(s.fred, points.at(-1)[0], was && was.asOf);
    const all = history(s.id, { freq: 'daily', unit: s.unit, source: 'eia' }, points, DAILY_MAX);
    rows.push({ id: s.id, group: s.group, unit: s.unit, source: 'eia', freq: 'daily', ...lastTwo(all) });
  }
  latest.series.push(...rows);
}

async function runWorldBank() {
  let buf;
  if (FIX) buf = fixture('pink-sheet.sample.xlsx', true);
  else {
    try { buf = await download(URLS.worldbank(), { binary: true }); parsePinkSheet(buf); }
    catch (e) {
      // The file's address can change between releases: look for the current link on the commodity-markets page.
      console.warn(`World Bank: default URL failed (${e.message}); looking for the current link.`);
      const page = await download(URLS.worldbankPage());
      const m = /href="([^"]*CMO-Historical-Data-Monthly\.xlsx)"/i.exec(page);
      if (!m) throw new Error('World Bank: monthly workbook link not found on the commodity-markets page');
      buf = await download(new URL(m[1], URLS.worldbankPage()).href, { binary: true });
    }
  }
  const wb = parsePinkSheet(buf);
  const prevMonth = prevRows('worldbank').map((r) => r.asOf).sort().at(-1);
  notOlder('World Bank', wb.lastMonth, prevMonth);
  for (const s of SERIES.filter((x) => x.source === 'worldbank')) {
    const got = wb.series[s.id];
    if (!got) { const was = prevRows('worldbank').find((r) => r.id === s.id); if (was) latest.series.push({ ...was, stale: true }); continue; }
    const all = history(s.id, { freq: 'monthly', unit: s.unit, source: 'worldbank' }, got.points, Infinity);
    latest.series.push({ id: s.id, group: s.group, unit: s.unit, source: 'worldbank', freq: 'monthly', ...lastTwo(all) });
  }
  if (wb.missing.length) console.warn(`::warning::World Bank: columns not found or unit changed: ${wb.missing.join(', ')}`);
  return { missing: wb.missing };
}

async function runTreasury() {
  const year = Number(TODAY.slice(0, 4));
  let days = parseTreasuryCsv(FIX ? fixture(`treasury-${year}.sample.csv`) : await download(URLS.treasury(year))).days;
  if (days.length < 2 && !FIX) days = days.concat(parseTreasuryCsv(await download(URLS.treasury(year - 1))).days);
  days = days.filter((d) => d.date <= TODAY);
  if (!days.length) throw new Error('Treasury: no rows up to today');
  notOlder('Treasury', days[0].date, prev && prev.yields && prev.yields.asOf);
  const [d0, d1] = days;
  for (const t of TENORS) {
    const pts = days.filter((d) => Number.isFinite(d.yields[t.key])).map((d) => [d.date, d.yields[t.key]]).reverse();
    if (pts.length) history(`ust-${t.key}`, { freq: 'daily', unit: '%', source: 'treasury', label: t.col }, pts, DAILY_MAX);
  }
  latest.yields = { source: 'treasury', freq: 'daily', asOf: d0.date, prevAsOf: d1 ? d1.date : null,
    tenors: TENORS.filter((t) => Number.isFinite(d0.yields[t.key])).map((t) => ({ key: t.key, col: t.col, months: t.months, value: d0.yields[t.key], prev: d1 && Number.isFinite(d1.yields[t.key]) ? d1.yields[t.key] : null })) };
}

async function runEcb() {
  const { days } = parseEcbXml(FIX ? fixture('ecb-hist-90d.sample.xml') : await download(URLS.ecb()));
  const fresh = days.filter((d) => d.date <= TODAY);
  if (!fresh.length) throw new Error('ECB: no rates up to today');
  notOlder('ECB', fresh[0].date, prev && prev.fx && prev.fx.asOf);
  const [d0, d1] = fresh;
  latest.fx = { source: 'ecb', freq: 'daily', base: 'EUR', asOf: d0.date, prevAsOf: d1 ? d1.date : null, eur: d0.eur, prevEur: d1 ? d1.eur : null };
  for (const c of ['EUR', ...Object.keys(d0.eur).filter((x) => x !== 'USD')]) {
    const pts = fresh.slice().reverse().map((d) => [d.date, perUsd(d.eur, c)]).filter((p) => Number.isFinite(p[1]));
    if (pts.length) history(`fx-${c}`, { freq: 'daily', unit: `${c} per USD`, source: 'ecb' }, pts, DAILY_MAX);
  }
}

// ---------------------------------------------------------------------------------------------
const jobs = { eia: runEia, worldbank: runWorldBank, treasury: runTreasury, ecb: runEcb };
for (const [k, fn] of Object.entries(jobs)) {
  if (ONLY && !ONLY.includes(k)) { carry(k); continue; }
  const before = { series: latest.series.length, files: new Set(pending.keys()) };
  try { const extra = await fn(); markOk(k, extra && extra.missing && extra.missing.length ? { missing: extra.missing } : {}); }
  catch (e) {
    // Roll back anything this source half-wrote, then carry its last good data.
    latest.series.length = before.series;
    for (const f of [...pending.keys()]) if (!before.files.has(f)) pending.delete(f);
    if (k === 'treasury') latest.yields = null; if (k === 'ecb') latest.fx = null;
    markFailed(k, e); carry(k);
  }
}
function carry(k) {
  if (!latest.sources[k]) { const was = prev && prev.sources && prev.sources[k]; latest.sources[k] = was ? { ...was } : { ...sourceMeta(k), status: 'unavailable', lastSuccess: null }; }
  if (!prev) return;
  if (k === 'treasury') latest.yields = prev.yields || null;
  else if (k === 'ecb') latest.fx = prev.fx || null;
  else latest.series.push(...prevRows(k).map((r) => ({ ...r })));
}
// Board order = catalog order.
latest.series.sort((a, b) => SERIES.findIndex((s) => s.id === a.id) - SERIES.findIndex((s) => s.id === b.id));

if (!ok.length) { console.error(`All sources failed (${failed.join(', ')}). Nothing written; the site keeps the last good data.`); process.exit(1); }

// Nothing new since last time (weekend, holiday)? Then write nothing, so there's no commit.
const dataKey = (l) => l && JSON.stringify({ s: l.series.map((r) => [r.id, r.asOf, r.value]), f: l.fx && l.fx.asOf, y: l.yields && l.yields.asOf, st: Object.entries(l.sources).map(([k, v]) => [k, v.status]) });
if (prev && dataKey(prev) === dataKey(latest)) { console.log('No new data from any source since the last update. Nothing written.'); process.exit(0); }

// Brief
const brief = buildBrief(latest, { date: TODAY });
const index = readJson(join(OUT, 'brief', 'index.json'), { dates: [] });
const dates = [...new Set([TODAY, ...(index.sample === !!FIX ? index.dates : [])])].sort().reverse();
put(join(OUT, 'brief', `${TODAY}.json`), brief);
put(join(OUT, 'brief', 'latest.json'), brief);
put(join(OUT, 'brief', 'index.json'), { sample: !!FIX, dates });
put(join(OUT, 'latest.json'), latest);

for (const [f, s] of pending) { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, s); }
if (BRIEF_PAGE && existsSync(BRIEF_PAGE)) {
  const html = readFileSync(BRIEF_PAGE, 'utf8');
  const re = /(<!-- brief:start -->)[\s\S]*?(<!-- brief:end -->)/;
  if (!re.test(html)) console.warn('::warning::brief page has no <!-- brief:start --> marker; not updated');
  else writeFileSync(BRIEF_PAGE, html.replace(re, `$1\n<p class="briefdate" data-date="${TODAY}">Brief for ${fmtDate(TODAY)}</p>\n${briefHtml(brief)}\n$2`));
}
console.log(`Wrote ${pending.size} files to ${OUT}. OK: ${ok.join(', ') || 'none'}. Failed (kept last good data): ${failed.join(', ') || 'none'}.`);
