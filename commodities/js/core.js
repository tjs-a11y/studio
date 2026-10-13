// WorldSource Commodity Desk: shared logic. Pure functions, no DOM, no network.
// Used by the page (browser) and by scripts/fetch.mjs (Node), so the board, the brief and the tracker
// all compute the same numbers. Nothing here gives advice: it describes prices that already happened.

// ---------------------------------------------------------------------------------------------
// Sources. Every number on the page carries one of these keys.
export const SOURCES = {
  eia: {
    name: 'U.S. Energy Information Administration (EIA)',
    short: 'EIA via FRED',
    via: 'Retrieved from FRED, Federal Reserve Bank of St. Louis',
    url: 'https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm',
    freq: 'daily',
    license: 'U.S. government data (EIA): public domain; EIA asks for credit as the source.',
  },
  worldbank: {
    name: 'World Bank Commodity Price Data (The Pink Sheet)',
    short: 'World Bank',
    url: 'https://www.worldbank.org/en/research/commodity-markets',
    freq: 'monthly',
    license: 'CC BY 4.0. Source: World Bank Commodity Price Data (The Pink Sheet).',
  },
  treasury: {
    name: 'U.S. Department of the Treasury, Daily Treasury Par Yield Curve Rates',
    short: 'U.S. Treasury',
    url: 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve',
    freq: 'daily',
    license: 'U.S. government data: public domain.',
  },
  ecb: {
    name: 'European Central Bank, euro foreign exchange reference rates',
    short: 'ECB',
    url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html',
    freq: 'daily',
    license: 'Reuse permitted with the source credited (ECB). Reference rates are published for information purposes only.',
  },
};

// ---------------------------------------------------------------------------------------------
// Series. `wb` = the column title in the World Bank "Monthly Prices" sheet (matched loosely, see wbKey).
// `fred` = FRED series id of the EIA daily spot price. `unit` = what the price is quoted per.
export const GROUPS = ['energy', 'metals', 'agri', 'fertilizers'];
export const SERIES = [
  // Energy, daily (EIA spot prices)
  { id: 'brent', group: 'energy', name: 'Brent crude oil', unit: 'bbl', source: 'eia', fred: 'DCOILBRENTEU', detail: 'Europe Brent spot price, FOB' },
  { id: 'wti', group: 'energy', name: 'WTI crude oil', unit: 'bbl', source: 'eia', fred: 'DCOILWTICO', detail: 'Cushing, Oklahoma spot price, FOB' },
  { id: 'henryhub', group: 'energy', name: 'Henry Hub natural gas', unit: 'mmbtu', source: 'eia', fred: 'DHHNGSP', detail: 'Henry Hub spot price' },
  // Energy, monthly (World Bank)
  { id: 'gas_eu', group: 'energy', name: 'Natural gas, Europe', unit: 'mmbtu', source: 'worldbank', wb: 'Natural gas, Europe' },
  { id: 'lng_jp', group: 'energy', name: 'LNG, Japan', unit: 'mmbtu', source: 'worldbank', wb: 'Liquefied natural gas, Japan' },
  { id: 'coal_au', group: 'energy', name: 'Coal, Australia', unit: 't', source: 'worldbank', wb: 'Coal, Australian' },
  { id: 'coal_za', group: 'energy', name: 'Coal, South Africa', unit: 't', source: 'worldbank', wb: 'Coal, South African' },
  // Metals, monthly
  { id: 'gold', group: 'metals', name: 'Gold', unit: 'ozt', source: 'worldbank', wb: 'Gold' },
  { id: 'silver', group: 'metals', name: 'Silver', unit: 'ozt', source: 'worldbank', wb: 'Silver' },
  { id: 'platinum', group: 'metals', name: 'Platinum', unit: 'ozt', source: 'worldbank', wb: 'Platinum' },
  { id: 'copper', group: 'metals', name: 'Copper', unit: 't', source: 'worldbank', wb: 'Copper' },
  { id: 'aluminium', group: 'metals', name: 'Aluminium', unit: 't', source: 'worldbank', wb: 'Aluminum' },
  { id: 'nickel', group: 'metals', name: 'Nickel', unit: 't', source: 'worldbank', wb: 'Nickel' },
  { id: 'zinc', group: 'metals', name: 'Zinc', unit: 't', source: 'worldbank', wb: 'Zinc' },
  { id: 'lead', group: 'metals', name: 'Lead', unit: 't', source: 'worldbank', wb: 'Lead' },
  { id: 'tin', group: 'metals', name: 'Tin', unit: 't', source: 'worldbank', wb: 'Tin' },
  { id: 'iron_ore', group: 'metals', name: 'Iron ore', unit: 't', source: 'worldbank', wb: 'Iron ore, cfr spot', detail: 'per dry metric ton' },
  // Grains and softs, monthly
  { id: 'wheat_srw', group: 'agri', name: 'Wheat, US SRW', unit: 't', source: 'worldbank', wb: 'Wheat, US SRW', bushel: 60 },
  { id: 'wheat_hrw', group: 'agri', name: 'Wheat, US HRW', unit: 't', source: 'worldbank', wb: 'Wheat, US HRW', bushel: 60 },
  { id: 'maize', group: 'agri', name: 'Maize (corn)', unit: 't', source: 'worldbank', wb: 'Maize', bushel: 56 },
  { id: 'soybeans', group: 'agri', name: 'Soybeans', unit: 't', source: 'worldbank', wb: 'Soybeans', bushel: 60 },
  { id: 'rice', group: 'agri', name: 'Rice, Thai 5%', unit: 't', source: 'worldbank', wb: 'Rice, Thai 5%' },
  { id: 'palm_oil', group: 'agri', name: 'Palm oil', unit: 't', source: 'worldbank', wb: 'Palm oil' },
  { id: 'coffee_arabica', group: 'agri', name: 'Coffee, Arabica', unit: 'kg', source: 'worldbank', wb: 'Coffee, Arabica' },
  { id: 'coffee_robusta', group: 'agri', name: 'Coffee, Robusta', unit: 'kg', source: 'worldbank', wb: 'Coffee, Robusta' },
  { id: 'cocoa', group: 'agri', name: 'Cocoa', unit: 'kg', source: 'worldbank', wb: 'Cocoa' },
  { id: 'sugar', group: 'agri', name: 'Sugar, world', unit: 'kg', source: 'worldbank', wb: 'Sugar, world' },
  { id: 'cotton', group: 'agri', name: 'Cotton, A Index', unit: 'kg', source: 'worldbank', wb: 'Cotton, A Index' },
  // Fertilizers, monthly
  { id: 'urea', group: 'fertilizers', name: 'Urea', unit: 't', source: 'worldbank', wb: 'Urea' },
  { id: 'dap', group: 'fertilizers', name: 'DAP', unit: 't', source: 'worldbank', wb: 'DAP', detail: 'diammonium phosphate' },
  { id: 'tsp', group: 'fertilizers', name: 'TSP', unit: 't', source: 'worldbank', wb: 'TSP', detail: 'triple superphosphate' },
  { id: 'potash', group: 'fertilizers', name: 'Potassium chloride (potash)', unit: 't', source: 'worldbank', wb: 'Potassium chloride' },
  { id: 'phosphate_rock', group: 'fertilizers', name: 'Phosphate rock', unit: 't', source: 'worldbank', wb: 'Phosphate rock' },
];
export const seriesById = (id) => SERIES.find((s) => s.id === id);

// The World Bank's unit labels, as printed under each column title, mapped to our unit keys.
export const WB_UNITS = { '$/bbl': 'bbl', '$/mmbtu': 'mmbtu', '$/mt': 't', '$/dmtu': 't', '$/kg': 'kg', '$/troy oz': 'ozt' };
// Loose key for matching World Bank column titles: lower case, no footnote stars, single spaces.
export const wbKey = (s) => String(s || '').toLowerCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim();

// U.S. Treasury par yield curve tenors, in the order Treasury prints them. `col` = CSV header.
export const TENORS = [
  { key: '1m', col: '1 Mo', months: 1 }, { key: '1.5m', col: '1.5 Month', months: 1.5 }, { key: '2m', col: '2 Mo', months: 2 },
  { key: '3m', col: '3 Mo', months: 3 }, { key: '4m', col: '4 Mo', months: 4 }, { key: '6m', col: '6 Mo', months: 6 },
  { key: '1y', col: '1 Yr', months: 12 }, { key: '2y', col: '2 Yr', months: 24 }, { key: '3y', col: '3 Yr', months: 36 },
  { key: '5y', col: '5 Yr', months: 60 }, { key: '7y', col: '7 Yr', months: 84 }, { key: '10y', col: '10 Yr', months: 120 },
  { key: '20y', col: '20 Yr', months: 240 }, { key: '30y', col: '30 Yr', months: 360 },
];

// ---------------------------------------------------------------------------------------------
// Units for the portfolio tracker. Factors are exact by definition, except bushels, which use the
// USDA standard bushel weights (60 lb wheat and soybeans, 56 lb corn) carried on each series.
export const MASS_KG = { g: 0.001, kg: 1, t: 1000, ozt: 0.0311034768, lb: 0.45359237 };
export const VOLUME_BBL = { bbl: 1, l: 1 / 158.987294928, gal: 1 / 42 };
export const ENERGY_MMBTU = { mmbtu: 1, therm: 0.1 };
export function unitsFor(series) {
  if (!series) return [];
  if (series.unit === 'bbl') return ['bbl', 'gal', 'l'];
  if (series.unit === 'mmbtu') return ['mmbtu', 'therm'];
  const u = series.unit === 'ozt' ? ['ozt', 'g', 'kg'] : ['t', 'kg', 'lb', 'g', 'ozt'];
  if (series.bushel) u.splice(1, 0, 'bu');
  return u;
}
// How many of the series' price units are in `qty` of `unit`. Throws on a unit that doesn't fit.
export function toPriceUnits(series, qty, unit) {
  if (series.unit === 'bbl') { if (!(unit in VOLUME_BBL)) throw new Error(`unit ${unit} not valid for ${series.id}`); return qty * VOLUME_BBL[unit]; }
  if (series.unit === 'mmbtu') { if (!(unit in ENERGY_MMBTU)) throw new Error(`unit ${unit} not valid for ${series.id}`); return qty * ENERGY_MMBTU[unit]; }
  let kg;
  if (unit === 'bu') { if (!series.bushel) throw new Error(`no bushel weight for ${series.id}`); kg = qty * series.bushel * MASS_KG.lb; }
  else if (unit in MASS_KG) kg = qty * MASS_KG[unit];
  else throw new Error(`unit ${unit} not valid for ${series.id}`);
  return kg / MASS_KG[series.unit];
}

// ---------------------------------------------------------------------------------------------
// Currency conversion. ECB rates are "1 EUR = rate X". EUR itself is 1.
export function rateOf(eur, ccy) {
  if (ccy === 'EUR') return 1;
  const r = eur && eur[ccy];
  return Number.isFinite(r) && r > 0 ? r : null;
}
// Convert an amount between any two currencies the ECB publishes (cross rate through EUR).
export function convert(amount, from, to, eur) {
  if (from === to) return amount;
  const a = rateOf(eur, from), b = rateOf(eur, to);
  if (a == null || b == null) return null;
  return (amount / a) * b;
}
// Units of `ccy` per 1 USD.
export const perUsd = (eur, ccy) => convert(1, 'USD', ccy, eur);

export function pct(now, before) {
  if (!Number.isFinite(now) || !Number.isFinite(before) || before === 0) return null;
  return ((now - before) / Math.abs(before)) * 100;
}

// ---------------------------------------------------------------------------------------------
// Portfolio tracker math. A holding is { id, kind: 'commodity'|'currency', ref, qty, unit, label }.
// Returns the USD value plus the price facts used, so the page can say what each value rests on.
export function valueHolding(h, latest) {
  const qty = Number(h.qty);
  if (!Number.isFinite(qty) || qty < 0) return { ok: false, reason: 'qty' };
  if (h.kind === 'currency') {
    const eur = latest && latest.fx && latest.fx.eur;
    const usd = eur ? convert(qty, h.ref, 'USD', eur) : null;
    if (usd == null) return { ok: false, reason: 'fx' };
    return { ok: true, usd, asOf: latest.fx.asOf, freq: 'daily', source: 'ecb' };
  }
  const s = seriesById(h.ref);
  const row = latest && latest.series && latest.series.find((r) => r.id === h.ref);
  if (!s || !row || !Number.isFinite(row.value)) return { ok: false, reason: 'price' };
  let units;
  try { units = toPriceUnits(s, qty, h.unit); } catch (e) { return { ok: false, reason: 'unit' }; }
  return { ok: true, usd: units * row.value, price: row.value, asOf: row.asOf, freq: row.freq, source: row.source };
}
// Totals in any display currency. Holdings that can't be valued are listed, never guessed.
export function portfolio(holdings, latest, display) {
  const eur = latest && latest.fx && latest.fx.eur;
  const rows = holdings.map((h) => {
    const v = valueHolding(h, latest);
    const value = v.ok ? (display === 'USD' ? v.usd : eur ? convert(v.usd, 'USD', display, eur) : null) : null;
    return { holding: h, ...v, value };
  });
  const valued = rows.filter((r) => r.value != null);
  return { rows, total: valued.reduce((a, r) => a + r.value, 0), missing: rows.length - valued.length, display };
}
const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) || /^[=+\-@\t]/.test(s) ? `"${(/^[=+\-@\t]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"` : s; };
export function portfolioCsv(p) {
  const head = ['label', 'kind', 'item', 'quantity', 'unit', `value_${p.display}`, 'price_usd', 'price_as_of', 'price_frequency', 'source'];
  const lines = [head.join(',')];
  for (const r of p.rows) {
    const h = r.holding;
    lines.push([h.label || '', h.kind, h.ref, h.qty, h.kind === 'currency' ? h.ref : h.unit, r.value == null ? '' : r.value.toFixed(2), r.price == null ? '' : r.price, r.asOf || '', r.freq || '', r.source ? SOURCES[r.source].short : ''].map(csvCell).join(','));
  }
  lines.push(['TOTAL', '', '', '', '', p.total.toFixed(2), '', '', '', ''].map(csvCell).join(','));
  return lines.join('\r\n') + '\r\n';
}
export const FREE_HOLDINGS = 3;
export const canAddHolding = (count, pro) => pro || count < FREE_HOLDINGS;

// ---------------------------------------------------------------------------------------------
// Price alerts (Desk plan). Checked against the latest data on each visit; stored on the device only.
// alert = { id, ref, op: 'above'|'below', level } in USD per the series' unit.
export function checkAlerts(alerts, latest) {
  return alerts.map((a) => {
    const row = latest && latest.series && latest.series.find((r) => r.id === a.ref);
    if (!row || !Number.isFinite(row.value)) return { alert: a, state: 'nodata' };
    const hit = a.op === 'above' ? row.value >= a.level : row.value <= a.level;
    return { alert: a, state: hit ? 'hit' : 'waiting', value: row.value, asOf: row.asOf, freq: row.freq };
  });
}

// A recurring calendar reminder to look at the desk (.ics). The calendar can't watch prices itself,
// so this is honest about being a reminder; the check runs when the page opens.
export function alertsIcs({ url, alerts, start, freq = 'DAILY' }) {
  const esc = (s) => String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const d = start.replace(/-/g, '');
  const desc = ['Open the WorldSource Commodity Desk to check your price alerts:', url, '', ...alerts.map((a) => `${(seriesById(a.ref) || { name: a.ref }).name}: ${a.op} ${a.level} USD`)].join('\n');
  const fold = (line) => { const out = []; let s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); } out.push(s); return out.join('\r\n'); };
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Quickwell//WorldSource Commodity Desk//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:commodity-desk-alerts-${d}@quickwell`, `DTSTAMP:${d}T000000Z`, `DTSTART;VALUE=DATE:${d}`, `RRULE:FREQ=${freq === 'WEEKLY' ? 'WEEKLY' : 'DAILY'}`,
    `SUMMARY:${esc('Check commodity price alerts')}`, `DESCRIPTION:${esc(desc)}`, `URL:${url}`, 'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------------------------------------
// History helpers. points = [[date, value], ...] sorted by date.
export function mergePoints(oldPts, newPts, max = Infinity) {
  const m = new Map((oldPts || []).map((p) => [p[0], p[1]]));
  for (const [d, v] of newPts || []) if (Number.isFinite(v)) m.set(d, v);
  const out = [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return out.length > max ? out.slice(out.length - max) : out;
}
// Points within the last `days` (daily) or months (monthly) of the newest point.
export function windowPoints(points, freq, span) {
  if (!points.length || span === 'all') return points;
  const last = points[points.length - 1][0];
  const y = Number(last.slice(0, 4)) - Number(span);
  const cut = `${y}${last.slice(4)}`;
  return points.filter((p) => p[0] >= cut);
}

// ---------------------------------------------------------------------------------------------
// Formatting (English, used by the brief; the page formats with the reader's locale).
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function fmtDate(d) {
  if (!d) return '';
  if (/^\d{4}-\d{2}$/.test(d)) return `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
  const [y, m, day] = d.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${day}, ${y}`;
}
export const UNIT_WORDS = { bbl: 'barrel', mmbtu: 'million Btu', t: 'metric ton', kg: 'kg', ozt: 'troy ounce' };
const money = (v) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: v < 10 ? 3 : 2 });
const signed = (v, digits = 1) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(digits);

// ---------------------------------------------------------------------------------------------
// Daily brief. Built only from latest.json; the same for every reader. Facts about past prices,
// never forecasts, targets or buy/sell language (a test scans the output for those words).
export const DISCLAIMER = 'Not investment advice. This brief describes published prices; it is the same for every reader and is not a recommendation to buy or sell anything. We do not hold funds or execute trades.';

export function buildBrief(latest, { date } = {}) {
  const series = (latest && latest.series) || [];
  const byId = Object.fromEntries(series.map((r) => [r.id, r]));
  const withChange = (r) => ({ ...r, changePct: pct(r.value, r.prev) });
  const daily = series.filter((r) => r.freq === 'daily' && Number.isFinite(r.prev)).map(withChange);
  const monthly = series.filter((r) => r.freq === 'monthly' && Number.isFinite(r.prev)).map(withChange);
  const byMove = (a, b) => Math.abs(b.changePct) - Math.abs(a.changePct) || (a.id < b.id ? -1 : 1);
  const brief = { date: date || latest.generated.slice(0, 10), generated: latest.generated, sample: !!latest.sample, daily: [], monthly: null, spreads: [], curve: null, fx: null, stale: [] };

  brief.daily = daily.sort(byMove).map((r) => ({ id: r.id, name: seriesById(r.id).name, unit: r.unit, value: r.value, prev: r.prev, asOf: r.asOf, prevAsOf: r.prevAsOf, changePct: r.changePct, source: r.source }));

  if (monthly.length) {
    const month = monthly.map((r) => r.asOf).sort().at(-1);
    const latestMonth = monthly.filter((r) => r.asOf === month).sort(byMove);
    brief.monthly = { month, prevMonth: latestMonth[0] && latestMonth[0].prevAsOf, count: latestMonth.length,
      movers: latestMonth.slice(0, 5).map((r) => ({ id: r.id, name: seriesById(r.id).name, unit: r.unit, value: r.value, prev: r.prev, changePct: r.changePct })) };
  }

  const b = byId.brent, w = byId.wti;
  if (b && w && b.asOf === w.asOf && Number.isFinite(b.value) && Number.isFinite(w.value)) {
    const sp = { id: 'brent_wti', name: 'Brent minus WTI', unit: 'bbl', asOf: b.asOf, value: b.value - w.value };
    if (Number.isFinite(b.prev) && Number.isFinite(w.prev) && b.prevAsOf === w.prevAsOf) Object.assign(sp, { prev: b.prev - w.prev, prevAsOf: b.prevAsOf });
    brief.spreads.push(sp);
  }
  const g = byId.gold, s = byId.silver;
  if (g && s && g.asOf === s.asOf && s.value > 0) {
    const sp = { id: 'gold_silver', name: 'Gold/silver ratio', unit: 'ratio', asOf: g.asOf, value: g.value / s.value };
    if (s.prev > 0 && Number.isFinite(g.prev) && g.prevAsOf === s.prevAsOf) Object.assign(sp, { prev: g.prev / s.prev, prevAsOf: g.prevAsOf });
    brief.spreads.push(sp);
  }

  const y = latest.yields;
  if (y && y.tenors && y.tenors.length) {
    const t = Object.fromEntries(y.tenors.map((x) => [x.key, x]));
    const changes = y.tenors.filter((x) => Number.isFinite(x.value) && Number.isFinite(x.prev)).map((x) => ({ key: x.key, bp: Math.round((x.value - x.prev) * 100) }));
    const spread = (a, c, field) => (t[a] && t[c] && Number.isFinite(t[a][field]) && Number.isFinite(t[c][field]) ? +(t[c][field] - t[a][field]).toFixed(2) : null);
    brief.curve = { asOf: y.asOf, prevAsOf: y.prevAsOf, ten: t['10y'] ? { value: t['10y'].value, prev: t['10y'].prev } : null, two: t['2y'] ? { value: t['2y'].value, prev: t['2y'].prev } : null,
      s2s10: spread('2y', '10y', 'value'), s2s10Prev: spread('2y', '10y', 'prev'), s3m10: spread('3m', '10y', 'value'), s3m10Prev: spread('3m', '10y', 'prev'),
      biggest: changes.slice().sort((a, c) => Math.abs(c.bp) - Math.abs(a.bp))[0] || null, changes };
  }

  const fx = latest.fx;
  if (fx && fx.eur && fx.prevEur) {
    const rows = Object.keys(fx.eur).filter((c) => c !== 'USD' && rateOf(fx.prevEur, c) && rateOf(fx.prevEur, 'USD')).map((c) => {
      const now = perUsd(fx.eur, c), before = perUsd(fx.prevEur, c);
      return { ccy: c, perUsd: now, prev: before, changePct: pct(now, before) };
    });
    const eurNow = perUsd(fx.eur, 'EUR'), eurPrev = perUsd(fx.prevEur, 'EUR');
    if (eurNow && eurPrev) rows.push({ ccy: 'EUR', perUsd: eurNow, prev: eurPrev, changePct: pct(eurNow, eurPrev) });
    rows.sort((a, c) => Math.abs(c.changePct) - Math.abs(a.changePct) || (a.ccy < c.ccy ? -1 : 1));
    brief.fx = { asOf: fx.asOf, prevAsOf: fx.prevAsOf, movers: rows.slice(0, 3), eur: rows.find((r) => r.ccy === 'EUR') || null };
  }
  brief.stale = Object.entries(latest.sources || {}).filter(([, v]) => v.status !== 'ok').map(([k, v]) => ({ source: k, lastSuccess: v.lastSuccess || null }));
  return brief;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const moveWord = (p) => (Math.abs(p) < 0.005 ? 'was unchanged' : p > 0 ? 'rose' : 'fell');
const srcLink = (k) => `<a href="${SOURCES[k].url}" rel="noopener">${esc(SOURCES[k].short)}</a>`;
const CCY_NAMES = (() => { try { return new Intl.DisplayNames(['en'], { type: 'currency' }); } catch (e) { return { of: (c) => c }; } })();

// The brief as plain sentences in HTML. English; the same text for everyone.
export function briefHtml(brief) {
  const out = [];
  if (brief.sample) out.push('<p class="callout bad"><b>SAMPLE DATA.</b> These numbers are made up for testing. They are not real prices.</p>');
  const p = (s) => out.push(`<p>${s}</p>`);
  if (brief.daily.length) {
    out.push('<h2>Energy, daily spot prices</h2><ul>');
    for (const r of brief.daily) {
      const ch = Math.abs(r.changePct) < 0.005 ? '' : ` ${Math.abs(r.changePct).toFixed(1)}%`;
      out.push(`<li><b>${esc(r.name)}</b> ${moveWord(r.changePct)}${ch} to ${money(r.value)} per ${UNIT_WORDS[r.unit]} on ${fmtDate(r.asOf)}, from ${money(r.prev)} on ${fmtDate(r.prevAsOf)}. <span class="cite">Source: ${srcLink(r.source)}, daily.</span></li>`);
    }
    out.push('</ul>');
  }
  if (brief.spreads.length) {
    out.push('<h2>Spreads</h2><ul>');
    for (const sp of brief.spreads) {
      if (sp.id === 'brent_wti') {
        const rel = sp.value >= 0 ? 'above' : 'below';
        out.push(`<li><b>Brent minus WTI:</b> Brent's spot price was ${money(Math.abs(sp.value))} per barrel ${rel} WTI's on ${fmtDate(sp.asOf)}${sp.prev != null ? ` (${fmtDate(sp.prevAsOf)}: ${sp.prev < 0 ? '−' : ''}${money(Math.abs(sp.prev))})` : ''}. <span class="cite">Source: ${srcLink('eia')}, daily.</span></li>`);
      } else if (sp.id === 'gold_silver') {
        out.push(`<li><b>Gold/silver ratio:</b> in the ${fmtDate(sp.asOf)} monthly averages, one troy ounce of gold cost as much as ${sp.value.toFixed(1)} troy ounces of silver${sp.prev != null ? ` (${fmtDate(sp.prevAsOf)}: ${sp.prev.toFixed(1)})` : ''}. <span class="cite">Source: ${srcLink('worldbank')}, monthly averages.</span></li>`);
      }
    }
    out.push('</ul>');
  }
  const c = brief.curve;
  if (c) {
    out.push('<h2>U.S. Treasury yield curve</h2><ul>');
    if (c.ten && Number.isFinite(c.ten.value)) {
      const bp = Number.isFinite(c.ten.prev) ? Math.round((c.ten.value - c.ten.prev) * 100) : null;
      out.push(`<li>The <b>10-year</b> par yield was ${c.ten.value.toFixed(2)}% on ${fmtDate(c.asOf)}${bp == null ? '' : bp === 0 ? `, unchanged from ${fmtDate(c.prevAsOf)}` : `, ${bp > 0 ? 'up' : 'down'} ${Math.abs(bp)} basis point${Math.abs(bp) === 1 ? '' : 's'} from ${fmtDate(c.prevAsOf)}`}. (A basis point is 0.01 percentage point.)</li>`);
    }
    if (c.s2s10 != null) {
      const inv = c.s2s10 < 0;
      out.push(`<li><b>10-year minus 2-year:</b> ${signed(c.s2s10, 2)} percentage points${c.s2s10Prev != null ? ` (previous day ${signed(c.s2s10Prev, 2)})` : ''}.${inv ? ' The 2-year yield was above the 10-year yield, a shape called an inverted curve.' : ''}</li>`);
    }
    if (c.s3m10 != null) out.push(`<li><b>10-year minus 3-month:</b> ${signed(c.s3m10, 2)} percentage points${c.s3m10Prev != null ? ` (previous day ${signed(c.s3m10Prev, 2)})` : ''}.</li>`);
    if (c.biggest && c.biggest.bp !== 0) {
      const t = TENORS.find((x) => x.key === c.biggest.key);
      out.push(`<li>The largest one-day change on the curve was the <b>${esc(t ? t.col : c.biggest.key)}</b> yield, ${c.biggest.bp > 0 ? 'up' : 'down'} ${Math.abs(c.biggest.bp)} basis points.</li>`);
    }
    out.push(`</ul><p class="cite">Source: ${srcLink('treasury')}, daily par yield curve rates, ${fmtDate(c.asOf)} vs ${fmtDate(c.prevAsOf)}.</p>`);
  }
  if (brief.fx) {
    out.push('<h2>Currencies against the U.S. dollar</h2><ul>');
    for (const r of brief.fx.movers) {
      out.push(`<li><b>${esc(CCY_NAMES.of(r.ccy) || r.ccy)} (${r.ccy}):</b> 1 USD = ${r.perUsd.toLocaleString('en-US', { maximumFractionDigits: r.perUsd < 10 ? 4 : 2 })} ${r.ccy} on ${fmtDate(brief.fx.asOf)}, ${signed(r.changePct, 2)}% from ${fmtDate(brief.fx.prevAsOf)}.</li>`);
    }
    out.push(`</ul><p class="cite">Cross rates derived from ${srcLink('ecb')} euro reference rates (published around 16:00 CET on working days, for information purposes).</p>`);
  }
  if (brief.monthly) {
    const m = brief.monthly;
    out.push(`<h2>Monthly averages: ${fmtDate(m.month)}</h2>`);
    p(`The World Bank publishes these once a month, as averages for the whole month. They are not today's prices. Largest changes from ${fmtDate(m.prevMonth)} among ${m.count} series:`);
    out.push('<ul>');
    for (const r of m.movers) out.push(`<li><b>${esc(r.name)}</b> ${signed(r.changePct)}% to ${money(r.value)} per ${UNIT_WORDS[r.unit]}.</li>`);
    out.push(`</ul><p class="cite">Source: ${srcLink('worldbank')}. CC BY 4.0.</p>`);
  }
  if (brief.stale.length) p(`<i>Not updated today: ${brief.stale.map((s) => `${esc(SOURCES[s.source].short)}${s.lastSuccess ? ` (last good data ${fmtDate(s.lastSuccess.slice(0, 10))})` : ''}`).join(', ')}. Numbers from these sources are the last ones we received.</i>`);
  if (!brief.daily.length && !brief.curve && !brief.fx && !brief.monthly) p('No data was available for this brief.');
  out.push(`<p class="disc"><b>${esc(DISCLAIMER)}</b></p>`);
  return out.join('\n');
}
