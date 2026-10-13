// Quickwell Saver: proving the savings. Pure math plus a small on-device store.
// A mark is what the user says happened to one item:
//   keep       - they still want it (0 saved)
//   cancelled  - saves the yearly cost (amount per charge x charges per year), editable
//   lowered    - saves (old price - new price) x charges per year
//   refunded   - a one-time amount back (refunds, reversed fees), never counted per year
// Nothing here is a promise: these are the user's own numbers, added up.

const r2 = (x) => Math.round(x * 100) / 100;
export const STATUSES = ['keep', 'cancelled', 'lowered', 'refunded'];

// item: { id, name, currency, latest, perYear }  mark: { status, newPrice?, amount?, date }
export function savingFor(item, mark) {
  if (!mark || !mark.status || mark.status === 'keep') return { perYear: 0, oneTime: 0 };
  const per = item.perYear || 12;
  if (mark.status === 'cancelled') { const amt = mark.amount != null && mark.amount !== '' ? Number(mark.amount) : item.latest; return { perYear: r2(Math.max(0, amt) * per), oneTime: 0 }; }
  if (mark.status === 'lowered') { const np = Number(mark.newPrice); if (!isFinite(np) || np < 0) return { perYear: 0, oneTime: 0 }; return { perYear: r2(Math.max(0, item.latest - np) * per), oneTime: 0 }; }
  if (mark.status === 'refunded') { const a = Number(mark.amount); return { perYear: 0, oneTime: isFinite(a) && a > 0 ? r2(a) : 0 }; }
  return { perYear: 0, oneTime: 0 };
}

// items: { [id]: item }, marks: { [id]: mark } -> per-currency totals
export function totals(items, marks) {
  const out = {};
  for (const [id, mark] of Object.entries(marks || {})) {
    const item = items[id] || mark.item; if (!item) continue;
    const s = savingFor(item, mark); if (!s.perYear && !s.oneTime) continue;
    const t = out[item.currency] = out[item.currency] || { perYear: 0, oneTime: 0, count: 0 };
    t.perYear = r2(t.perYear + s.perYear); t.oneTime = r2(t.oneTime + s.oneTime); t.count++;
  }
  return out;
}
export const primaryTotal = (tot, fallback = 'USD') => {
  const e = Object.entries(tot).sort((a, b) => (b[1].perYear + b[1].oneTime) - (a[1].perYear + a[1].oneTime))[0];
  return e ? { currency: e[0], ...e[1] } : { currency: fallback, perYear: 0, oneTime: 0, count: 0 };
};

// History: one line per change, newest first. The item is stored with the mark so the history survives a new scan.
export function addHistory(history, item, mark, at) {
  const s = savingFor(item, mark);
  const entry = { id: item.id, name: item.name, currency: item.currency, status: mark.status, perYear: s.perYear, oneTime: s.oneTime, at: at || new Date().toISOString().slice(0, 10) };
  return [entry, ...(history || []).filter((h) => !(h.id === item.id && h.at === entry.at))].slice(0, 500);
}

// Shareable card text. Only an amount: never a merchant name, date or anything from the statement.
export const SHARE_URL = 'https://quickwell.app/saver/?ref=share-saver';
export function shareText(kind, amountText, lang = 'en') {
  const es = lang === 'es';
  if (kind === 'saved') return es ? `Recorté ${amountText} al año en fugas de dinero con Quickwell Saver` : `I cut ${amountText}/yr in money leaks with Quickwell Saver`;
  return es ? `Encontré ${amountText} al año en fugas de dinero con Quickwell Saver` : `I found ${amountText}/yr in money leaks with Quickwell Saver`;
}

// On-device storage (localStorage). Every call is wrapped: private mode or blocked storage just means "this visit only".
const KEY = 'saver:v1';
export function load(storage) {
  try { const j = JSON.parse((storage || globalThis.localStorage).getItem(KEY) || 'null'); return j && typeof j === 'object' ? { marks: j.marks || {}, history: j.history || [], lang: j.lang || null } : { marks: {}, history: [], lang: null }; }
  catch (e) { return { marks: {}, history: [], lang: null }; }
}
export function save(state, storage) {
  try { (storage || globalThis.localStorage).setItem(KEY, JSON.stringify({ marks: state.marks || {}, history: state.history || [], lang: state.lang || null })); return true; }
  catch (e) { return false; }
}
export function clear(storage) { try { (storage || globalThis.localStorage).removeItem(KEY); } catch (e) { /* ignore */ } }
