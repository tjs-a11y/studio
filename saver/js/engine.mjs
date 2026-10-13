// Quickwell Saver: detection engine. Pure functions: no DOM, no network, no storage.
// Ported from the Year-End Vendor Check engine (studio/vendor-check, <script id="vc-engine">) and extended for
// households: more bank layouts, pasted statement text, currencies, a consumer merchant list, bank fees,
// free-trial and intro-price conversions, "still using it?" subscriptions and money-leak estimates.
// Everything here runs the same in the browser and in Node tests.

// ===================================================================== dates ('YYYY-MM-DD', UTC math)
const pad = (n) => String(n).padStart(2, '0');
const toD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (s, n) => { const d = toD(s); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const addMonths = (s, n) => {
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last)); return ymd(t);
};
const daysBetween = (a, b) => Math.round((toD(b) - toD(a)) / 864e5);
const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const dates = { toD, ymd, addDays, addMonths, daysBetween, todayLocal };

// ===================================================================== money and currencies
// Symbols we recognise in files. Longest first so "R$" wins over "$".
const SIGNS = [['US$', 'USD'], ['R$', 'BRL'], ['MX$', 'MXN'], ['CA$', 'CAD'], ['C$', 'CAD'], ['AU$', 'AUD'], ['A$', 'AUD'], ['KSh', 'KES'], ['₦', 'NGN'], ['₱', 'PHP'], ['₹', 'INR'], ['€', 'EUR'], ['£', 'GBP'], ['¥', 'JPY'], ['$', 'USD']];
const ISO_LIST = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'BRL', 'MXN', 'NGN', 'KES', 'ZAR', 'PHP', 'JPY', 'CHF', 'NZD', 'SGD'];
const ISO_RE = new RegExp(`\\b(${ISO_LIST.join('|')})\\b`, 'g');
export const CURRENCIES = ISO_LIST;
// Pick the currency a file is in: ISO codes count most, then symbols. Returns null when there is no clue.
export function detectCurrency(text) {
  const s = String(text || '').slice(0, 200000); const score = {};
  const add = (c, n) => { score[c] = (score[c] || 0) + n; };
  for (const m of s.matchAll(ISO_RE)) add(m[1], 3);
  let rest = s;
  for (const [sym, cur] of SIGNS) { const parts = rest.split(sym); if (parts.length > 1) { add(cur, parts.length - 1); rest = parts.join(' '); } }
  for (const m of s.matchAll(/(?:^|[\s;,"(])R ?\d{1,3}(?:[ ,.]\d{3})*[.,]\d{2}\b/g)) add('ZAR', 1);
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}
// A sensible default from the browser's language when a file has no currency clue.
const REGION_CUR = { US: 'USD', GB: 'GBP', IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', PT: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', CA: 'CAD', AU: 'AUD', NZ: 'NZD', IN: 'INR', BR: 'BRL', MX: 'MXN', NG: 'NGN', KE: 'KES', ZA: 'ZAR', PH: 'PHP', JP: 'JPY', CH: 'CHF', SG: 'SGD' };
export function currencyForLocale(locale) {
  const m = String(locale || '').match(/[-_]([A-Z]{2})\b/i);
  return (m && REGION_CUR[m[1].toUpperCase()]) || 'USD';
}
const NF = new Map();
export function fmtMoney(v, currency = 'USD', locale = 'en-US', opts = {}) {
  const k = `${locale}|${currency}|${opts.whole ? 1 : 0}`;
  if (!NF.has(k)) {
    let f; try { f = new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: opts.whole ? 0 : 2, maximumFractionDigits: opts.whole ? 0 : 2 }); }
    catch (e) { f = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }); }
    NF.set(k, f);
  }
  return NF.get(k).format(opts.whole ? Math.round(v) : Math.round(v * 100) / 100);
}
const r2 = (x) => Math.round(x * 100) / 100;

// ===================================================================== CSV parsing (from Vendor Check)
export function sniffDelimiter(text) {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim()).slice(0, 25);
  let best = ',', bestScore = -1;
  for (const d of [',', ';', '\t', '|']) {
    const counts = lines.map((l) => { let c = 0, q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === d && !q) c++; } return c; });
    const withD = counts.filter((c) => c > 0);
    if (!withD.length) continue;
    const freq = {}; withD.forEach((c) => { freq[c] = (freq[c] || 0) + 1; });
    const mode = Math.max(...Object.values(freq));
    const score = withD.length * 2 + mode * 3 + (d === ',' ? 0.5 : 0);
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}
export function parseCSV(text, delim) {
  text = String(text || '').replace(/^﻿/, '');
  const d = delim || sniffDelimiter(text);
  const rows = []; let row = [], f = '', q = false, i = 0, quoted = false; const n = text.length;
  const endField = () => { row.push(quoted ? f : f.trim()); f = ''; quoted = false; };
  while (i < n) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i += 2; continue; } q = false; i++; continue; }
      f += c; i++; continue;
    }
    if (c === '"' && f.trim() === '') { q = true; quoted = true; f = ''; i++; continue; }
    if (c === d) { endField(); i++; continue; }
    if (c === '\r' || c === '\n') { endField(); rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; i++; continue; }
    f += c; i++;
  }
  if (f !== '' || row.length) { endField(); rows.push(row); }
  return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some((x) => x !== ''));
}

const CUR_STRIP = new RegExp(`${ISO_LIST.join('|')}|KSh|R\\$|MX\\$|CA\\$|C\\$|AU\\$|A\\$|US\\$|[$€£₹₦₱¥\\s\\u00a0\\u202f]`, 'gi');
export function parseAmount(s) {
  if (s == null) return NaN; let t = String(s).trim().replace(/[−–]/g, '-'); if (!t) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1).trim(); }
  t = t.replace(/\s*CR$/i, '');
  if (/\s*DR$/i.test(t)) { neg = !neg; t = t.replace(/\s*DR$/i, ''); }
  if (/^-?\s*R\s?\d/.test(t)) t = t.replace(/R\s?(?=\d)/, '');
  t = t.replace(CUR_STRIP, '');
  if (t.endsWith('-')) { neg = !neg; t = t.slice(0, -1); }
  if (t.startsWith('-')) { neg = !neg; t = t.slice(1); } else if (t.startsWith('+')) t = t.slice(1);
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(t) || /^\d+,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}('\d{3})+(\.\d{1,2})?$/.test(t)) t = t.replace(/'/g, '');
  else t = t.replace(/,/g, '');
  if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return NaN;
  const v = parseFloat(t); return neg ? -v : v;
}

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  ene: 1, abr: 4, ago: 8, dic: 12, janv: 1, fev: 2, mars: 3, avr: 4, mai: 5, juin: 6, juil: 7, aout: 8, sept: 9 };
const monthOf = (w) => { const s = String(w).toLowerCase().normalize('NFD').replace(/[̀-ͯ.]/g, ''); return MON[s.slice(0, 3)] || MON[s.slice(0, 4)] || MON[s] || null; };
function mk(y, m, d) {
  if (!(y > 1900 && y < 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const s = `${y}-${pad(m)}-${pad(d)}`; return ymd(toD(s)) === s ? s : null;
}
export function parseDate(s, fmt) {
  s = String(s || '').trim(); if (!s) return null; let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|[ T])/))) return mk(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:$|\s)/))) { let y = +m[3]; if (y < 100) y += 2000; return fmt === 'dmy' ? mk(y, +m[2], +m[1]) : mk(y, +m[1], +m[2]); }
  if ((m = s.match(/^(\d{1,2})(?:\.|º)?[ -](?:de )?([A-Za-zÀ-ÿ]{3,10})\.?(?:[ -,]+(?:de )?)(\d{2}|\d{4})$/))) { const mo = monthOf(m[2]); let y = +m[3]; if (y < 100) y += 2000; return mo ? mk(y, mo, +m[1]) : null; }
  if ((m = s.match(/^([A-Za-zÀ-ÿ]{3,10})\.? (\d{1,2}),? (\d{4})$/))) { const mo = monthOf(m[1]); return mo ? mk(+m[3], mo, +m[2]) : null; }
  if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) return mk(+m[1], +m[2], +m[3]);
  return null;
}
export function guessDateFormat(samples) {
  let dmy = false, mdy = false;
  for (const s of samples) { const m = String(s || '').trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.]/); if (!m) continue; if (+m[1] > 12) dmy = true; if (+m[2] > 12) mdy = true; }
  return dmy && !mdy ? 'dmy' : 'mdy';
}

// ===================================================================== CSV layouts
const low = (s) => String(s || '').trim().toLowerCase();
const findCol = (h, re) => h.findIndex((x) => re.test(low(x)));
// Header names are matched loosely. Layouts marked (U) are from public descriptions, not a real export: see README.
export const LAYOUTS = {
  chaseChecking: 'Chase checking', chaseCard: 'Chase credit card', boa: 'Bank of America', wellsFargo: 'Wells Fargo',
  capitalOne: 'Capital One', amex: 'American Express', discover: 'Discover', citi: 'Citi', usBank: 'U.S. Bank',
  quickbooks: 'QuickBooks report', xero: 'Xero', generic: 'Other bank', paste: 'Pasted text',
};
const DATE_H = /^(transaction |posting |post |posted |booking |value |payment |trans\. )?date$|^date\b|\bdate$|^fecha|^datum|^data$|^date d/;
function genericCols(h) {
  const c = {
    date: findCol(h, DATE_H),
    desc: [/^description$/, /^(transaction description|memo\/description|narrative|particulars|details|concepto|descripci[oó]n|libell[eé]|omschrijving|beschreibung|verwendungszweck|movimiento|detalle|histórico|historico)$/].map((re) => findCol(h, re)).find((i) => i >= 0) ?? -1,
    vendor: findCol(h, /^(vendor|payee|name|contact|supplier|merchant|paid to|beneficiary|counterparty|beneficiario|comercio)( name)?$/),
    amount: findCol(h, /^(amount|transaction amount|value|amount \(\w{3}\)|net amount|importe|monto|montant|betrag|valor|bedrag)$/),
    debit: findCol(h, /^(debit|debits|withdrawal|withdrawals|money out|paid out|amount out|outflow|spent|payment|cargo|cargos|d[eé]bito|d[eé]bit|retiro|retiros|egreso|soll)s?( amount)?$/),
    credit: findCol(h, /^(credit|credits|deposit|deposits|money in|paid in|amount in|inflow|received|abono|abonos|cr[eé]dito|cr[eé]dit|dep[oó]sito|ingreso|haben)s?( amount)?$/),
    type: findCol(h, /^(type|transaction type|source|tipo)$/),
    check: findCol(h, /check|cheque|slip|^num$/),
    category: findCol(h, /^(category|categor[ií]a)$/),
    account: findCol(h, /^(account|split)$/),
  };
  if (c.desc < 0) c.desc = findCol(h, /description|memo|details|reference|payee|name|concepto|descrip/);
  if (c.desc === c.vendor && c.vendor >= 0) c.desc = -1;
  if (c.desc < 0 && c.vendor >= 0) { c.desc = c.vendor; c.vendor = -1; }
  if (c.amount < 0 && c.debit < 0) c.amount = findCol(h, /amount|importe|monto/);
  return c;
}
export function detectLayout(rows) {
  const out = { layout: 'generic', headerIdx: -1, header: [], cols: null, kindGuess: 'bank', sign: 'neg', dateFmt: 'mdy', needsMapping: false };
  if (!rows.length) return out;
  // Wells Fargo: no header, 5 columns: date, amount, "*", blank, description
  const wf = rows.slice(0, 5).every((r) => r.length >= 5 && parseDate(r[0], 'mdy') && !isNaN(parseAmount(r[1])) && r[2] === '*');
  if (wf) return Object.assign(out, { layout: 'wellsFargo', header: ['Date', 'Amount', '*', '', 'Description'], cols: { date: 0, amount: 1, desc: 4, vendor: -1, debit: -1, credit: -1, type: -1, check: -1, category: -1, account: -1 } });
  let hi = -1;
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const h = rows[i].map(low);
    if (h.some((x) => /date|fecha|datum|^data$/.test(x)) && h.some((x) => /amount|debit|credit|withdraw|deposit|money out|money in|paid out|importe|monto|cargo|abono|montant|betrag|valor/.test(x))) { hi = i; break; }
  }
  if (hi < 0) {
    // Headerless: guess by content (date-like column, number column, longest text column)
    const sample = rows.slice(0, 20); const w = Math.max(...sample.map((r) => r.length));
    let date = -1, amount = -1, desc = -1, best = 0;
    for (let c = 0; c < w; c++) {
      const vals = sample.map((r) => r[c] || '');
      if (date < 0 && vals.filter((v) => parseDate(v, 'mdy') || parseDate(v, 'dmy')).length >= sample.length * 0.8) { date = c; continue; }
      if (amount < 0 && vals.filter((v) => !isNaN(parseAmount(v))).length >= sample.length * 0.8) { amount = c; continue; }
      const len = vals.reduce((a, v) => a + v.length, 0); if (len > best) { best = len; desc = c; }
    }
    Object.assign(out, { header: Array.from({ length: w }, (_, i) => `Column ${i + 1}`), cols: { date, amount, desc, vendor: -1, debit: -1, credit: -1, type: -1, check: -1, category: -1, account: -1 }, needsMapping: date < 0 || amount < 0 || desc < 0, dateFmt: guessDateFormat(rows.slice(0, 50).map((r) => r[date])) });
    if (amount >= 0) { const vals = rows.slice(0, 300).map((r) => parseAmount(r[amount])).filter((v) => !isNaN(v)); out.sign = signByMajority(vals); }
    return out;
  }
  const header = rows[hi]; const h = header.map(low); const has = (re) => h.some((x) => re.test(x));
  out.headerIdx = hi; out.header = header;
  const cols = genericCols(header);
  if (has(/^details$/) && has(/^posting date$/) && has(/^description$/) && has(/^balance$/)) {
    out.layout = 'chaseChecking'; cols.type = findCol(header, /^type$/); cols.check = findCol(header, /check or slip/);
  } else if (has(/^transaction date$/) && has(/^post date$/) && has(/^description$/) && has(/^amount$/)) {
    out.layout = 'chaseCard'; out.kindGuess = 'card'; cols.date = findCol(header, /^transaction date$/); cols.type = findCol(header, /^type$/);
  } else if (has(/^transaction date$/) && has(/^posted date$/) && has(/^card no\.?$/) && has(/^debit$/)) {
    out.layout = 'capitalOne'; out.kindGuess = 'card'; out.sign = 'debit'; cols.date = findCol(header, /^transaction date$/); cols.amount = -1;
  } else if (has(/^trans\. date$/) && has(/^post date$/) && has(/^amount$/)) {
    out.layout = 'discover'; out.kindGuess = 'card'; out.sign = 'pos'; cols.date = findCol(header, /^trans\. date$/);
  } else if (has(/^date$/) && has(/^description$/) && has(/^amount$/) && (has(/^card ?member$/) || has(/^extended details$/) || has(/^appears on your statement as$/) || has(/^account #$/))) {
    out.layout = 'amex'; out.kindGuess = 'card'; out.sign = 'pos';
  } else if (has(/^status$/) && has(/^date$/) && has(/^description$/) && has(/^debit$/) && has(/^credit$/)) {
    out.layout = 'citi'; out.kindGuess = 'card'; out.sign = 'debit';
  } else if (has(/^date$/) && has(/^transaction$/) && has(/^name$/) && has(/^memo$/) && has(/^amount$/)) {
    out.layout = 'usBank'; cols.desc = findCol(header, /^name$/); cols.vendor = -1; cols.type = findCol(header, /^transaction$/);
  } else if (has(/^date$/) && has(/^description$/) && has(/^amount$/) && has(/^running bal/)) {
    out.layout = 'boa';
  } else if (has(/^transaction type$/) && has(/^amount$/)) {
    out.layout = 'quickbooks'; cols.type = findCol(header, /^transaction type$/); cols.vendor = findCol(header, /^(name|vendor|payee)$/);
    cols.desc = findCol(header, /^memo\/description$|^memo$|^description$/); cols.account = findCol(header, /^account$/); cols.check = findCol(header, /^num$/);
  } else if (has(/^source$/) && has(/^debit$/) && has(/^credit$/)) {
    out.layout = 'xero'; out.sign = 'credit'; cols.type = findCol(header, /^source$/); cols.vendor = findCol(header, /^contact$/); cols.desc = findCol(header, /^description$/);
  } else {
    out.needsMapping = !(cols.date >= 0 && cols.desc >= 0 && (cols.amount >= 0 || cols.debit >= 0));
    if (cols.amount < 0 && cols.debit >= 0) out.sign = 'debit';
    if (/card/.test(h.join(' '))) out.kindGuess = 'card';
  }
  out.cols = cols;
  const data = rows.slice(hi + 1);
  out.dateFmt = guessDateFormat(data.slice(0, 200).map((r) => r[cols.date]));
  if (out.layout === 'generic' && cols.amount >= 0 && out.sign !== 'debit') {
    out.sign = signByMajority(data.slice(0, 300).map((r) => parseAmount(r[cols.amount])).filter((v) => !isNaN(v)));
  }
  return out;
}
// Most rows in any export are money going out. Whichever sign is more common is "out".
function signByMajority(vals) {
  const neg = vals.filter((v) => v < 0).length, pos = vals.filter((v) => v > 0).length;
  return neg >= pos && neg > 0 ? 'neg' : 'pos';
}

// Turn a CSV (rows + layout) into transactions.
// t = { id, file, fileName, fileKind, layout, date, amount (>=0), dir: 'out'|'in', desc, vendorRaw, typeRaw, checkNo, category, ledgerMethod, currency }
const QB_OUT = /^(check|expense|cash expense|bill payment|bill payment \(check\)|bill payment \(credit card\)|credit card expense|cash purchase|payment)$/;
const QB_IN = /^(deposit|vendor credit|refund|credit card credit|refund receipt)$/;
const QB_SKIP = /^(bill|purchase order|journal entry|transfer|estimate|invoice|sales receipt)$/;
const XERO_OUT = /spend money|payable payment|bill payment|expense claim|payable overpayment/;
const XERO_IN = /receive money|receivable payment|receivable overpayment|refund/;
const XERO_SKIP = /invoice|manual journal|bank transfer|opening balance|credit note/;
export function toTransactions(rows, L, file) {
  const c = L.cols, out = [], skipped = { noDate: 0, noAmount: 0, other: 0 };
  let group = '';
  const data = L.headerIdx >= 0 ? rows.slice(L.headerIdx + 1) : rows;
  const flip = !!file.flip;
  data.forEach((r, i) => {
    const nonEmpty = r.filter((x) => x !== '');
    const first = (r[0] || '').trim();
    if (/^total\b|^closing balance|^opening balance|^beginning balance|^ending balance/i.test(first) || /^(opening|closing|beginning|ending) balance/i.test(r[1] || '')) { skipped.other++; return; }
    const date = parseDate(r[c.date], L.dateFmt);
    if (!date) {
      if (nonEmpty.length === 1 && first && ['quickbooks', 'xero', 'generic'].includes(L.layout)) group = first;
      else if (nonEmpty.length) skipped.noDate++;
      return;
    }
    const typeRaw = c.type >= 0 ? (r[c.type] || '') : '';
    const tl = low(typeRaw);
    let amount = NaN, dir = null;
    if (c.amount >= 0 && L.sign !== 'debit' && L.sign !== 'credit') {
      const v = parseAmount(r[c.amount]);
      if (isNaN(v)) { skipped.noAmount++; return; }
      if (v === 0) { amount = 0; dir = 'out'; } else { amount = Math.abs(v); dir = (L.sign === 'pos' ? v > 0 : v < 0) ? 'out' : 'in'; }
    } else {
      const dv = c.debit >= 0 ? parseAmount(r[c.debit]) : NaN, cv = c.credit >= 0 ? parseAmount(r[c.credit]) : NaN;
      const d0 = isNaN(dv) ? 0 : dv, c0 = isNaN(cv) ? 0 : cv;
      if (!d0 && !c0) { if (c.amount >= 0) { const v = parseAmount(r[c.amount]); if (!isNaN(v) && v) { amount = Math.abs(v); dir = v < 0 ? 'out' : 'in'; } } if (!dir) { skipped.noAmount++; return; } }
      else if (L.sign === 'credit') { if (c0) { amount = Math.abs(c0); dir = c0 > 0 ? 'out' : 'in'; } else { amount = Math.abs(d0); dir = d0 > 0 ? 'in' : 'out'; } }
      else { if (d0) { amount = Math.abs(d0); dir = d0 > 0 ? 'out' : 'in'; } else { amount = Math.abs(c0); dir = c0 > 0 ? 'in' : 'out'; } }
    }
    if (flip && amount) dir = dir === 'out' ? 'in' : 'out';
    let ledgerMethod = '';
    if (L.layout === 'quickbooks') {
      if (QB_SKIP.test(tl)) { skipped.other++; return; }
      if (QB_OUT.test(tl)) dir = 'out'; else if (QB_IN.test(tl)) dir = 'in';
      ledgerMethod = /credit card/.test(tl) ? 'card' : /check/.test(tl) ? 'check' : 'ledger';
    } else if (L.layout === 'xero') {
      if (XERO_SKIP.test(tl)) { skipped.other++; return; }
      if (XERO_OUT.test(tl)) dir = 'out'; else if (XERO_IN.test(tl)) dir = 'in';
      ledgerMethod = 'ledger';
    } else if (L.layout === 'chaseCard') {
      if (/^payment$/.test(tl)) { skipped.other++; return; } // paying the card bill
      if (/^return$/.test(tl)) dir = 'in';
    }
    const vendorRaw = c.vendor >= 0 ? (r[c.vendor] || '') : (L.layout === 'quickbooks' ? group : '');
    out.push({
      id: `${file.id}:${i}`, file: file.id, fileName: file.name, fileKind: file.kind || L.kindGuess, layout: L.layout, date,
      amount: r2(amount), dir, desc: c.desc >= 0 ? (r[c.desc] || '') : '', vendorRaw, typeRaw,
      checkNo: c.check >= 0 ? (r[c.check] || '').replace(/\D/g, '') : '', category: c.category >= 0 ? (r[c.category] || '') : '', ledgerMethod,
      currency: file.currency || 'USD',
    });
  });
  return { txns: out, skipped };
}

// ===================================================================== pasted text (PDF statements, banking apps)
// Handles three shapes, mixed freely:
//   "10/03 NETFLIX.COM 15.49"  (date, text, amount; a trailing balance is ignored)
//   "Oct 3, 2026" on its own line, then "Netflix" / "-$15.49" on the next lines (banking apps)
//   "Netflix  -15.49" under a date line
const MONEY_TOKEN = String.raw`[-+−]?\s?(?:(?:US|R|MX|CA|C|AU|A)?\$|€|£|₹|₦|₱|KSh\s?|R\s)?\s?[-−]?\d{1,3}(?:[,.  ']\d{3})*[.,]\d{2}(?:\s?(?:CR|DR))?(?:\s?(?:${ISO_LIST.join('|')}))?`;
const TRAIL_MONEY = new RegExp(`(?:^|\\s)(${MONEY_TOKEN})(?:\\s+(${MONEY_TOKEN}))?\\s*$`);
const ONLY_MONEY = new RegExp(`^(${MONEY_TOKEN})$`);
const MONTH_W = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|ene|abr|ago|dic)[a-zé]*\\.?';
const LEAD_DATE = new RegExp(`^(?:(?:mon|tue|wed|thu|fri|sat|sun|lun|mar|mi[eé]|jue|vie|s[aá]b|dom)[a-z]*\\.?,?\\s+)?(\\d{4}-\\d{1,2}-\\d{1,2}|\\d{1,2}[/.-]\\d{1,2}(?:[/.-]\\d{2,4})?|${MONTH_W}\\s+\\d{1,2}(?:,?\\s+\\d{4})?|\\d{1,2}(?:\\s+de)?\\s+${MONTH_W}(?:(?:\\s+de)?,?\\s+\\d{4})?)(?=\\s|$|,)`, 'i');
const IN_WORDS = /\b(DEPOSIT|DIRECT DEP|PAYROLL|SALARY|REFUND|REVERSAL|CREDIT(?! CARD)|PAYMENT RECEIVED|INTEREST PAID|CASHBACK|CASH BACK|TRANSFER FROM|RECEIVED|DEP[OÓ]SITO|ABONO|REEMBOLSO|N[OÓ]MINA)\b/i;
const SKIP_LINE = /^(date|fecha|description|descripci[oó]n|amount|importe|balance|saldo|total|subtotal|page \d|p[aá]gina|beginning balance|ending balance|opening balance|closing balance|statement|account number|pending|posted|pendiente|today's balance)\b/i;
export function parseText(text, opts = {}) {
  const today = opts.today || todayLocal();
  const ty = +today.slice(0, 4);
  const lines = String(text || '').replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const years = [...String(text).matchAll(/\b(20\d{2})\b/g)].map((m) => +m[1]).filter((y) => y <= ty + 1);
  const baseYear = years.length ? Math.max(...years.filter((y) => y <= ty), ...(years.every((y) => y > ty) ? years : [])) : ty;
  const fmt = guessDateFormat(lines.map((l) => (l.match(/^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/) || [''])[0]));
  const dmyHint = fmt === 'dmy' || opts.dateFmt === 'dmy';
  function toDate(raw) {
    let s = raw.trim().replace(/,$/, '');
    let d = parseDate(s, dmyHint ? 'dmy' : 'mdy') || parseDate(s.replace(/,/g, ''), dmyHint ? 'dmy' : 'mdy');
    if (d) return d;
    let m;
    if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})$/))) d = dmyHint ? mk(baseYear, +m[2], +m[1]) : mk(baseYear, +m[1], +m[2]);
    else if ((m = s.match(new RegExp(`^(${MONTH_W})\\s+(\\d{1,2})$`, 'i')))) { const mo = monthOf(m[1]); d = mo && mk(baseYear, mo, +m[2]); }
    else if ((m = s.match(new RegExp(`^(\\d{1,2})(?:\\s+de)?\\s+(${MONTH_W})$`, 'i')))) { const mo = monthOf(m[2]); d = mo && mk(baseYear, mo, +m[1]); }
    else if ((m = s.match(new RegExp(`^(${MONTH_W})\\s+(\\d{1,2}),?\\s+(\\d{4})$`, 'i')))) { const mo = monthOf(m[1]); d = mo && mk(+m[3], mo, +m[2]); }
    else if ((m = s.match(new RegExp(`^(\\d{1,2})(?:\\s+de)?\\s+(${MONTH_W})(?:\\s+de)?,?\\s+(\\d{4})$`, 'i')))) { const mo = monthOf(m[2]); d = mo && mk(+m[3], mo, +m[1]); }
    if (!d) return null;
    if (d > addDays(today, 3) && !/\d{4}/.test(s)) d = mk(+d.slice(0, 4) - 1, +d.slice(5, 7), +d.slice(8, 10)) || d;
    return d;
  }
  const raw = []; let curDate = null, pending = null;
  const push = (date, desc, tok) => {
    desc = desc.replace(/\s+[-–]\s*$/, '').trim();
    if (!date || !desc || /^[\d\s.,/-]+$/.test(desc)) return;
    const cr = /CR\b/i.test(tok), dr = /DR\b/i.test(tok);
    const v = parseAmount(tok.replace(/\s?(CR|DR)\b/i, ''));
    if (isNaN(v)) return;
    raw.push({ date, desc, v, explicit: /^[-+−]|[-−]\d|\(/.test(tok.trim()) || cr || dr, cr, plus: /^\+/.test(tok.trim()) });
  };
  for (const line of lines) {
    if (SKIP_LINE.test(line)) { pending = null; continue; } // headers, totals, balances, page numbers
    if (/^(today|hoy)$/i.test(line)) { curDate = today; pending = null; continue; }
    if (/^(yesterday|ayer)$/i.test(line)) { curDate = addDays(today, -1); pending = null; continue; }
    if (pending && curDate && ONLY_MONEY.test(line)) { push(curDate, pending, line); pending = null; continue; }
    const dm = line.match(LEAD_DATE);
    let rest = line, date = null;
    if (dm) { date = toDate(dm[1]); if (date) rest = line.slice(dm[0].length).trim(); }
    // a second date right after the first (transaction date + posting date)
    if (date) { const d2 = rest.match(LEAD_DATE); if (d2 && toDate(d2[1])) rest = rest.slice(d2[0].length).trim(); }
    if (date && !rest) { curDate = date; pending = null; continue; }
    const om = rest.match(ONLY_MONEY);
    if (om && !date) { if (pending && curDate) { push(curDate, pending, om[1]); pending = null; } continue; }
    const tm = rest.match(TRAIL_MONEY);
    if (tm) {
      const desc = rest.slice(0, tm.index).trim();
      const d = date || curDate;
      if (date) curDate = date;
      if (desc) push(d, desc, tm[1]); else if (pending && d) { push(d, pending, tm[1]); }
      pending = null; continue;
    }
    if (date) { curDate = date; pending = rest; continue; }
    if (/[A-Za-z]/.test(rest)) pending = rest;
  }
  // Direction: an explicit sign, CR, or words like "deposit"/"refund"; otherwise, the more common sign is "out".
  const signed = raw.filter((r) => r.explicit && !r.cr);
  const negs = signed.filter((r) => r.v < 0).length, poss = raw.filter((r) => r.v > 0 && r.plus).length;
  const negIsOut = negs > 0 && negs >= poss;
  const txns = raw.map((r, i) => {
    let dir;
    if (r.cr) dir = 'in';
    else if (negIsOut) dir = r.v < 0 ? 'out' : (r.plus || IN_WORDS.test(r.desc) ? 'in' : (negs > raw.length / 2 ? 'in' : 'out'));
    else dir = r.plus || r.v < 0 || IN_WORDS.test(r.desc) ? 'in' : 'out';
    return { id: `${opts.id || 'p'}:${i}`, file: opts.id || 'p', fileName: opts.name || 'Pasted text', fileKind: 'bank', layout: 'paste', date: r.date, amount: r2(Math.abs(r.v)), dir, desc: r.desc, vendorRaw: '', typeRaw: '', checkNo: '', category: '', ledgerMethod: '', currency: opts.currency || 'USD' };
  });
  return { txns, skipped: { noDate: 0, noAmount: 0, other: 0 } };
}

// One entry point for any file or paste. Returns the parsed transactions plus what we detected.
// opts: { id, name, today, currency (fallback), flip, layout overrides }
export function parseInput(text, opts = {}) {
  const name = opts.name || 'file';
  const cur = detectCurrency(text) || opts.currency || 'USD';
  const looksCSV = /\.(csv|tsv)$/i.test(name) || (!opts.paste && (() => { const ls = String(text).split(/\r?\n/).filter((l) => l.trim()).slice(0, 10); const d = sniffDelimiter(String(text)); return ls.length >= 2 && ls.filter((l) => l.split(d).length >= 3).length >= ls.length * 0.7; })());
  if (looksCSV) {
    const rows = parseCSV(text); const L = detectLayout(rows);
    if (opts.dateFmt) L.dateFmt = opts.dateFmt;
    const file = { id: opts.id || 'f1', name, kind: L.kindGuess, currency: cur, flip: opts.flip };
    const res = L.needsMapping ? { txns: [], skipped: {} } : toTransactions(rows, L, file);
    if (res.txns.length >= 3 || !L.needsMapping) return { kind: 'csv', layout: L.layout, L, rows, txns: res.txns, skipped: res.skipped, currency: cur, needsMapping: L.needsMapping };
  }
  const res = parseText(text, { id: opts.id, name, today: opts.today, currency: cur, dateFmt: opts.dateFmt });
  if (opts.flip) res.txns.forEach((t) => { if (t.amount) t.dir = t.dir === 'out' ? 'in' : 'out'; });
  return { kind: 'text', layout: 'paste', txns: res.txns, skipped: res.skipped, currency: cur, needsMapping: false };
}

// ===================================================================== consumer merchant list
// pattern | display name | category | flags
//   flags: b = a bill (phone, internet, utilities, insurance, housing, loans), g = everyday purchases (never a subscription),
//   n:<kind> = not spending (income, transfer, cardpay, tax), d:<group> = "you may only need one", k:<guide> = cancel guide.
// Category codes and guide ids are translated in i18n.mjs. Merchant names are statement labels only (fictional prices in tests).
const DICT_SRC = String.raw`
PAYROLL|DIRECT DEP|DIR DEP|\bPAYCHECK\b|\bSALARY\b|N[OÓ]MINA|Paycheck|other|n:income
\bIRS\b|USATAXPYMT|US TREASURY|TREAS TAX|TAX PYMT|DEPT OF REVENUE|FRANCHISE TAX|Tax payment|other|n:tax
CREDIT CRD AUTOPAY|CRD AUTOPAY|CARD SERVICES PAYMENT|AMEX EPAYMENT|AMERICAN EXPRESS ACH PMT|CAPITAL ONE (ONLINE |MOBILE )?(PMT|PYMT|PAYMENT)|CITI (AUTOPAY|CARD ONLINE)|DISCOVER (E-PAYMENT|DC PYMNT)|AUTOMATIC PAYMENT - THANK|AUTOPAY PAYMENT|PAYMENT THANK YOU|ONLINE PAYMENT,? THANK|MOBILE PAYMENT - THANK|BK OF AMER VISA|WF CREDIT CARD|Card bill payment|other|n:cardpay
TRANSFER TO|TRANSFER FROM|ONLINE TRANSFER|\bXFER\b|TO SAV|TO CHK|TRANSFERENCIA PROPIA|Transfer between accounts|other|n:transfer
\bMORTGAGE\b|HOME LOAN|ROCKET MORTGAGE|MR\.? COOPER|Mortgage|house|b k:contract x
AUTO LOAN|CAR LOAN|AUTO PMT|AUTO FINANCE|TOYOTA FIN|HONDA FIN|ALLY (AUTO|PAYMT|PAYMENT)|Car loan|house|b k:contract x
STUDENT LOAN|NAVIENT|NELNET|MOHELA|AIDVANTAGE|Student loan|house|b k:contract x
\bRENT\b|APARTMENTS|PROPERTY MGMT|Rent|house|b k:contract x
APPLE\.COM ?\/? ?BILL|APPLE COM BILL|ITUNES\.COM|Apple (App Store and iCloud)|apps|k:appstore
GOOGLE ?\*? ?YOUTUBE ?TV|YOUTUBE TV|YouTube TV|stream|d:livetv
GOOGLE ?\*? ?YOUTUBE ?(PREMIUM|MUSIC)|YOUTUBEPREMIUM|YOUTUBE PREMIUM|YouTube Premium|music|d:music
GOOGLE ?\*? ?(GOOGLE ?)?ONE|GOOGLE STORAGE|Google One|apps|d:cloud
GOOGLE ?\*? ?FI\b|GOOGLE FI|Google Fi|phone|b k:phone
GOOGLE ?\*? ?(PLAY|GOOGLE PLAY)|GOOGLE PLAY|Google Play|apps|k:appstore
AMAZON PRIME|PRIME VIDEO|AMZN PRIME|PRIME MEMBERSHIP|Amazon Prime|member|k:membership
AMAZON MUSIC|AMZN MUSIC|Amazon Music|music|d:music
AUDIBLE|Audible|news|
KINDLE UNLTD|KINDLE UNLIMITED|Kindle Unlimited|news|
NETFLIX|Netflix|stream|
HULU ?\+? ?LIVE|HULU LIVE|Hulu + Live TV|stream|d:livetv
\bHULU\b|Hulu|stream|
DISNEY ?(PLUS|\+)|DISNEYPLUS|Disney+|stream|
\bHBO ?MAX\b|\bMAX\.COM\b|HBOMAX|Max|stream|
PEACOCK|Peacock|stream|
PARAMOUNT ?(PLUS|\+)|PARAMOUNTPLUS|CBS ALL ACCESS|Paramount+|stream|
APPLE ?TV|Apple TV|stream|
CRUNCHYROLL|Crunchyroll|stream|
ESPN ?(PLUS|\+)|ESPN\+|ESPN+|stream|
\bDAZN\b|DAZN|stream|
\bSTARZ\b|Starz|stream|
SHOWTIME|Showtime|stream|
AMC ?(PLUS|\+)|AMC+|stream|
DISCOVERY ?(PLUS|\+)|Discovery+|stream|
BRITBOX|BritBox|stream|
\bPHILO\b|Philo|stream|d:livetv
SLING ?TV|\bSLING\b|Sling TV|stream|d:livetv
FUBO|fuboTV|stream|d:livetv
DIRECTV|DirecTV|stream|b d:livetv
DISH NETWORK|\bDISH\b|DISH|stream|b d:livetv
SPOTIFY|Spotify|music|d:music
APPLE ?MUSIC|Apple Music|music|d:music
PANDORA|Pandora|music|d:music
SIRIUS ?XM|SIRIUSXM|SiriusXM|music|
\bTIDAL\b|Tidal|music|d:music
DEEZER|Deezer|music|d:music
MICROSOFT ?\*? ?XBOX|XBOX|Xbox|game|
PLAYSTATION|SONY INTERACTIVE|\bPSN\b|PlayStation|game|
NINTENDO|Nintendo|game|
EA \*? ?PLAY|EA Play|game|
TWITCH|Twitch|game|
DISCORD|Discord|game|
MICROSOFT ?\*? ?(365|OFFICE)|MSFT ?\*|MICROSOFT|Microsoft 365|apps|d:office
ADOBE|Adobe|apps|
CANVA|Canva|apps|
DROPBOX|Dropbox|apps|d:cloud
OPENAI|CHATGPT|ChatGPT|apps|d:ai
CLAUDE\.AI|ANTHROPIC|Claude|apps|d:ai
PERPLEXITY|Perplexity|apps|d:ai
GRAMMARLY|Grammarly|apps|
EVERNOTE|Evernote|apps|
\bNOTION\b|Notion|apps|
LIFE360|Life360|apps|
DUOLINGO|Duolingo|learn|d:language
BABBEL|Babbel|learn|d:language
ROSETTA ?STONE|Rosetta Stone|learn|d:language
MASTERCLASS|MasterClass|learn|
COURSERA|Coursera|learn|
SKILLSHARE|Skillshare|learn|
CHEGG|Chegg|learn|
HEADSPACE|Headspace|fit|d:meditation
\bCALM\.COM\b|CALM APP|\bCALM\b|Calm|fit|d:meditation
NYTIMES|NY TIMES|NEW YORK TIMES|The New York Times|news|
\bWSJ\b|DOW JONES|Wall Street Journal|news|
WASHINGTON ?POST|WASHPOST|The Washington Post|news|
THE ATLANTIC|The Atlantic|news|
ECONOMIST|The Economist|news|
MEDIUM\.COM|MEDIUM CORP|Medium|news|
SUBSTACK|Substack|news|
PATREON|Patreon|news|
SCRIBD|EVERAND|Everand|news|
TINDER|Tinder|dating|d:dating
BUMBLE|Bumble|dating|d:dating
HINGE|Hinge|dating|d:dating
MATCH\.COM|MATCH GROUP|Match|dating|d:dating
LINKEDIN|LinkedIn|apps|
PLANET FITNESS|PLANET FIT|Planet Fitness|fit|d:gym k:gym
LA FITNESS|LA Fitness|fit|d:gym k:gym
24 ?HOUR FITNESS|24 Hour Fitness|fit|d:gym k:gym
ANYTIME FITNESS|Anytime Fitness|fit|d:gym k:gym
CRUNCH FITNESS|CRUNCH GYM|Crunch Fitness|fit|d:gym k:gym
EQUINOX|Equinox|fit|d:gym k:gym
ORANGETHEORY|\bOTF\b|Orangetheory|fit|d:gym k:gym
\bYMCA\b|YMCA|fit|d:gym k:gym
LIFE TIME FIT|LIFETIME FITNESS|Life Time|fit|d:gym k:gym
\bGYM\b|FITNESS CLUB|GIMNASIO|Gym|fit|d:gym k:gym x
PELOTON|Peloton|fit|
CLASSPASS|ClassPass|fit|
STRAVA|Strava|fit|
\bNOOM\b|Noom|fit|
WEIGHTWATCHERS|WW INTERNATIONAL|\bWW\b|WW|fit|
MYFITNESSPAL|MyFitnessPal|fit|
BEACHBODY|Beachbody|fit|
NORDVPN|NORDSEC|NordVPN|sec|d:vpn
EXPRESSVPN|ExpressVPN|sec|d:vpn
SURFSHARK|Surfshark|sec|d:vpn
PROTON ?(VPN|AG)|Proton|sec|d:vpn
NORTON|GEN DIGITAL|Norton|sec|d:antivirus
MCAFEE|McAfee|sec|d:antivirus
LIFELOCK|LifeLock|sec|d:idprotect
\bAURA\b|Aura|sec|d:idprotect
IDENTITY ?GUARD|IdentityGuard|sec|d:idprotect
EXPERIAN|Experian|sec|d:idprotect
1PASSWORD|1Password|sec|d:password
LASTPASS|LastPass|sec|d:password
DASHLANE|Dashlane|sec|d:password
BITWARDEN|Bitwarden|sec|d:password
\bADT\b|ADT|sec|b d:alarm k:contract
SIMPLISAFE|SimpliSafe|sec|d:alarm
RING\.COM|RING (YEARLY|MONTHLY|PROTECT)|\bRING LLC\b|Ring|sec|d:alarm
VIVINT|Vivint|sec|b d:alarm k:contract
WALMART ?\+|WALMART PLUS|WMT PLUS|Walmart+|member|k:membership
COSTCO ?\*? ?MEMBER|COSTCO MEMBERSHIP|Costco membership|member|d:warehouse k:membership
SAM ?S CLUB MEMBER|SAMS CLUB MEMBERSHIP|Sam's Club membership|member|d:warehouse k:membership
BJ ?S MEMBER|BJ's membership|member|d:warehouse k:membership
DASHPASS|DOORDASH DASHPASS|DashPass|member|d:delivery k:membership
UBER ?ONE|UBER \*ONE|Uber One|member|d:delivery k:membership
GRUBHUB ?\+|GRUBHUB PLUS|Grubhub+|member|d:delivery k:membership
INSTACART ?\+|INSTACART PLUS|INSTACART MEMBERSHIP|Instacart+|member|d:delivery k:membership
SHIPT|Shipt|member|d:delivery k:membership
HELLO ?FRESH|HelloFresh|box|d:mealkit k:membership
HOME ?CHEF|Home Chef|box|d:mealkit k:membership
BLUE ?APRON|Blue Apron|box|d:mealkit k:membership
FACTOR ?75|FACTOR MEALS|\bFACTOR\b|Factor|box|d:mealkit k:membership
EVERYPLATE|EveryPlate|box|d:mealkit k:membership
GREEN ?CHEF|Green Chef|box|d:mealkit k:membership
DOLLAR ?SHAVE|Dollar Shave Club|box|k:membership
BARKBOX|BarkBox|box|k:membership
\bIPSY\b|Ipsy|box|k:membership
FABFITFUN|FabFitFun|box|k:membership
STITCH ?FIX|Stitch Fix|box|k:membership
BUTCHER ?BOX|ButcherBox|box|k:membership
THRIVE ?MARKET|Thrive Market|box|k:membership
VERIZON ?FIOS|\bFIOS\b|Verizon Fios|net|b d:internet k:phone
VERIZON|VZWRLSS|VZW|Verizon|phone|b k:phone
AT ?& ?T|\bATT\b|AT&T|phone|b k:phone
T-MOBILE|TMOBILE|T MOBILE|T-Mobile|phone|b k:phone
MINT MOBILE|Mint Mobile|phone|b k:phone
VISIBLE|Visible|phone|b k:phone
CRICKET|Cricket|phone|b k:phone
METRO ?BY ?T|METROPCS|Metro|phone|b k:phone
BOOST MOBILE|Boost Mobile|phone|b k:phone
CONSUMER CELLULAR|Consumer Cellular|phone|b k:phone
STRAIGHT ?TALK|TRACFONE|Straight Talk|phone|b k:phone
COMCAST|XFINITY|Xfinity|net|b d:internet k:phone
\bSPECTRUM\b(?! ?(DENTAL|HEALTH|MEDICAL))|CHARTER COMM|Spectrum|net|b d:internet k:phone
COX COMM|\bCOX\b|Cox|net|b d:internet k:phone
OPTIMUM|ALTICE|Optimum|net|b d:internet k:phone
FRONTIER COMM|\bFRONTIER\b|Frontier|net|b d:internet k:phone
CENTURYLINK|LUMEN|CenturyLink|net|b d:internet k:phone
STARLINK|Starlink|net|b d:internet k:phone
PG ?& ?E|PGANDE|PG&E|home|b k:utility
\bCON ?ED(ISON)?\b|Con Edison|home|b k:utility
DUKE ENERGY|Duke Energy|home|b k:utility
\bFPL\b|FLORIDA POWER|FPL|home|b k:utility
XCEL ENERGY|Xcel Energy|home|b k:utility
DOMINION ENERGY|Dominion Energy|home|b k:utility
NATIONAL GRID|National Grid|home|b k:utility
\bCOMED\b|ComEd|home|b k:utility
GEORGIA POWER|Georgia Power|home|b k:utility
SO ?CAL ?EDISON|\bSCE\b|SoCal Edison|home|b k:utility
SOCALGAS|SO CAL GAS|SoCalGas|home|b k:utility
ATMOS ENERGY|Atmos Energy|home|b k:utility
WATER (UTIL|DEPT|BILL|DISTRICT|SERVICE)|CITY OF .{1,30} (WATER|UTILIT)|Water bill|home|b k:utility x
WASTE MANAGEMENT|WM\.COM|REPUBLIC SERVICES|Trash service|home|b k:utility x
ELECTRIC (CO|COMPANY|COOP)|ENERGY CO|POWER CO|Electric bill|home|b k:utility x
GEICO|GEICO|ins|b k:insurance
STATE FARM|State Farm|ins|b k:insurance
PROGRESSIVE|Progressive|ins|b k:insurance
ALLSTATE|Allstate|ins|b k:insurance
LIBERTY MUTUAL|Liberty Mutual|ins|b k:insurance
NATIONWIDE|Nationwide|ins|b k:insurance
FARMERS INS|Farmers Insurance|ins|b k:insurance
USAA (P&C|INS|PC)|USAA Insurance|ins|b k:insurance
LEMONADE|Lemonade|ins|b k:insurance
ROOT INS|Root Insurance|ins|b k:insurance
TRAVELERS|Travelers|ins|b k:insurance
TRUPANION|Trupanion|ins|b k:insurance
AMAZON|AMZN|Amazon|shop|g
WAL-?MART|WALMART|WM SUPERCENTER|Walmart|shop|g
\bTARGET\b|Target|shop|g
COSTCO|Costco|shop|g
SAM ?S CLUB|SAMSCLUB|Sam's Club|shop|g
KROGER|SAFEWAY|PUBLIX|WHOLE ?FOODS|WHOLEFDS|TRADER JOE|\bALDI\b|\bH-?E-?B\b|WEGMANS|ALBERTSONS|FOOD LION|GIANT EAGLE|MEIJER|Groceries|shop|g
STARBUCKS|DUNKIN|MCDONALD|CHIPOTLE|CHICK-?FIL-?A|TACO BELL|SUBWAY|PANERA|DOMINO|Eating out|shop|g
\bUBER\b|\bLYFT\b|Rides|shop|g
DOORDASH|GRUBHUB|INSTACART|UBER ?EATS|Food delivery|shop|g
SHELL|EXXON|\bMOBIL\b|CHEVRON|\bBP\b|SUNOCO|MARATHON PETRO|VALERO|CIRCLE K|WAWA|QUIKTRIP|Fuel|shop|g
\bCVS\b|WALGREENS|RITE AID|Pharmacy|shop|g
HOME DEPOT|\bLOWE ?S\b|BEST BUY|IKEA|ETSY|EBAY|Shopping|shop|g
\bATM\b.*WITHDRAW|WITHDRAWAL AT|CASH WITHDRAWAL|Cash withdrawal|other|n:cash
ZELLE|VENMO|CASH ?APP|PAYPAL ?\*? ?TRANSFER|Payment app|other|
PAYPAL|PayPal|apps|`;
export const DICT = DICT_SRC.trim().split('\n').map((line) => {
  const parts = line.split('|'); const flags = parts.pop(); const cat = parts.pop(); const name = parts.pop(); const pat = parts.join('|');
  const f = (flags || '').split(/\s+/).filter(Boolean);
  const get = (p) => (f.find((x) => x.startsWith(p)) || '').slice(p.length) || null;
  return { re: new RegExp(pat), name, cat, generic: f.includes('x'), bill: f.includes('b'), purchase: f.includes('g'), notSpend: get('n:'), dup: get('d:'), guide: get('k:') };
});
export const CATEGORY_IDS = ['stream', 'music', 'apps', 'news', 'learn', 'game', 'fit', 'dating', 'sec', 'member', 'box', 'phone', 'net', 'home', 'ins', 'house', 'shop', 'other'];
const BILL_CATS = new Set(['phone', 'net', 'home', 'ins', 'house']);
const CAT_GUIDE = { phone: 'phone', net: 'phone', home: 'utility', ins: 'insurance', house: 'contract', member: 'membership', box: 'membership' };

// ===================================================================== bank fees (keyword rules)
export const FEE_RULES = [
  ['overdraft', /OVERDRAFT|\bOD (FEE|ITEM|CHARGE)|\bNSF\b|INSUFFICIENT FUNDS|RETURNED ITEM FEE|EXTENDED OVERDRAWN|OVERDRAWN (BALANCE )?FEE|SOBREGIRO/],
  ['atm', /ATM (FEE|SURCHARGE|OPERATOR FEE|WITHDRAWAL FEE|BALANCE INQUIRY FEE|CHARGE)|NON[- ]?[A-Z]* ?ATM (FEE|CHARGE)|OUT[- ]OF[- ]NETWORK ATM|ATM INTL? FEE|COMISI[OÓ]N CAJERO/],
  ['foreign', /FOREIGN (TRANSACTION|TRANS|TXN|EXCHANGE|CURRENCY|PURCHASE) (FEE|CHARGE)|INT'?L (TRANSACTION|TXN|TRANS|PURCHASE) FEE|INTERNATIONAL (TRANSACTION|PURCHASE|SERVICE) FEE|CROSS[- ]BORDER (FEE|CHARGE)|\bFX FEE|CURRENCY CONVERSION FEE|COMISI[OÓ]N (DIVISA|EXTRANJER)/],
  ['late', /LATE (PAYMENT )?(FEE|CHARGE)|PAST DUE FEE|RECARGO POR MORA/],
  ['interest', /INTEREST CHARGE|PURCHASE INTEREST|FINANCE CHARGE|INTEREST CHARGED|CASH ADVANCE INTEREST/],
  ['annual', /ANNUAL (MEMBERSHIP |CARD )?FEE|MEMBERSHIP FEE ANNUAL|CUOTA ANUAL/],
  ['maintenance', /MONTHLY (SERVICE|MAINTENANCE|ACCOUNT|MAINT) (FEE|CHARGE)|MAINTENANCE (FEE|CHARGE)|SERVICE (FEE|CHARGE)|MONTHLY FEE|ACCOUNT FEE|MINIMUM BALANCE FEE|PAPER STATEMENT FEE|COMISI[OÓ]N (DE )?MANTENIMIENTO|CUOTA DE MANEJO/],
  ['other', /WIRE (TRANSFER )?FEE|STOP PAYMENT FEE|CASH ADVANCE FEE|BALANCE TRANSFER FEE|EXCESSIVE (WITHDRAWAL|TRANSACTION) FEE|RETURNED PAYMENT FEE|\bBANK FEE\b/],
];
export function feeType(desc) {
  const s = ' ' + String(desc || '').toUpperCase().replace(/\s+/g, ' ') + ' ';
  if (/REVERS|REFUND|REEMBOLSO|WAIVE|REBATE|CREDIT ADJ/.test(s) && /FEE|CHARGE|INTEREST|COMISI/.test(s)) return { reversal: true, type: (FEE_RULES.find(([, re]) => re.test(s.replace(/REVERS\w*|REFUND\w*|WAIVE\w*/g, ''))) || ['other'])[0] };
  for (const [type, re] of FEE_RULES) if (re.test(s)) return { reversal: false, type };
  return null;
}

// ===================================================================== merchant names (from Vendor Check)
const STATES = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' ');
const KEEP_UPPER = new Set(['LLC', 'LLP', 'USA', 'US', 'UK', 'TV', 'II', 'III', 'IV', 'YMCA']);
const STOP = new Set(['LLC', 'LLP', 'INC', 'CO', 'CORP', 'CORPORATION', 'COMPANY', 'LTD', 'THE', 'AND', '&', 'OF', 'REFUND', 'RETURN', 'REVERSAL', 'PAYMENT', 'PMT', 'COM', 'WWW']);
export function titleCase(s) {
  return s.split(' ').filter(Boolean).map((w) => (KEEP_UPPER.has(w.replace(/[.,]/g, '')) ? w : w.length <= 2 && /^[A-Z&]+$/.test(w) && !/^(OF|TO|AT|IN|ON|BY)$/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase())).join(' ');
}
export function extractName(raw) {
  let s = ' ' + String(raw || '').toUpperCase().replace(/\s+/g, ' ').trim() + ' '; let m;
  if ((m = s.match(/ORIG CO NAME:\s*(.+?)\s+(ORIG ID|DESC DATE|CO ENTRY|SEC:|IND ID|IND NAME|TRN:)/))) s = ` ${m[1]} `;
  else if ((m = s.match(/(?:ZELLE|QUICKPAY)(?: PAYMENT)? (?:TO|FROM|SENT TO)\s+(.+?)(?:\s+(?:JPM\w*|BAC\w*|WFCT\w*|CONF(?:IRMATION)?\s*#?\s*\S+|REF\s*#?\s*\S+|ON \d{1,2}\/\d{1,2}.*|FOR .*)|\s*$)/))) s = ` ${m[1]} `;
  else if ((m = s.match(/ZELLE TRANSFER CONF#?\s*\S+;?\s*(.+)$/))) { const n = m[1].trim(); const pr = n.split(/\s*,\s*/); s = ` ${pr.length === 2 ? pr[1] + ' ' + pr[0] : n} `; }
  else if ((m = s.match(/BILL PAY\s+(.+?)\s+(?:ON-LINE|ONLINE|RECURRING|XXXX|ON \d)/))) s = ` ${m[1]} `;
  else if ((m = s.match(/\b(?:PAYPAL|PP)\s*\*\s*(.+)$/))) s = ` ${m[1]} `;
  else if ((m = s.match(/\bSQ\s*\*\s*(.+)$/))) s = ` ${m[1]} `;
  else if ((m = s.match(/^\s*(.+?)\s+DES:.*$/))) s = ` ${m[1]} `;
  s = s.replace(/PURCHASE AUTHORIZED ON \d{1,2}\/\d{1,2}/g, ' ').replace(/\bRECURRING PAYMENT AUTHORIZED ON \d{1,2}\/\d{1,2}/g, ' ');
  s = s.replace(/\b(PPD|CCD|WEB|TEL|IAT)\s*ID:?\s*\S+/g, ' ').replace(/\b(CONF|REF|TRACE|TRN|ID)\s*#?:?\s*\S*\d\S*/g, ' ').replace(/\bCARD\s*\d{4}\b/g, ' ').replace(/\bX{2,}\d+\b/gi, ' ');
  s = s.replace(/https?:\S+/g, ' ').replace(/\S+@\S+/g, ' ').replace(/\b\d{3}[-.]\d{3}[-.]\d{4}\b/g, ' ').replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, ' ').replace(/\b\d{1,2}-\d{1,2}\b/g, ' ');
  s = s.replace(/#\s*\d+/g, ' ').replace(/\*/g, ' ').replace(/\b[A-Z]*\d[A-Z\d-]{3,}\b/g, ' ').replace(/\b\d+\b/g, ' ');
  let prefix = true;
  while (prefix) {
    prefix = false; const t = s.trim();
    const p = t.match(/^(POS|ACH|DEBIT|CREDIT|CARD|PURCHASE|RECURRING|CHECKCARD|CHECK CARD|VISA|DBT|CRD|ONLINE|ELECTRONIC|PREAUTHORIZED|EXTERNAL|WITHDRAWAL|PAYMENT TO|PMT TO|BILL PAYMENT|BILLPAY|MOBILE|COMPRA|PAGO)\b\s*/);
    if (p) { s = ' ' + t.slice(p[0].length) + ' '; prefix = true; }
  }
  s = s.replace(/[^A-Z0-9&'.\-+ ÀÁÉÍÓÚÑÜ]/g, ' ').replace(/\s+/g, ' ').trim();
  const w = s.split(' ');
  if (w.length >= 3 && STATES.includes(w[w.length - 1]) && !/^(INC|LLC|CO|CORP|LTD)$/.test(w[w.length - 2])) w.pop();
  return w.join(' ').replace(/[.\-']+$/, '').trim();
}
export function payeeKey(name) {
  const toks = String(name || '').toUpperCase().replace(/[^A-Z0-9& ]/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t));
  return toks.slice(0, 3).sort().join(' ');
}
export function lookupDict(raw) {
  const s = ' ' + String(raw || '').toUpperCase().replace(/\s+/g, ' ') + ' ';
  for (const e of DICT) if (e.re.test(s)) return e;
  return null;
}
export function enrich(t) {
  const raw = t.vendorRaw || t.desc;
  const fee = feeType(t.desc);
  let d = fee ? null : lookupDict(raw) || (t.vendorRaw ? lookupDict(t.desc) : null);
  if (d && d.name === 'Payment app') d = null; // Zelle/Venmo: the person's name is the merchant
  // Catch-all entries (any gym, any landlord) give the category; the name and grouping come from the statement.
  const generic = d && d.generic;
  let name = d && !generic ? d.name : (t.vendorRaw ? t.vendorRaw.trim() : '');
  let unnamedCheck = false;
  if (!name) {
    const ex = extractName(t.desc);
    if (/^\s*(CHECK|CHK)\b/i.test(t.desc) && (!ex || /^(CHECK|CHK)( PAID)?$/.test(ex))) { unnamedCheck = true; name = `Check ${t.checkNo || (String(t.desc).match(/\d{3,}/) || [''])[0]}`.trim(); }
    else name = ex ? titleCase(ex) : (titleCase(String(t.desc).toUpperCase().trim()) || 'Unknown');
  } else if (!d) name = /[a-z]/.test(name) ? name : titleCase(name.toUpperCase());
  const cat = fee ? 'fee' : d ? d.cat : 'other';
  return Object.assign(t, {
    payee: name, key: unnamedCheck ? `check:${t.id}` : d && !generic ? `v:${d.name}` : payeeKey(name) || name.toUpperCase(), unnamedCheck,
    dict: d ? d.name : null, cat, bill: !!(d && (d.bill || BILL_CATS.has(d.cat))), purchase: !!(d && d.purchase), notSpend: d ? d.notSpend : null,
    dupGroup: d ? d.dup : null, guide: d ? (d.guide || CAT_GUIDE[d.cat] || 'online') : 'online',
    fee: fee && !fee.reversal ? fee.type : null, feeReversal: fee && fee.reversal ? fee.type : null,
  });
}

// Same charge in two files (e.g. the same card in two exports): same merchant, same amount, within 3 days.
export function markCrossFileDuplicates(txns) {
  const out = txns.filter((t) => t.dir === 'out'); let n = 0;
  const byKey = {}; out.forEach((t) => { (byKey[t.key + '|' + t.currency] = byKey[t.key + '|' + t.currency] || []).push(t); });
  Object.values(byKey).forEach((list) => {
    list.sort((a, b) => (a.date < b.date ? -1 : 1));
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (daysBetween(a.date, b.date) > 3) break;
      if (a.file !== b.file && !a.crossDupOf && !b.crossDupOf && Math.abs(a.amount - b.amount) < 0.005) { b.crossDupOf = a.id; n++; }
    }
  });
  return n;
}

// ===================================================================== recurring charges (from Vendor Check, extended)
export const CADENCES = { weekly: { lo: 6, hi: 8, days: 7, perYear: 52 }, monthly: { lo: 26, hi: 35, days: 30.4, perYear: 12 }, quarterly: { lo: 85, hi: 97, days: 91, perYear: 4 }, annual: { lo: 350, hi: 380, days: 365, perYear: 1 } };
const nextOf = (date, cad) => (cad === 'weekly' ? addDays(date, 7) : cad === 'monthly' ? addMonths(date, 1) : cad === 'quarterly' ? addMonths(date, 3) : addMonths(date, 12));
export function cadenceOf(ch) {
  if (ch.length < 2) return null;
  const gaps = []; for (let i = 1; i < ch.length; i++) gaps.push(daysBetween(ch[i - 1].date, ch[i].date));
  const sorted = [...gaps].sort((a, b) => a - b); const med = sorted[Math.floor(sorted.length / 2)];
  for (const [name, c] of Object.entries(CADENCES)) {
    if (med < c.lo || med > c.hi) continue;
    if (name !== 'annual' && ch.length < 3) return null;
    const ok = gaps.filter((g) => (g >= c.lo && g <= c.hi) || (name !== 'annual' && g >= c.lo * 2 && g <= c.hi * 2)).length;
    if (ok / gaps.length >= 0.75) return name;
  }
  return null;
}
export function amountsOk(amts) {
  let anchor = amts[0], steps = 0;
  for (const a of amts) { if (Math.abs(a - anchor) / anchor <= 0.15) continue; if (a > anchor) { anchor = a; steps++; } else return false; }
  return steps <= 2;
}
function seriesFrom(charges) {
  const cad = cadenceOf(charges); if (!cad) return null;
  if (!amountsOk(charges.map((c) => c.amount))) return null;
  return cad;
}
const r4 = (x) => Math.round(x * 10000) / 10000;
// txns: all enriched transactions. opts: { today, dataEnd, marks: { [seriesId]: { status, date } } }
export function findRecurring(txns, opts = {}) {
  const today = opts.today || todayLocal(); const marks = opts.marks || {};
  const pool = txns.filter((t) => t.dir === 'out' && !t.notSpend && !t.fee && !t.purchase && !t.unnamedCheck && !t.crossDupOf);
  const dataEnd = opts.dataEnd || txns.reduce((m, t) => (t.date > m ? t.date : m), '0000-00-00');
  const groups = {}; pool.forEach((t) => { const g = t.key + '|' + t.currency; (groups[g] = groups[g] || []).push(t); });
  const series = [], doubles = [];
  for (const [gk, all] of Object.entries(groups)) {
    all.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const tiny = all.filter((t) => t.amount <= 1.0); const list = all.filter((t) => t.amount > 1.0);
    // possible double charges: same merchant, same amount (within 2%), within 5 days
    const dupIds = new Set(); const dbl = [];
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i];
      if (daysBetween(a.date, b.date) <= 5 && Math.abs(a.amount - b.amount) <= 0.02 * Math.max(a.amount, b.amount) && !dupIds.has(a.id)) { dupIds.add(b.id); dbl.push({ key: gk, name: a.payee, a, b, currency: a.currency, amount: b.amount }); }
    }
    const clean = list.filter((t) => !dupIds.has(t.id));
    const found = [];
    const knownBill = clean.length && clean[0].bill && clean[0].dict;
    const whole = seriesFrom(clean) || (knownBill && cadenceOf(clean) ? cadenceOf(clean) : null);
    if (whole) found.push({ cad: whole, charges: clean, variable: !amountsOk(clean.map((c) => c.amount)) });
    else {
      // Same merchant on two accounts (e.g. two Spotify plans): try each file on its own first.
      const files = [...new Set(clean.map((t) => t.file))];
      if (files.length > 1) for (const fid of files) { const ch = clean.filter((t) => t.file === fid); const cad = seriesFrom(ch); if (cad) found.push({ cad, charges: ch, split: fid }); }
      if (!found.length) {
        const byAmt = [...clean].sort((a, b) => a.amount - b.amount); const clusters = [];
        for (const t of byAmt) { const c = clusters.find((k) => Math.abs(t.amount - k.anchor) / k.anchor <= 0.15); if (c) c.items.push(t); else clusters.push({ anchor: t.amount, items: [t] }); }
        for (const c of clusters) { const ch = c.items.sort((a, b) => (a.date < b.date ? -1 : 1)); const cad = seriesFrom(ch); if (cad) found.push({ cad, charges: ch }); }
      }
    }
    // Only flag a double charge for something that recurs or is a known subscription (not a second coffee).
    if (found.length || (all[0].dict && !all[0].purchase)) doubles.push(...dbl);
    for (const f of found) {
      const ch = f.charges, cad = CADENCES[f.cad]; const first = ch[0], last = ch[ch.length - 1];
      const changePct = r4((last.amount - first.amount) / first.amount);
      let stepDate = null, stepFrom = null, stepIdx = -1;
      for (let i = ch.length - 1; i > 0; i--) { if (ch[i].amount > ch[i - 1].amount * 1.01) { stepDate = ch[i].date; stepFrom = ch[i - 1].amount; stepIdx = i; break; } }
      const yearAgo = addDays(last.date, -365); let yoy = null;
      const ly = ch.filter((c) => Math.abs(daysBetween(c.date, yearAgo)) <= 20 && c !== last); if (ly.length) yoy = r4((last.amount - ly[ly.length - 1].amount) / ly[ly.length - 1].amount);
      const pct = Math.max(changePct, yoy == null ? -Infinity : yoy);
      // Intro price ended: the first few charges were much lower (at most 60% of today's price).
      const firstFull = ch.findIndex((c) => c.amount > first.amount * 1.15);
      const intro = firstFull > 0 && firstFull <= 3 && first.amount <= 0.6 * last.amount ? { from: first.amount, date: ch[firstFull].date, n: firstFull } : null;
      let flag = f.variable ? null : pct >= 0.15 ? 'red' : pct >= 0.05 ? 'amber' : null;
      const before = stepFrom ?? first.amount;
      let increaseYearly = flag ? r2((last.amount - before) * cad.perYear) : 0;
      if (intro && (stepIdx === firstFull || stepIdx < 0)) { flag = null; increaseYearly = 0; }
      let next = nextOf(last.date, f.cad);
      const stopped = daysBetween(last.date, dataEnd) > cad.days * 1.5 + 5;
      if (!stopped) { let guard = 0; while (next < today && guard++ < 60) next = nextOf(next, f.cad); }
      const lastN = ch.slice(-12).map((c) => c.amount);
      const flat = Math.max(...lastN) - Math.min(...lastN) <= 0.01 * Math.max(...lastN);
      const longRun = { weekly: 12, monthly: 6, quarterly: 3, annual: 2 }[f.cad];
      const trialCharge = tiny.find((t) => { const g = daysBetween(t.date, first.date); return g >= 3 && g <= 45; }) || null;
      const id = `${gk}|${f.cad}${f.split ? '|' + f.split : found.length > 1 ? '|' + first.amount : ''}`;
      // Variable bills (power, water): use the average of the last 3 charges as "today's" amount.
      const typical = f.variable ? r2(ch.slice(-3).reduce((a, c) => a + c.amount, 0) / Math.min(3, ch.length)) : last.amount;
      const mark = marks[id];
      const afterCancel = mark && mark.status === 'cancelled' && mark.date ? all.filter((t) => t.date > addDays(mark.date, 1)) : [];
      const files = new Set(ch.map((c) => c.file));
      series.push({
        id, key: gk.split('|')[0], name: modeName(ch), currency: first.currency, cat: first.cat, kind: first.bill ? 'bill' : 'sub', guide: first.guide, dupGroup: first.dupGroup, known: !!first.dict,
        cadence: f.cad, perYear: cad.perYear, charges: ch, n: ch.length, first: first.date, last: last.date,
        firstAmount: first.amount, latest: typical, variable: !!f.variable, annual: r2(typical * cad.perYear), monthly: r2(typical * cad.perYear / 12),
        changePct, yoy, pct, flag, stepDate, stepFrom, increaseYearly, intro,
        trial: trialCharge ? { date: trialCharge.date, amount: trialCharge.amount, firstFull: first.date } : null,
        next: stopped ? null : next, daysToNext: stopped ? null : daysBetween(today, next), cancelBy: stopped ? null : addDays(next, -2), stopped,
        zombie: !stopped && flat && ch.length >= longRun && !first.bill && !!first.dict,
        isNew: daysBetween(first.date, dataEnd) <= 90, files: [...files], twoAccounts: !!f.split, afterCancel,
      });
    }
  }
  series.sort((a, b) => b.annual - a.annual);
  const active = series.filter((s) => !s.stopped);
  const overlaps = [];
  const byGroup = {}; active.forEach((s) => { if (s.dupGroup) { const g = s.dupGroup + '|' + s.currency; (byGroup[g] = byGroup[g] || []).push(s); } });
  Object.entries(byGroup).forEach(([g, list]) => { const names = [...new Set(list.map((s) => s.name))]; if (names.length > 1) overlaps.push({ group: g.split('|')[0], currency: list[0].currency, series: list, names, yearly: r2(Math.min(...list.map((s) => s.annual))) }); });
  const byKey = {}; active.filter((s) => s.twoAccounts).forEach((s) => { const k = s.key + '|' + s.currency; (byKey[k] = byKey[k] || []).push(s); });
  const twoAccounts = Object.values(byKey).filter((l) => l.length > 1).map((l) => ({ group: 'twoAccounts', currency: l[0].currency, series: l, names: [l[0].name], yearly: r2(Math.min(...l.map((s) => s.annual))) }));
  overlaps.push(...twoAccounts);
  doubles.sort((a, b) => b.amount - a.amount);
  const increases = series.filter((s) => s.flag).sort((a, b) => b.pct - a.pct);
  const trials = active.filter((s) => s.trial || s.intro);
  const zombies = active.filter((s) => s.zombie);
  const upcoming = active.filter((s) => s.next).sort((a, b) => (a.next < b.next ? -1 : 1));
  const afterCancel = series.filter((s) => s.afterCancel.length);
  return { series, active, overlaps, doubles, twoAccounts, increases, trials, zombies, upcoming, afterCancel, dataEnd };
}
const modeName = (rows) => { const c = {}; let best = rows[0] && rows[0].payee, n = 0; rows.forEach((t) => { c[t.payee] = (c[t.payee] || 0) + 1; if (c[t.payee] > n) { n = c[t.payee]; best = t.payee; } }); return best; };

// ===================================================================== bank fees
export function findFees(txns, range) {
  const rows = txns.filter((t) => t.fee && t.dir === 'out' && !t.crossDupOf);
  const reversed = txns.filter((t) => t.feeReversal && t.dir === 'in');
  const byType = {};
  for (const t of rows) {
    const k = t.fee + '|' + t.currency;
    const g = byType[k] = byType[k] || { type: t.fee, currency: t.currency, rows: [], total: 0 };
    g.rows.push(t); g.total = r2(g.total + t.amount);
  }
  // Yearly estimate: the fees seen, scaled to 365 days of the files they came from (only with 90+ days of data).
  const fileRange = {}; txns.forEach((t) => { const r = fileRange[t.file] = fileRange[t.file] || { start: t.date, end: t.date }; if (t.date < r.start) r.start = t.date; if (t.date > r.end) r.end = t.date; });
  const daysOf = (g) => { const fs = [...new Set(g.rows.map((t) => t.file))]; const st = fs.map((f) => fileRange[f].start).sort()[0], en = fs.map((f) => fileRange[f].end).sort().pop(); return daysBetween(st, en) + 1; };
  const groups = Object.values(byType).map((g) => { const days = daysOf(g); return Object.assign(g, { count: g.rows.length, days, yearly: days >= 90 ? r2(g.total * 365 / days) : null }); }).sort((a, b) => b.total - a.total);
  const totals = {}; groups.forEach((g) => { totals[g.currency] = r2((totals[g.currency] || 0) + g.total); });
  const reversedTotals = {}; reversed.forEach((t) => { reversedTotals[t.currency] = r2((reversedTotals[t.currency] || 0) + t.amount); });
  return { groups, rows, totals, reversed, reversedTotals, count: rows.length };
}

// ===================================================================== the whole check
// files: [{ txns }] already parsed. Returns everything the page shows. All money is per currency.
export function analyze(allTxns, opts = {}) {
  const txns = allTxns.map((t) => (t.key ? t : enrich(t)));
  const crossDuplicates = markCrossFileDuplicates(txns);
  const datesSorted = txns.map((t) => t.date).sort();
  const range = datesSorted.length ? { start: datesSorted[0], end: datesSorted[datesSorted.length - 1], days: daysBetween(datesSorted[0], datesSorted[datesSorted.length - 1]) + 1 } : { start: null, end: null, days: 0 };
  const rec = findRecurring(txns, { today: opts.today, marks: opts.marks, dataEnd: range.end });
  const fees = findFees(txns, range);
  const counts = {}; txns.forEach((t) => { counts[t.currency] = (counts[t.currency] || 0) + 1; });
  const currencies = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const totals = {};
  const T = (c) => (totals[c] = totals[c] || { yearly: 0, monthly: 0, subsYearly: 0, billsYearly: 0, subs: 0, bills: 0, review: 0, leaks: 0, leakParts: { increases: 0, trials: 0, overlaps: 0, doubles: 0, fees: 0, afterCancel: 0 } });
  for (const s of rec.active) {
    const t = T(s.currency); t.yearly = r2(t.yearly + s.annual); t.monthly = r2(t.monthly + s.monthly);
    if (s.kind === 'bill') { t.billsYearly = r2(t.billsYearly + s.annual); t.bills++; } else { t.subsYearly = r2(t.subsYearly + s.annual); t.subs++; }
  }
  // Possible money leaks (an estimate, "up to"): price rises, trials and intro prices that turned into full price,
  // overlapping services (the cheaper one), double charges, bank fees (scaled to a year) and charges after you cancelled.
  // Per subscription we count the largest single reason, never two. "Still using it?" items are a separate review total.
  const overlapCut = {}; rec.overlaps.forEach((o) => { const cheapest = [...o.series].sort((a, b) => a.annual - b.annual)[0]; overlapCut[cheapest.id] = Math.max(overlapCut[cheapest.id] || 0, cheapest.annual); });
  for (const s of rec.active) {
    if (s.zombie) { const t = T(s.currency); t.review = r2(t.review + s.annual); }
    const parts = { increases: s.increaseYearly || 0, trials: s.trial || s.intro ? s.annual : 0, overlaps: overlapCut[s.id] || 0 };
    const best = Object.entries(parts).sort((a, b) => b[1] - a[1])[0];
    if (best[1] > 0) { const t = T(s.currency); t.leaks = r2(t.leaks + best[1]); t.leakParts[best[0]] = r2(t.leakParts[best[0]] + best[1]); s.leak = { reason: best[0], yearly: best[1] }; }
  }
  for (const d of rec.doubles) { const t = T(d.currency); t.leaks = r2(t.leaks + d.amount); t.leakParts.doubles = r2(t.leakParts.doubles + d.amount); }
  for (const g of fees.groups) { const t = T(g.currency); const v = g.yearly ?? g.total; t.leaks = r2(t.leaks + v); t.leakParts.fees = r2(t.leakParts.fees + v); }
  for (const s of rec.afterCancel) { const t = T(s.currency); const v = r2(s.afterCancel.reduce((a, x) => a + x.amount, 0)); t.leaks = r2(t.leaks + v); t.leakParts.afterCancel = r2(t.leakParts.afterCancel + v); }
  const primary = currencies[0] || opts.currency || 'USD';
  return Object.assign(rec, { txns, fees, range, totals, currencies, primary, crossDuplicates, outCount: txns.filter((t) => t.dir === 'out').length });
}

// ===================================================================== calendar file
const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\r?\n/g, '\\n');
const fold = (line) => { const out = []; let s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); } out.push(s); return out.join('\r\n'); };
// events: [{ date, title, desc, alarms: [7, 1], uid }]
export function toICS(events, stamp) {
  const st = (stamp || new Date().toISOString()).replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Quickwell//Quickwell Saver//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  events.forEach((e, i) => {
    lines.push('BEGIN:VEVENT', `UID:saver-${e.date.replace(/-/g, '')}-${i}-${(e.uid || payeeKey(e.title)).replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 30)}@quickwell`, `DTSTAMP:${st}`,
      `DTSTART;VALUE=DATE:${e.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDays(e.date, 1).replace(/-/g, '')}`, `SUMMARY:${icsEsc(e.title)}`, `DESCRIPTION:${icsEsc(e.desc || '')}`);
    (e.alarms || []).forEach((d) => lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(e.title)}`, `TRIGGER:-P${d}D`, 'END:VALARM'));
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
