// Letters, phone scripts, cancel guides and the calendar. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { letter, script, guide, GUIDE_IDS, calendarFile, calendarEvents, ROSCA } from '../js/acts.mjs';

const base = { merchant: 'Netflix', amount: '$17.99', last: 'Sep 6, 2026', next: 'Nov 6, 2026', old: '$15.49', new: '$17.99', pct: '16%', stepDate: 'Jan 6, 2026' };
const KINDS = ['cancel', 'pushback', 'refund', 'fee'];

test('every letter names the merchant, has a subject, and fills placeholders when details are missing', () => {
  for (const lang of ['en', 'es']) for (const k of KINDS) {
    const l = letter(k, { ...base, charges: [{ date: 'Jul 14, 2026', amount: '$11.99' }], total: '$11.99', feeType: 'overdraft fee', fee: '$34.00', feeDate: 'Aug 19, 2026' }, lang);
    assert.ok(l.subject.length > 5 && l.body.length > 80, `${lang} ${k}`);
    if (k !== 'fee') assert.ok(l.body.includes('Netflix'), `${lang} ${k} merchant`);
    assert.match(l.body, lang === 'es' ? /\[Tu nombre\]/ : /\[Your name\]/);
    assert.ok(!/undefined|null|NaN|\$\{/.test(l.subject + l.body), `${lang} ${k}: template leak`);
  }
});
test('the user\'s own name and account replace the placeholders', () => {
  const l = letter('cancel', { ...base, name: 'Jordan Sample', account: 'jordan@example.com' }, 'en');
  assert.match(l.body, /Jordan Sample$/); assert.match(l.body, /Account: jordan@example\.com/); assert.ok(!/\[Your/.test(l.body));
});
test('cancel letter cites ROSCA §8403(3) only when the user says they signed up online in the U.S.', () => {
  assert.ok(!/8403|U\.S\.C\./.test(letter('cancel', base, 'en').body));
  const en = letter('cancel', { ...base, rosca: true }, 'en').body, es = letter('cancel', { ...base, rosca: true }, 'es').body;
  assert.match(en, /simple mechanisms for a consumer to stop recurring charges \(Restore Online Shoppers' Confidence Act, 15 U\.S\.C\. §8403\(3\)\)/);
  assert.match(es, /15 U\.S\.C\. §8403\(3\)/);
  assert.equal(ROSCA.cite, '15 U.S.C. §8403(3)');
});
test('no letter cites any other law, threatens, or promises a result', () => {
  for (const lang of ['en', 'es']) for (const k of KINDS) for (const rosca of [false, true]) {
    const b = letter(k, { ...base, rosca, charges: [], total: '$0', feeType: 'fee', fee: '$1' }, lang).body;
    const cites = b.match(/\d+ U\.S\.C\. §\s?\d+/g) || [];
    assert.ok(cites.every((c) => c === '15 U.S.C. §8403'), `${lang} ${k}: ${cites}`);
    assert.ok(!/click.to.cancel|Regulation E|Fair Credit Billing|CFPB|lawsuit|sue|attorney|guarantee|required by law to refund|demande|abogado|demanda/i.test(b), `${lang} ${k}`);
  }
});
test('refund letters cover double charges, charges after cancelling, unauthorised charges and trials', () => {
  const ch = [{ date: 'Jul 14, 2026', amount: '$11.99' }, { date: 'Jul 15, 2026', amount: '$11.99' }];
  assert.match(letter('refund', { ...base, reason: 'double', charges: ch, total: '$11.99' }, 'en').body, /charged twice[\s\S]*- Jul 15, 2026: \$11\.99[\s\S]*refund the duplicate charge of \$11\.99/);
  assert.match(letter('refund', { ...base, reason: 'afterCancel', cancelDate: 'Jul 20, 2026', charges: ch, total: '$23.98' }, 'en').body, /I cancelled on Jul 20, 2026/);
  assert.match(letter('refund', { ...base, reason: 'unauthorized', charges: ch, total: '$23.98' }, 'en').body, /didn't authorize/);
  assert.match(letter('refund', { ...base, reason: 'trial', charges: ch, total: '$23.98' }, 'es').body, /prueba/);
});
test('push-back and fee scripts are polite, specific and bilingual', () => {
  const p = script('pushback', base, 'en'); assert.match(p, /from \$15\.49 to \$17\.99/); assert.match(p, /confirm it by email/);
  const f = script('fee', { ...base, feeType: 'overdraft fee', fee: '$34.00', feeDate: 'Aug 19, 2026' }, 'es'); assert.match(f, /cortesía/); assert.match(f, /\$34\.00/);
  assert.match(letter('fee', { feeType: 'overdraft fee', fee: '$34.00', feeDate: 'Aug 19, 2026' }, 'en').body, /reverse it as a one-time courtesy/);
});
test('cancel guides exist for every kind in both languages and name no company', () => {
  for (const lang of ['en', 'es']) for (const id of GUIDE_IDS) {
    const g = guide(id, lang); assert.ok(g.title && g.steps.length >= 3, `${lang} ${id}`);
    assert.ok(!/Apple|Google|iPhone|Android|Netflix|Planet|Verizon|Comcast/i.test(g.title + g.steps.join(' ')), `${lang} ${id}: names a company`);
  }
  assert.equal(guide('nope').title, guide('online').title);
});
test('calendar: cancel-by reminders, monthly repeats, yearly alarms', () => {
  const s = (o) => ({ name: 'Netflix', cadence: 'monthly', cancelBy: '2026-11-04', next: '2026-11-06', ...o });
  const items = [{ series: s(), amount: '$17.99', next: 'Nov 6, 2026' }, { series: s({ name: 'Duolingo', cadence: 'annual', cancelBy: '2027-01-08' }), amount: '$84.99', next: 'Jan 10, 2027' }, { series: s({ name: 'Old', cancelBy: null }), amount: '$1', next: '' }];
  assert.equal(calendarEvents(items).length, 2);
  const ics = calendarFile(items, 'en', '2026-10-13T00:00:00.000Z');
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(ics, /DTSTART;VALUE=DATE:20261104\r\nDTEND;VALUE=DATE:20261105\r\nRRULE:FREQ=MONTHLY;COUNT=12\r\n/);
  assert.match(ics, /SUMMARY:Cancel Duolingo by today if you don't want it/);
  assert.match(ics, /TRIGGER:-P30D[\s\S]*TRIGGER:-P7D/);
  assert.match(calendarFile(items, 'es'), /SUMMARY:Cancela Netflix hoy si no lo quieres/);
});
