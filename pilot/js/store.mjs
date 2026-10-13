// Quickwell Pilot: saved items, the "what's due" timeline, the weekly summary, Saver import and backups.
// Everything lives in this browser (localStorage). Every storage call is wrapped: blocked storage = this visit only.
// We never store the letter text, only the fields the user saved; reference numbers are stored masked.
import { addDays, daysBetween, mask } from './extract.mjs';

export const KEY = 'pilot:v1';
export const SAVER_KEY = 'saver:v1';          // Quickwell Saver's own store (read only, never written here)
export const SAVER_DUE_KEY = 'saver:due:v1';  // optional list of upcoming renewals, if Saver writes one (see README)
export const ACTIONS = ['pay', 'respond', 'sign', 'call', 'renew', 'appear', 'cancel', 'check', 'other'];
const S = (storage) => storage || globalThis.localStorage;

const str = (v, n = 120) => (v == null ? '' : String(v)).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().startsWith(v);
const isTime = (v) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
let seq = 0;
export const newId = () => 'p' + Date.now().toString(36) + (++seq).toString(36) + Math.random().toString(36).slice(2, 6);

// A clean item from anything (a reading, a form, a backup file). Unknown fields are dropped.
export function makeItem(f = {}, now = new Date()) {
  const amount = f.amount === '' || f.amount == null ? null : Number(f.amount);
  return {
    id: str(f.id, 40) || newId(),
    title: str(f.title, 120) || str(f.from, 80) || 'Untitled',
    action: ACTIONS.includes(f.action) ? f.action : 'other',
    from: str(f.from, 80),
    date: isDate(f.date) ? f.date : null,
    time: isTime(f.time) ? f.time : null,
    kind: str(f.kind, 20) || null,
    amount: amount != null && isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : null,
    currency: /^[A-Z]{3}$/.test(f.currency || '') ? f.currency : 'USD',
    ref: f.refMasked ? str(f.refMasked, 40) : f.ref ? (String(f.ref).includes('•') ? str(f.ref, 40) : mask(str(f.ref, 40))) : '',
    phone: str(f.phone, 40), email: str(f.email, 80), url: str(f.url, 160),
    notes: str(f.notes, 500),
    source: ['letter', 'manual', 'saver'].includes(f.source) ? f.source : 'manual',
    sid: str(f.sid, 160) || null,
    suggested: !!f.suggested,
    done: !!f.done,
    created: isDate(f.created) ? f.created : now.toISOString().slice(0, 10),
  };
}

export function load(storage) {
  try {
    const j = JSON.parse(S(storage).getItem(KEY) || 'null');
    if (!j || typeof j !== 'object') return { items: [], seenWeek: null };
    return { items: Array.isArray(j.items) ? j.items.map((i) => makeItem(i)) : [], seenWeek: j.seenWeek || null };
  } catch (e) { return { items: [], seenWeek: null }; }
}
export function save(state, storage) {
  try { S(storage).setItem(KEY, JSON.stringify({ v: 1, items: state.items || [], seenWeek: state.seenWeek || null })); return true; } catch (e) { return false; }
}
export function clear(storage) { try { S(storage).removeItem(KEY); } catch (e) { /* ignore */ } }

// Sort: open items by date (undated last), done items at the end
export const sortItems = (items) => [...items].sort((a, b) => (a.done - b.done) || ((a.date || '9999') < (b.date || '9999') ? -1 : (a.date || '9999') > (b.date || '9999') ? 1 : 0) || (a.time || '') .localeCompare(b.time || ''));

// The timeline: overdue · next 7 days · next 30 days · later · no date yet · done
export const GROUPS = ['overdue', 'week', 'month', 'later', 'nodate', 'done'];
export function groups(items, today) {
  const g = Object.fromEntries(GROUPS.map((k) => [k, []]));
  for (const it of sortItems(items)) {
    if (it.done) g.done.push(it);
    else if (!it.date) g.nodate.push(it);
    else { const d = daysBetween(today, it.date); g[d < 0 ? 'overdue' : d <= 7 ? 'week' : d <= 30 ? 'month' : 'later'].push(it); }
  }
  return GROUPS.map((key) => ({ key, items: g[key] })).filter((x) => x.items.length);
}

// ISO week key, e.g. 2026-W42 (the weekly summary shows once per week, on the first visit)
export function weekKey(date) {
  const d = new Date(date + 'T00:00:00Z'); const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const y = d.getUTCFullYear(); const jan4 = new Date(Date.UTC(y, 0, 4));
  const w = 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
// What's due this week: overdue items + the next 7 days, and money due per currency
export function summary(items, today) {
  const open = items.filter((i) => !i.done && i.date);
  const overdue = sortItems(open.filter((i) => i.date < today));
  const week = sortItems(open.filter((i) => i.date >= today && daysBetween(today, i.date) <= 7));
  const totals = {};
  for (const i of [...overdue, ...week]) if (i.amount && ['pay', 'renew'].includes(i.action)) totals[i.currency] = Math.round(((totals[i.currency] || 0) + i.amount) * 100) / 100;
  return { overdue, week, totals, count: overdue.length + week.length, week_key: weekKey(today) };
}

// ------------------------------------------------------------------ Quickwell Saver (read only)
// Saver keeps { marks: { [seriesId]: { status, date, newPrice?, item: { id, name, currency, latest, perYear } } } }.
// It has no charge dates in storage today, so:
//   keep / lowered -> a renewal item with no date yet (the user adds the next charge date)
//   cancelled      -> "check it stopped": one billing cycle after the cancel date (our suggestion)
// If Saver ever writes saver:due:v1 = [{ id, name, amount, currency, next, cancelBy }], those dates are used.
export function fromSaver(storage, today) {
  let saver = null, due = [];
  try { saver = JSON.parse(S(storage).getItem(SAVER_KEY) || 'null'); } catch (e) { saver = null; }
  try { const d = JSON.parse(S(storage).getItem(SAVER_DUE_KEY) || 'null'); if (Array.isArray(d)) due = d; } catch (e) { due = []; }
  const out = [];
  const byId = new Map(due.filter((d) => d && d.id).map((d) => [String(d.id), d]));
  const marks = saver && typeof saver.marks === 'object' && saver.marks ? saver.marks : {};
  for (const [id, m] of Object.entries(marks)) {
    if (!m || !m.item || !m.item.name) continue;
    const it = m.item, d = byId.get(id); byId.delete(id);
    if (m.status === 'keep' || m.status === 'lowered') {
      const amount = m.status === 'lowered' && isFinite(Number(m.newPrice)) ? Number(m.newPrice) : it.latest;
      out.push(makeItem({ sid: 'saver:' + id, source: 'saver', action: 'renew', kind: 'renewal', title: it.name, from: it.name, amount, currency: it.currency,
        date: d && isDate(d.cancelBy) ? d.cancelBy : d && isDate(d.next) ? d.next : null }));
    } else if (m.status === 'cancelled' && isDate(m.date)) {
      const cycle = Math.round(365 / (it.perYear || 12)) + 3;
      const date = addDays(m.date, cycle);
      if (daysBetween(today, date) < -30) continue; // long past: nothing left to check
      out.push(makeItem({ sid: 'saver:' + id + ':check', source: 'saver', action: 'check', kind: 'check', title: it.name, from: it.name, amount: it.latest, currency: it.currency, date, suggested: true }));
    }
  }
  for (const [id, d] of byId) {
    if (!d.name) continue;
    out.push(makeItem({ sid: 'saver:' + id, source: 'saver', action: 'renew', kind: isDate(d.cancelBy) ? 'cancelBy' : 'renewal', title: d.name, from: d.name, amount: d.amount, currency: d.currency, date: isDate(d.cancelBy) ? d.cancelBy : isDate(d.next) ? d.next : null }));
  }
  return out;
}
// Adds Saver items not already in the list; returns { items, added }
export function mergeSaver(items, incoming) {
  const have = new Set(items.map((i) => i.sid).filter(Boolean));
  const add = incoming.filter((i) => !have.has(i.sid));
  return { items: [...items, ...add], added: add.length };
}

// ------------------------------------------------------------------ backup
export function backup(items, now = new Date()) {
  return JSON.stringify({ app: 'quickwell-pilot', v: 1, exported: now.toISOString(), items }, null, 2);
}
export function restore(text, existing = []) {
  let j; try { j = JSON.parse(text); } catch (e) { return { ok: false, error: 'json' }; }
  if (!j || j.app !== 'quickwell-pilot' || !Array.isArray(j.items)) return { ok: false, error: 'format' };
  const ids = new Set(existing.map((i) => i.id));
  const add = j.items.slice(0, 2000).map((i) => makeItem(i)).filter((i) => !ids.has(i.id));
  return { ok: true, items: [...existing, ...add], added: add.length };
}
