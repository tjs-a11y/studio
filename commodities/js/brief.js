// Daily brief page: the brief itself is rendered into the HTML by scripts/fetch.mjs (so it reads
// without JavaScript). This script adds the language chrome, refreshes the brief if the data is newer
// than the page, and opens the archive for Desk plan holders.
import { briefHtml, fmtDate } from './core.js';
import { state, boot, tr, esc } from './chrome.js';

const $ = (id) => document.getElementById(id);
const getJson = (u) => fetch(u, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const show = (b) => { $('brief').innerHTML = `<p class="briefdate" data-date="${esc(b.date)}">Brief for ${esc(fmtDate(b.date))}</p>\n${briefHtml(b)}`; };
let index = null, archiveShownFor = null;

async function refresh() {
  const shown = document.querySelector('#brief .briefdate');
  const b = await getJson('/commodities/data/brief/latest.json');
  if (b && b.date && (!shown || shown.dataset.date < b.date)) show(b);
}

async function renderArchive() {
  const body = $('archiveBody');
  if (!state.pro) { body.innerHTML = `<p class="note">${esc(tr('brief.archiveLocked'))} <a href="/commodities/#plan">${esc(tr('plan.title'))}</a></p>`; archiveShownFor = null; return; }
  if (archiveShownFor === state.lang) return;
  index = index || await getJson('/commodities/data/brief/index.json');
  const dates = (index && index.dates) || [];
  if (!dates.length) { body.innerHTML = '<p class="note">—</p>'; return; }
  archiveShownFor = state.lang;
  body.innerHTML = `<label class="f">${esc(tr('brief.pick'))}<select id="pick">${dates.map((d) => `<option value="${d}">${esc(fmtDate(d))}</option>`).join('')}</select></label>`;
  $('pick').addEventListener('change', async (e) => { const b = await getJson(`/commodities/data/brief/${e.target.value}.json`); if (b) show(b); });
}

function render() { $('langNote').hidden = state.lang === 'en'; renderArchive(); }
refresh();
boot(render);
