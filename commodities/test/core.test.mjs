// Currency conversion, units, tracker math, CSV, alerts, calendar file and history helpers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { convert, perUsd, rateOf, toPriceUnits, unitsFor, seriesById, valueHolding, portfolio, portfolioCsv, canAddHolding, FREE_HOLDINGS, checkAlerts, alertsIcs, mergePoints, windowPoints, pct, SERIES, WB_UNITS } from '../js/core.js';
import { STRINGS, NAMES, pickLang, t } from '../js/i18n.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const eur = { USD: 1.25, GBP: 0.8, JPY: 160 };

test('currency conversion goes through EUR and round-trips', () => {
  assert.equal(rateOf(eur, 'EUR'), 1);
  close(convert(125, 'USD', 'EUR', eur), 100);
  close(convert(100, 'EUR', 'GBP', eur), 80);
  close(convert(1, 'USD', 'JPY', eur), 128);
  close(perUsd(eur, 'GBP'), 0.64);
  close(convert(convert(1000, 'GBP', 'JPY', eur), 'JPY', 'GBP', eur), 1000);
  assert.equal(convert(5, 'USD', 'USD', null), 5);
  assert.equal(convert(5, 'USD', 'XYZ', eur), null, 'unknown currency gives null, not a guess');
  assert.equal(pct(110, 100), 10); assert.equal(pct(1, 0), null);
});

test('unit conversion: exact definitions and bushel weights', () => {
  const gold = seriesById('gold'), wheat = seriesById('wheat_srw'), maize = seriesById('maize'), brent = seriesById('brent'), coffee = seriesById('coffee_arabica'), hh = seriesById('henryhub');
  close(toPriceUnits(gold, 31.1034768, 'g'), 1);
  close(toPriceUnits(gold, 1, 'kg'), 1 / 0.0311034768);
  close(toPriceUnits(wheat, 2, 't'), 2);
  close(toPriceUnits(wheat, 1000, 'bu'), 1000 * 60 * 0.45359237 / 1000);
  close(toPriceUnits(maize, 1000, 'bu'), 1000 * 56 * 0.45359237 / 1000);
  close(toPriceUnits(brent, 42, 'gal'), 1);
  close(toPriceUnits(brent, 158.987294928, 'l'), 1);
  close(toPriceUnits(coffee, 1, 't'), 1000);
  close(toPriceUnits(hh, 10, 'therm'), 1);
  assert.throws(() => toPriceUnits(gold, 1, 'bu'));
  assert.throws(() => toPriceUnits(brent, 1, 'kg'));
  assert.ok(!unitsFor(gold).includes('bu') && unitsFor(wheat).includes('bu'));
  for (const s of SERIES) for (const u of unitsFor(s)) assert.ok(Number.isFinite(toPriceUnits(s, 1, u)), `${s.id} ${u}`);
  assert.ok(Object.values(WB_UNITS).every((u) => ['bbl', 'mmbtu', 't', 'kg', 'ozt'].includes(u)));
});

const latest = {
  series: [
    { id: 'gold', value: 2000, asOf: '2026-09', freq: 'monthly', source: 'worldbank' },
    { id: 'wheat_srw', value: 250, asOf: '2026-09', freq: 'monthly', source: 'worldbank' },
    { id: 'brent', value: 80, asOf: '2026-10-12', freq: 'daily', source: 'eia' },
  ],
  fx: { asOf: '2026-10-12', eur },
};

test('tracker: values holdings in any currency and never guesses missing prices', () => {
  const hs = [
    { id: 'a', kind: 'commodity', ref: 'gold', qty: 10, unit: 'ozt' },
    { id: 'b', kind: 'commodity', ref: 'wheat_srw', qty: 2, unit: 't' },
    { id: 'c', kind: 'currency', ref: 'GBP', qty: 800, unit: 'GBP' },
    { id: 'd', kind: 'commodity', ref: 'cocoa', qty: 5, unit: 'kg' },
  ];
  close(valueHolding(hs[0], latest).usd, 20000);
  close(valueHolding(hs[2], latest).usd, 1250);
  assert.equal(valueHolding(hs[3], latest).ok, false);
  assert.equal(valueHolding({ ...hs[0], qty: -1 }, latest).ok, false);
  const pUsd = portfolio(hs, latest, 'USD');
  close(pUsd.total, 20000 + 500 + 1250);
  assert.equal(pUsd.missing, 1);
  const pEur = portfolio(hs, latest, 'EUR');
  close(pEur.total, (20000 + 500 + 1250) / 1.25);
  const pJpy = portfolio(hs, latest, 'JPY');
  close(pJpy.total, 21750 * 128);
  assert.equal(portfolio(hs, { series: latest.series }, 'EUR').total, 0, 'no FX data: nothing converted');
});

test('free plan holds 3 holdings; Desk is unlimited', () => {
  assert.equal(FREE_HOLDINGS, 3);
  assert.ok(canAddHolding(2, false)); assert.ok(!canAddHolding(3, false)); assert.ok(canAddHolding(300, true));
});

test('CSV export: header, total, quoting and spreadsheet-formula guard', () => {
  const hs = [{ id: 'a', kind: 'commodity', ref: 'gold', qty: 1, unit: 'ozt', label: '=HYPERLINK("x")' }, { id: 'b', kind: 'currency', ref: 'GBP', qty: 80, unit: 'GBP', label: 'Cash, savings' }];
  const csv = portfolioCsv(portfolio(hs, latest, 'EUR'));
  const lines = csv.trim().split('\r\n');
  assert.equal(lines[0], 'label,kind,item,quantity,unit,value_EUR,price_usd,price_as_of,price_frequency,source');
  assert.ok(lines[1].startsWith(`"'=HYPERLINK(""x"")"`));
  assert.ok(lines[2].startsWith('"Cash, savings",currency,GBP,80,GBP,100.00'));
  assert.equal(lines.at(-1), 'TOTAL,,,,,1700.00,,,,');
});

test('alerts: above/below and missing data', () => {
  const r = checkAlerts([{ id: 1, ref: 'brent', op: 'above', level: 75 }, { id: 2, ref: 'brent', op: 'below', level: 75 }, { id: 3, ref: 'cocoa', op: 'above', level: 1 }], latest);
  assert.deepEqual(r.map((x) => x.state), ['hit', 'waiting', 'nodata']);
});

test('.ics reminder is valid iCalendar with CRLF and folded lines', () => {
  const ics = alertsIcs({ url: 'https://example.test/commodities/', alerts: [{ ref: 'gold', op: 'above', level: 2100 }], start: '2026-10-13' });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(ics.includes('RRULE:FREQ=DAILY') && ics.includes('DTSTART;VALUE=DATE:20261013') && ics.trim().endsWith('END:VCALENDAR'));
  for (const line of ics.split('\r\n')) assert.ok(line.length <= 75, line);
  assert.ok(!/\n(?<!\r\n)/.test(ics.replace(/\r\n/g, '')));
});

test('history merge: dedupes by date, sorts, keeps the newest when capped', () => {
  const m = mergePoints([['2026-01-02', 1], ['2026-01-01', 0]], [['2026-01-02', 2], ['2026-01-03', 3], ['2026-01-04', NaN]], 2);
  assert.deepEqual(m, [['2026-01-02', 2], ['2026-01-03', 3]]);
  const pts = [['2020-01', 1], ['2025-09', 2], ['2026-09', 3]];
  assert.deepEqual(windowPoints(pts, 'monthly', 1), [['2025-09', 2], ['2026-09', 3]]);
  assert.equal(windowPoints(pts, 'monthly', 'all').length, 3);
});

test('i18n: four languages, same keys, every commodity named', () => {
  const keys = Object.keys(STRINGS.en).sort();
  for (const l of ['es', 'fr', 'pt']) {
    assert.deepEqual(Object.keys(STRINGS[l]).sort(), keys, `${l} keys`);
    for (const s of SERIES) assert.ok(NAMES[l][s.id], `${l} name for ${s.id}`);
  }
  assert.equal(pickLang(null, ['pt-BR', 'en']), 'pt');
  assert.equal(pickLang('fr', ['es']), 'fr');
  assert.equal(pickLang(null, ['de-DE']), 'en');
  assert.equal(t('es', 'tr.missing', { n: 2 }), '2 activo(s) no se pudieron valorar y no están en el total.');
  assert.equal(t('xx', 'nav.board'), 'Prices');
});
