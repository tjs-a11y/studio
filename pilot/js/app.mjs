// Quickwell Pilot page. Everything runs here, in the browser. Letters never leave the device.
import { read, todayLocal, daysBetween } from './extract.mjs';
import { toFields, headline, daysText, checklist, eventFor, itemFrom, fieldsFromItem } from './card.mjs';
import { buildIcs } from './ics.mjs';
import { draft, mailto, FOR_ACTION, KINDS as REPLY_KINDS } from './replies.mjs';
import * as St from './store.mjs';
import { makeT, pickLang, STR } from './i18n.mjs';
import { sample } from './sample.mjs';
import { photoReadingAvailable, pdfText, pdfPageImages, ocrImages, isPdf, isImage, isText } from './ocr.mjs';

const TOOL = 'pilot';
export const FREE_ITEMS = 3;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sget = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const sset = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } };

const saved = St.load();
const state = { pro: false, reading: null, fields: null, userSet: new Set(), text: '', sample: false, sent: false, items: saved.items, seenWeek: saved.seenWeek, reply: null, editing: null, fromItem: null };
let lang = pickLang(location.search, sget('pilot:lang'), navigator.language);
let t = makeT(lang);
const today = () => todayLocal();
const locale = () => { const n = navigator.language || ''; return lang === 'es' ? (n.toLowerCase().startsWith('es') ? n : 'es-ES') : (n.toLowerCase().startsWith('en') ? n : 'en-US'); };
const fmt = {
  date: (d) => (d ? new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d + 'T00:00:00Z')) : ''),
  short: (d) => (d ? new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(new Date(d + 'T00:00:00Z')) : ''),
  money: (v, cur) => { try { return new Intl.NumberFormat(locale(), { style: 'currency', currency: cur || 'USD', currencyDisplay: 'narrowSymbol' }).format(v); } catch (e) { return `${v} ${cur || ''}`.trim(); } },
  time: (tm) => { if (!tm) return ''; const [h, m] = tm.split(':').map(Number); return new Intl.DateTimeFormat(locale(), { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 1, h, m))); },
};
const persist = () => St.save({ items: state.items, seenWeek: state.seenWeek });

// ------------------------------------------------------------------ language
function applyLang() {
  t = makeT(lang);
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach((el) => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
  const other = lang === 'es' ? 'en' : 'es';
  const b = $('#langBtn'); b.textContent = t('lang'); b.setAttribute('lang', other); b.setAttribute('aria-label', STR[other].lang);
  $('#addAction').innerHTML = St.ACTIONS.filter((a) => a !== 'check').map((a) => `<option value="${a}">${esc(t('act.' + a))}</option>`).join('');
}
$('#langBtn').addEventListener('click', () => { lang = lang === 'es' ? 'en' : 'es'; sset('pilot:lang', lang); applyLang(); renderAll(); });

// ------------------------------------------------------------------ messages
let toastTimer;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2600); }
function fileMsg(msg, tip = false) { const el = $('#fileMsg'); el.textContent = msg || ''; el.classList.toggle('hidden', !msg); $('#photoTip').classList.toggle('hidden', !tip); }
function showLocked() {
  toast(t('lockedMsg'));
  const p = $('#planCard'); p.scrollIntoView({ behavior: 'smooth', block: 'start' }); p.classList.add('flash'); setTimeout(() => p.classList.remove('flash'), 1600);
  setTimeout(() => $('[data-buy="year"]').focus({ preventScroll: true }), 400);
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const slug = (s) => String(s || 'pilot').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'pilot';

// ------------------------------------------------------------------ reading
function runRead(text, { sample: isSample = false } = {}) {
  const clean = String(text || '').trim();
  if (clean.replace(/\s+/g, ' ').length < 25) { fileMsg(t('tooShort')); return; }
  fileMsg('');
  state.text = clean; state.sample = isSample; state.userSet = new Set(); state.fromItem = null; state.reply = null;
  state.reading = read(clean, { today: today() });
  state.fields = toFields(state.reading);
  if (!isSample && !state.sent) { state.sent = true; fetch('/api/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tool: TOOL, event: 'check' }) }).catch(() => {}); }
  renderCard();
  $('#results').classList.remove('hidden');
  $('#needCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('#readBtn').addEventListener('click', () => runRead($('#letterText').value));
$('#sampleBtn').addEventListener('click', () => { const s = sample(lang, today()); $('#letterText').value = s; runRead(s, { sample: true }); });

async function handleFile(file) {
  if (!file) return;
  try {
    if (isText(file)) { const s = await file.text(); $('#letterText').value = s; return runRead(s); }
    if (isPdf(file)) {
      fileMsg(t('reading'));
      const { text, doc } = await pdfText(file);
      if (text.replace(/\s/g, '').length > 40) { $('#letterText').value = text; return runRead(text); }
      if (!(await photoReadingAvailable())) return fileMsg(t('pdfScanned'), true);
      return ocrRun(await pdfPageImages(doc));
    }
    if (isImage(file)) {
      if (!(await photoReadingAvailable())) return fileMsg(t('ocrBlocked'), true);
      return ocrRun([file]);
    }
    fileMsg(t('fileType'));
  } catch (e) {
    fileMsg(isPdf(file) ? t('pdfFail') : t('ocrFail'), true);
  } finally { $('#fileInput').value = ''; }
}
async function ocrRun(images) {
  const bar = $('#ocrBar'); bar.classList.remove('hidden');
  const prog = (p) => { const pc = Math.round(Math.min(1, Math.max(0, p)) * 100); bar.firstElementChild.style.width = pc + '%'; bar.setAttribute('aria-valuenow', String(pc)); fileMsg(t('ocrLoading', { p: pc })); };
  prog(0);
  try {
    const text = await ocrImages(images, lang === 'es' ? 'spa+eng' : 'eng', prog);
    bar.classList.add('hidden');
    if (text.replace(/\s/g, '').length < 25) return fileMsg(t('ocrFail'), true);
    $('#letterText').value = text; runRead(text);
  } catch (e) { bar.classList.add('hidden'); fileMsg(e && e.message === 'ocr-blocked' ? t('ocrBlocked') : t('ocrFail'), true); }
}
$('#fileInput').addEventListener('change', (e) => handleFile(e.target.files[0]));
const inputCard = $('#inputCard');
inputCard.addEventListener('dragover', (e) => { e.preventDefault(); inputCard.classList.add('over'); });
inputCard.addEventListener('dragleave', () => inputCard.classList.remove('over'));
inputCard.addEventListener('drop', (e) => { e.preventDefault(); inputCard.classList.remove('over'); handleFile(e.dataTransfer.files[0]); });

// ------------------------------------------------------------------ the card
const conf = (c) => `<span class="conf c-${esc(c)}">${esc(t('conf.' + c))}</span>`;
function fieldRows(f) {
  const rows = [];
  const actionV = f.action ? `<b>${esc(t('act.' + f.action))}</b>${f.also.length ? `<small>${esc(t('also', { a: f.also.map((a) => t('act.' + a)).join(', ') }))}</small>` : ''}` : `<span class="muted">${esc(t('none.action'))}</span>`;
  rows.push(['action', t('f.action'), actionV, f.actionConf]);
  const dV = f.date ? `<b>${esc(fmt.date(f.date))}${f.time ? ' · ' + esc(fmt.time(f.time)) : ''}</b><small>${esc(t('kind.' + (f.dkind || 'deadline')))} · ${esc(daysText(f.date, today(), t))}</small>${f.computed ? `<small>${esc(t('computed.' + (f.computed.noLetterDate ? 'noDate' : f.computed.fromReceipt ? 'receipt' : 'letter'), { n: f.computed.n + (f.computed.unit !== 'day' ? ' ' + f.computed.unit : '') + (f.computed.business ? ' (' + t('business') + ')' : ''), from: fmt.date(f.computed.from) }))}</small>` : ''}` : `<span class="muted">${esc(t('none.date'))}</span>`;
  rows.push(['date', t('f.deadline'), dV, f.dateConf]);
  rows.push(['amount', t('f.amount'), f.amount != null ? `<b>${esc(fmt.money(f.amount, f.currency))}</b>` : `<span class="muted">${esc(t('none.amount'))}</span>`, f.amountConf]);
  const c = [f.phone && `<a href="tel:${esc(f.phone.replace(/[^\d+]/g, ''))}">${esc(f.phone)}</a>`, f.email && `<a href="mailto:${esc(f.email)}">${esc(f.email)}</a>`, f.url && esc(f.url), f.address && `<small>${esc(f.address)}</small>`].filter(Boolean);
  rows.push(['contact', t('f.contact'), c.length ? c.join('<br>') : `<span class="muted">${esc(t('none.contact'))}</span>`, f.contactConf]);
  rows.push(['from', t('f.from'), f.from ? esc(f.from) : `<span class="muted">${esc(t('none.from'))}</span>`, f.fromConf]);
  rows.push(['ref', t('f.ref'), f.refMasked ? `<span class="mono">${esc(f.refMasked)}</span>` : `<span class="muted">${esc(t('none.ref'))}</span>`, f.refConf]);
  rows.push(['letterDate', t('f.letterDate'), f.letterDate ? esc(fmt.date(f.letterDate)) : `<span class="muted">${esc(t('none.date'))}</span>`, f.letterDateConf]);
  return rows;
}
function editor(key, f) {
  const inp = (name, type, value, label, extra = '') => `<label><span class="sr-only">${esc(label)}</span><input type="${type}" name="${name}" value="${esc(value ?? '')}" aria-label="${esc(label)}" ${extra}></label>`;
  switch (key) {
    case 'action': return `<select name="action" aria-label="${esc(t('f.action'))}">${St.ACTIONS.filter((a) => a !== 'check').map((a) => `<option value="${a}"${a === f.action ? ' selected' : ''}>${esc(t('act.' + a))}</option>`).join('')}</select>`;
    case 'date': return inp('date', 'date', f.date, t('f.deadline')) + inp('time', 'time', f.time, t('f.time'));
    case 'amount': return inp('amount', 'number', f.amount, t('f.amount'), 'min="0" step="0.01" inputmode="decimal"');
    case 'contact': return inp('phone', 'tel', f.phone, t('f.phone')) + inp('email', 'email', f.email, t('f.email')) + inp('url', 'text', f.url, t('f.web'));
    case 'from': return inp('from', 'text', f.from, t('f.from'), 'maxlength="80"');
    case 'ref': return inp('ref', 'text', '', t('f.ref'), 'maxlength="40" autocomplete="off"');
    case 'letterDate': return inp('letterDate', 'date', f.letterDate, t('f.letterDate'));
    default: return '';
  }
}
function renderCard() {
  const f = state.fields; if (!f) return;
  $('#headline').textContent = headline(f, t, fmt);
  $('#daysLeft').textContent = f.date ? daysText(f.date, today(), t) : '';
  $('#sensitiveNote').classList.toggle('hidden', !f.sensitive.length);
  $('#fields').innerHTML = fieldRows(f).map(([key, label, val, c]) => state.editing === key
    ? `<div class="frow editing" data-row="${key}"><dt>${esc(label)}</dt><dd><form class="fix" data-fix="${key}">${editor(key, f)}<div class="row"><button type="submit">${esc(t('saveFix'))}</button><button type="button" class="secondary" data-unfix>${esc(t('cancelFix'))}</button></div></form></dd></div>`
    : `<div class="frow" data-row="${key}"><dt>${esc(label)}</dt><dd><div class="v">${val}</div><div class="side">${conf(state.userSet.has(key) ? 'you' : c)}<button type="button" class="link" data-edit="${key}" aria-label="${esc(t('fix') + ': ' + label)}">${esc(t('fix'))}</button></div></dd></div>`).join('');
  const others = f.others.filter((o) => o.value);
  $('#others').innerHTML = others.length ? `<h3>${esc(t('otherDates'))}</h3><ul class="others small">${others.map((o) => `<li><b>${esc(fmt.date(o.value))}${o.time ? ' · ' + esc(fmt.time(o.time)) : ''}</b> · ${esc(t('kind.' + o.kind))}</li>`).join('')}</ul>` : '';
  $('#icsBtn').disabled = !f.date;
  $('#checklist').innerHTML = checklist(f, t, fmt).map((s, i) => `<li><label class="check"><input type="checkbox" id="ck${i}"> <span>${esc(s)}</span></label></li>`).join('');
  renderReplyKinds();
  const ed = state.editing && $(`[data-fix="${state.editing}"] input, [data-fix="${state.editing}"] select`); if (ed) ed.focus();
}
$('#fields').addEventListener('click', (e) => {
  const b = e.target.closest('[data-edit]'); if (b) { state.editing = b.dataset.edit; renderCard(); return; }
  if (e.target.closest('[data-unfix]')) { const k = state.editing; state.editing = null; renderCard(); const x = $(`[data-edit="${k}"]`); if (x) x.focus(); }
});
$('#fields').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target.closest('[data-fix]'); if (!form) return;
  const key = form.dataset.fix, fd = new FormData(form), f = state.fields;
  if (key === 'action') { f.action = fd.get('action'); f.also = f.also.filter((a) => a !== f.action); }
  if (key === 'date') { f.date = fd.get('date') || null; f.time = fd.get('time') || null; f.computed = null; if (!f.dkind) f.dkind = 'deadline'; }
  if (key === 'amount') { const v = parseFloat(fd.get('amount')); f.amount = isFinite(v) && v >= 0 ? v : null; }
  if (key === 'contact') { f.phone = String(fd.get('phone') || '').trim(); f.email = String(fd.get('email') || '').trim(); f.url = String(fd.get('url') || '').trim(); }
  if (key === 'from') f.from = String(fd.get('from') || '').trim();
  if (key === 'ref') { const v = String(fd.get('ref') || '').trim(); if (v) { f.ref = v; f.refMasked = St.makeItem({ ref: v }).ref; } }
  if (key === 'letterDate') {
    const v = fd.get('letterDate') || null;
    if (v && state.text) {
      // re-read with the right letter date, keeping what the user already fixed
      const keep = { ...f }; const r = read(state.text, { today: today(), letterDate: v }); const nf = toFields(r);
      for (const k of state.userSet) for (const p of FIELD_PARTS[k] || [k]) nf[p] = keep[p];
      state.reading = r; state.fields = nf;
    } else f.letterDate = v;
  }
  state.userSet.add(key); state.editing = null; state.reply = null; renderCard();
  const x = $(`[data-edit="${key}"]`); if (x) x.focus();
});
const FIELD_PARTS = { date: ['date', 'time', 'computed', 'dkind'], contact: ['phone', 'email', 'url'], ref: ['ref', 'refMasked'], action: ['action', 'also'] };

$('#icsBtn').addEventListener('click', () => {
  const f = state.fields; if (!f || !f.date) return;
  download(`${slug(f.from)}-${f.date}.ics`, buildIcs([eventFor(f, t, fmt)]), 'text/calendar');
});
$('#saveBtn').addEventListener('click', () => {
  const f = state.fields; if (!f) return;
  const it = St.makeItem(itemFrom(f, t, fmt));
  const same = state.items.find((x) => x.title === it.title && x.date === it.date && x.from === it.from);
  if (same) { $('#saveMsg').textContent = t('savedAlready'); return; }
  if (!state.pro && state.items.length >= FREE_ITEMS) { $('#saveMsg').textContent = t('savedFull', { n: FREE_ITEMS }); showLocked(); return; }
  state.items.push(it); persist(); $('#saveMsg').textContent = t('saved'); toast(t('saved')); renderDue();
});

// ------------------------------------------------------------------ reply drafts
function renderReplyKinds() {
  const f = state.fields; if (!f) return;
  const order = [...new Set([...(FOR_ACTION[f.action] || FOR_ACTION.null), ...REPLY_KINDS])];
  $('#replyKinds').innerHTML = order.map((k) => `<button type="button" data-reply="${k}" class="${state.pro ? '' : 'locked'}" aria-pressed="${state.reply === k}">${esc(t('rk.' + k))}</button>`).join('');
  $('#replyBox').classList.toggle('hidden', !(state.pro && state.reply));
}
function replyFields() {
  const f = state.fields;
  return { from: f.from, ref: f.ref || (f.refMasked ? f.refMasked : ''), letterDate: f.letterDate ? fmt.date(f.letterDate) : '', deadline: f.date ? fmt.date(f.date) + (f.time ? ' ' + fmt.time(f.time) : '') : '', amount: f.amount != null ? fmt.money(f.amount, f.currency) : '', name: $('#replyName').value, contact: '' };
}
let lastDraft = '';
function fillReply() {
  const d = draft(state.reply, replyFields(), lang);
  $('#replySubject').value = d.subject; $('#replyBody').value = d.body; lastDraft = d.body;
  $('#mailBtn').href = mailto(state.fields.email, d.subject, d.body);
}
$('#replyKinds').addEventListener('click', (e) => {
  const b = e.target.closest('[data-reply]'); if (!b) return;
  if (!state.pro) { showLocked(); return; }
  state.reply = b.dataset.reply; renderReplyKinds(); fillReply(); $('#replyBody').focus();
});
$('#replyName').addEventListener('input', () => { if ($('#replyBody').value === lastDraft) fillReply(); });
for (const id of ['#replySubject', '#replyBody']) $(id).addEventListener('input', () => { $('#mailBtn').href = mailto(state.fields.email, $('#replySubject').value, $('#replyBody').value); });
$('#copyBtn').addEventListener('click', async () => { const s = `${$('#replySubject').value}\n\n${$('#replyBody').value}`; try { await navigator.clipboard.writeText(s); toast(t('copied')); } catch (e) { $('#replyBody').select(); } });
$('#txtBtn').addEventListener('click', () => download(`reply-${slug(state.fields.from)}.txt`, `${$('#replySubject').value}\n\n${$('#replyBody').value}\n`, 'text/plain'));

// ------------------------------------------------------------------ what's due
function itemRow(it) {
  const d = it.date ? daysBetween(today(), it.date) : null;
  const when = it.date ? `${esc(fmt.short(it.date))}${it.time ? ' · ' + esc(fmt.time(it.time)) : ''}` : '—';
  const meta = [t('act.' + it.action), it.amount != null ? fmt.money(it.amount, it.currency) : '', it.date ? daysText(it.date, today(), t) : '', t('src.' + it.source), it.suggested ? t('suggested') : '', it.ref ? it.ref : ''].filter(Boolean).map(esc).join(' · ');
  const setDate = !it.date && !it.done ? `<label class="small setdate"><span>${esc(t('saverNoDate'))}</span><input type="date" data-setdate="${esc(it.id)}" aria-label="${esc(t('item.edit') + ': ' + it.title)}"></label>` : '';
  return `<li class="due-item${it.done ? ' done' : ''}${d != null && d < 0 && !it.done ? ' late' : ''}" data-id="${esc(it.id)}">
    <div class="when">${when}</div>
    <div class="what"><b>${esc(it.title)}</b><small>${meta}</small>${it.notes ? `<small>${esc(it.notes)}</small>` : ''}${setDate}</div>
    <div class="acts">
      <button type="button" data-item="done" aria-pressed="${it.done}">${esc(it.done ? t('item.undo') : t('item.done'))}</button>
      ${it.date ? `<button type="button" data-item="ics">${esc(t('item.ics'))}</button>` : ''}
      <button type="button" data-item="open" class="${state.pro ? '' : 'locked'}">${esc(t('item.draft'))}</button>
      <button type="button" data-item="del" aria-label="${esc(t('item.del') + ': ' + it.title)}">${esc(t('item.del'))}</button>
    </div></li>`;
}
function renderDue() {
  const items = state.items;
  $('#dueCount').textContent = String(items.filter((i) => !i.done).length);
  $('#dueLocked').classList.toggle('hidden', state.pro);
  $('#duePro').classList.toggle('hidden', !state.pro);
  if (!items.length) { $('#dueList').innerHTML = `<p class="small muted">${esc(t('dueEmpty'))}</p>`; $('#dueSummary').innerHTML = ''; }
  else if (!state.pro) {
    $('#dueSummary').innerHTML = `<p class="small">${esc(t('dueFree', { n: Math.min(items.length, FREE_ITEMS), max: FREE_ITEMS }))}</p>`;
    $('#dueList').innerHTML = `<ul class="due">${St.sortItems(items).slice(0, FREE_ITEMS).map(itemRow).join('')}</ul>`;
  } else {
    $('#dueSummary').innerHTML = summaryHtml();
    $('#dueList').innerHTML = St.groups(items, today()).map((g) => `<h3 class="grp g-${g.key}">${esc(t('group.' + g.key))} <span class="count">${g.items.length}</span></h3><ul class="due">${g.items.map(itemRow).join('')}</ul>`).join('');
  }
  renderWeek();
}
function summaryHtml() {
  const s = St.summary(state.items, today());
  const tot = Object.entries(s.totals).map(([c, v]) => fmt.money(v, c)).join(' + ');
  return `<p class="summary small"><b>${esc(s.count === 0 ? t('weekNone') : s.count === 1 ? t('weekOne') : t('weekSome', { n: s.count }))}</b>${tot ? ' ' + esc(t('weekTotal', { a: tot })) : ''}</p>`;
}
function renderWeek() {
  const s = St.summary(state.items, today());
  const show = state.pro && s.count > 0 && state.seenWeek !== s.week_key;
  $('#weekCard').classList.toggle('hidden', !show);
  if (!show) return;
  $('#weekBody').innerHTML = summaryHtml() + `<ul class="due compact">${[...s.overdue, ...s.week].slice(0, 6).map((it) => `<li class="due-item${it.date < today() ? ' late' : ''}"><div class="when">${esc(fmt.short(it.date))}</div><div class="what"><b>${esc(it.title)}</b><small>${esc([t('act.' + it.action), it.amount != null ? fmt.money(it.amount, it.currency) : '', daysText(it.date, today(), t)].filter(Boolean).join(' · '))}</small></div></li>`).join('')}</ul>`;
}
$('#weekOk').addEventListener('click', () => { state.seenWeek = St.weekKey(today()); persist(); renderWeek(); $('#inputCard').focus?.(); });
$('#dueCard').addEventListener('click', (e) => {
  if (e.target.closest('[data-show-plan]')) { showLocked(); return; }
  const b = e.target.closest('[data-item]'); if (!b) return;
  const id = b.closest('[data-id]').dataset.id; const it = state.items.find((x) => x.id === id); if (!it) return;
  const act = b.dataset.item;
  if (act === 'done') { it.done = !it.done; persist(); renderDue(); }
  else if (act === 'del') { state.items = state.items.filter((x) => x.id !== id); persist(); renderDue(); $('#dueMsg').textContent = t('deleted'); }
  else if (act === 'ics') download(`${slug(it.title)}-${it.date}.ics`, buildIcs([eventFor(fieldsFromItem(it), t, fmt, it.id)]), 'text/calendar');
  else if (act === 'open') {
    if (!state.pro) { showLocked(); return; }
    const f = { ...toFields(read('', { today: today() })), ...fieldsFromItem(it), actionConf: 'you', dateConf: 'you', amountConf: 'you', contactConf: 'you', fromConf: 'you', refConf: 'you', letterDateConf: 'low', others: [], sensitive: [], also: [] };
    state.fields = f; state.text = ''; state.userSet = new Set(['action', 'date', 'amount', 'contact', 'from', 'ref']); state.reply = (FOR_ACTION[f.action] || FOR_ACTION.null)[0];
    $('#results').classList.remove('hidden'); renderCard(); fillReply(); $('#replyCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
$('#dueCard').addEventListener('change', (e) => {
  const inp = e.target.closest('[data-setdate]'); if (!inp || !inp.value) return;
  const it = state.items.find((x) => x.id === inp.dataset.setdate); if (it) { it.date = inp.value; it.suggested = false; persist(); renderDue(); }
});
$('#addForm').addEventListener('submit', (e) => {
  e.preventDefault(); const fd = new FormData(e.target);
  const title = String(fd.get('title') || '').trim(); if (!title) { $('#dueMsg').textContent = t('addNeed'); return; }
  state.items.push(St.makeItem({ title, from: title, action: fd.get('action'), date: fd.get('date') || null, time: fd.get('time') || null, amount: fd.get('amount'), currency: currencyGuess(), notes: fd.get('notes'), source: 'manual' }));
  persist(); e.target.reset(); $('#dueMsg').textContent = t('added'); renderDue();
});
const currencyGuess = () => { const n = (navigator.language || '').toLowerCase(); return /^es-(es)|^(fr|de|it|nl|pt-pt)/.test(n) ? 'EUR' : /-gb$/.test(n) ? 'GBP' : /-mx$/.test(n) ? 'MXN' : 'USD'; };
$('#saverBtn').addEventListener('click', () => {
  const inc = St.fromSaver(undefined, today());
  if (!inc.length) { $('#dueMsg').textContent = t('saverNone'); return; }
  const r = St.mergeSaver(state.items, inc); state.items = r.items; persist(); renderDue();
  $('#dueMsg').textContent = r.added ? t('saverAdded', { n: r.added }) : t('saverSame');
});
$('#allIcsBtn').addEventListener('click', () => {
  const ev = state.items.filter((i) => !i.done && i.date).map((i) => eventFor(fieldsFromItem(i), t, fmt, i.id));
  download(`whats-due-${today()}.ics`, buildIcs(ev), 'text/calendar');
});
$('#backupBtn').addEventListener('click', () => download(`pilot-backup-${today()}.json`, St.backup(state.items), 'application/json'));
$('#restoreInput').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const r = St.restore(await file.text(), state.items);
  if (!r.ok) $('#dueMsg').textContent = t('restoreBad'); else { state.items = r.items; persist(); renderDue(); $('#dueMsg').textContent = t('restored', { n: r.added }); }
  e.target.value = '';
});
$('#clearBtn').addEventListener('click', () => { St.clear(); state.items = []; state.seenWeek = null; $('#clearMsg').textContent = t('privCleared'); renderDue(); });

// ------------------------------------------------------------------ plan
$$('[data-buy]').forEach((b) => b.addEventListener('click', async () => {
  if (!window.Studio) return;
  b.disabled = true; $('#buyMsg').textContent = t('opening');
  try { await window.Studio.upgrade('pilot', b.dataset.buy); }
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
function renderAll() { if (state.fields) renderCard(); renderDue(); }

applyLang();
renderDue();
if (window.Studio) window.Studio.init({ tool: TOOL, onChange: setPro });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__pilot = state; // for tests and debugging
