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
// Layout: RRC publication OGA049M, "Drilling Permit Master Plus Latitudes and Longitudes".
// Each permit starts with a record "01" (root) followed by its trailer records ("02" permit
// master, "03" field, "14" GIS surface location, "15" GIS bottom-hole location, ...).
// Positions below are 0-based slices. Records 01 and the 02 fields marked "checked" match a
// public parser that was calibrated against real daily files (record 02 sits 2 bytes earlier
// than the printed guide). Fields marked "guide" come from the guide only, so each is
// validated before use and dropped if it doesn't look right.
const F = {
  r01: { permit: [2, 9], county: [11, 14], lease: [14, 46], district: [46, 48], operatorNo: [48, 54], received: [58, 66], operator: [66, 98], status: [100, 101] /* guide */ },
  r02: { well: [48, 54], depth: [54, 59], issued: [129, 137], spud: [153, 161], // checked
         appType: [65, 67], locFormat: [242, 243], section: [243, 251], block: [251, 261], survey: [261, 316], abstract: [316, 322], horizontal: [493, 494], api: [502, 510] }, // guide
  r03: { fieldNo: [2, 10] }, // guide, uncalibrated: kept only if it is 8 digits
};
const DISTRICTS = new Set(['01', '02', '03', '04', '05', '06', '6E', '7B', '7C', '08', '8A', '09', '10']);
const STATUS = { P: 'Pending', A: 'Approved', W: 'Withdrawn', D: 'Dismissed', E: 'Denied', C: 'Closed', X: 'Deleted', Z: 'Cancelled' };
const APP_TYPE = { '01': 'Drill', '05': 'Other', '07': 'Re-enter', '09': 'Field transfer', '14': 'Recompletion', '15': 'Reclass' };

const cut = (line, [a, b]) => line.slice(a, b).replace(/\s+/g, ' ').trim();
export function ymd(s) {
  if (!/^\d{8}$/.test(s) || s === '00000000') return null;
  const y = +s.slice(0, 4), m = +s.slice(4, 6), d = +s.slice(6, 8);
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}
// GIS records carry decimal degrees; accept the pair only if it lands inside Texas.
export function coordsFrom(line) {
  const nums = (line.slice(2).match(/-?\d{1,3}\.\d+/g) || []).map(Number);
  const lat = nums.find((n) => n >= 25.5 && n <= 36.6), lon = nums.find((n) => n <= -93.4 && n >= -106.7);
  return lat != null && lon != null ? { lat: +lat.toFixed(6), lon: +lon.toFixed(6) } : null;
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
      const district = cut(line, F.r01.district).toUpperCase();
      const st = STATUS[cut(line, F.r01.status)];
      cur = { permit: permit.padStart(7, '0'), countyCode: cc, county: COUNTIES[cc] || null,
        district: DISTRICTS.has(district) ? district : null,
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

// The MFT link opens a small file-browser page (PrimeFaces/JSF). Getting the file means:
// keep the session cookie, select the newest row (row 0), then submit the page's Download button.
async function download(url) {
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

  const html = firstBuf.toString('utf8'), base = first.url;
  const attr = (tag, a) => (new RegExp(`\\b${a}="([^"]*)"`).exec(tag) || [])[1];
  const viewState = (/name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/.exec(html) || /value="([^"]+)"[^>]*name="javax\.faces\.ViewState"/.exec(html) || [])[1];
  const formTag = (/<form\b[^>]*>/.exec(html) || [])[0];
  const tableId = (/<div[^>]*id="([^"]+)"[^>]*class="[^"]*ui-datatable[^"]*"/.exec(html) || /<div[^>]*class="[^"]*ui-datatable[^"]*"[^>]*id="([^"]+)"/.exec(html) || [])[1];
  const row0 = (/<tr[^>]*data-ri="0"[^>]*>/.exec(html) || [])[0];
  const rowKey = row0 && attr(row0, 'data-rk');
  const btn = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0]).find((b) => /download/i.test(b.replace(/<[^>]+>/g, ' ')) || /download/i.test(attr(b, 'id') || ''));
  const btnId = btn && (attr(btn, 'name') || attr(btn, 'id'));
  if (!viewState || !formTag || !tableId || rowKey == null || !btnId) {
    throw new Error(`RRC download page layout not recognized (viewState:${!!viewState} form:${!!formTag} table:${!!tableId} row:${rowKey != null} button:${!!btnId})`);
  }
  const formId = attr(formTag, 'id') || attr(formTag, 'name');
  const action = new URL(attr(formTag, 'action') || base, base).toString();
  const post = (fields, extra = {}) => req(action, { method: 'POST', body: new URLSearchParams(fields).toString(), headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', ...extra } });
  // 1) register the row selection the way the page's checkbox click does (best effort)
  try {
    await post({ 'javax.faces.partial.ajax': 'true', 'javax.faces.source': tableId, 'javax.faces.partial.execute': tableId,
      'javax.faces.behavior.event': 'rowSelectCheckbox', 'javax.faces.partial.event': 'rowSelectCheckbox', [`${tableId}_instantSelection`]: rowKey,
      [formId]: formId, [`${tableId}_selection`]: rowKey, 'javax.faces.ViewState': viewState }, { 'faces-request': 'partial/ajax', 'x-requested-with': 'XMLHttpRequest' });
  } catch (e) { console.warn('row-select step failed, trying download anyway:', e.message); }
  // 2) submit the Download button
  const r = await post({ [formId]: formId, [`${tableId}_selection`]: rowKey, [btnId]: btnId, 'javax.faces.ViewState': viewState });
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
