// Echo game page.
import * as C from './core.mjs';
import * as E from './echo.mjs';
import * as U from './ui.mjs';

const ID = 'echo', NAME = 'Echo';
const $ = U.$;
const FREE_TIERS = ['easy', 'normal'];
const MODES = [['classic', 'Classic'], ['mirror', 'Mirror'], ['dual', 'Dual']];
const PASS_MODES = ['mirror', 'dual'];
const STATS_MODES = [{ key: 'daily', label: 'Daily' }, ...MODES.flatMap(([m, ml]) => Object.entries(E.TIERS).map(([t, tt]) => ({ key: `${m}:${t}`, label: `${ml} · ${tt.name}` })))];
const sel = { mode: U.store.get('echo-mode', 'classic'), tier: U.store.get('echo-tier', 'normal') };
const STEPS = [
  ['👀', 'Watch the tiles light up, one after another.'],
  ['👆', 'Tap them back <b>in the same order</b>.'],
  ['➕', 'Each round adds one more tile. The grid grows as you go.'],
  ['💛', 'You have 3 hearts. A slip costs one and replays the round.'],
];
const DUAL_STEPS = [
  ['🔁', 'Dual: a tile lights with a symbol every couple of seconds.'],
  ['📍', 'Press <b>Place</b> (or A) if it is in the same place as the one before.'],
  ['🔷', 'Press <b>Symbol</b> (or L) if it shows the same symbol as the one before.'],
  ['🧠', 'Hard and Expert compare with <b>two</b> steps back.'],
];

// ---------- Menu ----------
function renderMenu() {
  const g = U.loadGame(ID); const d = U.today(); const n = C.challengeNumber(d);
  const lp = C.levelProgress(g.xp);
  $('#m-level').textContent = lp.level; $('#m-streak').textContent = U.liveGameStreak(g);
  $('#m-best').textContent = C.fmtInt(g.best.daily || 0); $('#m-xp').style.width = `${Math.round(lp.pct * 100)}%`;
  $('#xp-label').textContent = `${C.fmtInt(lp.into)} / ${C.fmtInt(lp.need)} XP to level ${lp.level + 1}`;
  const done = g.daily[d];
  $('#daily-title').textContent = `Daily Echo #${n}`;
  if (done) {
    $('#daily-body').innerHTML = `<p style="margin:0 0 8px">Done for today: <b>${C.fmtInt(done.score)}</b> points, ${done.rounds} rounds. <span class="muted">Next challenge in ${U.nextIn()}.</span></p><div id="daily-share"></div>`;
    U.shareBlock($('#daily-share'), done.card);
  } else {
    $('#daily-body').innerHTML = `<p class="muted" style="margin:0 0 12px">Same sequence for everyone today. 3 hearts, ${E.DAILY_ROUNDS} rounds. Free, always.</p><button class="btn big block" id="play-daily">Play today's Echo</button>`;
    $('#play-daily').onclick = () => start('daily');
  }
  // Practice chips
  $('#mode-chips').innerHTML = MODES.map(([k, l]) => `<button class="chip" data-mode="${k}" aria-pressed="${sel.mode === k}">${l}${!U.pass.on && PASS_MODES.includes(k) ? '<span class="lock" aria-label="Brain Pass">🔒</span>' : ''}</button>`).join('');
  $('#tier-chips').innerHTML = Object.entries(E.TIERS).map(([k, t]) => `<button class="chip" data-tier="${k}" aria-pressed="${sel.tier === k}">${t.name}${!U.pass.on && !FREE_TIERS.includes(k) ? '<span class="lock" aria-label="Brain Pass">🔒</span>' : ''}</button>`).join('');
  const left = U.practiceLeft(ID);
  $('#practice-left').textContent = U.pass.on ? 'Unlimited practice with Brain Pass.' : left > 0 ? `${left} of ${C.FREE_PRACTICE} free practice runs left today.` : 'Free practice runs are used up for today. They come back at midnight.';
  $('#mode-note').textContent = sel.mode === 'mirror' ? 'Mirror: tap the sequence back in reverse order.' : sel.mode === 'dual' ? `Dual: spot repeats of place and symbol, ${sel.tier === 'hard' || sel.tier === 'expert' ? '2' : '1'} step back.` : 'Classic: an endless climb. How long a sequence can you hold?';
}
function onChip(e) {
  const b = e.target.closest('.chip'); if (!b) return;
  if (b.dataset.mode) {
    if (!U.pass.on && PASS_MODES.includes(b.dataset.mode)) return U.passSheet(`${b.textContent.replace('🔒', '')} mode comes with Brain Pass.`);
    sel.mode = b.dataset.mode; U.store.set('echo-mode', sel.mode);
  }
  if (b.dataset.tier) {
    if (!U.pass.on && !FREE_TIERS.includes(b.dataset.tier)) return U.passSheet(`${E.TIERS[b.dataset.tier].name} difficulty comes with Brain Pass.`);
    sel.tier = b.dataset.tier; U.store.set('echo-tier', sel.tier);
  }
  renderMenu();
}

// ---------- Game ----------
let run = null;
const show = (id) => { for (const s of ['menu', 'play', 'result']) $('#' + s).hidden = s !== id; window.scrollTo(0, 0); };
function buildBoard(size) {
  const b = $('#board'); b.style.setProperty('--n', size); b.innerHTML = '';
  for (let i = 0; i < size * size; i++) {
    const t = document.createElement('button'); t.className = 'tile'; t.dataset.i = i;
    t.setAttribute('aria-label', `Tile row ${Math.floor(i / size) + 1}, column ${(i % size) + 1}`);
    b.appendChild(t);
  }
}
const tileEl = (i) => $(`#board .tile[data-i="${i}"]`);
function light(i, ms, cls = 'lit') { const t = tileEl(i); if (!t) return; t.classList.add(cls); setTimeout(() => t.classList.remove(cls), ms); }

function start(mode) {
  U.unlockAudio();
  if (mode === 'daily') {
    run = { kind: 'daily', mode: 'daily', tier: 'normal', rounds: E.dailyRounds(U.today()), day: U.today() };
  } else {
    if (!U.pass.on && (PASS_MODES.includes(sel.mode) || !FREE_TIERS.includes(sel.tier))) return U.passSheet();
    if (!U.takePractice(ID, NAME)) return;
    if (sel.mode === 'dual') return startDual();
    run = { kind: 'practice', mode: `${sel.mode}:${sel.tier}`, tier: sel.tier, mirror: sel.mode === 'mirror', rounds: E.makeRounds(C.randomSeed(), sel.tier, 40), day: U.today() };
  }
  Object.assign(run, { r: 0, lives: E.LIVES, results: [], score: 0, firstTry: true, accepting: false, size: 0, token: Symbol('run') });
  $('#dual-controls').hidden = true; $('#board').classList.remove('dual'); $('#hud-round-label').textContent = 'Round'; $('#hud-lives-label').textContent = 'Hearts';
  show('play'); updateHud(); playRound();
}
function updateHud() {
  $('#hud-round').textContent = run.r + 1; $('#hud-score').textContent = C.fmtInt(run.score);
  $('#hud-lives').textContent = '♥'.repeat(run.lives) + '♡'.repeat(E.LIVES - run.lives);
  $('#hud-lives').setAttribute('aria-label', `${run.lives} hearts left`);
}
async function playRound() {
  const tok = run.token; const round = run.rounds[run.r]; const t = E.TIERS[run.tier];
  if (round.size !== run.size) { run.size = round.size; buildBoard(round.size); }
  run.accepting = false; run.progress = 0; $('#board').classList.add('watching');
  $('#status').textContent = `Watch… ${round.seq.length} tiles`;
  await U.sleep(650);
  for (const c of round.seq) {
    if (run?.token !== tok) return;
    light(c, t.flash); U.sfx.note(c); await U.sleep(t.flash + t.gap);
  }
  if (run?.token !== tok) return;
  $('#board').classList.remove('watching');
  $('#status').textContent = run.mirror ? 'Your turn, backwards ↩' : 'Your turn';
  run.accepting = true;
}
function onTap(e) {
  const t = e.target.closest('.tile'); if (!t || !run || !run.accepting || run.kind === 'dual') return;
  const i = Number(t.dataset.i); const round = run.rounds[run.r];
  const res = E.checkTap(round.seq, run.progress, i, run.mirror);
  if (res === 'miss') {
    run.accepting = false; light(i, 450, 'wrong'); U.shake($('#board')); U.sfx.bad(); U.haptic([40, 30, 40]);
    run.lives--; run.firstTry = false; updateHud();
    if (run.lives <= 0) { run.results.push({ len: round.seq.length, size: round.size, cleared: false }); $('#status').textContent = 'Out of hearts'; return setTimeout(end, 900); }
    $('#status').textContent = 'Not quite. Watch again…';
    return setTimeout(playRound, 1000);
  }
  light(i, 220, 'hit'); U.sfx.note(i); U.haptic(8); run.progress++;
  if (res === 'done') {
    run.accepting = false;
    const r = { len: round.seq.length, size: round.size, cleared: true, firstTry: run.firstTry };
    run.results.push(r); run.score += E.roundPoints(r); updateHud(); U.bump($('#hud-score'));
    U.sfx.good(); $('#status').textContent = run.firstTry ? 'Perfect!' : 'Got it!';
    run.firstTry = true; run.r++;
    if (run.r >= run.rounds.length) return setTimeout(end, 700);
    setTimeout(() => { updateHud(); playRound(); }, 750);
  }
}

function end() {
  const cleared = run.results.filter((x) => x.cleared).length;
  const best = run.results.filter((x) => x.cleared).reduce((a, x) => Math.max(a, x.len), 0);
  const daily = run.kind === 'daily'; const n = C.challengeNumber(run.day);
  const out = U.finishRun(ID, { mode: run.mode, score: run.score, daily, day: run.day });
  const streak = daily ? out.streak : U.liveGameStreak(out.g);
  const title = daily ? `Echo #${n} · ${cleared}/${run.rounds.length} rounds` : `Echo ${run.mirror ? 'Mirror' : 'practice'} (${E.TIERS[run.tier].name}) · ${cleared} rounds`;
  const card = C.shareText({ title, pattern: E.sharePattern(run.results), stats: `${C.fmtInt(run.score)} pts · longest ${best} tiles${streak > 1 ? ` · 🔥${streak}` : ''}`, game: ID });
  if (daily) { const g = U.loadGame(ID); g.daily[run.day] = { score: run.score, rounds: cleared, card }; U.saveGame(ID, g); }
  showResult({ score: run.score, headline: daily ? `Daily Echo #${n}` : 'Practice run', sub: `${cleared} round${cleared === 1 ? '' : 's'} cleared · longest sequence ${best}`, card, out, daily });
  run = null;
}
function showResult({ score, headline, sub, card, out, daily }) {
  show('result');
  $('#r-head').textContent = headline; $('#r-sub').textContent = sub;
  U.countUp($('#r-score'), score);
  const badges = [];
  if (out.newBest) badges.push('New personal best!');
  if (daily && out.streak > 1) badges.push(`🔥 ${out.streak}-day streak`);
  $('#r-badges').innerHTML = badges.map((b) => `<span class="badge">${b}</span>`).join('');
  $('#r-xp').textContent = `+${out.xp} XP`;
  U.shareBlock($('#r-share'), card);
  const left = U.practiceLeft(ID);
  $('#r-note').innerHTML = !daily && !U.pass.on && left === 0
    ? 'That was your last free practice run today. They come back at midnight. <button class="link-btn" id="r-pass">Brain Pass</button> makes practice unlimited.'
    : daily ? `Next daily in ${U.nextIn()}. Keep practising below.` : '';
  const rp = $('#r-pass'); if (rp) rp.onclick = () => U.passSheet();
  $('#r-again').textContent = daily ? 'Practice' : 'Play again';
  if (out.newBest || daily) { U.sfx.win(); U.confetti(daily ? 36 : 24); }
  if (out.leveled) setTimeout(() => U.levelUp(out.leveled), 700);
}

// ---------- Dual (Brain Pass) ----------
async function startDual() {
  const nBack = sel.tier === 'hard' || sel.tier === 'expert' ? 2 : 1;
  const stream = E.dualStream(C.randomSeed(), nBack, 20);
  const pace = { easy: 2800, normal: 2500, hard: 2500, expert: 2100 }[sel.tier];
  run = { kind: 'dual', mode: `dual:${sel.tier}`, tier: sel.tier, stream, responses: [], i: -1, token: Symbol('dual'), day: U.today() };
  show('play'); run.size = 3; buildBoard(3); $('#board').classList.add('dual'); $('#dual-controls').hidden = false; $('#board').classList.add('watching');
  $('#hud-round-label').textContent = 'Step'; $('#hud-lives-label').textContent = 'Mode'; $('#hud-lives').textContent = `${nBack}-back`; $('#hud-lives').removeAttribute('aria-label'); $('#hud-score').textContent = '0';
  $('#status').textContent = `Get ready: compare with ${nBack} step${nBack > 1 ? 's' : ''} back`;
  const tok = run.token;
  await U.sleep(1200);
  for (let i = 0; i < stream.pos.length; i++) {
    if (run?.token !== tok) return;
    run.i = i; run.responses[i] = { pos: false, sym: false };
    $('#hud-round').textContent = `${i + 1}/${stream.pos.length}`;
    $('#dual-pos').classList.remove('on', 'ok', 'no'); $('#dual-sym').classList.remove('on', 'ok', 'no');
    const t = tileEl(stream.pos[i]); const s = stream.sym[i];
    t.innerHTML = `<span class="sym s${s}" aria-hidden="true">${E.SYMBOLS[s]}</span>`; t.classList.add('lit');
    $('#status').textContent = i < nBack ? 'Remember this one' : 'Same place? Same symbol?';
    U.sfx.note(s * 2 + 3);
    await U.sleep(650); t.classList.remove('lit'); t.innerHTML = '';
    await U.sleep(pace - 650);
    if (run?.token !== tok) return;
    // Feedback after each step: show what was right.
    if (i >= nBack) {
      const pm = stream.pos[i] === stream.pos[i - nBack], sm = stream.sym[i] === stream.sym[i - nBack]; const r = run.responses[i];
      if (r.pos !== pm || r.sym !== sm) { U.haptic(30); } else if (pm || sm) U.sfx.good();
    }
  }
  const res = E.dualScore(stream, run.responses);
  const out = U.finishRun(ID, { mode: run.mode, score: res.score, daily: false });
  const card = C.shareText({ title: `Echo Dual (${nBack}-back) · ${Math.round(res.accuracy * 100)}% accurate`, pattern: '🔷'.repeat(Math.round(res.accuracy * 10)) + '▫️'.repeat(10 - Math.round(res.accuracy * 10)), stats: `${res.hits} matches spotted · ${C.fmtInt(res.score)} pts`, game: ID });
  showResult({ score: res.score, headline: `Dual · ${nBack}-back`, sub: `${Math.round(res.accuracy * 100)}% accurate · ${res.hits} matches spotted · ${res.misses} missed · ${res.falseAlarms} false alarms`, card, out, daily: false });
  run = null;
}
function dualPress(which) {
  if (!run || run.kind !== 'dual' || run.i < 0) return;
  const r = run.responses[run.i]; if (!r || r[which]) return;
  r[which] = true; const n = run.stream.n; const i = run.i;
  const right = i >= n && (which === 'pos' ? run.stream.pos[i] === run.stream.pos[i - n] : run.stream.sym[i] === run.stream.sym[i - n]);
  const b = $(which === 'pos' ? '#dual-pos' : '#dual-sym'); b.classList.add(right ? 'ok' : 'no');
  if (right) { U.sfx.good(); U.haptic(10); } else { U.sfx.bad(); U.haptic([30, 20, 30]); }
}

// ---------- Wire up ----------
U.boot({
  onStats: () => U.statsSheet(ID, NAME, STATS_MODES),
  onHelp: () => U.tutorial(ID, NAME, sel.mode === 'dual' ? DUAL_STEPS : STEPS, true),
});
U.onPass(() => renderMenu());
$('#mode-chips').addEventListener('click', onChip); $('#tier-chips').addEventListener('click', onChip);
$('#play-practice').onclick = () => start('practice');
$('#board').addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button === 0) { e.preventDefault(); onTap(e); } });
$('#board').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(e); } });
$('#dual-pos').onclick = () => dualPress('pos'); $('#dual-sym').onclick = () => dualPress('sym');
addEventListener('keydown', (e) => { if (run?.kind === 'dual') { if (e.key === 'a' || e.key === 'A') dualPress('pos'); if (e.key === 'l' || e.key === 'L') dualPress('sym'); } });
$('#quit').onclick = () => { if (run && !confirm('Leave this run? It won\'t be saved.')) return; run = null; renderMenu(); show('menu'); };
$('#r-again').onclick = () => { renderMenu(); show('menu'); if ($('#r-again').textContent === 'Play again') start('practice'); else $('#practice-card').scrollIntoView({ behavior: U.reducedMotion() ? 'auto' : 'smooth' }); };
$('#r-menu').onclick = () => { renderMenu(); show('menu'); };
renderMenu();
U.tutorial(ID, NAME, STEPS).then(() => { if (new URLSearchParams(location.search).get('play') === 'daily' && !U.loadGame(ID).daily[U.today()]) start('daily'); });
