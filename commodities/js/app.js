// WorldSource Commodity Desk: the price board, holdings tracker and alerts (index page).
import { SERIES, GROUPS, SOURCES, seriesById, unitsFor, convert, perUsd, pct, portfolio, portfolioCsv, canAddHolding, FREE_HOLDINGS, checkAlerts, alertsIcs, windowPoints } from './core.js';
import { state, boot, tr, nameOf, unitName, money, numFmt, pctFmt, dateFmt, ccyName, esc, prefs, savePrefs, currencies, upgrade } from './chrome.js';
import { lineChart, curveChart } from './chart.js';

const $ = (id) => document.getElementById(id);
const open = new Map(); // series id -> range ('1' | '5' | 'all')
const histCache = new Map();
let holdings = Array.isArray(prefs().holdings) ? prefs().holdings : [];
let alerts = Array.isArray(prefs().alerts) ? prefs().alerts : [];
const saveHoldings = () => savePrefs({ holdings });
const saveAlerts = () => savePrefs({ alerts });
const uid = () => Math.random().toString(36).slice(2, 10);

const freqTag = (f) => `<span class="tag ${f === 'monthly' ? 'm' : 'd'}">${esc(tr(`freq.${f}`))}</span>`;
const srcLink = (k) => `<a href="${SOURCES[k].url}" rel="noopener">${esc(SOURCES[k].short)}</a>`;
const changeSpan = (now, before) => { const p = pct(now, before); return p == null ? '' : `<span class="${p > 0.005 ? 'up' : p < -0.005 ? 'down' : 'flat'}">${pctFmt(p)}</span>`; };
const isStale = (latest, src) => latest.sources && latest.sources[src] && latest.sources[src].status !== 'ok';

// ---------------------------------------------------------------------------------------------
function renderStatus() {
  const L = state.latest, el = $('status');
  if (!L) { el.className = state.loaded ? 'callout bad' : 'callout info'; el.textContent = state.loaded ? tr('st.unavailable') : tr('st.loading'); return; }
  const stale = Object.entries(L.sources || {}).filter(([, v]) => v.status !== 'ok');
  const parts = [];
  if (L.sample) parts.push(`<b>${esc(tr('st.sample'))}</b>`);
  parts.push(`${esc(tr('st.updated'))}: ${esc(dateFmt(L.generated))}.`);
  if (stale.length) parts.push(`${esc(tr('st.stale'))} ${stale.map(([k, v]) => `${esc(SOURCES[k].short)}${v.lastSuccess ? ` (${esc(dateFmt(v.lastSuccess))})` : ''}`).join(', ')}.`);
  el.className = `callout ${L.sample ? 'bad' : stale.length ? 'warn' : 'info'}`;
  el.innerHTML = parts.join(' ');
}

function rowHtml(r) {
  const s = seriesById(r.id);
  const conv = state.ccy !== 'USD' && state.latest.fx ? convert(r.value, 'USD', state.ccy, state.latest.fx.eur) : null;
  const range = open.get(r.id);
  return `<li>
  <div class="pxh"><span class="pxn">${esc(nameOf(r.id))}${s.detail ? ` <span class="note">${esc(s.detail)}</span>` : ''}</span>
  <span class="pxv">${money(r.value)} <small>/ ${esc(unitName(r.unit))}</small>${conv != null ? `<br><span class="conv">≈ ${money(conv, state.ccy)}</span>` : ''}</span></div>
  <div class="pxm">${changeSpan(r.value, r.prev)}${r.prevAsOf ? `<span>${esc(tr('col.prev'))}: ${esc(dateFmt(r.prevAsOf))}</span>` : ''}
  ${freqTag(r.freq)}<span>${esc(tr('col.asof'))}: <b>${esc(dateFmt(r.asOf))}</b></span><span>${srcLink(r.source)}</span>
  ${r.stale || isStale(state.latest, r.source) ? '<span class="tag stale">!</span>' : ''}
  <button type="button" class="link" data-chart="${r.id}" aria-expanded="${range ? 'true' : 'false'}" aria-controls="ch-${r.id}">${esc(tr(range ? 'board.hide' : 'board.chart'))}</button></div>
  <div class="chart" id="ch-${r.id}"${range ? '' : ' hidden'}></div>
</li>`;
}

function renderBoard() {
  const L = state.latest, board = $('board');
  if (!L) { board.innerHTML = ''; $('fx').hidden = true; $('yields').hidden = true; return; }
  const convNote = state.ccy !== 'USD' && L.fx ? `<p class="note">${esc(tr('board.conv', { ccy: state.ccy, date: dateFmt(L.fx.asOf) }))}</p>` : '';
  board.innerHTML = GROUPS.map((g) => {
    const rows = L.series.filter((r) => r.group === g && Number.isFinite(r.value));
    if (!rows.length) return '';
    return `<section class="card" id="g-${g}"><h2>${esc(tr(`grp.${g}`))}</h2><ul class="px">${rows.map(rowHtml).join('')}</ul></section>`;
  }).join('') + `<p class="note">${esc(tr('board.note'))}</p>${convNote}`;
  for (const id of open.keys()) drawChart(id);

  // Currencies
  const fx = L.fx;
  if (fx && fx.eur) {
    const list = currencies(L).filter((c) => c !== 'USD');
    $('fx').hidden = false;
    $('fx').innerHTML = `<h2>${esc(tr('fx.title'))}</h2><p class="note">${esc(tr('fx.note'))}</p>
<div class="pxm" style="margin-bottom:6px">${freqTag('daily')}<span>${esc(tr('col.asof'))}: <b>${esc(dateFmt(fx.asOf))}</b></span><span>${srcLink('ecb')}</span>${isStale(L, 'ecb') ? '<span class="tag stale">!</span>' : ''}</div>
<div class="tablewrap"><table class="t"><thead><tr><th>${esc(tr('grp.fx'))}</th><th class="r">1 USD =</th><th class="r">${esc(tr('col.change'))}</th></tr></thead><tbody>
${list.map((c) => { const now = perUsd(fx.eur, c), before = fx.prevEur ? perUsd(fx.prevEur, c) : null; return `<tr${c === state.ccy ? ' style="font-weight:700"' : ''}><td>${c} <span class="note">${esc(ccyName(c))}</span></td><td class="r">${numFmt(now, now < 10 ? 4 : 2)}</td><td class="r">${before ? changeSpan(now, before) : '—'}</td></tr>`; }).join('')}
</tbody></table></div>`;
  } else $('fx').hidden = true;

  // Yields
  const y = L.yields;
  if (y && y.tenors && y.tenors.length) {
    $('yields').hidden = false;
    $('yields').innerHTML = `<h2>${esc(tr('y.title'))}</h2><p class="note">${esc(tr('y.note'))}</p>
<div class="pxm">${freqTag('daily')}<span>${esc(tr('col.asof'))}: <b>${esc(dateFmt(y.asOf))}</b></span>${y.prevAsOf ? `<span>${esc(tr('col.prev'))}: ${esc(dateFmt(y.prevAsOf))}</span>` : ''}<span>${srcLink('treasury')}</span>${isStale(L, 'treasury') ? '<span class="tag stale">!</span>' : ''}</div>
<div class="chart">${curveChart(y.tenors, { labels: (t) => t.col.replace(' Month', ' Mo'), latestLabel: `${tr('y.today')} ${dateFmt(y.asOf)}`, prevLabel: `${tr('y.prev')}` })}</div>
<div class="tablewrap"><table class="t"><thead><tr><th></th><th class="r">${esc(tr('y.today'))}</th><th class="r">${esc(tr('y.prev'))}</th><th class="r">bp</th></tr></thead><tbody>
${y.tenors.map((t) => { const bp = Number.isFinite(t.prev) ? Math.round((t.value - t.prev) * 100) : null; return `<tr><td>${esc(t.col)}</td><td class="r">${numFmt(t.value)}%</td><td class="r">${Number.isFinite(t.prev) ? numFmt(t.prev) + '%' : '—'}</td><td class="r ${bp > 0 ? 'up' : bp < 0 ? 'down' : 'flat'}">${bp == null ? '—' : (bp > 0 ? '+' : '') + bp}</td></tr>`; }).join('')}
</tbody></table></div>`;
  } else $('yields').hidden = true;
}

async function history(id) {
  if (!histCache.has(id)) histCache.set(id, fetch(`/commodities/data/history/${id}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return histCache.get(id);
}
async function drawChart(id) {
  const el = $(`ch-${id}`); if (!el) return;
  const h = await history(id);
  if (!h || !h.points) { el.innerHTML = '<p class="note">—</p>'; return; }
  const range = state.pro ? open.get(id) || '1' : '1';
  const pts = windowPoints(h.points, h.freq, range === 'all' ? 'all' : Number(range));
  const isM = h.freq === 'monthly';
  el.innerHTML = lineChart(pts, { title: nameOf(id), fmtY: (v) => money(v), fmtX: (d) => dateFmt(d) }) +
    (state.pro ? `<div class="ranges" role="group">${['1', '5', 'all'].map((k) => `<button type="button" class="ghost small" data-range="${k}" data-id="${id}" aria-pressed="${k === range}">${esc(tr(k === 'all' ? 'chart.all' : `chart.${k}y`))}</button>`).join('')}</div>` : `<p class="note">${esc(tr('chart.free'))}</p>`) +
    `<p class="cite">${isM ? esc(tr('freq.monthly')) : esc(tr('freq.daily'))} · ${srcLink(h.source)}</p>`;
}

// ---------------------------------------------------------------------------------------------
// Tracker
function fillForm() {
  const kind = $('hKind').value, item = $('hItem'), unit = $('hUnit');
  const prevItem = item.value, prevUnit = unit.value;
  const avail = new Set(((state.latest && state.latest.series) || []).filter((r) => Number.isFinite(r.value)).map((r) => r.id));
  if (kind === 'currency') {
    item.innerHTML = currencies(state.latest).map((c) => `<option value="${c}">${c} · ${esc(ccyName(c))}</option>`).join('');
    $('hUnitWrap').hidden = true;
  } else {
    item.innerHTML = GROUPS.map((g) => `<optgroup label="${esc(tr(`grp.${g}`))}">${SERIES.filter((s) => s.group === g && (!state.latest || avail.has(s.id))).map((s) => `<option value="${s.id}">${esc(nameOf(s.id))}</option>`).join('')}</optgroup>`).join('');
    $('hUnitWrap').hidden = false;
  }
  if ([...item.options].some((o) => o.value === prevItem)) item.value = prevItem;
  if (kind === 'commodity') {
    unit.innerHTML = unitsFor(seriesById(item.value)).map((u) => `<option value="${u}">${esc(unitName(u))}</option>`).join('');
    if ([...unit.options].some((o) => o.value === prevUnit)) unit.value = prevUnit;
  }
}

function renderHoldings() {
  fillForm();
  const box = $('holdings');
  $('hAdd').disabled = !canAddHolding(holdings.length, state.pro);
  const limit = !state.pro && holdings.length >= FREE_HOLDINGS ? `<p class="callout warn">${esc(tr('tr.limit'))} <a href="#plan">${esc(tr('plan.title'))}</a></p>` : '';
  if (!holdings.length) { box.innerHTML = `<p class="note">${esc(tr('tr.empty'))}</p>`; return; }
  const p = portfolio(holdings, state.latest, state.ccy);
  const anyMonthly = p.rows.some((r) => r.freq === 'monthly');
  box.innerHTML = `<ul class="px">${p.rows.map((r) => {
    const h = r.holding;
    const what = h.kind === 'currency' ? `${numFmt(Number(h.qty))} ${h.ref}` : `${numFmt(Number(h.qty), Number(h.qty) % 1 ? 3 : 0)} ${unitName(h.unit)} · ${nameOf(h.ref)}`;
    const basis = !r.ok ? tr('tr.novalue') : h.kind === 'currency' ? tr('tr.cash', { date: dateFmt(r.asOf) }) : tr('tr.basis', { price: money(r.price), unit: unitName(seriesById(h.ref).unit), freq: tr(`freq.${r.freq}`), date: dateFmt(r.asOf), src: SOURCES[r.source].short });
    return `<li><div class="hold"><div><b>${esc(h.label || what)}</b>${h.label ? `<div class="note">${esc(what)}</div>` : ''}<div class="note">${esc(basis)}</div></div>
    <div style="text-align:right"><div class="pxv">${r.value == null ? '—' : money(r.value, state.ccy)}</div><button type="button" class="link small" data-del="${h.id}">${esc(tr('tr.remove'))}</button></div></div></li>`;
  }).join('')}</ul>
  <div class="total"><span>${esc(tr('tr.total'))}</span><span>${money(p.total, state.ccy)}</span></div>
  ${p.missing ? `<p class="note">${esc(tr('tr.missing', { n: p.missing }))}</p>` : ''}
  ${anyMonthly ? `<p class="note">${esc(tr('tr.monthlyNote'))}</p>` : ''}
  ${limit}
  <div class="row" style="margin-top:10px"><button type="button" class="ghost small" id="csv">${esc(tr('tr.export'))}</button></div>`;
}

function addHolding(e) {
  e.preventDefault();
  const msg = $('hMsg'); msg.textContent = ''; msg.className = 'msg';
  if (!canAddHolding(holdings.length, state.pro)) { msg.className = 'msg err'; msg.textContent = tr('tr.limit'); return; }
  const qty = Number($('hQty').value);
  if ($('hQty').value === '' || !Number.isFinite(qty) || qty < 0) { msg.className = 'msg err'; msg.textContent = tr('tr.bad'); $('hQty').focus(); return; }
  const kind = $('hKind').value;
  holdings.push({ id: uid(), kind, ref: $('hItem').value, qty, unit: kind === 'currency' ? $('hItem').value : $('hUnit').value, label: $('hLabel').value.trim().slice(0, 60) });
  saveHoldings();
  $('hQty').value = ''; $('hLabel').value = '';
  renderHoldings();
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// ---------------------------------------------------------------------------------------------
// Alerts (Desk plan)
function renderAlerts() {
  const body = $('alertsBody'), banner = $('alertBanner');
  const res = checkAlerts(alerts, state.latest);
  const hits = state.pro ? res.filter((r) => r.state === 'hit') : [];
  banner.hidden = !hits.length;
  banner.innerHTML = hits.length ? `<b>${esc(tr('al.banner'))}</b> ${hits.map((r) => `${esc(nameOf(r.alert.ref))} ${money(r.value)} (${esc(dateFmt(r.asOf))}, ${esc(tr(`freq.${r.freq}`))})`).join(' · ')}` : '';
  if (!state.pro) { body.innerHTML = `<p class="callout info">${esc(tr('al.locked'))} <a href="#plan">${esc(tr('plan.title'))}</a></p>`; return; }
  const avail = ((state.latest && state.latest.series) || []).filter((r) => Number.isFinite(r.value));
  body.innerHTML = `<form id="alForm" class="grid" novalidate>
  <label class="f"><span>${esc(tr('tr.item'))}</span><select id="aItem">${avail.map((r) => `<option value="${r.id}">${esc(nameOf(r.id))}</option>`).join('')}</select></label>
  <label class="f"><span>&nbsp;</span><select id="aOp"><option value="above">${esc(tr('al.above'))}</option><option value="below">${esc(tr('al.below'))}</option></select></label>
  <label class="f"><span>${esc(tr('al.level'))}</span><input id="aLevel" type="number" min="0" step="any" inputmode="decimal"></label>
  <div class="f" style="justify-content:flex-end;display:flex"><button type="submit">${esc(tr('al.add'))}</button></div></form>
  <ul class="px">${res.map((r) => `<li><div class="hold"><div><b>${esc(nameOf(r.alert.ref))}</b> ${esc(tr(`al.${r.alert.op}`))} ${money(r.alert.level)}
  <div class="note">${r.value != null ? `${money(r.value)} · ${esc(dateFmt(r.asOf))} · ${esc(tr(`freq.${r.freq}`))}` : ''}</div></div>
  <div style="text-align:right"><span class="tag ${r.state === 'hit' ? 'stale' : 'd'}">${esc(tr(`al.${r.state}`))}</span><br><button type="button" class="link small" data-delal="${r.alert.id}">${esc(tr('tr.remove'))}</button></div></div></li>`).join('')}</ul>
  ${alerts.length ? `<button type="button" class="ghost small" id="ics">${esc(tr('al.ics'))}</button>` : ''}`;
}

// ---------------------------------------------------------------------------------------------
function renderPlan() {
  $('planBuy').hidden = state.pro; $('planOn').hidden = !state.pro; $('welcome').hidden = !state.welcome;
}
function renderSources() {
  const L = state.latest;
  $('sourcesBody').innerHTML = `<ul>${Object.entries(SOURCES).map(([k, s]) => { const st = L && L.sources && L.sources[k]; return `<li><a href="${s.url}" rel="noopener">${esc(s.name)}</a>${s.via ? ` (${esc(s.via)})` : ''}. ${esc(tr('src.freq'))}: ${esc(tr(`freq.${s.freq}`))}. ${esc(tr('src.license'))}: ${esc(s.license)}${st && st.status !== 'ok' ? ` <span class="tag stale">${esc(st.status)}</span>` : ''}</li>`; }).join('')}</ul>
<p class="note">Brent, WTI and Henry Hub are EIA daily spot prices, retrieved through FRED. Metals, grains, softs, fertilizers, coal and non-U.S. gas are World Bank monthly averages. Currency values use ECB euro reference rates; cross rates against the dollar are derived from them. Holdings values are estimates for your own tracking, not quotes or offers.</p>`;
}

function render() {
  renderStatus(); renderBoard(); renderHoldings(); renderAlerts(); renderPlan(); renderSources();
}

// ---------------------------------------------------------------------------------------------
document.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.chart) { const id = t.dataset.chart; if (open.has(id)) open.delete(id); else open.set(id, '1'); renderBoard(); const b = document.querySelector(`[data-chart="${id}"]`); if (b) b.focus(); }
  else if (t.dataset.range) { open.set(t.dataset.id, t.dataset.range); drawChart(t.dataset.id); }
  else if (t.dataset.del) { holdings = holdings.filter((h) => h.id !== t.dataset.del); saveHoldings(); renderHoldings(); }
  else if (t.dataset.delal) { alerts = alerts.filter((a) => a.id !== t.dataset.delal); saveAlerts(); renderAlerts(); }
  else if (t.id === 'csv') download(`holdings-${new Date().toISOString().slice(0, 10)}.csv`, portfolioCsv(portfolio(holdings, state.latest, state.ccy)), 'text/csv;charset=utf-8');
  else if (t.id === 'ics') download('commodity-alerts.ics', alertsIcs({ url: `${location.origin}/commodities/`, alerts, start: new Date().toISOString().slice(0, 10) }), 'text/calendar;charset=utf-8');
  else if (t.id === 'buyM') upgrade('month', $('planMsg'));
  else if (t.id === 'buyY') upgrade('year', $('planMsg'));
  else if (t.id === 'manage' && window.Studio) window.Studio.manage().catch(() => {});
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'addForm') addHolding(e);
  else if (e.target.id === 'alForm') {
    e.preventDefault();
    const level = Number($('aLevel').value);
    if ($('aLevel').value === '' || !Number.isFinite(level) || level < 0) { $('aLevel').focus(); return; }
    alerts.push({ id: uid(), ref: $('aItem').value, op: $('aOp').value, level }); saveAlerts(); renderAlerts();
  }
});
$('hKind').addEventListener('change', () => { fillForm(); });
$('hItem').addEventListener('change', () => { if ($('hKind').value === 'commodity') { $('hUnit').innerHTML = unitsFor(seriesById($('hItem').value)).map((u) => `<option value="${u}">${esc(unitName(u))}</option>`).join(''); } });

boot(render);
