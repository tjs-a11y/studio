// Quickwell Saver page. Everything runs here, in the browser. Files never leave the device.
import { parseInput, analyze, fmtMoney, dates, currencyForLocale } from './engine.mjs';
import { letter, script, guide, calendarFile } from './acts.mjs';
import * as S from './savings.mjs';
import { makeT, pickLang, STR } from './i18n.mjs';
import { SAMPLE, SAMPLE_NAME } from './sample.mjs';

const FREE_FILES = 2;
const TOOL = 'saver';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sget = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const sset = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } };

const state = { files: [], pro: false, marks: {}, history: [], report: null, items: {}, sent: false, seq: 0, form: {} };
let lang = pickLang(location.search, sget('saver:lang'), navigator.language);
let t = makeT(lang);
const locale = () => { const n = navigator.language || ''; return lang === 'es' ? (n.toLowerCase().startsWith('es') ? n : 'es-ES') : (n.toLowerCase().startsWith('en') ? n : 'en-US'); };
const money = (v, cur, whole) => fmtMoney(v, cur || 'USD', locale(), { whole: whole ?? Math.abs(v) >= 1000 });
const DF = new Map();
const fdate = (s) => { if (!s) return ''; const k = locale(); if (!DF.has(k)) DF.set(k, new Intl.DateTimeFormat(k, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })); return DF.get(k).format(dates.toD(s)); };
const pct = (p) => `${Math.round(p * 100)}%`;
const today = () => dates.todayLocal();

// ------------------------------------------------------------------ language
function applyLang() {
  t = makeT(lang);
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach((el) => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
  const other = lang === 'es' ? 'en' : 'es';
  const b = $('#langBtn'); b.textContent = t('lang'); b.setAttribute('lang', other); b.setAttribute('aria-label', STR[other].lang);
}
$('#langBtn').addEventListener('click', () => { lang = lang === 'es' ? 'en' : 'es'; sset('saver:lang', lang); applyLang(); renderFiles(); render(); });

// ------------------------------------------------------------------ messages
let toastTimer;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2600); }
function showMsg(msg) { const el = $('#msg'); el.textContent = msg || ''; el.classList.toggle('hidden', !msg); }
function showLocked() {
  toast(t('lockedMsg'));
  const p = $('#planCard'); p.scrollIntoView({ behavior: 'smooth', block: 'start' }); p.classList.add('flash'); setTimeout(() => p.classList.remove('flash'), 1600);
  setTimeout(() => $('[data-buy="year"]').focus({ preventScroll: true }), 400);
}

// ------------------------------------------------------------------ input
function canAdd() {
  if (state.pro || state.files.length < FREE_FILES) return true;
  showMsg(t('freeLimit', { n: FREE_FILES })); showLocked(); return false;
}
function addText(name, text, extra = {}) {
  const id = 'f' + (++state.seq);
  const fallbackCur = currencyForLocale(navigator.language);
  const res = parseInput(text, { id, name, today: today(), currency: fallbackCur, paste: !!extra.paste });
  const f = { id, name, text, paste: !!extra.paste, sample: !!extra.sample, flip: false, res };
  if (!res.txns.length) { showMsg(t('noRows', { name })); return false; }
  showMsg('');
  state.files.push(f);
  if (!f.sample && !state.sent) { state.sent = true; fetch('/api/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tool: TOOL, event: 'check' }) }).catch(() => {}); }
  return true;
}
function reparse(f) { f.res = parseInput(f.text, { id: f.id, name: f.name, today: today(), currency: f.res.currency, paste: f.paste, flip: f.flip }); }
async function handleFiles(list) {
  for (const file of list) {
    if (!canAdd()) break;
    showMsg(t('reading'));
    try {
      const text = /\.pdf$/i.test(file.name) || file.type === 'application/pdf' ? await pdfText(file) : await file.text();
      if (!text.trim()) { showMsg(t('pdfFail')); continue; }
      addText(file.name, text, { paste: /\.pdf$/i.test(file.name) });
    } catch (e) { showMsg(/\.pdf$/i.test(file.name) ? t('pdfFail') : t('noRows', { name: file.name })); }
  }
  renderFiles(); run();
}
function loadScript(src) { return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); }); }
// pdf.js turns each page into positioned text pieces; we rebuild the lines by their height on the page.
async function pdfText(file) {
  const V = '3.11.174', base = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${V}/`;
  if (!window.pdfjsLib) await loadScript(base + 'pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js';
  const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; const out = [];
  for (let p = 1; p <= Math.min(pdf.numPages, 60); p++) {
    const items = (await (await pdf.getPage(p)).getTextContent()).items.filter((i) => i.str.trim());
    items.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
    let line = [], y = null;
    for (const i of items) { if (y !== null && Math.abs(i.transform[5] - y) > 3) { out.push(line.sort((a, b) => a.transform[4] - b.transform[4]).map((x) => x.str).join(' ')); line = []; } line.push(i); y = i.transform[5]; }
    if (line.length) out.push(line.sort((a, b) => a.transform[4] - b.transform[4]).map((x) => x.str).join(' '));
  }
  return out.join('\n');
}
const drop = $('#drop');
['dragenter', 'dragover'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (ev) => handleFiles([...(ev.dataTransfer?.files || [])]));
$('#fileInput').addEventListener('change', (ev) => { handleFiles([...ev.target.files]); ev.target.value = ''; });
$('#pasteBtn').addEventListener('click', () => {
  const v = $('#pasteBox').value; if (!v.trim() || !canAdd()) return;
  if (addText(lang === 'es' ? 'Texto pegado' : 'Pasted text', v, { paste: true })) { $('#pasteBox').value = ''; renderFiles(); run(); }
});
$('#sampleBtn').addEventListener('click', () => {
  if (state.files.some((f) => f.sample)) return;
  if (!canAdd()) return;
  addText(SAMPLE_NAME, SAMPLE, { sample: true }); renderFiles(); run();
  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

const LAYOUT_NAMES = { chaseChecking: 'Chase checking', chaseCard: 'Chase card', boa: 'Bank of America', wellsFargo: 'Wells Fargo', capitalOne: 'Capital One', amex: 'American Express', discover: 'Discover', citi: 'Citi', usBank: 'U.S. Bank', quickbooks: 'QuickBooks', xero: 'Xero', generic: 'CSV', paste: 'Text' };
function renderFiles() {
  $('#fileList').innerHTML = state.files.map((f) => `<div class="file" data-file="${f.id}"><b>${esc(f.name)}</b><span class="meta">${esc(LAYOUT_NAMES[f.res.layout] || f.res.layout)} · ${esc(f.res.currency)} · ${esc(t('rows', { n: f.res.txns.length }))}</span><button type="button" data-flip="${f.id}">${esc(t('flip'))}</button><button type="button" data-remove="${f.id}">${esc(t('remove'))}</button></div>`).join('');
}
$('#fileList').addEventListener('click', (ev) => {
  const r = ev.target.closest('[data-remove]'), fl = ev.target.closest('[data-flip]');
  if (r) { state.files = state.files.filter((f) => f.id !== r.dataset.remove); showMsg(''); }
  else if (fl) { const f = state.files.find((x) => x.id === fl.dataset.flip); f.flip = !f.flip; reparse(f); }
  else return;
  renderFiles(); run();
});

// ------------------------------------------------------------------ analysis
function run() {
  if (!state.files.length) { state.report = null; render(); return; }
  const all = state.files.flatMap((f) => f.res.txns.map((x) => ({ ...x })));
  state.report = analyze(all, { today: today(), marks: state.marks, currency: currencyForLocale(navigator.language) });
  render();
}

// ------------------------------------------------------------------ rendering
const statusBar = (id, opts = ['keep', 'cancelled', 'lowered', 'refunded']) => {
  const m = state.marks[id];
  return `<div class="status" role="group" aria-label="${esc(t('savedTitle'))}" data-status="${esc(id)}">${opts.map((s) => `<button type="button" data-mark="${s}" data-id="${esc(id)}" aria-pressed="${m && m.status === s ? 'true' : 'false'}">${esc(t('st.' + s))}</button>`).join('')}</div><div class="markrow hidden" data-markrow="${esc(id)}"></div>`;
};
const actBtn = (act, id, label) => `<button type="button" data-act="${act}" data-id="${esc(id)}" class="${state.pro ? '' : 'locked'}">${esc(label)}</button>`;
function seriesItem(s, why, extraTags = '', acts = ['cancel', 'guide', 'remind']) {
  state.items[s.id] = { id: s.id, name: s.name, currency: s.currency, latest: s.latest, perYear: s.perYear, kind: 'series' };
  const every = t('every.' + s.cadence);
  const meta = [t('perYear', { a: money(s.annual, s.currency) }), s.next ? t('next', { d: fdate(s.next) }) : t('stopped'), s.cancelBy ? `${t('cancelBy', { d: fdate(s.cancelBy) })} (${t('cancelByNote')})` : ''].filter(Boolean).join(' · ');
  const tags = `${s.kind === 'bill' ? `<span class="tag plain">${esc(t('bill'))}</span>` : ''}${s.variable ? `<span class="tag plain">${esc(t('variable'))}</span>` : ''}${extraTags}`;
  const labels = { cancel: t('actCancel'), push: t('actPush'), refund: t('actRefund'), guide: t('actGuide'), remind: t('actRemind') };
  return `<article class="item" data-series="${esc(s.id)}"><div class="top"><b>${esc(s.name)}</b><span class="amt">${esc(money(s.latest, s.currency, false))} <span class="small muted">${esc(every)}</span></span></div>
    <div class="meta">${tags}${esc(meta)}</div>${why ? `<p class="why">${esc(why)}</p>` : ''}
    ${statusBar(s.id)}<div class="acts">${acts.map((a) => actBtn(a, s.id, labels[a])).join('')}</div></article>`;
}
function section(id, title, count, inner, hint) {
  return `<section class="card find" id="${id}" aria-labelledby="${id}-h"><h2 id="${id}-h">${esc(title)} <span class="count">${count}</span></h2>${hint ? `<p class="small muted">${esc(hint)}</p>` : ''}<div class="items">${count ? inner : `<p class="small muted">${esc(t('none'))}</p>`}</div></section>`;
}
function render() {
  const R = state.report;
  $('#results').classList.toggle('hidden', !R);
  if (!R) return;
  state.items = {};
  const cur = R.primary; const T = R.totals[cur] || { yearly: 0, subs: 0, bills: 0, leaks: 0, review: 0 };
  $('#rangeNote').textContent = R.range.start ? t('range', { start: fdate(R.range.start), end: fdate(R.range.end), n: R.outCount }) : '';
  const others = R.currencies.filter((c) => c !== cur && R.totals[c]).map((c) => `${money(R.totals[c].yearly, c)} (${c})`);
  $('#otherCur').textContent = others.length ? t('otherCur', { list: others.join(', ') }) : '';

  const html = [];
  // charged after you cancelled
  if (R.afterCancel.length) html.push(section('secAfter', t('secAfter'), R.afterCancel.length, R.afterCancel.map((s) => {
    const sum = s.afterCancel.reduce((a, x) => a + x.amount, 0);
    return seriesItem(s, t('afterWhy', { d: fdate(state.marks[s.id].date), a: money(sum, s.currency) }), '<span class="tag red">!</span>', ['refund', 'guide']);
  }).join('')));
  // price increases
  html.push(section('secIncreases', t('secIncreases'), R.increases.length, R.increases.map((s) => {
    const from = s.stepFrom ?? s.firstAmount;
    return seriesItem(s, t('upWhy', { a: money(from, s.currency, false), b: money(s.latest, s.currency, false), y: money(s.increaseYearly, s.currency) }),
      `<span class="tag ${s.flag}">${esc(t('up', { p: pct(s.pct), d: fdate(s.stepDate || s.first) }))}</span>`, ['push', 'cancel', 'guide', 'remind']);
  }).join('')));
  // double charges, two accounts, overlaps
  const dbl = R.doubles.map((d) => {
    const id = 'dbl:' + d.b.id;
    state.items[id] = { id, name: d.name, currency: d.currency, latest: d.amount, perYear: 0, kind: 'double', d };
    return `<article class="item"><div class="top"><b>${esc(d.name)}</b><span class="amt">${esc(money(d.amount, d.currency, false))}</span></div>
      <p class="why"><span class="tag red">2×</span>${esc(t('doubleWhy', { m: d.name, a: money(d.amount, d.currency, false), d1: fdate(d.a.date), d2: fdate(d.b.date) }))}</p>
      ${statusBar(id, ['keep', 'refunded'])}<div class="acts">${actBtn('refund', id, t('actRefund'))}</div></article>`;
  });
  const ovl = R.overlaps.map((o) => {
    const cheap = [...o.series].sort((a, b) => a.annual - b.annual)[0];
    const why = o.group === 'twoAccounts' ? t('twoAccWhy', { m: o.names[0] }) : t('overlapWhy', { names: o.names.join(' + '), g: t('group.' + o.group) });
    return seriesItem(cheap, why, `<span class="tag amber">${o.group === 'twoAccounts' ? '2×' : '≈'}</span>`, ['cancel', 'guide', 'remind']);
  });
  html.push(section('secDoubles', t('secDoubles'), dbl.length + ovl.length, dbl.join('') + ovl.join('')));
  // trials and intro prices
  html.push(section('secTrials', t('secTrials'), R.trials.length, R.trials.map((s) => {
    const why = s.intro ? t('introWhy', { a: money(s.intro.from, s.currency, false), n: s.intro.n, b: money(s.latest, s.currency, false) }) : t('trialWhy', { a: money(s.trial.amount, s.currency, false), d: fdate(s.trial.date), f: fdate(s.trial.firstFull) });
    return seriesItem(s, why, '<span class="tag amber">→</span>', ['refund', 'cancel', 'guide', 'remind']);
  }).join('')));
  // bank fees
  html.push(section('secFees', t('secFees'), R.fees.groups.length, R.fees.groups.map((g) => {
    const id = `fee:${g.type}|${g.currency}`;
    state.items[id] = { id, name: t('fee.' + g.type), currency: g.currency, latest: g.total, perYear: 0, kind: 'fee', g };
    const rev = R.fees.reversed.filter((x) => x.feeReversal === g.type && x.currency === g.currency).reduce((a, x) => a + x.amount, 0);
    return `<article class="item"><div class="top"><b>${esc(t('fee.' + g.type))}</b><span class="amt">${esc(money(g.total, g.currency, false))}</span></div>
      <div class="meta">${esc(t('feeLine', { n: g.count, a: money(g.total, g.currency, false) }))}${g.yearly ? ' · ' + esc(t('feeYear', { a: money(g.yearly, g.currency) })) : ''}${rev ? ' · ' + esc(t('feeRev', { a: money(rev, g.currency, false) })) : ''}</div>
      ${statusBar(id, ['keep', 'refunded'])}<div class="acts">${actBtn('fee', id, t('actFee'))}</div></article>`;
  }).join('')));
  // still using these?
  html.push(section('secZombies', t('secZombies'), R.zombies.length, R.zombies.map((s) => seriesItem(s, t('zombieWhy', { n: s.n, d: fdate(s.first) }))).join(''), t('secZombiesHint')));
  // everything
  const allSorted = [...R.active].sort((a, b) => b.annual - a.annual);
  html.push(`<details class="card find" id="secAll"><summary><h2 style="margin:0">${esc(t('secAll'))} <span class="count">${allSorted.length}</span></h2></summary><div class="items" style="margin-top:10px">${allSorted.map((s) => seriesItem(s, '')).join('')}</div></details>`);
  $('#sections').innerHTML = html.join('');
  updateMarks();
}
function savedTotals() { return S.primaryTotal(S.totals(state.items, state.marks), state.report ? state.report.primary : 'USD'); }
function updateMarks() {
  const R = state.report; if (!R) return;
  $$('[data-status]').forEach((g) => { const m = state.marks[g.dataset.status]; $$('button', g).forEach((b) => b.setAttribute('aria-pressed', m && m.status === b.dataset.mark ? 'true' : 'false')); });
  const cur = R.primary; const T = R.totals[cur] || { yearly: 0, subs: 0, bills: 0, leaks: 0, review: 0 };
  const sv = savedTotals();
  $('#tiles').innerHTML = [
    ['', t('tYearly'), money(T.yearly, cur), t('tYearlySub', { s: T.subs, b: T.bills })],
    ['leak', t('tLeaks'), money(T.leaks, cur), t('tLeaksSub')],
    ['', t('tReview'), money(T.review, cur), t('tReviewSub')],
    ['saved', t('tSaved'), money(sv.perYear, sv.currency), sv.oneTime ? t('oneTime', { a: money(sv.oneTime, sv.currency) }) : t('tSavedSub')],
  ].map(([c, l, v, s]) => `<div class="tile ${c}"><span>${esc(l)}</span><b>${esc(v)}</b><small>${esc(s)}</small></div>`).join('');
  const hist = state.pro ? (state.history.length ? `<h3 style="margin-top:12px">${esc(t('histTitle'))}</h3><ul class="hist">${state.history.slice(0, 50).map((h) => `<li><span>${esc(fdate(h.at))} · ${esc(h.name)} · ${esc(t('st.' + h.status))}</span><b>${esc(h.perYear ? t('perYear', { a: money(h.perYear, h.currency) }) : h.oneTime ? money(h.oneTime, h.currency) : '—')}</b></li>`).join('')}</ul>` : '') : `<p class="small muted">${esc(t('histLocked'))} <button type="button" class="link" data-show-plan>${esc(t('locked'))} 🔒</button></p>`;
  $('#savedBody').innerHTML = (sv.perYear || sv.oneTime
    ? `<div class="saved-big">${esc(t('perYear', { a: money(sv.perYear, sv.currency) }))}</div>${sv.oneTime ? `<p class="small">${esc(t('oneTime', { a: money(sv.oneTime, sv.currency) }))}</p>` : ''}`
    : `<p class="small muted">${esc(t('savedEmpty'))}</p>`) + hist;
  $('#shareBtn').classList.toggle('hidden', !(sv.perYear > 0 || T.leaks > 0 || T.review > 0));
}

// ------------------------------------------------------------------ marks (Keep / Cancelled / Lowered / Refunded)
function setMark(id, mark) {
  const item = state.items[id]; if (!item) return;
  if (!mark) delete state.marks[id];
  else {
    const keep = { id: item.id, name: item.name, currency: item.currency, latest: item.latest, perYear: item.perYear };
    state.marks[id] = { ...mark, date: today(), item: keep }; if (state.pro) state.history = S.addHistory(state.history, keep, mark, today());
  }
  persist(); updateMarks();
}
function persist() { if (state.pro) S.save({ marks: state.marks, history: state.history }); }
$('#results').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-mark]');
  if (b) {
    const id = b.dataset.id, st = b.dataset.mark, item = state.items[id];
    const row = $$('[data-markrow]').find((r) => r.dataset.markrow === id && r.closest('.item') === b.closest('.item'));
    $$('[data-markrow]').forEach((r) => { if (r !== row) { r.classList.add('hidden'); r.innerHTML = ''; } });
    if (st === 'lowered' || st === 'refunded') {
      const label = st === 'lowered' ? t('newPrice') : t('refundAmt');
      const def = st === 'refunded' ? (item.kind === 'double' ? item.latest : item.kind === 'fee' ? item.latest : '') : '';
      row.innerHTML = `<label>${esc(label)}<input type="number" inputmode="decimal" min="0" step="0.01" value="${esc(def)}" data-amt></label><button type="button" data-save="${st}" data-id="${esc(id)}">${esc(t('saveMark'))}</button>`;
      row.classList.remove('hidden'); $('input', row).focus();
      return;
    }
    if (row) { row.classList.add('hidden'); row.innerHTML = ''; }
    const cur = state.marks[id];
    setMark(id, cur && cur.status === st ? null : { status: st });
    return;
  }
  const sv = ev.target.closest('[data-save]');
  if (sv) {
    const row = sv.closest('[data-markrow]'); const v = Number($('[data-amt]', row).value);
    if (!isFinite(v) || v < 0) return;
    setMark(sv.dataset.id, sv.dataset.save === 'lowered' ? { status: 'lowered', newPrice: v } : { status: 'refunded', amount: v });
    row.classList.add('hidden'); row.innerHTML = '';
    return;
  }
  if (ev.target.closest('[data-show-plan]')) { showLocked(); return; }
  const a = ev.target.closest('[data-act]');
  if (a) act(a.dataset.act, a.dataset.id);
});

// ------------------------------------------------------------------ Act (Saver plan)
const findSeries = (id) => state.report && state.report.series.find((s) => s.id === id);
function download(name, text, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(text instanceof Blob ? text : new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
async function copy(text) { try { await navigator.clipboard.writeText(text); toast(t('copied')); } catch (e) { toast(t('copied')); } }
const calItem = (s) => ({ series: s, amount: money(s.latest, s.currency, false), next: fdate(s.next) });
function act(kind, id) {
  if (!state.pro) { showLocked(); return; }
  const R = state.report;
  if (kind === 'calendar') {
    const items = R.active.filter((s) => s.next && (s.kind === 'sub' || s.cadence === 'annual')).map(calItem);
    download('cancel-by-calendar.ics', calendarFile(items, lang), 'text/calendar;charset=utf-8'); return;
  }
  const item = state.items[id]; const s = findSeries(id);
  if (kind === 'remind' && s) { download(`${(s.name || 'reminder').replace(/[^\w-]+/g, '-').toLowerCase()}-cancel-by.ics`, calendarFile([calItem(s)], lang), 'text/calendar;charset=utf-8'); return; }
  if (kind === 'guide' && s) { openGuide(s); return; }
  openLetter(kind, item, s);
}
function openDialog(title, body, buttons) {
  const d = $('#dlg'); $('#dlgTitle').textContent = title; $('#dlgBody').innerHTML = body; $('#dlgBtns').innerHTML = buttons || '';
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  return d;
}
function openGuide(s) {
  const g = guide(s.guide, lang);
  openDialog(`${t('actGuide')}: ${s.name}`, `<p class="small"><b>${esc(g.title)}</b></p><p class="small muted">${esc(t('guideIntro'))}</p><ol class="small">${g.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`);
}
function ctxFor(kind, item, s) {
  const f = state.form; const cur = item.currency;
  const base = { merchant: item.name, name: f.name, account: f.account, since: f.since, rosca: !!f.rosca };
  if (s) {
    const from = s.stepFrom ?? s.firstAmount;
    Object.assign(base, { amount: money(s.latest, cur, false), last: fdate(s.last), next: s.next ? fdate(s.next) : '', old: money(from, cur, false), new: money(s.latest, cur, false), pct: s.pct > 0 ? pct(s.pct) : '', stepDate: s.stepDate ? fdate(s.stepDate) : '' });
  }
  if (kind === 'refund') {
    let charges = [], reason = f.reason;
    if (item.kind === 'double') { charges = [item.d.a, item.d.b]; reason = reason || 'double'; }
    else if (s && s.afterCancel.length) { charges = s.afterCancel; reason = reason || 'afterCancel'; base.cancelDate = fdate(state.marks[s.id].date); }
    else if (s) { charges = [s.trial ? { date: s.trial.date, amount: s.trial.amount } : null, ...s.charges.slice(s.intro ? s.intro.n : 0, (s.intro ? s.intro.n : 0) + 1)].filter(Boolean); reason = reason || 'trial'; }
    const total = item.kind === 'double' ? item.latest : charges.reduce((a, c) => a + c.amount, 0);
    Object.assign(base, { reason, charges: charges.map((c) => ({ date: fdate(c.date), amount: money(c.amount, cur, false) })), total: money(total, cur, false) });
  }
  if (kind === 'fee') { const g = item.g; const lastRow = g.rows[g.rows.length - 1]; Object.assign(base, { feeType: t('fee.' + g.type).toLowerCase(), fee: money(lastRow.amount, cur, false), feeDate: fdate(lastRow.date) }); }
  return base;
}
function openLetter(kind, item, s) {
  const L = { cancel: 'actCancel', push: 'actPush', refund: 'actRefund', fee: 'actFee' }[kind];
  const lk = kind === 'push' ? 'pushback' : kind;
  const usd = item.currency === 'USD';
  const fields = `<label for="fName">${esc(t('dlgName'))}</label><input type="text" id="fName" autocomplete="name" value="${esc(state.form.name || '')}">
    <label for="fAcct">${esc(t('dlgAccount'))}</label><input type="text" id="fAcct" autocomplete="off" value="${esc(state.form.account || '')}">
    ${kind === 'push' || kind === 'fee' ? `<label for="fSince">${esc(t('dlgSince'))}</label><input type="text" id="fSince" inputmode="numeric" value="${esc(state.form.since || '')}">` : ''}
    ${kind === 'cancel' && usd ? `<label class="check"><input type="checkbox" id="fRosca" ${state.form.rosca ? 'checked' : ''}><span>${esc(t('dlgRosca'))}</span></label>` : ''}
    ${kind === 'refund' ? `<label for="fReason">${esc(t('dlgReason'))}</label><select id="fReason">${['double', 'afterCancel', 'unauthorized', 'trial'].map((r) => `<option value="${r}">${esc(t('reason.' + r))}</option>`).join('')}</select>` : ''}`;
  const body = `${fields}<label for="fText">${esc(t('dlgMessage'))}</label><textarea id="fText"></textarea>${kind === 'push' || kind === 'fee' ? `<label for="fScript">${esc(t('dlgScript'))}</label><textarea id="fScript" readonly></textarea>` : ''}
    <p class="small muted">${esc(t('dlgNote'))}${kind === 'refund' ? ' ' + esc(t('disputeNote')) : ''}</p>`;
  const btns = `<button type="button" id="bCopy">${esc(t('dlgCopy'))}</button><button type="button" class="secondary" id="bMail">${esc(t('dlgEmail'))}</button><button type="button" class="secondary" id="bTxt">${esc(t('dlgTxt'))}</button>`;
  openDialog(`${t(L)}: ${item.name}`, body, btns);
  const ctx0 = ctxFor(kind, item, s);
  if (kind === 'refund') $('#fReason').value = ctx0.reason;
  let current = null;
  const fill = () => {
    state.form = { ...state.form, name: $('#fName').value, account: $('#fAcct').value, since: $('#fSince') ? $('#fSince').value : state.form.since, rosca: $('#fRosca') ? $('#fRosca').checked : false, reason: $('#fReason') ? $('#fReason').value : undefined };
    const ctx = ctxFor(kind, item, s);
    current = letter(lk, ctx, lang);
    $('#fText').value = `${lang === 'es' ? 'Asunto' : 'Subject'}: ${current.subject}\n\n${current.body}`;
    if ($('#fScript')) $('#fScript').value = script(lk, ctx, lang);
  };
  fill();
  $$('#fName,#fAcct,#fSince,#fRosca,#fReason').forEach((el) => el.addEventListener('input', fill));
  $('#bCopy').onclick = () => copy($('#fText').value);
  $('#bTxt').onclick = () => download(`${item.name.replace(/[^\w-]+/g, '-').toLowerCase()}-${lk}.txt`, $('#fText').value + ($('#fScript') ? `\n\n---\n${t('dlgScript')}\n\n${$('#fScript').value}` : ''));
  $('#bMail').onclick = () => { const txt = $('#fText').value; const body = txt.replace(/^[^\n]*\n\n/, ''); location.href = `mailto:?subject=${encodeURIComponent(current.subject)}&body=${encodeURIComponent(body)}`; };
}
$('#calBtn').addEventListener('click', () => act('calendar'));

// ------------------------------------------------------------------ share card (amount only)
function drawCard(canvas, text, amount) {
  const c = canvas.getContext('2d'); canvas.width = 1200; canvas.height = 630;
  c.fillStyle = '#1f6b52'; c.fillRect(0, 0, 1200, 630);
  c.fillStyle = '#f6f4ef'; c.globalAlpha = 0.08; c.beginPath(); c.arc(1060, 110, 260, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
  const i = text.indexOf(amount); const before = text.slice(0, i).trim(), after = text.slice(i + amount.length).trim();
  c.fillStyle = '#f6f4ef';
  c.font = '700 40px system-ui, sans-serif'; c.fillText('Quickwell Saver', 80, 100);
  c.font = '600 50px system-ui, sans-serif'; c.fillText(before, 80, 210, 1040);
  c.font = '800 150px system-ui, sans-serif'; c.fillText(amount, 80, 360, 1040);
  c.font = '600 46px system-ui, sans-serif'; wrap(c, after, 80, 440, 1040, 58);
  c.font = '500 30px system-ui, sans-serif'; c.globalAlpha = 0.85; c.fillText('quickwell.app/saver', 80, 575); c.globalAlpha = 1;
}
function wrap(c, text, x, y, w, lh) { const words = text.split(' '); let line = ''; for (const wd of words) { const tst = line ? line + ' ' + wd : wd; if (c.measureText(tst).width > w && line) { c.fillText(line, x, y); line = wd; y += lh; } else line = tst; } if (line) c.fillText(line, x, y); }
$('#shareBtn').addEventListener('click', () => {
  const R = state.report; if (!R) return;
  const sv = savedTotals(); const T = R.totals[R.primary] || {};
  const saved = sv.perYear > 0;
  const amount = saved ? money(sv.perYear, sv.currency, true) : money(T.leaks || T.review || 0, R.primary, true);
  const text = S.shareText(saved ? 'saved' : 'found', amount, lang);
  openDialog(t('shareTitle'), `<canvas class="share" id="shareCanvas" width="1200" height="630" role="img" aria-label="${esc(text)}"></canvas><p class="small">${esc(text)}</p><p class="small muted">${esc(t('shareNote'))}</p>`,
    `<button type="button" id="sShare">${esc(t('shareDo'))}</button><button type="button" class="secondary" id="sDl">${esc(t('shareDl'))}</button><button type="button" class="secondary" id="sCopy">${esc(t('shareCopy'))}</button>`);
  const cv = $('#shareCanvas'); drawCard(cv, text, amount);
  const blob = () => new Promise((ok) => cv.toBlob(ok, 'image/png'));
  $('#sDl').onclick = async () => download('quickwell-saver.png', await blob());
  $('#sCopy').onclick = () => copy(`${text} ${S.SHARE_URL}`);
  $('#sShare').onclick = async () => {
    try {
      const file = new File([await blob()], 'quickwell-saver.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text, url: S.SHARE_URL });
      else if (navigator.share) await navigator.share({ text, url: S.SHARE_URL });
      else copy(`${text} ${S.SHARE_URL}`);
    } catch (e) { /* user closed the share sheet */ }
  };
});

// ------------------------------------------------------------------ plan
$$('[data-buy]').forEach((b) => b.addEventListener('click', () => {
  b.disabled = true; $('#buyMsg').textContent = t('opening');
  window.Studio.upgrade('saver', b.dataset.buy).catch((e) => { $('#buyMsg').textContent = e && e.message && !/fetch/i.test(e.message) ? e.message : t('checkoutErr'); }).finally(() => { b.disabled = false; });
}));
$('#manageBtn').addEventListener('click', () => window.Studio.manage().catch((e) => { $('#buyMsg').textContent = (e && e.message) || t('checkoutErr'); }));
$('#clearBtn').addEventListener('click', () => { S.clear(); state.marks = {}; state.history = []; $('#clearMsg').textContent = t('privCleared'); updateMarks(); });

function setPro(s) {
  const was = state.pro; state.pro = !!s.pro;
  $('#proOn').classList.toggle('hidden', !state.pro);
  $('#planCard').classList.toggle('hidden', state.pro);
  if (state.pro && !was) {
    const saved = S.load();
    state.marks = { ...saved.marks, ...state.marks }; state.history = saved.history || [];
    if (s.welcome) toast(t('welcome'));
  }
  if (state.report) render();
}
applyLang();
if (window.Studio) window.Studio.init({ tool: TOOL, onChange: setPro });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__saver = state; // for tests and debugging
