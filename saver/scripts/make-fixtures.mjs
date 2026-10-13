// Writes the synthetic test files in fixtures/ and the page's built-in sample (js/sample.mjs).
// Every person, account, amount and date is invented. Real merchant names appear only as statement labels,
// so the merchant list can be tested; their prices here are made up.
//   node scripts/make-fixtures.mjs
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fx = (n, s) => writeFileSync(join(root, 'fixtures', n), s);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pad = (n) => String(n).padStart(2, '0');
const d = (y, m, day) => { const t = new Date(Date.UTC(y, m - 1, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(day, last)); return t.toISOString().slice(0, 10); };
const months = (from, n, day) => Array.from({ length: n }, (_, i) => { const [y, m] = from.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1 + i, 1)); return d(t.getUTCFullYear(), t.getUTCMonth() + 1, day); });
const plusDays = (s, n) => { const t = new Date(s + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const mdy = (s) => `${s.slice(5, 7)}/${s.slice(8, 10)}/${s.slice(0, 4)}`;
const dmy = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const q = (s) => (/[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const money = (v) => v.toFixed(2);
const sortDesc = (rows) => rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

// ---------------------------------------------------------------- 1. Chase checking (header row, newest first)
{
  const r = []; const add = (date, desc, amt, type, details) => r.push({ date, desc, amt, type, details: details || (amt < 0 ? 'DEBIT' : 'CREDIT') });
  for (let i = 0; i < 26; i++) add(plusDays('2025-10-03', i * 14), 'ACME LOGISTICS PAYROLL PPD ID: 9100000001', 2150, 'ACH_CREDIT');
  months('2025-10', 12, 1).forEach((x) => add(x, 'ORIG CO NAME:OAKRIDGE APARTMENTS ORIG ID:1234567890 DESC DATE: CO ENTRY DESCR:RENT SEC:PPD TRACE#:0210000212', -1450, 'ACH_DEBIT'));
  months('2025-10', 12, 9).forEach((x, i) => add(x, 'COMCAST XFINITY PPD ID: 0000403020', i < 6 ? -79.99 : -89.99, 'ACH_DEBIT'));
  months('2025-10', 12, 21).forEach((x) => add(x, 'VERIZON WIRELESS PAYMENTS PPD ID: 2223344556', -85.0, 'ACH_DEBIT'));
  months('2025-10', 12, 17).forEach((x, i) => add(x, 'DUKE ENERGY PAYMENT PPD ID: 5600000017', -[96.4, 118.2, 142.75, 151.3, 139.8, 112.6, 94.1, 101.55, 133.9, 158.2, 149.65, 121.4][i], 'ACH_DEBIT'));
  months('2025-10', 12, 5).forEach((x) => add(x, 'PLANET FIT CLUB DUES 844-880-7180 NH', -24.99, 'DEBIT_CARD'));
  months('2025-10', 12, 14).forEach((x) => add(x, 'SPOTIFY USA 877-778-1161 NY', -11.99, 'DEBIT_CARD'));
  add('2026-07-15', 'SPOTIFY USA 877-778-1161 NY', -11.99, 'DEBIT_CARD'); // double charge
  months('2026-03', 7, 28).forEach((x) => add(x, 'MONTHLY SERVICE FEE', -12.0, 'FEE_TRANSACTION'));
  add('2026-05-03', 'OVERDRAFT FEE FOR A $42.17 ITEM - DETAILS: KROGER #0412', -34.0, 'FEE_TRANSACTION');
  add('2026-08-19', 'OVERDRAFT FEE FOR A $18.60 ITEM - DETAILS: SHELL OIL 5744', -34.0, 'FEE_TRANSACTION');
  add('2026-08-21', 'OVERDRAFT FEE REVERSAL', 34.0, 'FEE_TRANSACTION');
  ['2026-02-11', '2026-06-02', '2026-09-09'].forEach((x) => { add(x, 'NON-CHASE ATM FEE-WITH', -3.0, 'FEE_TRANSACTION'); add(x, 'NON-CHASE ATM WITHDRAW 0012 MAIN ST SPRINGFIELD IL', -60, 'ATM'); });
  months('2025-10', 12, 25).forEach((x) => add(x, 'CHASE CREDIT CRD AUTOPAY PPD ID: 4760039224', -620, 'ACH_DEBIT'));
  months('2025-10', 12, 2).forEach((x) => add(x, 'Online Transfer to SAV ...4412 transaction#: 1928374650', -200, 'ACCT_XFER'));
  for (let i = 0; i < 52; i++) add(plusDays('2025-10-04', i * 7), 'KROGER #0412 SPRINGFIELD IL', -(60 + Math.round(rnd() * 9000) / 100), 'DEBIT_CARD');
  sortDesc(r);
  let bal = 3200;
  const lines = ['Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #'];
  for (const x of r) { lines.push([x.details, mdy(x.date), q(x.desc), money(x.amt), x.type, money(bal), ''].join(',')); bal -= x.amt; }
  fx('chase-checking.csv', lines.join('\n') + '\n');
}

// ---------------------------------------------------------------- 2. Chase credit card (purchases negative)
let chaseCard;
{
  const r = []; const add = (date, desc, amt, cat = 'Shopping', type = 'Sale') => r.push({ date, desc, amt, cat, type });
  months('2025-10', 12, 6).forEach((x, i) => add(x, 'NETFLIX.COM NETFLIX.COM CA', i < 3 ? -15.49 : -17.99, 'Entertainment'));
  months('2025-10', 12, 11).forEach((x) => add(x, 'HULU 877-8244858 CA', -9.99, 'Entertainment'));
  add('2026-04-02', 'AUDIBLE ADBL.CO/PYMT NJ', -0.99, 'Entertainment');
  months('2026-05', 5, 2).forEach((x) => add(x, 'AUDIBLE ADBL.CO/PYMT NJ', -14.95, 'Entertainment'));
  months('2026-03', 7, 19).forEach((x, i) => add(x, 'PEACOCK TV 888-3263234 NY', i < 3 ? -1.99 : -7.99, 'Entertainment'));
  months('2025-10', 12, 23).forEach((x) => add(x, 'EXPRESSVPN.COM 302-2615540 DE', -12.95, 'Bills & Utilities'));
  months('2026-04', 6, 8).forEach((x) => add(x, 'SURFSHARK* VPN AMSTERDAM', -3.99, 'Bills & Utilities'));
  months('2025-10', 12, 15).forEach((x) => add(x, 'Amazon Prime*2K4LM81Q3 Amzn.com/bill WA', -14.99, 'Shopping'));
  months('2025-10', 12, 27).forEach((x) => add(x, 'APPLE.COM/BILL 866-712-7753 CA', -2.99, 'Bills & Utilities'));
  add('2026-06-12', 'FOREIGN TRANSACTION FEE', -2.85, 'Fees & Adjustments', 'Fee');
  add('2026-06-14', 'FOREIGN TRANSACTION FEE', -1.2, 'Fees & Adjustments', 'Fee');
  add('2026-02-25', 'LATE FEE', -30.0, 'Fees & Adjustments', 'Fee');
  for (let i = 0; i < 30; i++) add(plusDays('2025-10-07', i * 12), 'AMAZON MKTPL*2K4LM81Q3 Amzn.com/bill WA', -(8 + Math.round(rnd() * 7000) / 100));
  add('2026-03-30', 'AMAZON MKTPL*RT5521 Amzn.com/bill WA', 23.4, 'Shopping', 'Return');
  for (let i = 0; i < 50; i++) add(plusDays('2025-10-01', i * 7), 'STARBUCKS STORE 08812 SPRINGFIELD IL', -5.75, 'Food & Drink');
  months('2025-10', 12, 25).forEach((x) => add(x, 'Payment Thank You-Mobile', 620, '', 'Payment'));
  sortDesc(r);
  const lines = ['Transaction Date,Post Date,Description,Category,Type,Amount,Memo'];
  for (const x of r) lines.push([mdy(x.date), mdy(plusDays(x.date, 1)), q(x.desc), q(x.cat), x.type, money(x.amt), ''].join(','));
  chaseCard = lines.join('\n') + '\n';
  fx('chase-card.csv', chaseCard);
}

// ---------------------------------------------------------------- 3. American Express (charges positive)
{
  const r = []; const add = (date, desc, amt) => r.push({ date, desc, amt });
  months('2025-10', 12, 4).forEach((x, i) => add(x, 'DISNEY PLUS 888-905-7888 CA', i < 3 ? 10.99 : 13.99));
  add('2026-06-10', 'NYTIMES*NYTDIGITALSUBSCRIP NEW YORK NY', 4.0); add('2026-07-10', 'NYTIMES*NYTDIGITALSUBSCRIP NEW YORK NY', 4.0);
  months('2026-08', 2, 10).forEach((x) => add(x, 'NYTIMES*NYTDIGITALSUBSCRIP NEW YORK NY', 25.0));
  months('2025-10', 12, 16).forEach((x) => add(x, 'UBER *ONE MEMBERSHIP SAN FRANCISCO CA', 9.99));
  months('2026-02', 8, 20).forEach((x) => add(x, 'DOORDASH DASHPASS SAN FRANCISCO CA', 9.99));
  months('2026-03', 7, 22).forEach((x) => add(x, 'SPOTIFY P1A2B3C4 STOCKHOLM', 11.99));
  for (let i = 0; i < 14; i++) add(plusDays('2025-10-09', i * 26), 'UBER *TRIP HELP.UBER.COM CA', 11 + Math.round(rnd() * 2500) / 100);
  months('2025-10', 12, 28).forEach((x) => add(x, 'AUTOPAY PAYMENT - THANK YOU', -180));
  sortDesc(r);
  const lines = ['Date,Description,Card Member,Account #,Amount'];
  for (const x of r) lines.push([mdy(x.date), q(x.desc), 'J SAMPLE', '-31005', money(x.amt)].join(','));
  fx('amex.csv', lines.join('\n') + '\n');
}

// ---------------------------------------------------------------- 4. Capital One (Debit / Credit columns)
{
  const r = []; const add = (date, desc, debit, credit = '', cat = 'Other') => r.push({ date, desc, debit, credit, cat });
  add('2025-01-10', 'DUOLINGO PITTSBURGH PA', 59.99); add('2026-01-10', 'DUOLINGO PITTSBURGH PA', 84.99);
  months('2025-10', 12, 3).forEach((x, i) => add(x, 'MICROSOFT*XBOX GAME PASS MSBILL.INFO WA', i < 9 ? 16.99 : 19.99, '', 'Entertainment'));
  add('2026-04-26', 'PAST DUE FEE', 29.0, '', 'Fee/Interest Charge');
  ['2026-04-27', '2026-05-27', '2026-06-27'].forEach((x, i) => add(x, 'INTEREST CHARGE:PURCHASES', [18.42, 17.9, 16.05][i], '', 'Fee/Interest Charge'));
  for (let i = 0; i < 20; i++) add(plusDays('2025-10-12', i * 18), 'SHELL OIL 57444219200 SPRINGFIELD IL', 30 + Math.round(rnd() * 3000) / 100, '', 'Gas/Automotive');
  months('2025-10', 12, 20).forEach((x) => add(x, 'CAPITAL ONE MOBILE PYMT', '', 150, 'Payment/Credit'));
  sortDesc(r);
  const lines = ['Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit'];
  for (const x of r) lines.push([x.date, plusDays(x.date, 1), '7781', q(x.desc), q(x.cat), x.debit === '' ? '' : money(x.debit), x.credit === '' ? '' : money(x.credit)].join(','));
  fx('capital-one.csv', lines.join('\n') + '\n');
}

// ---------------------------------------------------------------- 5. Bank of America (summary block first)
{
  const r = []; const add = (date, desc, amt) => r.push({ date, desc, amt });
  months('2025-10', 12, 12).forEach((x) => add(x, 'GEICO *AUTO DES:INS PREM ID:8831200 INDN:J SAMPLE CO ID:9000123456 WEB', -142.3));
  months('2025-10', 12, 7).forEach((x) => add(x, 'LA FITNESS DES:DUES ID:44120 INDN:J SAMPLE CO ID:1112223334 PPD', -34.99));
  months('2025-10', 12, 3).forEach((x) => add(x, 'Zelle Transfer Conf# a1b2c3d4e; Ramirez, Elena', -150));
  months('2026-01', 9, 30).forEach((x) => add(x, 'Monthly Maintenance Fee', -12.0));
  months('2025-10', 12, 15).forEach((x) => add(x, 'ACME LOGISTICS DES:PAYROLL ID:000123 INDN:J SAMPLE CO ID:9100000001 PPD', 1200));
  r.sort((a, b) => (a.date < b.date ? -1 : 1));
  let bal = 2400; const body = r.map((x) => { bal += x.amt; return [mdy(x.date), q(x.desc), money(x.amt), q(bal.toLocaleString('en-US', { minimumFractionDigits: 2 }))].join(','); });
  const lines = ['Description,,Summary Amt.', 'Beginning balance as of 10/01/2025,,"2,400.00"', 'Total credits,,"14,400.00"', 'Total debits,,"-4,331.88"', `Ending balance as of 09/30/2026,,"${bal.toLocaleString('en-US', { minimumFractionDigits: 2 })}"`, '',
    'Date,Description,Amount,Running Bal.', '10/01/2025,Beginning balance as of 10/01/2025,,"2,400.00"', ...body];
  fx('bank-of-america.csv', lines.join('\n') + '\n');
}

// ---------------------------------------------------------------- 6. Wells Fargo (no header row)
{
  const r = []; const add = (date, amt, desc) => r.push({ date, amt, desc });
  for (let i = 0; i < 12; i++) { const x = plusDays('2026-07-01', i * 7); add(x, -79.99, `RECURRING PAYMENT AUTHORIZED ON ${x.slice(5, 7)}/${x.slice(8, 10)} HELLOFRESH 646-846-3663 NY S386${i}0911 CARD 9921`); }
  months('2026-04', 6, 18).forEach((x) => add(x, -16.99, `PURCHASE AUTHORIZED ON ${x.slice(5, 7)}/${x.slice(8, 10)} HOME CHEF CHICAGO IL S38620260${x.slice(5, 7)} CARD 9921`));
  add('2026-08-04', -2.5, 'ATM FEE NON-WF ATM'); add('2026-09-01', 1800, 'DEPOSIT');
  sortDesc(r);
  fx('wells-fargo.csv', r.map((x) => [mdy(x.date), money(x.amt), '*', '', x.desc].join(',')).join('\n') + '\n');
}

// ---------------------------------------------------------------- 7. A Spanish bank in euros (semicolons, day/month/year, comma decimals)
{
  const r = []; const add = (date, desc, amt) => r.push({ date, desc, amt });
  const eu = (v) => (v < 0 ? '-' : '') + Math.abs(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace(/\.(\d{2})$/, ',$1');
  months('2025-10', 12, 8).forEach((x, i) => add(x, 'NETFLIX.COM', i < 6 ? -12.99 : -13.99));
  months('2025-10', 12, 12).forEach((x) => add(x, 'SPOTIFY P2C3D4E5F6', -10.99));
  months('2025-10', 12, 1).forEach((x) => add(x, 'COMISION MANTENIMIENTO', -5));
  months('2025-10', 12, 20).forEach((x) => add(x, 'RECIBO MOVIL LINEA 6XX', -25));
  months('2025-10', 12, 3).forEach((x) => add(x, 'GIMNASIO MUNICIPAL CUOTA', -30));
  months('2025-10', 12, 28).forEach((x) => add(x, 'NOMINA EMPRESA EJEMPLO SL', 1850));
  sortDesc(r);
  fx('spanish-bank-eur.csv', ['Moneda: EUR', 'Fecha;Concepto;Importe;Saldo', ...r.map((x) => [dmy(x.date), x.desc, eu(x.amt), ''].join(';'))].join('\n') + '\n');
}

// ---------------------------------------------------------------- 8. A UK bank in pounds (money out / money in)
{
  const r = []; const add = (date, desc, out, inn) => r.push({ date, desc, out, inn });
  months('2026-04', 6, 9).forEach((x) => add(x, 'NETFLIX.COM', 10.99, ''));
  months('2026-04', 6, 14).forEach((x) => add(x, 'PURE GYM LTD', 24.99, ''));
  months('2026-04', 6, 25).forEach((x) => add(x, 'SALARY EXAMPLE LTD', '', 2100));
  sortDesc(r);
  fx('uk-bank-gbp.csv', ['Date,Description,Money Out,Money In,Balance', ...r.map((x) => [dmy(x.date), x.desc, x.out === '' ? '' : '£' + money(x.out), x.inn === '' ? '' : '£' + money(x.inn), ''].join(','))].join('\n') + '\n');
}

// ---------------------------------------------------------------- 9. Text copied from a PDF statement
fx('statement-pdf-text.txt', `Springfield Community Bank   Statement period 06/15/2026 - 09/14/2026
Page 1 of 3
Date Description Amount Balance
06/16 NETFLIX.COM 17.99 2,431.02
06/18 PEACOCK TV 888-3263234 NY 7.99 2,423.03
06/20 SPOTIFY USA 11.99 2,411.04
06/28 MONTHLY SERVICE FEE 12.00 2,399.04
07/01 PAYROLL DEPOSIT ACME 2,150.00 CR 4,549.04
07/16 NETFLIX.COM 17.99 4,531.05
07/18 PEACOCK TV 888-3263234 NY 7.99 4,523.06
07/20 SPOTIFY USA 11.99 4,511.07
07/21 SPOTIFY USA 11.99 4,499.08
07/28 MONTHLY SERVICE FEE 12.00 4,487.08
08/16 NETFLIX.COM 17.99 4,469.09
08/18 PEACOCK TV 888-3263234 NY 7.99 4,461.10
08/20 SPOTIFY USA 11.99 4,449.11
08/22 OVERDRAFT FEE 34.00 4,415.11
08/28 MONTHLY SERVICE FEE 12.00 4,403.11
09/02 FOREIGN TRANSACTION FEE 1.45 4,401.66
Total withdrawals 213.33
`);

// ---------------------------------------------------------------- 10. Text copied from a banking app
fx('banking-app-paste.txt', `Today
Starbucks
-$5.75
Yesterday
Payroll Acme Logistics
+$2,150.00
Sep 14, 2026
Netflix
-$17.99
Hulu
-$9.99
Aug 14, 2026
Netflix
-$17.99
Hulu
-$9.99
Monthly Service Fee
-$12.00
Jul 14, 2026
Netflix
-$17.99
Hulu
-$9.99
Jun 14, 2026
Netflix
-$15.49
Hulu
-$9.99
`);

// ---------------------------------------------------------------- the page's built-in sample (the Chase card file)
writeFileSync(join(root, 'js', 'sample.mjs'), `// Built-in sample for "Try a sample" (fictional; generated by scripts/make-fixtures.mjs from fixtures/chase-card.csv).\nexport const SAMPLE_NAME = 'sample-card.csv';\nexport const SAMPLE = ${JSON.stringify(chaseCard)};\n`);
console.log('fixtures written');
