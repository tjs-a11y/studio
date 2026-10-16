#!/usr/bin/env node
// Permit Watch (Texas): download the RRC "Drilling Permit Master and Trailer - Daily File"
// (daf420.dat, ASCII fixed width), parse it, and write small static files for the page:
//   data/latest.json          last ~30 days of permits, all counties
//   data/county/<slug>.json   the same, one file per county (all 254)
//   feeds/<slug>.xml          RSS 2.0 feed per county (all 254)
//
// Node 20+, built-ins only. Usage:
//   node permit-watch/scripts/update.mjs                 download from the RRC and update
//   node permit-watch/scripts/update.mjs --file X        use a local daf420.dat (or the .zip the RRC serves)
//   options: --out <dir> (default: permit-watch/)  --today YYYY-MM-DD  --days 30
// Env: RRC_DAF420_URL  (override the download link)   SITE_URL  (e.g. https://example.com, used for feed links)
//
// If the download or parse fails, the script exits non-zero and writes NOTHING, so the
// live page never shows partial or made-up data.

import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { COUNTIES, slugify } from './counties.mjs';

// The RRC lists this daily file on "Data Sets Available for Download"; files are served from
// its MFT ("GoDrive") server. This link is the one the RRC data-sets page pointed to as of 2026
// (as recorded by other public parsers); override with RRC_DAF420_URL if the RRC moves it.
export const DEFAULT_URL = 'https://mft.rrc.texas.gov/link/5f07cc72-2e79-4df8-ade1-9aeb792e03fc';
// RRC public W-1 (drilling permit) search. There is no stable per-permit URL we could verify,
// so every record links here and shows its permit number to search for.
export const RRC_QUERY_URL = 'https://webapps2.rrc.texas.gov/EWA/drillingPermitsQueryAction.do';
const UA = 'PermitWatchTexas/1.0 (daily download of a public RRC data set; once per day)';

// ---------------------------------------------------------------- parsing
// Layout: RRC publication OGA049M, "Drilling Permit Master Plus Latitudes and Longitudes"
// (https://www.rrc.texas.gov/media/zgccdjpi/drillingpermitmasterpluslatitudeslongitudes_oga049m_july1.pdf,
// the manual the RRC data-sets page links for this file; checked 2026-10-11). Records are 510 bytes.
// Each permit starts with a record "01" (root) followed by its trailer records ("02" permit
// master, "03" field, "14" GIS surface location, "15" GIS bottom-hole location, ...).
// Positions below are 0-based slices = the guide's 1-based POS minus 1. Exception: the guide's
// record-02 listing prints the record id twice (POS 1 and POS 3), so every printed 02 position is
// 2 too high; 02 slices are POS minus 3 (well # POS 51 -> 48, API # POS 505 -> 502, which ends
// exactly at byte 510). A public parser calibrated on real files uses the same 02 offsets.
// Not yet checked against a real file: each guide-only value is validated before use and dropped
// if it doesn't look right, so a wrong offset hides a field instead of showing garbage.
const F = {
  // 01: permit POS 3, county 12, lease 15, district 47, operator # 49, received 59, operator name 67, status 101
  r01: { permit: [2, 9], county: [11, 14], lease: [14, 46], district: [46, 48], operatorNo: [48, 54], received: [58, 66], operator: [66, 98], status: [100, 101] },
  // 02 (printed POS): well 51, depth 57, application type 68, issued 132, spud 156, location format 245,
  // section 246, block 254, survey 264, abstract 319, horizontal flag 496, API # 505
  r02: { well: [48, 54], depth: [54, 59], issued: [129, 137], spud: [153, 161],
         appType: [65, 67], locFormat: [242, 243], section: [243, 251], block: [251, 261], survey: [261, 316], abstract: [316, 322], horizontal: [493, 494], api: [502, 510] },
  r03: { fieldNo: [2, 10] }, // 03: field # POS 3, 8 digits
};
// The district field is numeric (PIC 9(02)) and holds the RRC's internal code, not the district
// name (OGA049M, DA-DISTRICT): 07 = 6E, 08 = 7B, 09 = 7C, 10 = 08, 11 = 8A, 12 = 8B (unused), 13 = 09, 14 = 10.
export const DISTRICTS = { '01': '01', '02': '02', '03': '03', '04': '04', '05': '05', '06': '06', '07': '6E', '08': '7B', '09': '7C', '10': '08', '11': '8A', '13': '09', '14': '10' };
const STATUS = { P: 'Pending', A: 'Approved', W: 'Withdrawn', D: 'Dismissed', E: 'Denied', C: 'Closed', O: 'Other', X: 'Deleted', Z: 'Cancelled' };
const APP_TYPE = { '01': 'Drill', '05': 'Other', '07': 'Re-enter', '09': 'Field transfer', '14': 'Recompletion', '15': 'Reclass' };

const cut = (line, [a, b]) => line.slice(a, b).replace(/\s+/g, ' ').trim();
export function ymd(s) {
  if (!/^\d{8}$/.test(s) || s === '00000000') return null;
  const y = +s.slice(0, 4), m = +s.slice(4, 6), d = +s.slice(6, 8);
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}
// GIS records (14 surface, 15 bottom hole): longitude then latitude, 12 columns each with 7 decimal
// places, NAD27 (OGA049M II.75-II.77). The guide's picture is unsigned (PIC 9(5)V9(7)), so accept a
// longitude with or without its minus sign and, if the decimal point is implied, the raw 12 digits.
// Keep the pair only if it lands inside Texas.
export function coordsFrom(line) {
  let nums = (line.slice(2).match(/-?\d{1,3}\.\d+/g) || []).map(Number);
  if (!nums.length) nums = [line.slice(2, 14), line.slice(14, 26)].map((f) => f.trim()).filter((f) => /^\d{8,12}$/.test(f)).map((f) => +f / 1e7);
  const lat = nums.find((n) => n >= 25.5 && n <= 36.6), lonAbs = nums.map(Math.abs).find((n) => n >= 93.4 && n <= 106.7);
  return lat != null && lonAbs != null ? { lat: +lat.toFixed(6), lon: +(-lonAbs).toFixed(6) } : null;
}
const printable = (s) => s && /^[\x20-\x7E]+$/.test(s) ? s : null;

/** Parse the text of a daf420.dat file into permit objects (one per "01" record). */
export function parseDaily(text) {
  const out = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\r$/, ''), rec = line.slice(0, 2);
    if (rec === '01') {
      const permit = cut(line, F.r01.permit);
      if (!/^\d{5,7}$/.test(permit)) { cur = null; continue; }
      const cc = cut(line, F.r01.county).padStart(3, '0');
      const district = cut(line, F.r01.district);
      const st = STATUS[cut(line, F.r01.status)];
      cur = { permit: permit.padStart(7, '0'), countyCode: cc, county: COUNTIES[cc] || null,
        district: DISTRICTS[district] || null,
        operator: printable(cut(line, F.r01.operator)), operatorNo: cut(line, F.r01.operatorNo) || null,
        lease: printable(cut(line, F.r01.lease)), received: ymd(cut(line, F.r01.received)) };
      if (st) cur.status = st;
      out.push(cur);
    } else if (!cur) {
      continue;
    } else if (rec === '02') {
      const g = (k) => cut(line, F.r02[k]);
      cur.well = printable(g('well'));
      if (/^\d+$/.test(g('depth')) && +g('depth') > 0) cur.depth = +g('depth');
      cur.issued = ymd(g('issued'));
      const spud = ymd(g('spud')); if (spud) cur.spud = spud;
      if (APP_TYPE[g('appType')]) cur.type = APP_TYPE[g('appType')];
      if (g('horizontal') === 'Y') cur.horizontal = true;
      const api = g('api');
      if (/^\d{8}$/.test(api) && api.startsWith(cur.countyCode)) cur.api = `42-${api.slice(0, 3)}-${api.slice(3)}`;
      if (g('locFormat') === 'N') {
        for (const k of ['section', 'block', 'survey', 'abstract']) { const v = printable(g(k)); if (v && /[A-Za-z0-9]/.test(v)) cur[k] = v; }
      }
    } else if (rec === '03') {
      const fno = cut(line, F.r03.fieldNo);
      if (!cur.fieldNo && /^\d{8}$/.test(fno)) cur.fieldNo = fno;
    } else if (rec === '14') {
      const c = coordsFrom(line); if (c) { cur.lat = c.lat; cur.lon = c.lon; }
    } else if (rec === '15') {
      const c = coordsFrom(line); if (c) { cur.bhLat = c.lat; cur.bhLon = c.lon; }
    }
  }
  // drop empty fields to keep the JSON small
  return out.filter((p) => p.county).map((p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v != null && v !== '')));
}

export const permitDate = (p) => p.issued || p.received || '';

/** Merge new permits over previous ones (same permit number: newest file wins), keep the window, newest first. */
export function mergeWindow(prev, fresh, today, days) {
  const map = new Map();
  for (const p of prev || []) map.set(p.permit, p);
  for (const p of fresh) map.set(p.permit, p);
  const cutoff = new Date(Date.parse(today + 'T00:00:00Z') - days * 864e5).toISOString().slice(0, 10);
  return [...map.values()].filter((p) => permitDate(p) >= cutoff && permitDate(p) <= today)
    .sort((a, b) => permitDate(b).localeCompare(permitDate(a)) || b.permit.localeCompare(a.permit));
}

// ---------------------------------------------------------------- RSS
const xml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const rfc822 = (d) => new Date(d + 'T12:00:00-06:00').toUTCString(); // noon, Texas time
export function describe(p) {
  return [p.status ? `Status: ${p.status}` : null, p.issued ? `Issued ${p.issued}` : null, p.received ? `Filed ${p.received}` : null,
    `Operator: ${p.operator || 'n/a'}`, `Lease: ${p.lease || 'n/a'}${p.well ? `, well ${p.well}` : ''}`,
    p.district ? `RRC district ${p.district}` : null, p.api ? `API ${p.api}` : null,
    p.survey ? `Survey: ${p.survey}${p.abstract ? `, abstract ${p.abstract}` : ''}` : (p.abstract ? `Abstract ${p.abstract}` : null),
    p.section ? `Section ${p.section}${p.block ? `, block ${p.block}` : ''}` : null,
    p.depth ? `Total depth ${p.depth.toLocaleString('en-US')} ft` : null, p.horizontal ? 'Horizontal' : null,
    p.lat != null ? `Surface location ${p.lat}, ${p.lon}` : null,
    `Permit #${p.permit}. Look it up on the RRC Drilling Permit (W-1) Query.`].filter(Boolean).join(' · ');
}
export function rssFeed(countyName, slug, permits, siteUrl) {
  const page = siteUrl ? `${siteUrl.replace(/\/$/, '')}/permit-watch/?county=${slug}` : RRC_QUERY_URL;
  const items = permits.slice(0, 100).map((p) => `    <item>
      <title>${xml(`${p.operator || 'Unknown operator'}: ${p.lease || 'lease n/a'}${p.well ? ' #' + p.well : ''} (permit ${p.permit})`)}</title>
      <link>${xml(page)}</link>
      <guid isPermaLink="false">permit-watch-tx-${p.permit}-${permitDate(p)}</guid>
      <pubDate>${rfc822(permitDate(p))}</pubDate>
      <description>${xml(describe(p))}</description>
    </item>`).join('\n');
  const last = permits[0] ? `\n    <lastBuildDate>${rfc822(permitDate(permits[0]))}</lastBuildDate>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xml(`Texas drilling permits: ${countyName} County`)}</title>
    <link>${xml(page)}</link>
    <description>${xml(`New drilling permits in ${countyName} County, Texas, from public Railroad Commission of Texas data. May lag the RRC by up to a day. Not affiliated with the RRC. Not legal or investment advice.`)}</description>
    <language>en-us</language>
    <ttl>720</ttl>${last}
${items}
  </channel>
</rss>
`;
}

// ---------------------------------------------------------------- download
/** Minimal ZIP reader (stored or deflated entries). Returns { name: Buffer }. */
export function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a zip file');
  const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16); const files = {};
  for (let k = 0; k < n; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad zip directory');
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nlen).toString('utf8');
    const lstart = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    const data = buf.slice(lstart, lstart + csize);
    files[name] = method === 0 ? data : method === 8 ? inflateRawSync(data) : null;
    p += 46 + nlen + xlen + clen;
  }
  return files;
}
const isZip = (b) => b.length > 4 && b.readUInt32LE(0) === 0x04034b50;
const looksLikeDaily = (b) => /^01\d{5,7}/m.test(b.slice(0, 4000).toString('latin1'));
function fileFromBytes(buf) {
  if (isZip(buf)) {
    const files = unzip(buf);
    const name = Object.keys(files).find((f) => /daf420/i.test(f)) || Object.keys(files).find((f) => files[f] && looksLikeDaily(files[f]));
    if (!name || !files[name]) throw new Error('zip has no daf420 file: ' + Object.keys(files).join(', '));
    return files[name];
  }
  if (looksLikeDaily(buf)) return buf;
  throw new Error('downloaded file is neither a zip nor a daf420 text file');
}

// The MFT link opens a small "Public GoDrive" file-browser page (PrimeFaces/JSF) that lists
// daf420.dat (the current file) plus dated archive copies (daf420.dat.MM-DD-YYYY). Each file
// name is a command link; clicking it submits the table's form with that link's id, and the
// response is the file itself. Checked against the live page on 2026-10-11.
export const DAILY_NAME = 'daf420.dat';
/** Find what to POST to download one file from a Public GoDrive listing page. */
export function godriveRequest(html, base, fileName = DAILY_NAME) {
  const attr = (tag, a) => (new RegExp(`\\b${a}="([^"]*)"`).exec(tag) || [])[1];
  const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const link = [...html.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)].find((m) => m[2].trim() === fileName);
  if (!link) throw new Error(`RRC download page has no file named ${fileName}`);
  const click = /addSubmitParam\('([^']+)',\{'([^']+)':'([^']+)'\}\)/.exec(unesc(attr(link[0], 'onclick') || ''));
  if (!click) throw new Error('RRC download page layout not recognized (file link has no submit action)');
  const [, formId, key, val] = click;
  const fStart = html.indexOf(`<form id="${formId}"`), fEnd = html.indexOf('</form>', fStart);
  if (fStart < 0 || fEnd < 0) throw new Error(`RRC download page layout not recognized (form ${formId} missing)`);
  const form = html.slice(fStart, fEnd), formTag = (/<form\b[^>]*>/.exec(form) || [])[0];
  const fields = {};
  for (const m of form.matchAll(/<input\b[^>]*type="hidden"[^>]*>/g)) { const n = attr(m[0], 'name'); if (n) fields[n] = unesc(attr(m[0], 'value') || ''); }
  if (!fields['javax.faces.ViewState']) throw new Error('RRC download page layout not recognized (no ViewState)');
  fields[formId] = formId; fields[key] = val;
  return { action: new URL(unesc(attr(formTag, 'action') || base), base).toString(), fields };
}

// The RRC file server sometimes resets connections (TLS reset, ECONNRESET), on some days for every attempt.
// Retry network failures with growing waits, each time from a fresh session. A page-layout error is not retried:
// it will not fix itself, and the run should fail so someone looks.
export const RETRY_WAITS_MS = [15000, 60000, 180000];
export async function download(url, { once = downloadOnce, waits = RETRY_WAITS_MS, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), log = console.warn } = {}) {
  for (let i = 0; ; i++) {
    try { return await once(url); }
    catch (e) {
      if (/^RRC download page/.test(e.message) || i >= waits.length) throw e;
      log(`Download attempt ${i + 1} failed (${e.cause?.code || e.message}); retrying in ${Math.round(waits[i] / 1000)} s`);
      await sleep(waits[i]);
    }
  }
}

async function downloadOnce(url) {
  const jar = new Map();
  const req = async (u, opts = {}) => {
    const headers = { 'user-agent': UA, ...(opts.headers || {}) };
    if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const r = await fetch(u, { ...opts, headers, redirect: 'follow', signal: AbortSignal.timeout(120000) });
    for (const c of r.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim()); }
    if (!r.ok) throw new Error(`HTTP ${r.status} from ${u}`);
    return r;
  };
  const first = await req(url);
  const firstBuf = Buffer.from(await first.arrayBuffer());
  if (isZip(firstBuf) || looksLikeDaily(firstBuf)) return fileFromBytes(firstBuf);
  const { action, fields } = godriveRequest(firstBuf.toString('utf8'), first.url);
  const r = await req(action, { method: 'POST', body: new URLSearchParams(fields).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded', referer: first.url } });
  return fileFromBytes(Buffer.from(await r.arrayBuffer()));
}

// ---------------------------------------------------------------- main
async function writeIfChanged(file, content) {
  try { if ((await readFile(file, 'utf8')) === content) return false; } catch { /* new file */ }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file + '.tmp', content); await rename(file + '.tmp', file);
  return true;
}

export async function buildOutputs({ permits, outDir, today, sourceName, siteUrl, days }) {
  const latestFile = path.join(outDir, 'data', 'latest.json');
  let prev = [];
  if (existsSync(latestFile)) { try { prev = JSON.parse(await readFile(latestFile, 'utf8')).permits || []; } catch { prev = []; } }
  const all = mergeWindow(prev, permits, today, days);
  const meta = { source: 'Railroad Commission of Texas, Drilling Permit Master and Trailer daily file (daf420)', sourceFile: sourceName, windowDays: days, rrcQueryUrl: RRC_QUERY_URL };
  // latest.json is rewritten only when the permit list changed, so a quiet day makes no commit
  let changed = 0;
  if (JSON.stringify(prev) !== JSON.stringify(all) || !existsSync(latestFile)) {
    await writeIfChanged(latestFile, JSON.stringify({ updated: new Date().toISOString(), dataDate: today, ...meta, count: all.length, permits: all }) + '\n');
    changed++;
  }
  for (const [code, name] of Object.entries(COUNTIES)) {
    const slug = slugify(name), list = all.filter((p) => p.countyCode === code);
    if (await writeIfChanged(path.join(outDir, 'data', 'county', slug + '.json'), JSON.stringify({ county: name, countyCode: code, ...meta, count: list.length, permits: list }) + '\n')) changed++;
    if (await writeIfChanged(path.join(outDir, 'feeds', slug + '.xml'), rssFeed(name, slug, list, siteUrl))) changed++;
  }
  return { total: all.length, fresh: permits.length, changed };
}

function args(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  return o;
}
const chicagoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());

async function main() {
  const a = args(process.argv.slice(2));
  const outDir = a.out || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const today = a.today || chicagoToday(), days = +(a.days || 30);
  let bytes, sourceName;
  if (a.file) { bytes = fileFromBytes(await readFile(a.file)); sourceName = path.basename(a.file); }
  else { const url = process.env.RRC_DAF420_URL || DEFAULT_URL; bytes = await download(url); sourceName = `daf420.dat (downloaded ${today})`; }
  const permits = parseDaily(bytes.toString('latin1'));
  if (!permits.length) throw new Error('parsed 0 permits: file format may have changed. Nothing written.');
  const r = await buildOutputs({ permits, outDir, today, sourceName, siteUrl: process.env.SITE_URL || '', days });
  console.log(`parsed ${r.fresh} permits from ${sourceName}; ${r.total} in the ${days}-day window; ${r.changed} files changed`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => { console.error('Permit Watch update failed:', e.message + (e.cause ? ` (${e.cause.code || e.cause.message || e.cause})` : '')); process.exit(1); });
}
