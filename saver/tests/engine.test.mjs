// Engine tests on synthetic bank files (fixtures/, made by scripts/make-fixtures.mjs). Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../js/engine.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fx = (n) => readFileSync(join(root, 'fixtures', n), 'utf8');
const TODAY = '2026-10-13';
const load = (...names) => names.map((n, i) => E.parseInput(fx(n), { id: 'f' + i, name: n, today: TODAY }));
const check = (...names) => E.analyze(load(...names).flatMap((r) => r.txns), { today: TODAY });
const byName = (R, n) => R.series.filter((s) => s.name === n);
const one = (R, n) => { const l = byName(R, n); assert.equal(l.length, 1, `${n}: expected one series, got ${l.length}`); return l[0]; };

// ------------------------------------------------------------------ parsing
test('every fixture layout is recognised, with the right currency and direction', () => {
  const want = { 'chase-checking.csv': ['chaseChecking', 'USD'], 'chase-card.csv': ['chaseCard', 'USD'], 'amex.csv': ['amex', 'USD'], 'capital-one.csv': ['capitalOne', 'USD'],
    'bank-of-america.csv': ['boa', 'USD'], 'wells-fargo.csv': ['wellsFargo', 'USD'], 'spanish-bank-eur.csv': ['generic', 'EUR'], 'uk-bank-gbp.csv': ['generic', 'GBP'],
    'statement-pdf-text.txt': ['paste', 'USD'], 'banking-app-paste.txt': ['paste', 'USD'] };
  for (const [n, [layout, cur]] of Object.entries(want)) {
    const [r] = load(n);
    assert.equal(r.layout, layout, n); assert.equal(r.currency, cur, n); assert.ok(r.txns.length >= 10, n);
    const out = r.txns.filter((t) => t.dir === 'out').length, inn = r.txns.length - out;
    assert.ok(out > inn, `${n}: most rows should be money out (${out} out, ${inn} in)`);
  }
});
test('card exports: Amex/Discover-style positive charges are money out; card bill payments are money in or skipped', () => {
  const [amex] = load('amex.csv');
  const disney = amex.txns.find((t) => /DISNEY/.test(t.desc)); assert.equal(disney.dir, 'out');
  const pay = amex.txns.find((t) => /AUTOPAY PAYMENT/.test(t.desc)); assert.equal(pay.dir, 'in');
  const [chase] = load('chase-card.csv');
  assert.ok(!chase.txns.some((t) => /Payment Thank You/.test(t.desc)), 'Chase card "Payment" rows are skipped');
  assert.equal(chase.txns.find((t) => /RT5521/.test(t.desc)).dir, 'in', 'returns are money in');
  const [c1] = load('capital-one.csv');
  assert.equal(c1.txns.find((t) => /MOBILE PYMT/.test(t.desc)).dir, 'in');
  assert.equal(c1.txns.find((t) => /XBOX/.test(t.desc)).dir, 'out');
});
test('Bank of America summary block and balance lines are skipped', () => {
  const [r] = load('bank-of-america.csv');
  assert.ok(!r.txns.some((t) => /balance|Total/i.test(t.desc)));
  assert.equal(r.txns.length, 57);
});
test('amounts: signs, brackets, CR/DR, currency symbols and codes, European and Swiss formats', () => {
  const cases = [['-15.49', -15.49], ['(15.49)', -15.49], ['15.49-', -15.49], ['$1,234.56', 1234.56], ['-$1,234.56', -1234.56], ['1.234,56', 1234.56], ['-12,99', -12.99], ['€ 12,99', 12.99],
    ['£9.99', 9.99], ['R$ 49,90', 49.9], ['₹1,23,456.00', 123456], ['12.00 DR', -12], ['12.00 CR', 12], ['USD 5.00', 5], ['1\'234.50', 1234.5], ['−7.99', -7.99], ['KSh 1,200.00', 1200], ['abc', NaN]];
  for (const [s, v] of cases) Number.isNaN(v) ? assert.ok(Number.isNaN(E.parseAmount(s)), s) : assert.equal(E.parseAmount(s), v, s);
});
test('currency detection from symbols and codes; locale fallback', () => {
  assert.equal(E.detectCurrency('Fecha;Concepto;Importe\n01/02/2026;X;-12,99 €'), 'EUR');
  assert.equal(E.detectCurrency('Date,Amount\n2026-01-01,£4.00\n2026-01-02,£5.00'), 'GBP');
  assert.equal(E.detectCurrency('Valor R$ 49,90'), 'BRL');
  assert.equal(E.detectCurrency('Amount (INR)'), 'INR');
  assert.equal(E.detectCurrency('Date,Amount\n2026-01-01,4.00'), null);
  assert.equal(E.currencyForLocale('en-GB'), 'GBP'); assert.equal(E.currencyForLocale('es-MX'), 'MXN'); assert.equal(E.currencyForLocale('xx'), 'USD');
  assert.match(E.fmtMoney(1234.5, 'EUR', 'es-ES'), /1234,50|1\.234,50/); assert.equal(E.fmtMoney(1234.5, 'USD', 'en-US'), '$1,234.50');
});
test('dates: US, day-first, ISO, month names (English and Spanish)', () => {
  assert.equal(E.parseDate('10/03/2026', 'mdy'), '2026-10-03'); assert.equal(E.parseDate('10/03/2026', 'dmy'), '2026-03-10');
  assert.equal(E.parseDate('2026-01-31'), '2026-01-31'); assert.equal(E.parseDate('Oct 3, 2026'), '2026-10-03');
  assert.equal(E.parseDate('3 de octubre de 2026'), '2026-10-03'); assert.equal(E.parseDate('15 ene 2026'), '2026-01-15');
  assert.equal(E.guessDateFormat(['13/02/2026', '01/03/2026']), 'dmy');
});
test('pasted text: PDF statement lines (date, text, amount, balance) and banking-app lines', () => {
  const [pdf] = load('statement-pdf-text.txt');
  const nf = pdf.txns.filter((t) => /NETFLIX/.test(t.desc)); assert.equal(nf.length, 3); assert.deepEqual(nf.map((t) => t.amount), [17.99, 17.99, 17.99]);
  assert.deepEqual(nf.map((t) => t.date), ['2026-06-16', '2026-07-16', '2026-08-16'], 'year comes from the statement period');
  assert.equal(pdf.txns.find((t) => /PAYROLL/.test(t.desc)).dir, 'in', 'CR is money in');
  assert.ok(!pdf.txns.some((t) => /Total|Page|Statement/i.test(t.desc)));
  const [app] = load('banking-app-paste.txt');
  assert.equal(app.txns.find((t) => t.desc === 'Starbucks').date, TODAY, '"Today"');
  assert.equal(app.txns.find((t) => /Payroll/.test(t.desc)).dir, 'in');
  assert.deepEqual(app.txns.filter((t) => t.desc === 'Netflix').map((t) => [t.date, t.amount]), [['2026-09-14', 17.99], ['2026-08-14', 17.99], ['2026-07-14', 17.99], ['2026-06-14', 15.49]]);
});
test('pasted text: yearless dates roll back a year when they would be in the future', () => {
  const r = E.parseText('12/20 NETFLIX.COM 15.49\n01/20 NETFLIX.COM 15.49', { today: '2026-01-25' });
  assert.deepEqual(r.txns.map((t) => t.date), ['2025-12-20', '2026-01-20']);
});
test('"Swap money in/out" flips direction', () => {
  const a = E.parseInput(fx('uk-bank-gbp.csv'), { name: 'uk.csv' }), b = E.parseInput(fx('uk-bank-gbp.csv'), { name: 'uk.csv', flip: true });
  assert.equal(a.txns[0].dir === 'out', b.txns[0].dir === 'in');
});

// ------------------------------------------------------------------ findings
test('US household (6 files): subscriptions, bills, price rises, trials, intro prices, overlaps, doubles, fees', () => {
  const R = check('chase-checking.csv', 'chase-card.csv', 'amex.csv', 'capital-one.csv', 'bank-of-america.csv', 'wells-fargo.csv');
  // price increases: thresholds 5% amber, 15% red
  const nf = one(R, 'Netflix'); assert.equal(nf.flag, 'red'); assert.equal(nf.stepFrom, 15.49); assert.equal(nf.latest, 17.99); assert.equal(nf.increaseYearly, 30); assert.equal(nf.stepDate, '2026-01-06');
  assert.equal(one(R, 'Xfinity').flag, 'amber'); assert.equal(one(R, 'Xfinity').kind, 'bill');
  assert.equal(one(R, 'Disney+').flag, 'red'); assert.equal(one(R, 'Xbox').flag, 'red');
  const duo = one(R, 'Duolingo'); assert.equal(duo.cadence, 'annual'); assert.equal(duo.flag, 'red'); assert.equal(duo.next, '2027-01-10'); assert.equal(duo.cancelBy, '2027-01-08');
  assert.deepEqual(R.increases.map((s) => s.name).sort(), ['Disney+', 'Duolingo', 'Netflix', 'Xbox', 'Xfinity']);
  // free trial and intro prices
  const aud = one(R, 'Audible'); assert.deepEqual(aud.trial, { date: '2026-04-02', amount: 0.99, firstFull: '2026-05-02' });
  const pea = one(R, 'Peacock'); assert.deepEqual(pea.intro, { from: 1.99, date: '2026-06-19', n: 3 }); assert.equal(pea.flag, null, 'an intro price ending is not a price increase');
  assert.ok(one(R, 'The New York Times').intro);
  assert.deepEqual(R.trials.map((s) => s.name).sort(), ['Audible', 'Peacock', 'The New York Times']);
  // double charge and two accounts
  assert.equal(R.doubles.length, 1); assert.equal(R.doubles[0].name, 'Spotify'); assert.equal(R.doubles[0].b.date, '2026-07-15');
  assert.equal(byName(R, 'Spotify').length, 2, 'Spotify on two accounts is two series');
  const groups = Object.fromEntries(R.overlaps.map((o) => [o.group, o]));
  assert.deepEqual(Object.keys(groups).sort(), ['delivery', 'gym', 'mealkit', 'twoAccounts', 'vpn']);
  assert.equal(groups.vpn.yearly, 47.88); assert.deepEqual(groups.gym.names.sort(), ['LA Fitness', 'Planet Fitness']);
  // weekly
  assert.equal(one(R, 'HelloFresh').cadence, 'weekly');
  // variable bills are found, without a price flag
  const duke = one(R, 'Duke Energy'); assert.equal(duke.variable, true); assert.equal(duke.flag, null); assert.equal(duke.kind, 'bill');
  // not subscriptions: groceries, coffee, fuel, rides, transfers, card bills, payroll, ATM cash
  for (const n of ['Groceries', 'Eating out', 'Fuel', 'Rides', 'Amazon', 'Transfer between accounts', 'Card bill payment', 'Paycheck']) assert.equal(byName(R, n).length, 0, n);
  // zombies: known subscriptions, flat price, long-running; never bills
  assert.ok(one(R, 'Planet Fitness').zombie); assert.ok(one(R, 'Hulu').zombie); assert.ok(!one(R, 'Verizon').zombie); assert.ok(!one(R, 'Netflix').zombie);
  assert.ok(!byName(R, 'Elena Ramirez')[0].zombie, 'unknown payees are never called zombie subscriptions');
  // fees by type
  const fee = Object.fromEntries(R.fees.groups.map((g) => [g.type, g]));
  assert.equal(fee.overdraft.count, 2); assert.equal(fee.overdraft.total, 68);
  assert.equal(fee.maintenance.count, 16); assert.equal(fee.atm.count, 4); assert.equal(fee.foreign.total, 4.05); assert.equal(fee.late.count, 2); assert.equal(fee.interest.count, 3);
  assert.equal(R.fees.reversedTotals.USD, 34, 'the overdraft reversal is noticed');
  assert.equal(R.txns.filter((t) => /ATM WITHDRAW/.test(t.desc))[0].fee, null, 'an ATM withdrawal is not a fee');
});
test('totals and the leak estimate add up, and each subscription counts once', () => {
  const R = check('chase-checking.csv', 'chase-card.csv');
  const T = R.totals.USD;
  assert.equal(T.yearly, Math.round(R.active.reduce((a, s) => a + s.annual, 0) * 100) / 100);
  assert.equal(T.subs + T.bills, R.active.length);
  const parts = Object.values(T.leakParts).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(parts - T.leaks) < 0.02);
  // Netflix: increase only (30/yr). Audible, Peacock: whole yearly cost (trial/intro). VPN overlap: the cheaper one. Spotify double: 11.99.
  assert.equal(T.leakParts.increases, 30 + 120); // Netflix + Xfinity
  assert.equal(T.leakParts.trials, 179.4 + 95.88);
  assert.equal(T.leakParts.overlaps, 47.88); assert.equal(T.leakParts.doubles, 11.99);
  assert.equal(T.review, R.zombies.reduce((a, s) => Math.round((a + s.annual) * 100) / 100, 0));
});
test('price thresholds: under 5% no flag, 5% amber, 15% red', () => {
  const mk = (amts) => { let i = 0; const txns = amts.map((a, k) => E.enrich({ id: 'x' + k, file: 'f', fileName: 'f', fileKind: 'card', layout: 't', date: E.dates.addMonths('2026-01-05', k), amount: a, dir: 'out', desc: 'NETFLIX.COM', vendorRaw: '', typeRaw: '', checkNo: '', category: '', ledgerMethod: '', currency: 'USD' })); return E.findRecurring(txns, { today: '2026-06-10' }).series[0]; };
  assert.equal(mk([10, 10, 10, 10.49]).flag, null);
  assert.equal(mk([10, 10, 10, 10.5]).flag, 'amber');
  assert.equal(mk([10, 10, 10, 11.49]).flag, 'amber');
  assert.equal(mk([10, 10, 10, 11.5]).flag, 'red');
});
test('a $0 authorisation before the first charge counts as a free trial', () => {
  const rows = [['2026-01-01', 0], ['2026-01-15', 9.99], ['2026-02-15', 9.99], ['2026-03-15', 9.99]].map(([d, a], k) => E.enrich({ id: 'z' + k, file: 'f', fileName: 'f', fileKind: 'card', layout: 't', date: d, amount: a, dir: 'out', desc: 'CALM.COM', vendorRaw: '', typeRaw: '', checkNo: '', category: '', ledgerMethod: '', currency: 'USD' }));
  const s = E.findRecurring(rows, { today: '2026-03-20' }).series[0];
  assert.deepEqual(s.trial, { date: '2026-01-01', amount: 0, firstFull: '2026-01-15' });
});
test('charges after the user marked a subscription cancelled are found', () => {
  const R0 = check('chase-card.csv'); const hulu = one(R0, 'Hulu');
  const R = E.analyze(load('chase-card.csv').flatMap((r) => r.txns), { today: TODAY, marks: { [hulu.id]: { status: 'cancelled', date: '2026-07-20' } } });
  const h = one(R, 'Hulu'); assert.deepEqual(h.afterCancel.map((t) => t.date), ['2026-08-11', '2026-09-11']);
  assert.equal(R.totals.USD.leakParts.afterCancel, 19.98);
});
test('euros and pounds stay separate; Spanish and UK fees and names are found', () => {
  const R = check('spanish-bank-eur.csv', 'uk-bank-gbp.csv');
  assert.deepEqual(R.currencies.sort(), ['EUR', 'GBP']);
  const nfE = R.series.find((s) => s.name === 'Netflix' && s.currency === 'EUR'); assert.equal(nfE.flag, 'amber'); assert.equal(nfE.latest, 13.99);
  const nfG = R.series.find((s) => s.name === 'Netflix' && s.currency === 'GBP'); assert.equal(nfG.latest, 10.99);
  assert.equal(R.fees.groups[0].type, 'maintenance'); assert.equal(R.fees.groups[0].currency, 'EUR');
  assert.ok(R.series.some((s) => s.name === 'Pure Gym Ltd' && s.cat === 'fit'), 'catch-all entries keep the name from the statement');
  assert.ok(!R.series.some((s) => /NOMINA|Salary/i.test(s.name)));
});
test('fee keywords: types, reversals, and lookalikes that are not fees', () => {
  const f = (s) => (E.feeType(s) || {}).type || null;
  assert.equal(f('OVERDRAFT FEE FOR A $42.17 ITEM'), 'overdraft'); assert.equal(f('NSF RETURNED ITEM FEE'), 'overdraft');
  assert.equal(f('MONTHLY SERVICE FEE'), 'maintenance'); assert.equal(f('Monthly Maintenance Fee'), 'maintenance'); assert.equal(f('COMISION MANTENIMIENTO'), 'maintenance');
  assert.equal(f('NON-CHASE ATM FEE-WITH'), 'atm'); assert.equal(f('ATM SURCHARGE'), 'atm');
  assert.equal(f('FOREIGN TRANSACTION FEE'), 'foreign'); assert.equal(f('INTL TRANSACTION FEE'), 'foreign');
  assert.equal(f('LATE FEE'), 'late'); assert.equal(f('INTEREST CHARGE:PURCHASES'), 'interest'); assert.equal(f('ANNUAL MEMBERSHIP FEE'), 'annual');
  assert.equal(E.feeType('OVERDRAFT FEE REVERSAL').reversal, true);
  for (const s of ['NETFLIX.COM', 'ATM WITHDRAWAL 0012 MAIN ST', 'PLANET FIT CLUB DUES', 'FEEDING AMERICA DONATION']) assert.equal(E.feeType(s), null, s);
});
test('cross-file duplicates (same export added twice) are counted once', () => {
  const a = E.parseInput(fx('chase-card.csv'), { id: 'a', name: 'a.csv' }), b = E.parseInput(fx('chase-card.csv'), { id: 'b', name: 'b.csv' });
  const R = E.analyze([...a.txns, ...b.txns], { today: TODAY });
  const R1 = check('chase-card.csv');
  assert.equal(R.totals.USD.yearly, R1.totals.USD.yearly);
  assert.equal(R.doubles.length, 0);
});
test('calendar file: all-day events, alarms, CRLF and folding', () => {
  const ics = E.toICS([{ date: '2026-11-04', title: 'Cancel Netflix, maybe; really', desc: 'line1\nline2', alarms: [7, 1] }], '2026-10-13T00:00:00.000Z');
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/); assert.match(ics, /DTSTART;VALUE=DATE:20261104\r\n/); assert.match(ics, /DTEND;VALUE=DATE:20261105\r\n/);
  assert.match(ics, /SUMMARY:Cancel Netflix\\, maybe\\; really/); assert.match(ics, /TRIGGER:-P7D/); assert.match(ics, /TRIGGER:-P1D/);
  assert.ok(ics.split('\r\n').every((l) => l.length <= 75));
});
