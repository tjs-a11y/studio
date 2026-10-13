// Page chrome shared by every WorldSource Commodity Desk page: language, display currency,
// on-device storage, data loading and the Desk plan state.
import { STRINGS, LANGS, LOCALES, NAMES, pickLang, t } from './i18n.js';
import { seriesById } from './core.js';

const KEY = 'commodities:v1';
export const store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } },
  set(patch) { const v = { ...store.get(), ...patch }; try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode: lasts this visit */ } return v; },
};
let mem = {}; // fallback when storage is blocked
export const prefs = () => ({ ...mem, ...store.get() });
export const savePrefs = (p) => { mem = { ...mem, ...p }; store.set(p); };

export const state = { lang: 'en', ccy: 'USD', latest: null, loaded: false, pro: false, welcome: false };
export const tr = (key, vars) => t(state.lang, key, vars);
export const locale = () => LOCALES[state.lang] || 'en-US';
export const nameOf = (id) => (NAMES[state.lang] && NAMES[state.lang][id]) || (seriesById(id) || { name: id }).name;
export const unitName = (u) => tr(`u.${u}`);

const nfCache = new Map();
export function money(v, ccy = 'USD', opts = {}) {
  if (!Number.isFinite(v)) return '—';
  const digits = opts.digits ?? (Math.abs(v) < 10 ? 2 : Math.abs(v) >= 100000 ? 0 : 2);
  const k = `${locale()}|${ccy}|${digits}`;
  if (!nfCache.has(k)) { try { nfCache.set(k, new Intl.NumberFormat(locale(), { style: 'currency', currency: ccy, minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, Math.abs(v) < 1 ? 4 : digits) })); } catch (e) { nfCache.set(k, { format: (x) => `${x.toFixed(2)} ${ccy}` }); } }
  return nfCache.get(k).format(v);
}
export const numFmt = (v, d = 2) => (Number.isFinite(v) ? new Intl.NumberFormat(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v) : '—');
export const pctFmt = (v, d = 1) => (Number.isFinite(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + numFmt(Math.abs(v), d) + '%' : '—');
export function dateFmt(d) {
  if (!d) return '';
  try {
    if (/^\d{4}-\d{2}$/.test(d)) return new Intl.DateTimeFormat(locale(), { year: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}-15T00:00:00Z`));
    return new Intl.DateTimeFormat(locale(), { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${d.slice(0, 10)}T00:00:00Z`));
  } catch (e) { return d; }
}
let ccyNames;
export const ccyName = (c) => { try { ccyNames = ccyNames && ccyNames.lang === state.lang ? ccyNames : Object.assign(new Intl.DisplayNames([locale()], { type: 'currency' }), { lang: state.lang }); return ccyNames.of(c); } catch (e) { return c; } };
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// latest.json, loaded once. Resolves to null when missing or broken: pages then say "unavailable".
let latestP;
export function loadLatest() {
  latestP = latestP || fetch('/commodities/data/latest.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((j) => (j && Array.isArray(j.series) ? j : null)).catch(() => null);
  return latestP;
}
export const currencies = (latest) => (latest && latest.fx && latest.fx.eur ? ['USD', 'EUR', ...Object.keys(latest.fx.eur).filter((c) => c !== 'USD').sort()] : ['USD']);

function applyI18n() {
  document.documentElement.lang = state.lang;
  for (const el of document.querySelectorAll('[data-i18n]')) { const k = el.getAttribute('data-i18n'); if (STRINGS.en[k] !== undefined) el.textContent = tr(k); }
}
function fillControls() {
  const ls = document.getElementById('lang');
  if (ls) { ls.innerHTML = Object.entries(LANGS).map(([k, v]) => `<option value="${k}"${k === state.lang ? ' selected' : ''}>${v}</option>`).join(''); }
  const cs = document.getElementById('ccy');
  if (cs) { cs.innerHTML = currencies(state.latest).map((c) => `<option value="${c}"${c === state.ccy ? ' selected' : ''}>${c} · ${esc(ccyName(c))}</option>`).join(''); }
}

// Boot the chrome; `render` is called on load and whenever language, currency or plan changes.
export async function boot(render) {
  const p = prefs();
  state.lang = pickLang(new URL(location.href).searchParams.get('lang') || p.lang, navigator.languages || [navigator.language]);
  state.ccy = p.ccy || 'USD';
  applyI18n(); fillControls();
  const rerender = () => { applyI18n(); fillControls(); render(); };
  document.getElementById('lang')?.addEventListener('change', (e) => { state.lang = e.target.value; savePrefs({ lang: state.lang }); nfCache.clear(); rerender(); });
  document.getElementById('ccy')?.addEventListener('change', (e) => { state.ccy = e.target.value; savePrefs({ ccy: state.ccy }); rerender(); });
  render();
  state.latest = await loadLatest();
  state.loaded = true;
  if (!currencies(state.latest).includes(state.ccy)) state.ccy = 'USD';
  rerender();
  if (window.Studio) window.Studio.init({ tool: 'commodities', onChange: (s) => { state.pro = !!s.pro; state.welcome = !!s.welcome; rerender(); } });
}

export function upgrade(interval, msgEl) {
  if (!window.Studio) return;
  window.Studio.upgrade('desk', interval).catch((e) => {
    if (!msgEl) return;
    msgEl.className = 'msg err';
    msgEl.textContent = /not switched on|not on sale|unknown|not found/i.test(e.message || '') ? tr('plan.soon') : (e.message || 'Something went wrong. Please try again.');
  });
}
