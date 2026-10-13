// From a reading to the "What this needs from you" card, the checklist, calendar events and saved items.
// Pure functions: t = translator from i18n.mjs, fmt = { date(d), money(v, cur), time(t) } formatters.
import { daysBetween } from './extract.mjs';

// Editable fields, each with its confidence ('high' | 'medium' | 'low' | 'you' once the user sets it)
export function toFields(r) {
  const d = r.deadline;
  const c = r.contacts || {};
  return {
    action: r.action.value, actionConf: r.action.value ? r.action.conf : 'low', also: r.action.also || [],
    date: d ? d.value : null, time: d ? d.time : null, dkind: d ? d.kind : null, dateConf: d ? d.conf : 'low', computed: d ? d.computed || null : null, sentence: d ? d.sentence : '',
    amount: r.amount ? r.amount.value : null, currency: r.amount ? r.amount.currency : 'USD', amountConf: r.amount ? r.amount.conf : 'low', amountLabel: r.amount ? r.amount.label : null,
    lateFee: r.lateFee,
    from: r.from.value || '', fromConf: r.from.value ? r.from.conf : 'low',
    ref: r.ref ? r.ref.value : '', refMasked: r.ref ? r.ref.masked : '', refLabel: r.ref ? r.ref.label : '', refConf: r.ref ? (r.refs.length > 1 ? 'medium' : 'high') : 'low',
    phone: c.phones && c.phones[0] || '', email: c.emails && c.emails[0] || '', url: c.urls && c.urls[0] || '', address: c.address || '',
    contactConf: c.phones && c.phones.length + c.emails.length + c.urls.length ? (c.phones.length + c.emails.length + c.urls.length > 2 ? 'medium' : 'high') : 'low',
    letterDate: r.letterDate ? r.letterDate.value : null, letterDateConf: r.letterDate ? r.letterDate.conf : 'low',
    title: r.title || '', kind: r.kind, lang: r.lang, sensitive: r.sensitive || [],
    others: (r.deadlines || []).filter((x) => !d || x.value !== d.value || x.kind !== d.kind).map((x) => ({ value: x.value, kind: x.kind, time: x.time, computed: !!x.computed })),
  };
}

// The one-line answer: "Pay $142.18 by Tue, Oct 27, 2026"
export function headline(f, t, fmt) {
  if (!f.action && !f.date) return t('head.none');
  const from = f.from || t('them');
  const money = f.amount != null ? fmt.money(f.amount, f.currency) : '';
  const what = f.action === 'pay' && money ? t('do.payAmt', { a: money, from }) : t('do.' + (f.action || 'other'), { from });
  const amt = money && ['renew', 'cancel', 'check'].includes(f.action) ? ` (${money})` : '';
  const when = f.date ? ' ' + t('head.' + (f.dkind === 'appear' || f.dkind === 'appointment' ? 'on' : 'by'), { d: fmt.date(f.date) + (f.time ? ' ' + fmt.time(f.time) : '') }) : '';
  return (what + amt + when).trim();
}
export function daysText(date, today, t) {
  if (!date) return '';
  const n = daysBetween(today, date);
  if (n === 0) return t('days.today'); if (n === 1) return t('days.tomorrow'); if (n === -1) return t('days.yesterday');
  return n > 0 ? t('days.in', { n }) : t('days.ago', { n: -n });
}

// The checklist: short steps for the main action, plus safety notes by letter type.
export function checklist(f, t, fmt) {
  const L = [], add = (k, v) => L.push(t('ck.' + k, v));
  const d = f.date ? fmt.date(f.date) : null, amt = f.amount != null ? fmt.money(f.amount, f.currency) : null;
  const last4 = f.refMasked ? f.refMasked.replace(/[^A-Za-z0-9]/g, '').slice(-4) : '';
  switch (f.action) {
    case 'pay':
      add(amt ? 'payCheck' : 'payCheckNo', { a: amt });
      if (d) add('payBy', { d });
      add('payOfficial', { u: f.url ? ` (${f.url})` : '' });
      add('payKeep');
      if (f.lateFee) add('payLate', { a: fmt.money(f.lateFee.value, f.lateFee.currency) });
      add('payCant');
      break;
    case 'respond':
      add('respRead'); add('respGather'); if (d) add('respBy', { d }); else add('respNoDate');
      break;
    case 'sign':
      add('signRead'); if (d) add('signBy', { d }); else add('signReturn'); add('signCopy');
      if (f.amount != null) add('signPay', { a: amt });
      break;
    case 'appear':
      if (d) add('appCal', { d: d + (f.time ? ' ' + fmt.time(f.time) : '') });
      add('appWay', { a: f.address ? ` (${f.address})` : '' }); add('appBring'); add('appCant');
      break;
    case 'renew':
      add('renDecide'); if (d) add('renOn', { d, a: amt ? ` (${amt})` : '' }); add('renCancel'); add('renCompare');
      break;
    case 'cancel':
      add('canDecide'); if (d) add('canBy', { d, a: amt ? ` (${amt})` : '' }); add('canConfirm'); add('canWatch');
      break;
    case 'call':
      if (f.phone) add('callNum', { p: f.phone }); add('callNotes');
      break;
    default:
      add('otherRead'); if (d) add('otherDate', { d });
  }
  if (f.also.includes('call') && f.action !== 'call' && f.phone) add('callNum', { p: f.phone });
  if (last4 && ['pay', 'call', 'respond', 'cancel'].includes(f.action)) add('haveRef', { r: '…' + last4 });
  if (f.computed) add(f.computed.noLetterDate ? 'compNoDate' : f.computed.fromReceipt ? 'compReceipt' : 'compLetter', { n: f.computed.n, from: fmt.date(f.computed.from) });
  if (['bill', 'tax', 'ticket', 'other'].includes(f.kind) && f.action === 'pay') add('scam');
  if (['jury', 'court', 'tax'].includes(f.kind)) add('legal');
  if (f.dkind !== 'appear' && f.dkind !== 'appointment' && f.date) add('remind');
  return L;
}

const DESC_SEP = '\n';
// A calendar event for one deadline (all-day unless there is a time). Reminders 7 days and 1 day before.
export function eventFor(f, t, fmt, uid) {
  if (!f.date) return null;
  const title = headline({ ...f, date: null }, t, fmt);
  const desc = [
    f.from && `${t('f.from')}: ${f.from}`,
    f.amount != null && `${t('f.amount')}: ${fmt.money(f.amount, f.currency)}`,
    f.refMasked && `${t('f.ref')}: ${f.refMasked}`,
    f.phone && `${t('f.phone')}: ${f.phone}`, f.email && `${t('f.email')}: ${f.email}`, f.url && `${t('f.web')}: ${f.url}`,
    '', t('ics.foot'),
  ].filter((x) => x !== false && x != null).join(DESC_SEP);
  return { uid: uid || `pilot-${f.date}-${(f.from || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`, date: f.date, time: f.time || null, title, desc, location: ['appear'].includes(f.action) ? f.address || '' : '', alarms: [7, 1] };
}

// A saved item from the card's fields (only what's needed; the reference is stored masked)
export function itemFrom(f, t, fmt) {
  return {
    title: f.title || headline({ ...f, date: null }, t, fmt), action: f.action || 'other', from: f.from, date: f.date, time: f.time, kind: f.dkind,
    amount: f.amount, currency: f.currency, refMasked: f.refMasked, phone: f.phone, email: f.email, url: f.url, source: 'letter',
  };
}
// Fields back from a saved item (for drafts and calendar files from the timeline)
export function fieldsFromItem(it) {
  return { action: it.action, also: [], date: it.date, time: it.time, dkind: it.kind, amount: it.amount, currency: it.currency, from: it.from, refMasked: it.ref, ref: '', phone: it.phone, email: it.email, url: it.url, title: it.title, address: '', kind: 'other', computed: null };
}
