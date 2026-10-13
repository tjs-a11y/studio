// "Today's Linkr" widget (/play/embed/linkr/), made to sit in an iframe on other sites.
// Today's Normal daily, the same puzzle as /play/linkr/, playable in place. Deliberately light: no storage (third-party
// iframes often can't use it), no sound, no billing script, no service worker, no network calls.
import * as C from './core.mjs';
import * as L from './linkr.mjs';

const $ = (s) => document.querySelector(s);
const day = C.dayKey(); const n = C.challengeNumber(day);
const p = L.dailyPuzzle(day, 'normal');
let path = [p.start], t0 = 0, done = false, timer = null;

$('#title').textContent = `Today's Linkr #${n}`;
$('#target').textContent = p.target;

const board = $('#board');
board.style.setProperty('--n', p.n);
board.innerHTML = p.grid.map((v, i) => `<button class="lt" data-i="${i}" aria-label="Row ${Math.floor(i / p.n) + 1}, column ${(i % p.n) + 1}: ${v}${i === p.start ? ', start' : ''}${i === p.end ? ', finish flag' : ''}${p.gems.includes(i) ? ', gem' : ''}"><span class="v">${v}</span>${i === p.start ? '<span class="mk s" aria-hidden="true">S</span>' : ''}${i === p.end ? '<span class="mk f" aria-hidden="true">⚑</span>' : ''}${p.gems.includes(i) ? '<span class="mk g" aria-hidden="true">◆</span>' : ''}</button>`).join('')
  + `<svg class="trail" viewBox="0 0 ${p.n} ${p.n}" aria-hidden="true"><polyline points="" /></svg>`;

function tick() { if (done || !t0) return; $('#time').textContent = C.fmtTime(performance.now() - t0); timer = setTimeout(tick, 250); }
function startClock() { if (!t0) { t0 = performance.now(); tick(); } }

function draw() {
  const set = new Set(path); const head = path[path.length - 1];
  board.querySelectorAll('.lt').forEach((t) => { const i = Number(t.dataset.i); t.classList.toggle('on', set.has(i)); t.classList.toggle('head', i === head); t.classList.toggle('next', !done && !set.has(i) && L.adjacent(p.n, head, i)); });
  board.querySelector('polyline').setAttribute('points', path.map((c) => `${(c % p.n) + 0.5},${Math.floor(c / p.n) + 0.5}`).join(' '));
  const sum = path.reduce((a, c) => a + p.grid[c], 0); const left = p.gems.filter((g) => !set.has(g)).length;
  $('#sum').textContent = sum;
  if (!done) $('#status').textContent = `${sum > p.target ? `Over by ${sum - p.target}` : `${p.target - sum} to go`}${p.gems.length ? ` · ${left ? `${left} gem${left > 1 ? 's' : ''} left` : 'all gems ✓'}` : ''}`;
}
function finish() {
  const res = L.check(p, path);
  if (!res.ok) { $('#status').textContent = `${res.reason} Back up and try another way.`; return; }
  done = true; clearTimeout(timer);
  const ms = t0 ? performance.now() - t0 : 0; const stars = L.stars('normal', ms, 0);
  draw();
  $('#status').textContent = `Solved! ${L.STAR[stars]} ${C.fmtTime(ms)}`;
  const d = $('#done'); d.hidden = false;
  d.innerHTML = 'Nice work. Two more daily games are waiting: Echo (memory) and Swift (focus).';
  $('#back').textContent = 'Play Echo and Swift at Quickwell Play →';
}
function extend(i) {
  if (done) return;
  const last = path[path.length - 1];
  if (path.length > 1 && i === path[path.length - 2]) { path.pop(); return draw(); }
  if (path.includes(i) || last === p.end || !L.adjacent(p.n, last, i)) return;
  startClock(); path.push(i); draw();
  if (i === p.end) finish();
}
function tap(i) {
  if (done) return;
  const k = path.indexOf(i);
  if (k >= 0) { if (k < path.length - 1) { path.length = k + 1; draw(); } return; }
  extend(i);
}
const tileAt = (x, y) => { const el = document.elementFromPoint(x, y); const t = el && el.closest && el.closest('.lt'); return t && board.contains(t) ? Number(t.dataset.i) : null; };
let dragging = false;
board.addEventListener('pointerdown', (e) => { const i = tileAt(e.clientX, e.clientY); if (i == null) return; e.preventDefault(); dragging = true; try { board.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } tap(i); });
board.addEventListener('pointermove', (e) => { if (!dragging || done) return; const i = tileAt(e.clientX, e.clientY); if (i != null && i !== path[path.length - 1]) extend(i); });
const stop = () => { dragging = false; }; board.addEventListener('pointerup', stop); board.addEventListener('pointercancel', stop);
board.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.lt')) { e.preventDefault(); tap(Number(e.target.closest('.lt').dataset.i)); } });
$('#undo').onclick = () => { if (!done && path.length > 1) { path.pop(); draw(); } };
$('#reset').onclick = () => { if (!done && path.length > 1) { path = [p.start]; draw(); } };
draw();
