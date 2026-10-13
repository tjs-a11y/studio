// Extraction rules over realistic synthetic letters, plus the date, amount, reference and contact readers.
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, findDates, findAmounts, findRefs, findContacts, findTimes, mask, addBusinessDays, addMonths, detectLang, daysLeft } from '../js/extract.mjs';
import { LETTERS } from './letters.mjs';

const TODAY = '2026-10-13';

for (const [name, L] of Object.entries(LETTERS)) {
  test(`letter: ${name}`, () => {
    const r = read(L.text, { today: TODAY }); const w = L.want;
    if (w.lang) assert.equal(r.lang, w.lang, 'lang'); else assert.equal(r.lang, 'en', 'lang');
    assert.equal(r.kind, w.kind, 'kind');
    assert.equal(r.action.value, w.action, 'action');
    if (w.aconfAction) assert.equal(r.action.conf, w.aconfAction, 'action confidence');
    if (w.alsoAction) assert.ok(r.action.also.includes(w.alsoAction), `also ${w.alsoAction}: ${r.action.also}`);
    assert.equal(r.deadline && r.deadline.value, w.deadline, 'deadline');
    assert.equal(r.deadline.kind, w.dkind, 'deadline kind');
    if (w.dconf) assert.equal(r.deadline.conf, w.dconf, 'deadline confidence');
    if (w.time) assert.equal(r.deadline.time, w.time, 'time'); else assert.equal(r.deadline.time, null, 'no time');
    if (w.computed) assert.ok(r.deadline.computed, 'computed from a relative phrase');
    if (w.amount === null) assert.equal(r.amount, null, 'no amount');
    else if (w.amount !== undefined) { assert.equal(r.amount && r.amount.value, w.amount, 'amount'); assert.equal(r.amount.currency, w.currency || 'USD', 'currency'); }
    if (w.aconf) assert.equal(r.amount.conf, w.aconf, 'amount confidence');
    assert.equal(r.letterDate ? r.letterDate.value : null, w.letterDate, 'letter date');
    assert.match(r.from.value || '', w.from, 'from');
    if (w.fromConf) assert.equal(r.from.conf, w.fromConf);
    if (w.ref) assert.equal(r.ref && r.ref.masked, w.ref, 'masked reference');
    if (w.lateFee) assert.equal(r.lateFee && r.lateFee.value, w.lateFee, 'late fee');
    if (typeof w.phone === 'string') assert.equal(r.contacts.phones[0], w.phone, 'phone'); else if (w.phone) assert.ok(r.contacts.phones.length, 'a phone');
    if (w.email) assert.equal(r.contacts.emails[0], w.email, 'email');
    if (w.url) assert.ok(r.contacts.urls.some((u) => w.url.test(u)), `url ${r.contacts.urls}`);
    if (w.address) assert.match(r.contacts.address || '', w.address, 'address');
    if (w.title) assert.match(r.title || '', w.title, 'title');
    if (w.also) {
      const o = r.deadlines.find((c) => c.kind === w.also.kind && c.value === w.also.value);
      assert.ok(o, `other deadline ${w.also.kind} ${w.also.value}: ${r.deadlines.map((c) => c.kind + ':' + c.value)}`);
      if (w.also.computed) assert.ok(o.computed);
      if (w.also.fromReceipt) assert.ok(o.computed.fromReceipt);
    }
    // every deadline carries a confidence; the full reference never leaks into the masked value
    for (const c of r.deadlines) assert.ok(['high', 'medium', 'low'].includes(c.conf));
    if (r.ref) assert.notEqual(r.ref.masked, r.ref.value);
  });
}

test('relative deadlines: computed from the letter date, business days skip weekends, receipt-based phrases are flagged', () => {
  const r = read('Notice date: October 1, 2026\nYou must respond within 30 days of the date of this letter.', { today: TODAY });
  assert.equal(r.deadline.value, '2026-10-31'); assert.equal(r.deadline.kind, 'respond'); assert.equal(r.deadline.conf, 'medium');
  assert.deepEqual({ n: r.deadline.computed.n, from: r.deadline.computed.from }, { n: 30, from: '2026-10-01' });
  const b = read('Date: Friday, October 9, 2026\nPlease reply within ten (10) business days.', { today: TODAY });
  assert.equal(b.deadline.value, '2026-10-23'); assert.ok(b.deadline.computed.business);
  assert.equal(addBusinessDays('2026-10-09', 1), '2026-10-12');
  const w = read('Dated 10/02/2026. Pay within 2 weeks of the date of this invoice.', { today: TODAY });
  assert.equal(w.deadline.value, '2026-10-16');
  const m = read('October 31, 2026\nSubmit the form within 1 month of the date of this letter.', { today: TODAY });
  assert.equal(m.deadline.value, '2026-11-30'); assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  const rc = read('October 1, 2026\nReturn the questionnaire within 5 days of receiving this letter.', { today: TODAY });
  assert.ok(rc.deadline.computed.fromReceipt);
  const es = read('Madrid, 1 de octubre de 2026\nDebe responder dentro de los 10 días hábiles siguientes a la fecha de esta carta.', { today: TODAY });
  assert.equal(es.lang, 'es'); assert.equal(es.deadline.value, '2026-10-15'); assert.ok(es.deadline.computed.business);
  // without a letter date: counted from today, low confidence, and the reading says so
  const nd = read('Please respond within 15 days.', { today: TODAY });
  assert.equal(nd.deadline.value, '2026-10-28'); assert.equal(nd.deadline.conf, 'low'); assert.ok(nd.deadline.computed.noLetterDate);
  // "for 30 days" / "30-day trial" are not deadlines
  assert.equal(read('Enjoy the service for 30 days. Your 30 days of history are below.', { today: TODAY }).deadline, null);
});

test('dates: many formats, English and Spanish, with sensible years', () => {
  const v = (s, o) => findDates(s, { anchor: TODAY, ...o }).map((d) => d.value);
  assert.deepEqual(v('October 13, 2026 · Oct 5 2026 · Oct. 7, 2026 · Sept 9, 2026 · November 3rd, 2026'), ['2026-10-13', '2026-10-05', '2026-10-07', '2026-09-09', '2026-11-03']);
  assert.deepEqual(v('13 October 2026 · 5th of November, 2026 · Monday, November 16, 2026'), ['2026-10-13', '2026-11-05', '2026-11-16']);
  assert.deepEqual(v('10/13/2026 · 10-13-26 · 2026-10-13 · 25/10/2026'), ['2026-10-13', '2026-10-13', '2026-10-13', '2026-10-25']);
  assert.deepEqual(v('05/11/2026', { lang: 'es' }), ['2026-11-05'], 'day-first in Spanish');
  assert.deepEqual(v('13 de octubre de 2026 · lunes, 2 de nov. de 2026 · 1º de diciembre de 2026'), ['2026-10-13', '2026-11-02', '2026-12-01']);
  assert.deepEqual(v('Due Jan 5'), ['2027-01-05'], 'a date without a year in the near future rolls into next year');
  assert.deepEqual(v('Paid Oct 1'), ['2026-10-01']);
  assert.deepEqual(v('you may 5 times · 2/30/2026 · 13/13/2026 · call 555-123-4567 · ID 12-34-5678'), [], 'no false dates');
  assert.ok(findDates('5/6/2026', { anchor: TODAY })[0].ambiguous);
  assert.deepEqual(findTimes('at 8:00 a.m. · 2:30 PM · 2 pm · a las 10:30 · 12:15 am').map((t) => t.value), ['08:00', '14:30', '14:00', '10:30', '00:15']);
});

test('amounts: symbols, codes, thousands and decimal commas, and labels', () => {
  const a = (s, l) => findAmounts(s, l).map((x) => [x.value, x.currency]);
  assert.deepEqual(a('$1,234.56 · $45 · USD 12.00 · 12.00 USD · US$7.50'), [[1234.56, 'USD'], [45, 'USD'], [12, 'USD'], [12, 'USD'], [7.5, 'USD']]);
  assert.deepEqual(a('86,45 € · €1.234,50 · 1.234,50 EUR · £30.00 · 250 pesos', 'es'), [[86.45, 'EUR'], [1234.5, 'EUR'], [1234.5, 'EUR'], [30, 'GBP'], [250, 'MXN']]);
  const L = findAmounts('Previous balance $131.40\nTotal amount due: $142.18\nA late fee of $15.00 will be added.\nJurors are paid $15 per day.');
  assert.deepEqual(L.map((x) => x.label), ['other', 'due', 'lateFee', 'other']);
  const r = read('Bill\nPrevious balance $500.00\nPayments received $500.00\nAmount due $61.20 by 11/02/2026', { today: TODAY });
  assert.equal(r.amount.value, 61.2); assert.equal(r.amount.conf, 'high');
});

test('references are masked to the last 4, never keep SSN-shaped numbers, and skip dates and phones', () => {
  assert.equal(mask('4410-2297-8831'), '••••-••••-8831'); assert.equal(mask('802231'), '••••31'); assert.equal(mask('AB12'), '••12');
  const refs = findRefs('Account number: 4410 2297 8831 Date: Oct 1\nCase #: CV-26-1182\nPolicy No. HMA-55120-778\nSSN: 123-45-6789\nInvoice: 10/02/2026\nAcct ending in 9921');
  assert.deepEqual(refs.map((r) => r.value), ['4410 2297 8831', 'CV-26-1182', 'HMA-55120-778', '9921']);
  const r = read('Your SSN: 123-45-6789\nAmount due $10.00 by Nov 1, 2026', { today: TODAY });
  assert.deepEqual(r.sensitive, ['ssn']); assert.ok(!JSON.stringify(r.refs).includes('6789'));
});

test('contacts: phones (US, toll-free, Spain), emails without the recipient, web addresses, mailing address', () => {
  const c = findContacts('To: me@example.com\nCall us at (555) 201-4410 or 1-800-555-0142. Fax: 555-201-9999.\nTel. +34 912 345 678\nEmail help@lakeside.example.com or visit www.lakeside.example.com/help.\nMail payments to: PO Box 12, Fairview, OH 44120');
  assert.deepEqual(c.phones, ['(555) 201-4410', '1-800-555-0142', '+34 912 345 678']);
  assert.deepEqual(c.emails, ['help@lakeside.example.com']);
  assert.deepEqual(c.urls, ['www.lakeside.example.com/help']);
  assert.equal(c.address, 'PO Box 12, Fairview, OH 44120');
});

test('language detection and days left', () => {
  assert.equal(detectLang(LETTERS.spanish.text), 'es'); assert.equal(detectLang(LETTERS.utility.text), 'en');
  assert.equal(daysLeft('2026-10-27', TODAY), 14); assert.equal(daysLeft('2026-10-10', TODAY), -3);
});

test('robust to messy input: empty text, OCR noise, Windows line ends, curly quotes, no crash', () => {
  for (const s of ['', '   ', '$$$ ///', 'Due date: 13/45/2026', 'Total due: $', '\u0000\u0001', 'x'.repeat(20000)]) assert.doesNotThrow(() => read(s, { today: TODAY }));
  const r = read('LAKESIDE POWER & WATER\r\nStatement date: Oct 2, 2026\r\nTotal amount due : $ 142.18\r\nDue date : Oct 27, 2026\r\nWe’ll  add a late fee.', { today: TODAY });
  assert.equal(r.deadline.value, '2026-10-27'); assert.equal(r.amount.value, 142.18); assert.equal(r.action.value, 'pay');
  const empty = read('Hello, just checking in. Hope you are well.', { today: TODAY });
  assert.equal(empty.deadline, null); assert.equal(empty.amount, null); assert.equal(empty.action.value, null);
});

test('many deadline phrasings (short synthetic snippets)', () => {
  const cases = [
    // [text, deadline, kind, action]
    ['Statement date: 10/01/2026\nPAYMENT DUE BY 10/27/2026\nAMOUNT DUE $88.20', '2026-10-27', 'due', 'pay'],
    ['Date: Oct 1, 2026\nPlease respond by: Nov 2 so we can update your file.', '2026-11-02', 'respond', 'respond'],
    ['Your membership expires 12/31/26. Renew online to keep your benefits.', '2026-12-31', 'expires', 'renew'],
    ['Your appointment: 11/03/2026 10:15 AM with Dr. Lee. Please arrive early.', '2026-11-03', 'appointment', 'appear'],
    ['RENEWAL DATE 01/15/2027 · Your plan renews automatically. Renewal price $59.00', '2027-01-15', 'renewal', 'renew'],
    ['October 2, 2026\nYou must reply no later than thirty (30) days from the date of this letter.', '2026-11-01', 'respond', 'respond'],
    ['Notice date: 10/05/2026. Return the signed form on or before October 30, 2026. Please sign where marked.', '2026-10-30', 'respond', 'sign'],
    ['Your hearing is scheduled for December 3, 2026 at 9:00 AM. You must appear in person.', '2026-12-03', 'appear', 'appear'],
    ['Free trial ends on Oct 20, 2026. Cancel before Oct 20, 2026 to avoid being charged $14.99.', '2026-10-20', 'cancelBy', 'cancel'],
    ['Fecha: 2 de octubre de 2026\nDebe pagar 120,00 € antes del 30 de octubre de 2026.', '2026-10-30', 'due', 'pay'],
    ['Fecha de emisión: 01/10/2026\nFecha de vencimiento: 25/10/2026\nImporte total: 45,10 €', '2026-10-25', 'due', 'pay'],
    ['Su cita es el martes, 3 de noviembre de 2026 a las 9:30. Por favor, llegue 10 minutos antes.', '2026-11-03', 'appointment', 'appear'],
    ['Deadline: November 9, 2026. Submit your documents through the portal.', '2026-11-09', 'deadline', 'respond'],
  ];
  for (const [text, date, kind, action] of cases) {
    const r = read(text, { today: TODAY });
    assert.equal(r.deadline && r.deadline.value, date, text); assert.equal(r.deadline.kind, kind, text); assert.equal(r.action.value, action, text);
  }
});

test('OCR-style noise: stray spaces, line breaks inside sentences, smart quotes, ALL CAPS', () => {
  const r = read(`HARBORVIEW  MUTUAL INSURANCE COMPANY\nMAILING DATE:  OCTOBER 9, 2026\nPOLICY NUMBER : HMA-55120-778\nTO KEEP YOUR COVERAGE, PLEASE PAY $1,148.00 BY\nNOVEMBER 20, 2026.\nQUESTIONS? CALL US AT 555-310-8800.`, { today: TODAY });
  assert.equal(r.deadline.value, '2026-11-20'); assert.equal(r.amount.value, 1148); assert.equal(r.action.value, 'pay');
  assert.equal(r.letterDate.value, '2026-10-09'); assert.equal(r.ref.masked, '•••-••••0-778'); assert.equal(r.contacts.phones[0], '555-310-8800');
});
