// Parsers for each public source. Pure functions over the downloaded bytes/text; no network here.
// Each parser throws a clear Error when the file doesn't look like what we expect, so fetch.mjs can
// keep the last good data for that source instead of publishing something wrong.
import { inflateRawSync } from 'node:zlib';
import { SERIES, TENORS, WB_UNITS, wbKey } from '../js/core.js';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const num = (s) => { const t = String(s ?? '').trim(); if (t === '' || t === '.' || /^(n\/?a|…|\.\.\.?)$/i.test(t)) return null; const v = Number(t.replace(/,/g, '')); return Number.isFinite(v) ? v : null; };

// ---------------------------------------------------------------------------------------------
// ECB euro reference rates, XML (eurofxref-daily.xml / eurofxref-hist-90d.xml / eurofxref-hist.xml):
//   <Cube><Cube time="2026-10-12"><Cube currency="USD" rate="1.0850"/>...</Cube>...</Cube>
// Returns { days: [{ date, eur: { USD: 1.085, ... } }] } newest first.
export function parseEcbXml(xml) {
  if (!/eurofxref|gesmes/i.test(xml)) throw new Error('ECB: not an ECB reference-rate file');
  const days = [];
  const dayRe = /<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]\s*>([\s\S]*?)<\/Cube>\s*(?=<Cube\s+time=|<\/Cube>)/g;
  for (const m of xml.matchAll(dayRe)) {
    const eur = {};
    for (const r of m[2].matchAll(/<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]\s*\/>/g)) {
      const v = Number(r[2]);
      if (Number.isFinite(v) && v > 0) eur[r[1]] = v;
    }
    if (Object.keys(eur).length) days.push({ date: m[1], eur });
  }
  if (!days.length) throw new Error('ECB: no dated rates found');
  days.sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!days[0].eur.USD) throw new Error('ECB: latest day has no USD rate');
  return { days };
}

// ---------------------------------------------------------------------------------------------
// Minimal CSV reader (quoted fields, CRLF/LF).
export function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

// ---------------------------------------------------------------------------------------------
// U.S. Treasury daily par yield curve CSV. Header: Date,"1 Mo","1.5 Month","2 Mo",...,"30 Yr"; dates MM/DD/YYYY.
// Columns are matched by name, so added or missing tenors don't shift anything.
// Returns { days: [{ date, yields: { '10y': 4.12, ... } }] } newest first.
const tenorOf = (h) => {
  const t = h.trim().toLowerCase().replace(/\s+/g, ' ');
  const m = /^([0-9.]+) ?(mo|mos|month|months|yr|yrs|year|years)$/.exec(t);
  if (!m) return null;
  const months = /^y/.test(m[2]) ? Number(m[1]) * 12 : Number(m[1]);
  const k = TENORS.find((x) => x.months === months);
  return k ? k.key : null;
};
export function parseTreasuryCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('Treasury: empty file');
  const head = rows[0];
  if (!/^date$/i.test(head[0].trim())) throw new Error(`Treasury: first column is "${head[0]}", expected Date`);
  const cols = head.map(tenorOf);
  if (!cols.includes('10y') || !cols.includes('2y')) throw new Error('Treasury: 2 Yr / 10 Yr columns not found');
  const days = [];
  for (const r of rows.slice(1)) {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(r[0].trim()) || /^(\d{4})-(\d{2})-(\d{2})$/.exec(r[0].trim());
    if (!m) throw new Error(`Treasury: bad date "${r[0]}"`);
    const date = m[0].includes('/') ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : m[0];
    const yields = {};
    cols.forEach((k, i) => { if (!k) return; const v = num(r[i]); if (v != null && v > -5 && v < 30) yields[k] = v; });
    if (Object.keys(yields).length) days.push({ date, yields });
  }
  if (!days.length) throw new Error('Treasury: no rows');
  days.sort((a, b) => (a.date < b.date ? 1 : -1));
  return { days };
}

// ---------------------------------------------------------------------------------------------
// FRED graph CSV (no key): "observation_date,DCOILBRENTEU" (older files: "DATE,..."); "." or empty = no value.
// Returns { id, points: [[date, value], ...] } oldest first, missing days dropped.
export function parseFredCsv(text, expectId) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('FRED: empty file');
  const [d, id] = rows[0].map((x) => x.trim());
  if (!/^(observation_date|date)$/i.test(d)) throw new Error(`FRED: unexpected header "${rows[0].join(',')}"`);
  if (expectId && id !== expectId) throw new Error(`FRED: expected ${expectId}, got ${id}`);
  const points = [];
  for (const r of rows.slice(1)) {
    const date = r[0].trim();
    if (!ISO.test(date)) throw new Error(`FRED: bad date "${date}"`);
    const v = num(r[1]);
    if (v != null) points.push([date, v]);
  }
  if (!points.length) throw new Error('FRED: no values');
  points.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return { id, points };
}

// ---------------------------------------------------------------------------------------------
// Minimal .xlsx reader: ZIP central directory + inflate, shared strings, one sheet's cells.
export function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('xlsx: not a zip file');
  const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let k = 0; k < n; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('xlsx: bad central directory');
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl);
    const lnl = buf.readUInt16LE(off + 26), lxl = buf.readUInt16LE(off + 28);
    const data = buf.subarray(off + 30 + lnl + lxl, off + 30 + lnl + lxl + csize);
    files[name] = method === 0 ? data : method === 8 ? inflateRawSync(data) : null;
    p += 46 + nl + xl + cl;
  }
  return files;
}
const xmlText = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&amp;/g, '&');
const colNum = (ref) => { let n = 0; for (const ch of /^[A-Z]+/.exec(ref)[0]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
// Returns the sheet as an array of rows (sparse arrays of strings/numbers).
export function readXlsxSheet(buf, wantName) {
  const files = unzip(buf);
  const get = (n) => { const f = files[n]; if (!f) throw new Error(`xlsx: missing ${n}`); return f.toString('utf8'); };
  const wb = get('xl/workbook.xml');
  const sheets = [...wb.matchAll(/<sheet\b[^>]*>/g)].map((m) => ({ name: xmlText((/\bname="([^"]*)"/.exec(m[0]) || [])[1] || ''), rid: (/\br:id="([^"]*)"/.exec(m[0]) || /\bid="([^"]*)"/.exec(m[0]) || [])[1] }));
  const sheet = sheets.find((s) => s.name.trim().toLowerCase() === wantName.toLowerCase());
  if (!sheet) throw new Error(`xlsx: no sheet "${wantName}" (found: ${sheets.map((s) => s.name).join(', ')})`);
  const rels = get('xl/_rels/workbook.xml.rels');
  const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`Id="${sheet.rid}"`));
  if (!rel) throw new Error('xlsx: sheet relationship not found');
  let target = /Target="([^"]+)"/.exec(rel)[1];
  target = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
  const shared = files['xl/sharedStrings.xml'] ? [...files['xl/sharedStrings.xml'].toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => xmlText([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''))) : [];
  const rows = [];
  for (const rm of get(target).matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rnum = Number((/\br="(\d+)"/.exec(rm[0]) || [])[1]) - 1;
    const row = [];
    for (const cm of (rm[1] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1], body = cm[2] || '';
      const ref = (/\br="([A-Z]+\d+)"/.exec(attrs) || [])[1];
      const t = (/\bt="(\w+)"/.exec(attrs) || [])[1];
      const v = (/<v>([\s\S]*?)<\/v>/.exec(body) || [])[1];
      let val;
      if (t === 's') val = shared[Number(v)];
      else if (t === 'inlineStr') val = xmlText((/<is>([\s\S]*?)<\/is>/.exec(body) || ['', ''])[1]);
      else if (t === 'str' || t === 'e') val = v == null ? undefined : xmlText(v);
      else if (t === 'b') val = v === '1';
      else val = v == null ? undefined : Number(v);
      if (ref && val !== undefined) row[colNum(ref)] = val;
    }
    rows[Number.isFinite(rnum) && rnum >= 0 ? rnum : rows.length] = row;
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------
// World Bank "CMO Historical Data Monthly" workbook, sheet "Monthly Prices":
// a few title rows, then a row of commodity names, a row of units like "($/mt)", then one row per
// month with the date as text "1960M01" in column A. Values may be "…" when missing.
// Returns { series: { <ourId>: { unit, points: [['2026-09', v], ...] } }, missing: [ourId...], lastMonth }.
export function parsePinkSheet(buf) {
  const rows = readXlsxSheet(buf, 'Monthly Prices');
  const isMonth = (v) => typeof v === 'string' && /^\d{4}M\d{2}$/.test(v.trim());
  const first = rows.findIndex((r) => r && isMonth(r[0]));
  if (first < 2) throw new Error('World Bank: no month rows like 1960M01 found');
  // Names row: the nearest row above the data with text in many columns; units row sits between it and the data.
  let unitsRow = -1, namesRow = -1;
  for (let i = first - 1; i >= 0; i--) {
    const r = rows[i] || [];
    const txt = r.filter((x) => typeof x === 'string' && x.trim()).length;
    if (unitsRow < 0 && r.some((x) => typeof x === 'string' && /^\(\$\//.test(x.trim()))) { unitsRow = i; continue; }
    if (unitsRow >= 0 && txt >= 3) { namesRow = i; break; }
  }
  if (namesRow < 0) throw new Error('World Bank: commodity name / unit rows not found');
  const names = rows[namesRow], units = rows[unitsRow];
  const colFor = new Map();
  names.forEach((n, i) => { if (typeof n === 'string' && n.trim()) colFor.set(wbKey(n), i); });
  const out = {}, missing = [];
  for (const s of SERIES.filter((x) => x.source === 'worldbank')) {
    const want = wbKey(s.wb);
    let col = colFor.get(want);
    if (col == null) for (const [k, i] of colFor) if (k.startsWith(want + ' ') || k.startsWith(want + ',')) { col = i; break; }
    if (col == null) { missing.push(s.id); continue; }
    const u = String(units[col] || '').trim().replace(/^\(|\)$/g, '').toLowerCase();
    if (WB_UNITS[u] !== s.unit) { missing.push(s.id); continue; } // unit changed: don't guess a conversion
    const points = [];
    for (let i = first; i < rows.length; i++) {
      const r = rows[i]; if (!r || !isMonth(r[0])) continue;
      const v = typeof r[col] === 'number' ? r[col] : num(r[col]);
      if (v != null && v > 0) points.push([`${r[0].slice(0, 4)}-${r[0].slice(5, 7)}`, v]);
    }
    if (points.length) out[s.id] = { unit: s.unit, unitLabel: u, points }; else missing.push(s.id);
  }
  if (Object.keys(out).length < 5) throw new Error(`World Bank: only ${Object.keys(out).length} series matched`);
  const lastMonth = Object.values(out).map((x) => x.points.at(-1)[0]).sort().at(-1);
  return { series: out, missing, lastMonth };
}
