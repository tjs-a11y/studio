// Linkr game page.
import * as C from './core.mjs';
import * as L from './linkr.mjs';
import * as U from './ui.mjs';

const ID = 'linkr', NAME = 'Linkr';
const $ = U.$;
const FREE_TIERS = ['easy', 'normal'];
const FREE_DAILY = 'normal';
const MODES = [['classic', 'Classic'], ['blind', 'Blind total']];
const PASS_MODES = ['blind'];
const STATS_MODES = [{ key: 'daily', label: 'Daily · Normal' }, { key: 'daily:hard', label: 'Daily · Hard' }, { key: 'daily:expert', label: 'Daily · Expert' },
  ...MODES.flatMap(([m, ml]) => Object.entries(L.TIERS).map(([t, tt]) => ({ key: `${m}:${t}`, label: `${ml} · ${tt.name}` })))];
const sel = { mode: U.store.get('linkr-mode', 'classic'), tier: U.store.get('linkr-tier', 'normal') };
const STEPS = [
  ['🟢', 'Start on <b>S</b>. Drag (or tap tile by tile) to draw a path to the <b>flag</b>.'],
  ['➕', 'The numbers on your path must add up to <b>exactly</b> the target.'],
  ['◆', 'Pass through every <b>gem</b>. Move up, down, left or right; use each tile once.'],
  ['↩️', 'Tap an earlier tile on your path to back up. Keyboard: arrow keys and Backspace.'],
];

function renderMenu() {
  const g = U.loadGame(ID); const d = U.today(); const n = C.challengeNumber(d); const lp = C.levelProgress(g.xp);
  $('#m-level').textContent = lp.level; $('#m-streak').textContent = U.liveGameStreak(g);
  $('#m-best').textContent = C.fmtInt(g.best.daily || 0); $('#m-xp').style.width = `${Math.round(lp.pct * 100)}%`;
  $('#xp-label').textContent = `${C.fmtInt(lp.into)} / ${C.fmtInt(lp.need)} XP to level ${lp.level + 1}`;
  $('#daily-title').textContent = `Daily Linkr #${n}`;
  const today = g.daily[d] || {};
  $('#daily-body').innerHTML = ['normal', 'hard', 'expert'].map((t) => {
    const r = today[t]; const locked = t !== FREE_DAILY && !U.pass.on;
    return `<div class="drow"><div><b>${L.TIERS[t].name}</b> <span class="muted small">${L.TIERS[t].n}×${L.TIERS[t].n}${L.TIERS[t].gems ? `, ${L.TIERS[t].gems} gem${L.TIERS[t].gems > 1 ? 's' : ''}` : ''}</span>${r ? `<div class="small">${L.STAR[r.stars]} ${C.fmtTime(r.ms)} · ${C.fmtInt(r.score)} pts</div>` : ''}</div>
      ${r ? '<span class="pill">Solved</span>' : `<button class="btn ${t === FREE_DAILY ? '' : 'ghost'}" data-daily="${t}">${locked ? '🔒 ' : ''}Play</button>`}</div>`;
  }).join('') + (today.card ? `<div id="daily-share"></div><p class="small muted" style="margin:0">Next puzzles in ${U.nextIn()}.</p>` : '<p class="small muted" style="margin:8px 0 0">Same puzzles for everyone today. Normal is free, always.</p>');
  if (today.card) U.shareBlock($('#daily-share'), today.card);
  U.$$('[data-daily]').forEach((b) => { b.onclick = () => start('daily', b.dataset.daily); });
  $('#mode-chips').innerHTML = MODES.map(([k, l]) => `<button class="chip" data-mode="${k}" aria-pressed="${sel.mode === k}">${l}${!U.pass.on && PASS_MODES.includes(k) ? '<span class="lock" aria-label="Brain Pass">🔒</span>' : ''}</button>`).join('');
  $('#tier-chips').innerHTML = Object.entries(L.TIERS).map(([k, t]) => `<button class="chip" data-tier="${k}" aria-pressed="${sel.tier === k}">${t.name}${!U.pass.on && !FREE_TIERS.includes(k) ? '<span class="lock" aria-label="Brain Pass">🔒</span>' : ''}</button>`).join('');
  const left = U.practiceLeft(ID);
  $('#practice-left').textContent = U.pass.on ? 'Unlimited practice with Brain Pass.' : left > 0 ? `${left} of ${C.FREE_PRACTICE} free practice puzzles left today.` : 'Free practice puzzles are used up for today. They come back at midnight.';
  $('#mode-note').textContent = sel.mode === 'blind' ? 'Blind total: your running sum stays hidden. Add it up in your head.' : 'A fresh puzzle every time.';
}
function onChip(e) {
  const b = e.target.closest('.chip'); if (!b) return;
  if (b.dataset.mode) { if (!U.pass.on && PASS_MODES.includes(b.dataset.mode)) return U.passSheet('Blind total mode comes with Brain Pass.'); sel.mode = b.dataset.mode; U.store.set('linkr-mode', sel.mode); }
  if (b.dataset.tier) { if (!U.pass.on && !FREE_TIERS.includes(b.dataset.tier)) return U.passSheet(`${L.TIERS[b.dataset.tier].name} puzzles come with Brain Pass.`); sel.tier = b.dataset.tier; U.store.set('linkr-tier', sel.tier); }
  renderMenu();
}

let run = null;
const show = (id) => { for (const s of ['menu', 'play', 'result']) $('#' + s).hidden = s !== id; window.scrollTo(0, 0); };

function start(kind, tier) {
  U.unlockAudio();
  if (kind === 'daily') {
    if (tier !== FREE_DAILY && !U.pass.on) return U.passSheet(`The ${L.TIERS[tier].name} daily puzzle comes with Brain Pass. The Normal daily is free, always.`);
    run = { kind, tier, blind: false, mode: tier === FREE_DAILY ? 'daily' : `daily:${tier}`, p: L.dailyPuzzle(U.today(), tier), day: U.today() };
  } else {
    if (!U.pass.on && (PASS_MODES.includes(sel.mode) || !FREE_TIERS.includes(sel.tier))) return U.passSheet();
    if (!U.takePractice(ID, NAME)) return;
    run = { kind: 'practice', tier: sel.tier, blind: sel.mode === 'blind', mode: `${sel.mode}:${sel.tier}`, p: L.makePuzzle(C.randomSeed(), sel.tier), day: U.today() };
  }
  Object.assign(run, { path: [run.p.start], undos: 0, resets: 0, t0: performance.now(), done: false });
  show('play'); build(); draw(); tick();
}
function tick() { if (!run || run.done) return; $('#hud-time').textContent = C.fmtTime(performance.now() - run.t0); setTimeout(tick, 250); }
function build() {
  const { n, grid, start, end, gems } = run.p; const b = $('#board');
  b.style.setProperty('--n', n); b.classList.toggle('dense', n >= 6);
  b.innerHTML = grid.map((v, i) => `<button class="lt" data-i="${i}" aria-label="Row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}: ${v}${i === start ? ', start' : ''}${i === end ? ', finish flag' : ''}${gems.includes(i) ? ', gem' : ''}"><span class="v">${v}</span>${i === start ? '<span class="mk s" aria-hidden="true">S</span>' : ''}${i === end ? '<span class="mk f" aria-hidden="true">⚑</span>' : ''}${gems.includes(i) ? '<span class="mk g" aria-hidden="true">◆</span>' : ''}</button>`).join('')
    + `<svg class="trail" viewBox="0 0 ${n} ${n}" aria-hidden="true"><polyline points="" /></svg>`;
  $('#hud-target').textContent = run.p.target;
  $('#hud-tier').textContent = `${L.TIERS[run.tier].name}${run.blind ? ' · Blind' : ''}`;
}
function draw() {
  const { n, gems } = run.p; const set = new Set(run.path); const endC = run.path[run.path.length - 1];
  U.$$('#board .lt').forEach((t) => { const i = Number(t.dataset.i); t.classList.toggle('on', set.has(i)); t.classList.toggle('head', i === endC); t.classList.toggle('next', !run.done && !set.has(i) && L.adjacent(n, endC, i)); });
  $('#board polyline').setAttribute('points', run.path.map((c) => `${(c % n) + 0.5},${Math.floor(c / n) + 0.5}`).join(' '));
  const sum = run.path.reduce((a, c) => a + run.p.grid[c], 0); const gemsLeft = gems.filter((g) => !set.has(g)).length;
  $('#hud-sum').textContent = run.blind && !run.done ? '?' : sum;
  $('#hud-sum').parentElement.classList.toggle('over', !run.blind && sum > run.p.target);
  if (!run.done) $('#status').textContent = run.blind ? `${run.path.length} tiles · ${gemsLeft ? `${gemsLeft} gem${gemsLeft > 1 ? 's' : ''} to go` : 'all gems collected'}` : `${sum > run.p.target ? `Over by ${sum - run.p.target}` : `${run.p.target - sum} to go`} · ${gems.length ? (gemsLeft ? `${gemsLeft} gem${gemsLeft > 1 ? 's' : ''} left` : 'all gems ✓') : `${run.path.length} tiles`}`;
}
function extend(i) {
  const { n, end } = run.p; const path = run.path; const last = path[path.length - 1];
  if (path.length > 1 && i === path[path.length - 2]) { path.pop(); run.undos++; U.sfx.tap(); return draw(); }
  if (path.includes(i)) return;
  if (last === end) return; // finished: back up first
  if (!L.adjacent(n, last, i)) return;
  path.push(i); U.haptic(6); U.tone(300 + Math.min(900, path.reduce((a, c) => a + run.p.grid[c], 0) * 9), 0.06, 'sine', 0.08);
  draw();
  if (i === end) finishAttempt();
}
function finishAttempt() {
  const res = L.check(run.p, run.path);
  if (res.ok) return win();
  $('#status').textContent = `${res.reason} Back up and try another way.`;
  U.sfx.bad(); U.haptic([40, 30, 40]); U.shake($('#board'));
}
function tapTile(i) {
  if (!run || run.done) return;
  const k = run.path.indexOf(i);
  if (k >= 0) { if (k < run.path.length - 1) { run.path.length = k + 1; run.undos++; U.sfx.tap(); draw(); } return; }
  const last = run.path[run.path.length - 1];
  if (!L.adjacent(run.p.n, last, i) || last === run.p.end) { U.shake($(`#board .lt[data-i="${i}"]`)); return; }
  extend(i);
}

async function win() {
  run.done = true; const ms = performance.now() - run.t0;
  const stars = L.stars(run.tier, ms, run.resets); const score = L.score(run.tier, ms, run.resets, run.undos);
  draw(); $('#status').textContent = `Solved! ${L.STAR[stars]}`;
  U.sfx.win(); U.haptic([20, 30, 60]);
  if (!U.reducedMotion()) { for (const c of run.path) { const t = $(`#board .lt[data-i="${c}"]`); t.classList.add('pop'); await U.sleep(Math.max(25, 260 / run.path.length * 2)); } }
  await U.sleep(500);
  const daily = run.kind === 'daily'; const d = run.day; const n = C.challengeNumber(d);
  const g0 = U.loadGame(ID); const prevDay = { ...(g0.daily[d] || {}) };
  const entry = { stars, ms, score };
  const out = U.finishRun(ID, { mode: run.mode, score, daily, day: d, result: daily ? { ...prevDay, [run.tier]: entry } : undefined });
  let card;
  if (daily) {
    const g = U.loadGame(ID); const day = g.daily[d];
    const lines = ['normal', 'hard', 'expert'].filter((t) => day[t]).map((t) => `${L.TIERS[t].name.padEnd(6)} ${L.STAR[day[t].stars]}${'☆'.repeat(3 - day[t].stars)} ${C.fmtTime(day[t].ms)}`);
    card = C.shareText({ title: `🔗 Linkr #${n}`, pattern: lines.join('\n'), stats: out.streak > 1 ? `🔥 ${out.streak}-day streak` : '', game: ID });
    day.card = card; U.saveGame(ID, g);
  } else {
    card = C.shareText({ title: `🔗 Linkr ${run.blind ? 'Blind ' : ''}practice (${L.TIERS[run.tier].name})`, pattern: `${L.STAR[stars]}${'☆'.repeat(3 - stars)} ${C.fmtTime(ms)}`, stats: `${run.path.length} links · ${run.undos} undo${run.undos === 1 ? '' : 's'}`, game: ID });
  }
  show('result');
  $('#r-head').textContent = daily ? `Daily Linkr #${n} · ${L.TIERS[run.tier].name}` : `Practice · ${L.TIERS[run.tier].name}`;
  U.countUp($('#r-score'), score);
  $('#r-sub').textContent = `${L.STAR[stars]}${'☆'.repeat(3 - stars)} · ${C.fmtTime(ms)} · ${run.path.length} links · par ${C.fmtTime(L.TIERS[run.tier].par * 1000)}`;
  const badges = []; if (out.newBest) badges.push('New personal best!'); if (daily && out.streak > 1) badges.push(`🔥 ${out.streak}-day streak`);
  $('#r-badges').innerHTML = badges.map((b) => `<span class="badge">${b}</span>`).join('');
  $('#r-xp').textContent = `+${out.xp} XP`;
  U.shareBlock($('#r-share'), card);
  const left = U.practiceLeft(ID);
  $('#r-note').innerHTML = !daily && !U.pass.on && left === 0 ? 'That was your last free practice puzzle today. They come back at midnight. <button class="link-btn" id="r-pass">Brain Pass</button> makes practice unlimited.'
    : daily && run.tier === FREE_DAILY && !U.pass.on ? 'Want more? Hard and Expert dailies come with <button class="link-btn" id="r-pass">Brain Pass</button>.' : '';
  const rp = $('#r-pass'); if (rp) rp.onclick = () => U.passSheet();
  $('#r-again').textContent = daily ? 'Practice' : 'Play again';
  U.confetti(daily ? 36 : 24);
  if (out.leveled) setTimeout(() => U.levelUp(out.leveled), 700);
  run = null;
}

U.boot({ onStats: () => U.statsSheet(ID, NAME, STATS_MODES), onHelp: () => U.tutorial(ID, NAME, STEPS, true) });
U.onPass(() => renderMenu());
$('#mode-chips').addEventListener('click', onChip); $('#tier-chips').addEventListener('click', onChip);
$('#play-practice').onclick = () => start('practice');
// Pointer: press a tile, then drag across neighbours. Dragging back onto the previous tile backs up.
const board = $('#board'); let dragging = false;
const tileAt = (x, y) => { const el = document.elementFromPoint(x, y); const t = el && el.closest && el.closest('.lt'); return t && board.contains(t) ? Number(t.dataset.i) : null; };
board.addEventListener('pointerdown', (e) => { const i = tileAt(e.clientX, e.clientY); if (i == null || !run) return; e.preventDefault(); dragging = true; try { board.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } tapTile(i); });
board.addEventListener('pointermove', (e) => { if (!dragging || !run || run.done) return; const i = tileAt(e.clientX, e.clientY); if (i != null && i !== run.path[run.path.length - 1]) extend(i); });
const stop = () => { dragging = false; }; board.addEventListener('pointerup', stop); board.addEventListener('pointercancel', stop);
board.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.lt')) { e.preventDefault(); tapTile(Number(e.target.closest('.lt').dataset.i)); } });
addEventListener('keydown', (e) => {
  if (!run || run.done || $('#play').hidden) return;
  const n = run.p.n; const last = run.path[run.path.length - 1]; const x = last % n, y = Math.floor(last / n);
  const mv = { ArrowUp: y > 0 ? last - n : -1, ArrowDown: y < n - 1 ? last + n : -1, ArrowLeft: x > 0 ? last - 1 : -1, ArrowRight: x < n - 1 ? last + 1 : -1 }[e.key];
  if (mv !== undefined) { e.preventDefault(); if (mv >= 0) extend(mv); return; }
  if (e.key === 'Backspace') { e.preventDefault(); $('#undo').click(); }
});
$('#undo').onclick = () => { if (!run || run.done || run.path.length < 2) return; run.path.pop(); run.undos++; U.sfx.tap(); draw(); };
$('#reset').onclick = () => { if (!run || run.done || run.path.length < 2) return; run.path = [run.p.start]; run.resets++; U.sfx.tap(); draw(); };
$('#quit').onclick = () => { if (run && !run.done && run.path.length > 1 && !confirm('Leave this puzzle? It won\'t be saved.')) return; run = null; renderMenu(); show('menu'); };
$('#r-again').onclick = () => { renderMenu(); show('menu'); if ($('#r-again').textContent === 'Play again') start('practice'); else $('#practice-card').scrollIntoView({ behavior: U.reducedMotion() ? 'auto' : 'smooth' }); };
$('#r-menu').onclick = () => { renderMenu(); show('menu'); };
renderMenu();
U.tutorial(ID, NAME, STEPS).then(() => { if (new URLSearchParams(location.search).get('play') === 'daily' && !(U.loadGame(ID).daily[U.today()] || {})[FREE_DAILY]) start('daily', FREE_DAILY); });
