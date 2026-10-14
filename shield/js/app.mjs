// Quickwell Shield page. Everything runs here, in the browser: messages are never uploaded and links never opened.
import { check, segments, LIKELY, SUSPICIOUS } from './check.mjs';
import { makeT, pickLang, fill, STR } from './i18n.mjs';
import * as Kit from './kit.mjs';
import { EDITIONS } from './tips.mjs';

const TOOL = 'shield';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sget = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const sset = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } };

const SAMPLE = {
  en: 'USPS: Your package is on hold due to an incomplete address. Please update it within 24 hours or it will be returned: https://usps.parcel-redeliver.top/track',
  es: 'Correos: su paquete está retenido por una dirección incompleta. Actualice su dirección en las próximas 24 horas o será devuelto: https://correos-entregas.top/es',
};

const state = { pro: false, result: null, store: Kit.load(), alertKind: 'toll' };
let lang = pickLang(location.search, sget('shield:lang'), navigator.language);
let t = makeT(lang);
const locale = () => (lang === 'es' ? 'es-ES' : 'en-US');
const rName = (id) => t('r.' + id)[0];
const rWhy = (id, detail) => fill(t('r.' + id)[1], detail || {});

// ------------------------------------------------------------------ language
function applyLang() {
  t = makeT(lang);
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach((el) => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
  const other = lang === 'es' ? 'en' : 'es';
  const b = $('#langBtn'); b.textContent = t('lang'); b.setAttribute('lang', other); b.setAttribute('aria-label', STR[other].lang);
  $('#alertPick').innerHTML = Kit.ALERT_KINDS.map((k) => `<option value="${k}">${esc(t('al.' + k)[0])}</option>`).join('');
  $('#alertPick').value = state.alertKind;
}
$('#langBtn').addEventListener('click', () => { lang = lang === 'es' ? 'en' : 'es'; sset('shield:lang', lang); applyLang(); renderAll(); });

let toastTimer;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2600); }
function showPlan() {
  toast(t('lockedMsg'));
  const p = $('#planCard'); p.scrollIntoView({ behavior: 'smooth', block: 'start' }); p.classList.add('flash'); setTimeout(() => p.classList.remove('flash'), 1600);
  setTimeout(() => $('[data-buy="year"]').focus({ preventScroll: true }), 400);
}
$$('[data-unlock]').forEach((b) => b.addEventListener('click', showPlan));
function download(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
async function copy(text) { try { await navigator.clipboard.writeText(text); toast(t('copied')); return true; } catch (e) { return false; } }

// ------------------------------------------------------------------ checking
function runCheck(text, { save = true } = {}) {
  const clean = String(text || '').trim();
  if (clean.replace(/\s+/g, ' ').length < 6) { const m = $('#inMsg'); m.textContent = t('tooShort'); m.classList.remove('hidden'); return; }
  $('#inMsg').classList.add('hidden');
  state.result = check(clean);
  if (save && state.pro) { Kit.addEntry(state.store, state.result); renderHistory(); }
  renderResult();
  $('#results').classList.remove('hidden');
  $('#levelCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#levelText').focus({ preventScroll: true });
}
$('#checkBtn').addEventListener('click', () => runCheck($('#msgBox').value));
$('#sampleBtn').addEventListener('click', () => { $('#msgBox').value = SAMPLE[lang]; runCheck(SAMPLE[lang], { save: false }); });
$('#clearBtn').addEventListener('click', () => { $('#msgBox').value = ''; state.result = null; $('#results').classList.add('hidden'); $('#msgBox').focus(); });

function stepsFor(r) {
  if (r.level === 'none') return ['noneCheck', 'contact'];
  const k = r.kinds;
  const out = ['noClick', 'noPay', 'contact'];
  for (const x of ['family', 'toll', 'delivery', 'gov', 'tech', 'job', 'invest', 'code']) if (k.includes(x)) out.push(x);
  out.push('clicked', 'report');
  return out;
}
const quote = (s) => { const v = String(s).replace(/\s+/g, ' ').trim(); return v.length > 90 ? v.slice(0, 87) + '…' : v; };

function renderResult() {
  const r = state.result; if (!r) return;
  const lc = $('#levelCard'); lc.className = `card level lvl-${r.level}`;
  $('#levelText').textContent = t('level.' + r.level);
  $('#levelSub').textContent = t('levelSub.' + r.level);
  // warning signs
  const signs = r.findings;
  $('#signsTitle').textContent = t('signsTitle', { n: signs.length });
  $('#signs').innerHTML = signs.length ? signs.map((f) => {
    const q = (f.spans || []).slice(0, 3).map((sp) => `<mark>${esc(quote(sp.text))}</mark>`).join(' ');
    return `<li class="sign w${Math.min(f.w, 4)}" data-rule="${esc(f.id)}"><div class="top"><b>${esc(rName(f.id))}</b><span class="pts" aria-label="${esc(t('pts', { n: f.w }))} points">${esc(t('pts', { n: f.w }))}</span></div><p>${esc(rWhy(f.id, f.detail))}</p>${q ? `<p class="trig small"><span class="muted">${esc(t('triggered'))}:</span> ${q}</p>` : ''}</li>`;
  }).join('') : `<li class="muted">${esc(t('signsNone'))}</li>`;
  // the message with marks
  $('#marked').innerHTML = segments(r.text, r.findings).map((s) => (s.ids.length ? `<mark title="${esc(s.ids.map(rName).join(', '))}" data-r="${esc(s.ids.join(' '))}">${esc(s.text)}</mark>` : esc(s.text))).join('');
  // links
  $('#linksCard').classList.toggle('hidden', !r.links.length);
  $('#links').innerHTML = r.links.map((l) => {
    const hits = l.results.filter((x) => x.hit);
    const body = hits.length ? `<ul class="small">${hits.map((x) => `<li><b>${esc(rName(x.id))}:</b> ${esc(rWhy(x.id, x.detail))}</li>`).join('')}</ul>` : `<p class="small">${esc(l.official ? t('linkOfficial', { brand: l.official }) : t('linkClean'))}</p>`;
    return `<li><code class="host">${esc(l.display)}</code>${body}</li>`;
  }).join('');
  // next steps
  $('#steps').innerHTML = stepsFor(r).map((k) => `<li>${esc(t('steps.' + k))}</li>`).join('');
  // what we checked
  $('#whatLede').textContent = t('whatLede', { s: SUSPICIOUS, l: LIKELY, p: r.score });
  const groups = [...r.groups.filter((g) => g !== 'link'), 'link', 'combo'];
  $('#what').innerHTML = groups.map((g) => {
    const rows = r.ran.filter((x) => x.group === g);
    if (!rows.length) return '';
    const extra = g === 'link' ? `<p class="small muted">${esc(r.links.length ? t('linksChecked', { n: r.links.length }) : t('noLinks'))}</p>` : '';
    return `<h3>${esc(t('grp.' + g))}</h3>${extra}<ul class="ran">${rows.map((x) => `<li class="${x.hit ? 'hit' : ''}" data-ran="${esc(x.id)}"><span>${esc(rName(x.id))}</span><span class="res">${esc(x.hit ? t('found') : t('notFound'))}${x.hit ? ` · ${esc(t('pts', { n: x.w }))}` : ''}</span></li>`).join('')}</ul>`;
  }).join('');
}

// ------------------------------------------------------------------ family kit
function renderKit() {
  $('#kitLocked').classList.toggle('hidden', state.pro);
  $('#kitBody').classList.toggle('hidden', !state.pro);
  $('#alertLocked').classList.toggle('hidden', state.pro);
  $('#alertBody').classList.toggle('hidden', !state.pro);
  if (!state.pro) return;
  const w = Kit.cleanWord($('#kitWord').value);
  const shown = $('#kitBlank').checked || !w ? '' : w;
  $('#walletWordOut').textContent = shown; $('#fridgeWordOut').textContent = shown;
  $$('.wordline').forEach((el) => el.classList.toggle('blank', !shown));
  renderAlert();
}
$('#kitSuggest').addEventListener('click', () => { $('#kitWord').value = Kit.suggestWord(t('words')); onWord(); });
$('#kitWord').addEventListener('input', onWord);
$('#kitBlank').addEventListener('change', renderKit);
$('#kitRemember').addEventListener('change', onWord);
function onWord() { if ($('#kitRemember').checked) Kit.saveWord($('#kitWord').value); else Kit.saveWord(''); renderKit(); }
$('#kitPrint').addEventListener('click', () => {
  document.body.classList.add('print-cards');
  const done = () => { document.body.classList.remove('print-cards'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(done, 1500);
});
$('#scriptCopy').addEventListener('click', () => copy(Kit.scriptText(t)));

function renderAlert() {
  const kind = state.alertKind;
  $('#alertText').textContent = Kit.alertText(t, kind);
  drawAlert($('#alertCanvas'), kind);
}
$('#alertPick').addEventListener('change', (e) => { state.alertKind = e.target.value; renderAlert(); });
function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = test; }
  if (line) ctx.fillText(line, x, y);
  return y + lh;
}
function drawAlert(c, kind) {
  const ctx = c.getContext('2d'); if (!ctx) return;
  const [title, body] = t('al.' + kind);
  ctx.fillStyle = '#f6f4ef'; ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = '#1f6b52'; ctx.fillRect(0, 0, 1080, 170);
  ctx.fillStyle = '#ffffff'; ctx.font = '700 64px system-ui, sans-serif'; ctx.fillText('⚠ ' + t('alertHead'), 70, 112);
  ctx.fillStyle = '#1d2420'; ctx.font = '800 76px system-ui, sans-serif';
  let y = wrap(ctx, title, 70, 320, 940, 90);
  ctx.font = '500 48px system-ui, sans-serif'; ctx.fillStyle = '#2b332e';
  wrap(ctx, body, 70, y + 50, 940, 66);
  ctx.fillStyle = '#5a6460'; ctx.font = '600 34px system-ui, sans-serif'; ctx.fillText(t('alertFoot'), 70, 1010);
}
const alertBlob = () => new Promise((res) => $('#alertCanvas').toBlob((b) => res(b), 'image/png'));
$('#alertPng').addEventListener('click', async () => { const b = await alertBlob(); if (b) download(`scam-alert-${state.alertKind}.png`, b); });
$('#alertCopy').addEventListener('click', () => copy(Kit.alertText(t, state.alertKind)));
$('#alertShare').addEventListener('click', async () => {
  const text = Kit.alertText(t, state.alertKind);
  try {
    const b = await alertBlob();
    const file = b && typeof File === 'function' ? new File([b], `scam-alert-${state.alertKind}.png`, { type: 'image/png' }) : null;
    if (navigator.share) {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ text, files: [file] });
      else await navigator.share({ text });
      return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  copy(text);
});

// ------------------------------------------------------------------ history
function renderHistory() {
  $('#histLocked').classList.toggle('hidden', state.pro);
  $('#histBody').classList.toggle('hidden', !state.pro);
  if (!state.pro) return;
  const h = state.store.history.slice().reverse();
  const df = new Intl.DateTimeFormat(locale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  $('#hist').innerHTML = h.length ? h.slice(0, 50).map((e) => `<li class="lv-${esc(e.level)}"><span><b>${esc(t('level.' + e.level))}</b><small>${esc(e.ids.filter((id) => !id.startsWith('combo-')).slice(0, 3).map(rName).join(' · '))}</small></span><span class="muted">${esc(df.format(new Date(e.at)))}</span></li>`).join('') : `<li class="muted">${esc(t('histNone'))}</li>`;
}
$('#histClear').addEventListener('click', () => { state.store.history = []; Kit.save(state.store); renderHistory(); });

// ------------------------------------------------------------------ tips
function renderTips() {
  const df = new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' });
  const eds = state.pro ? EDITIONS : [{ ...EDITIONS[0], notes: EDITIONS[0].notes.slice(0, 1) }];
  $('#tips').innerHTML = eds.map((ed) => `<h3 class="sub"><time datetime="${ed.week}">${esc(df.format(new Date(ed.week + 'T00:00:00Z')))}</time></h3>` + ed.notes.map((n) => {
    const x = n[lang] || n.en;
    return `<article class="tip" data-tip="${esc(n.id)}"><b>${esc(x.t)}</b><p class="small"><span class="muted">${esc(t('tipLook'))}</span> ${esc(x.look)}</p><p class="small"><span class="muted">${esc(t('tipDo'))}</span> ${esc(x.do)}</p><p class="small muted">${esc(t('tipRules'))} ${esc(n.rules.map(rName).join(', '))}</p></article>`;
  }).join('')).join('');
  $('#tipsMore').classList.toggle('hidden', state.pro);
}

// ------------------------------------------------------------------ privacy
$('#privClear').addEventListener('click', () => { Kit.clearAll(); state.store = { history: [] }; $('#kitWord').value = ''; $('#kitRemember').checked = false; $('#clearMsg').textContent = t('privCleared'); renderAll(); });

// ------------------------------------------------------------------ plan
$$('[data-buy]').forEach((b) => b.addEventListener('click', async () => {
  if (!window.Studio) return;
  b.disabled = true; $('#buyMsg').textContent = t('opening');
  try { await window.Studio.upgrade('family', b.dataset.buy); }
  catch (e) { $('#buyMsg').textContent = e && e.message && !/fetch/i.test(e.message) ? e.message : t('buyFail'); }
  finally { b.disabled = false; }
}));
$('#manageBtn').addEventListener('click', () => { if (window.Studio) window.Studio.manage().catch(() => toast(t('buyFail'))); });
function setPro(s) {
  state.pro = !!s.pro;
  $('#proOn').classList.toggle('hidden', !state.pro);
  $('#planCard').classList.toggle('hidden', state.pro);
  if (s.welcome) toast(t('welcome'));
  renderAll();
}
function renderAll() { renderResult(); renderKit(); renderHistory(); renderTips(); }

// ------------------------------------------------------------------ shared from another app (Web Share Target)
// The service worker receives the share on this device and hands it over through the local Cache Storage.
async function takeShared() {
  const url = new URL(location.href);
  if (!url.searchParams.has('shared')) return;
  url.searchParams.delete('shared'); history.replaceState(null, '', url.pathname + url.search + url.hash);
  try {
    const cache = await caches.open('shield-share');
    const res = await cache.match('/shield/__shared');
    if (!res) return;
    const j = await res.json(); await cache.delete('/shield/__shared');
    const text = [j.title, j.text, j.url].filter(Boolean).join('\n');
    if (text) { $('#msgBox').value = text; runCheck(text); toast(t('shared')); }
  } catch (e) { /* nothing shared */ }
}

applyLang();
const remembered = Kit.loadWord();
if (remembered) { $('#kitWord').value = remembered; $('#kitRemember').checked = true; }
renderAll();
if (window.Studio) window.Studio.init({ tool: TOOL, onChange: setPro });
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});
takeShared();
window.__shield = state; // for tests and debugging
