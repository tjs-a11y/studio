// Calendar files, reply drafts, the timeline (store, groups, weekly summary, Saver import, backup) and the card.
// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs, fold, trigger } from '../js/ics.mjs';
import { draft, mailto, KINDS, FOR_ACTION } from '../js/replies.mjs';
import * as St from '../js/store.mjs';
import { toFields, headline, checklist, eventFor, itemFrom, daysText } from '../js/card.mjs';
import { read } from '../js/extract.mjs';
import { makeT } from '../js/i18n.mjs';
import { sample } from '../js/sample.mjs';
import { LETTERS } from './letters.mjs';

const TODAY = '2026-10-13';
const memStore = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
const fmtEN = { date: (d) => d, short: (d) => d, money: (v, c) => `${c === 'EUR' ? '€' : '$'}${v.toFixed(2)}`, time: (t) => t };

test('ics: valid calendar, all-day and timed events, reminders 7 days and 1 day before, escaping and folding', () => {
  const s = buildIcs([
    { uid: 'a', date: '2026-10-27', title: 'Pay $142.18 to Lakeside Power & Water; account, ref', desc: 'Line one\nLine two' },
    { uid: 'b', date: '2026-11-16', time: '08:00', title: 'Jury service', location: '200 Court Plaza, Maple City' },
    { uid: 'c', date: 'not a date', title: 'skipped' },
  ], { now: new Date('2026-10-13T15:00:00Z') });
  assert.ok(s.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')); assert.ok(s.endsWith('END:VCALENDAR\r\n'));
  assert.equal((s.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(s, /DTSTART;VALUE=DATE:20261027\r\nDTEND;VALUE=DATE:20261028/);
  assert.match(s, /DTSTART:20261116T080000\r\nDTEND:20261116T090000/);
  assert.match(s, /SUMMARY:Pay \$142\.18 to Lakeside Power & Water\\; account\\, ref/);
  assert.match(s, /DESCRIPTION:Line one\\nLine two/); assert.match(s, /LOCATION:200 Court Plaza\\, Maple City/);
  assert.match(s, /DTSTAMP:20261013T150000Z/); assert.match(s, /UID:a@quickwell\.app/);
  assert.deepEqual([...s.matchAll(/TRIGGER:([^\r]+)/g)].map((m) => m[1]), ['-P6DT15H', '-PT15H', '-P7D', '-P1D']);
  assert.equal(trigger(7, false), '-P6DT15H'); assert.equal(trigger(1, false), '-PT15H');
  for (const line of s.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  const long = fold('DESCRIPTION:' + 'ñ'.repeat(80));
  assert.ok(long.split('\r\n ').every((l) => new TextEncoder().encode(l).length <= 75)); assert.equal(long.replace(/\r\n /g, ''), 'DESCRIPTION:' + 'ñ'.repeat(80));
});

test('reply drafts: five kinds in two languages, details filled, [brackets] for the rest, no legal claims or threats', () => {
  const f = { from: 'Lakeside Power & Water', ref: '4410-2297-8831', letterDate: 'Oct 2, 2026', deadline: 'Oct 27, 2026', amount: '$142.18', name: 'Sam Rivera' };
  for (const lang of ['en', 'es']) for (const k of KINDS) {
    const d = draft(k, f, lang);
    assert.ok(d.subject.includes('4410-2297-8831'), `${lang} ${k} subject`);
    assert.ok(d.body.includes('Lakeside Power & Water') && d.body.includes('Sam Rivera'), `${lang} ${k} body`);
    assert.ok(!/lawsuit|sue\b|attorney|demand|legal action|guarantee|demanda|abogado/i.test(d.body), `${lang} ${k}: no threats or legal claims`);
  }
  assert.match(draft('extension', f).body, /act by Oct 27, 2026[\s\S]*extend the deadline to \[new date\]/);
  assert.match(draft('paid', f).body, /I paid \$142\.18 on \[date\] by \[payment method\]/);
  assert.match(draft('cancel', {}, 'en').body, /^Hello,\n\nI'm writing about your recent letter\.\n\nPlease cancel \[my subscription/);
  assert.match(draft('reschedule', { deadline: 'Nov 16, 2026 8:00 AM' }).body, /scheduled for Nov 16, 2026 8:00 AM/);
  assert.match(draft('clarify', f, 'es').body, /^Hola, equipo de Lakeside Power & Water:\n\nLes escribo por su carta del Oct 2, 2026 \(referencia 4410-2297-8831\)\./);
  assert.match(draft('extension', {}, 'en').body, /\[Your name\]/);
  assert.equal(mailto('a@b.example', 'S 1', 'B&2'), 'mailto:a%40b.example?subject=S%201&body=B%262');
  assert.deepEqual(FOR_ACTION.appear[0], 'reschedule'); assert.deepEqual(FOR_ACTION.pay[0], 'extension');
});

test('store: clean items, masked references, blocked storage, load/save/clear', () => {
  const s = memStore();
  const it = St.makeItem({ title: 'x'.repeat(300), action: 'hack', amount: '12.345', ref: '4410-2297-8831', date: '2026-13-45', time: '9am', currency: 'usd', source: 'evil' });
  assert.equal(it.title.length, 120); assert.equal(it.action, 'other'); assert.equal(it.amount, 12.35); assert.equal(it.ref, '••••-••••-8831');
  assert.equal(it.date, null); assert.equal(it.time, null); assert.equal(it.currency, 'USD'); assert.equal(it.source, 'manual');
  assert.equal(St.makeItem({ amount: null }).amount, null); assert.equal(St.makeItem({ amount: '' }).amount, null); assert.equal(St.makeItem({ amount: 0 }).amount, 0);
  assert.equal(St.makeItem({ ref: '••••-••••-8831' }).ref, '••••-••••-8831', 'already-masked references are kept, not masked again');
  assert.ok(St.save({ items: [it], seenWeek: '2026-W42' }, s));
  assert.deepEqual(St.load(s).items.map((i) => i.id), [it.id]); assert.equal(St.load(s).seenWeek, '2026-W42');
  St.clear(s); assert.deepEqual(St.load(s), { items: [], seenWeek: null });
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.deepEqual(St.load(blocked), { items: [], seenWeek: null }); assert.equal(St.save({ items: [] }, blocked), false); assert.doesNotThrow(() => St.clear(blocked));
  s.setItem(St.KEY, '{not json'); assert.deepEqual(St.load(s).items, []);
});

test('timeline groups and the weekly summary', () => {
  const mk = (date, extra = {}) => St.makeItem({ title: date || 'none', date, action: 'pay', amount: 10, ...extra });
  const items = [mk('2026-10-10'), mk('2026-10-13'), mk('2026-10-20'), mk('2026-10-21'), mk('2026-11-12'), mk('2026-11-13'), mk(null), mk('2026-10-14', { done: true }), mk('2026-10-15', { currency: 'EUR', amount: 5 }), mk('2026-10-16', { action: 'appear' })];
  const g = Object.fromEntries(St.groups(items, TODAY).map((x) => [x.key, x.items.map((i) => i.title)]));
  assert.deepEqual(g, { overdue: ['2026-10-10'], week: ['2026-10-13', '2026-10-15', '2026-10-16', '2026-10-20'], month: ['2026-10-21', '2026-11-12'], later: ['2026-11-13'], nodate: ['none'], done: ['2026-10-14'] });
  const s = St.summary(items, TODAY);
  assert.equal(s.count, 5); assert.deepEqual(s.totals, { USD: 30, EUR: 5 }); assert.equal(s.week_key, '2026-W42');
  assert.equal(St.weekKey('2027-01-01'), '2026-W53'); assert.equal(St.weekKey('2026-01-01'), '2026-W01'); assert.equal(St.weekKey('2026-12-28'), '2026-W53');
});

test('Saver import is read only: kept subscriptions (no date yet), "check it stopped" after cancelling, saver:due:v1 dates', () => {
  const saver = { marks: {
    'netflix|monthly': { status: 'keep', date: '2026-10-01', item: { id: 'netflix|monthly', name: 'Netflix', currency: 'USD', latest: 17.99, perYear: 12 } },
    'gym|monthly': { status: 'cancelled', date: '2026-10-05', item: { id: 'gym|monthly', name: 'Planet Fitness', currency: 'USD', latest: 24.99, perYear: 12 } },
    'old|monthly': { status: 'cancelled', date: '2026-01-05', item: { id: 'old|monthly', name: 'Old', currency: 'USD', latest: 5, perYear: 12 } },
    'audible|monthly': { status: 'lowered', newPrice: '7.95', date: '2026-10-02', item: { id: 'audible|monthly', name: 'Audible', currency: 'USD', latest: 14.95, perYear: 12 } },
    'dup|monthly': { status: 'refunded', amount: 11.99, item: { id: 'dup|monthly', name: 'Spotify', currency: 'USD', latest: 11.99, perYear: 12 } },
    'bad': { status: 'keep' },
  }, history: [] };
  const raw = JSON.stringify(saver);
  const s = memStore({ 'saver:v1': raw, 'saver:due:v1': JSON.stringify([{ id: 'netflix|monthly', name: 'Netflix', next: '2026-11-01', cancelBy: '2026-10-30' }, { id: 'hulu|monthly', name: 'Hulu', amount: 9.99, currency: 'USD', next: '2026-10-25' }]) });
  const inc = St.fromSaver(s, TODAY);
  const by = Object.fromEntries(inc.map((i) => [i.title, i]));
  assert.deepEqual(Object.keys(by).sort(), ['Audible', 'Hulu', 'Netflix', 'Planet Fitness']);
  assert.equal(by.Netflix.date, '2026-10-30'); assert.equal(by.Netflix.action, 'renew'); assert.equal(by.Netflix.amount, 17.99);
  assert.equal(by.Audible.amount, 7.95); assert.equal(by.Audible.date, null);
  assert.equal(by['Planet Fitness'].date, '2026-11-07'); assert.equal(by['Planet Fitness'].action, 'check'); assert.ok(by['Planet Fitness'].suggested);
  assert.equal(by.Hulu.date, '2026-10-25'); assert.ok(inc.every((i) => i.source === 'saver' && i.sid.startsWith('saver:')));
  assert.equal(s.getItem('saver:v1'), raw, 'Saver storage is never written');
  const m1 = St.mergeSaver([], inc); const m2 = St.mergeSaver(m1.items, St.fromSaver(s, TODAY));
  assert.equal(m1.added, 4); assert.equal(m2.added, 0);
  assert.deepEqual(St.fromSaver(memStore(), TODAY), []); assert.deepEqual(St.fromSaver(memStore({ 'saver:v1': 'garbage' }), TODAY), []);
});

test('backup and restore: round trip, wrong files refused, duplicates skipped', () => {
  const items = [St.makeItem({ title: 'A', date: '2026-10-20', ref: '12345678' }), St.makeItem({ title: 'B' })];
  const text = St.backup(items, new Date('2026-10-13T00:00:00Z'));
  assert.equal(JSON.parse(text).exported, '2026-10-13T00:00:00.000Z');
  const r = St.restore(text, []); assert.ok(r.ok); assert.equal(r.added, 2); assert.deepEqual(r.items, items);
  assert.equal(St.restore(text, items).added, 0);
  assert.deepEqual(St.restore('nope', []), { ok: false, error: 'json' }); assert.deepEqual(St.restore('{"items":[]}', []), { ok: false, error: 'format' });
});

test('card: headline, days left, checklist by action, calendar event, saved item (English and Spanish)', () => {
  const t = makeT('en');
  const f = toFields(read(LETTERS.utility.text, { today: TODAY }));
  assert.equal(headline(f, t, fmtEN), 'Pay $142.18 to Lakeside Power & Water by 2026-10-27');
  assert.equal(daysText(f.date, TODAY, t), 'in 14 days'); assert.equal(daysText(TODAY, TODAY, t), 'today'); assert.equal(daysText('2026-10-12', TODAY, t), 'yesterday');
  const ck = checklist(f, t, fmtEN);
  assert.ok(ck[0].includes('$142.18')); assert.ok(ck.some((s) => s.includes('Paying late adds $15.00'))); assert.ok(ck.some((s) => s.includes('(ending …8831)')));
  const ev = eventFor(f, t, fmtEN);
  assert.equal(ev.title, 'Pay $142.18 to Lakeside Power & Water'); assert.deepEqual(ev.alarms, [7, 1]); assert.match(ev.desc, /Reference: ••••-••••-8831/); assert.ok(!ev.desc.includes('4410-2297-8831'));
  const it = St.makeItem(itemFrom(f, t, fmtEN)); assert.equal(it.ref, '••••-••••-8831'); assert.equal(it.date, '2026-10-27');
  const jury = toFields(read(LETTERS.jury.text, { today: TODAY }));
  assert.equal(headline(jury, t, fmtEN), 'Be there: SUPERIOR COURT OF MAPLE COUNTY · Office of the Jury Commissioner on 2026-11-16 08:00');
  const jck = checklist(jury, t, fmtEN);
  assert.ok(jck.some((s) => /legal or tax matter/.test(s))); assert.ok(jck.some((s) => /Plan how you’ll get there \(200 Court Plaza/.test(s)));
  assert.equal(eventFor(jury, t, fmtEN).time, '08:00');
  const sub = toFields(read(LETTERS.subscription.text, { today: TODAY }));
  assert.equal(headline(sub, t, fmtEN), 'Cancel StreamNest if you don’t want it ($119.99) by 2026-10-31');
  const med = toFields(read(LETTERS.medical.text, { today: TODAY }));
  assert.ok(checklist(med, t, fmtEN).some((s) => /counted 30 days from today/.test(s)));
  const es = toFields(read(LETTERS.spanish.text, { today: TODAY }));
  assert.equal(headline(es, makeT('es'), fmtEN), 'Pagar €86.45 a Eléctrica del Norte S.A. antes del 2026-10-20');
  assert.equal(headline(toFields(read('Hello there, nothing to see.', { today: TODAY })), t, fmtEN), t('head.none'));
  for (const k of ['en', 'es']) { const s = sample(k, TODAY); const r = read(s, { today: TODAY }); assert.equal(r.deadline.value, '2026-10-27'); assert.equal(r.action.value, 'pay'); }
});
