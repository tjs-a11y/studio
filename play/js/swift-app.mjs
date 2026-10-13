// Swift game page.
import * as C from './core.mjs';
import * as S from './swift.mjs';
import * as U from './ui.mjs';

const ID = 'swift', NAME = 'Swift';
const $ = U.$;
const FREE_TIERS = ['easy', 'normal'];
const MODES = [['timed', 'Timed'], ['zen', 'Zen'], ['sudden', 'Sudden death']];
const PASS_MODES = ['zen', 'sudden'];
const ZEN_ITEMS = 40, SUDDEN_MS = 3000;
const STATS_MODES = [{ key: 'daily', label: 'Daily' }, ...MODES.flatMap(([m, ml]) => Object.entries(S.TIERS).map(([t, tt]) => ({ key: `${m}:${t}`, label: `${ml} · ${tt.name}` })))];
const sel = { mode: U.store.get('swift-mode', 'timed'), tier: U.store.get('swift-tier', 'normal') };
const STEPS = [
  ['⚡', 'Small challenges flash up fast. Read the question at the top.'],
  ['🎨', 'Tap the <b>ink colour</b>, the arrow\'s <b>real direction</b>, the <b>odd one out</b>, the side with <b>more dots</b>…'],
  ['✖️', 'Right answers in a row build a combo: ×2, ×3, up to ×4. A slip resets it and costs 2 seconds.'],
  ['⌨️', 'On a keyboard: arrow keys or 1–4.'],
];

function renderMenu() {
  const g = U.loadGame(ID); const d = U.today(); const n = C.challengeNumber(d); const lp = C.levelProgress(g.xp);
  $('#m-level').textContent = lp.level; $('#m-streak').textContent = U.liveGameStreak(g);
  $('#m-best').textContent = C.fmtInt(g.best.daily || 0); $('#m-xp').style.width = `${Math.round(lp.pct * 100)}%`;
  $('#xp-label').textContent = `${C.fmtInt(lp.into)} / ${C.fmtInt(lp.need)} XP to level ${lp.level + 1}`;
  const done = g.daily[d];
  $('#daily-title').textContent = `Daily Swift #${n}`;
  if (done) {
    $('#daily-body').innerHTML = `<p style="margin:0 0 8px">Done for today: <b>${C.fmtInt(done.score)}</b> points, best combo ×${done.mult || 1}. <span class="muted">Next challenge in ${U.nextIn()}.</span></p><div id="daily-share"></div>`;
    U.shareBlock($('#daily-share'), done.card);
  } else {
    $('#daily-body').innerHTML = `<p class="muted" style="margin:0 0 12px">${S.DAILY_SECONDS} seconds. The same challenges for everyone today. Free, always.</p><button class="btn big block" id="play-daily">Play today's Swift</button>`;
    $('#play-daily').onclick = () => start('daily');
  }
  $('#mode-chips').innerHTML = MODES.map(([k, l]) => `<button class="chip" data-mode="${k}" aria-pressed="${sel.mode === k}">${l}${!U.pass.on && PASS_MODES.includes(k) ? '<span class="lock" aria-label="Brain Pass">🔒</span>' : ''}</button>`).join('');
  $('#tier-chips').innerHTML = Object.entries(S.TIERS).map(([k, t]) => `<button class="chip" data-tier="${k}" aria-pressed="${sel.tier === k}">${t.name}${!U.pass.on && !FREE_TIERS.includes(k) ? '<span class="lock" aria-label="Brain Pass">🔒</span>' : ''}</button>`).join('');
  const left = U.practiceLeft(ID);
  $('#practice-left').textContent = U.pass.on ? 'Unlimited practice with Brain Pass.' : left > 0 ? `${left} of ${C.FREE_PRACTICE} free practice runs left today.` : 'Free practice runs are used up for today. They come back at midnight.';
  $('#mode-note').textContent = sel.mode === 'zen' ? `Zen: ${ZEN_ITEMS} challenges, no clock. Accuracy and calm.` : sel.mode === 'sudden' ? 'Sudden death: one slip, or 3 seconds of hesitation, ends the run.' : '60 seconds. Build the biggest combo you can.';
}
function onChip(e) {
  const b = e.target.closest('.chip'); if (!b) return;
  if (b.dataset.mode) { if (!U.pass.on && PASS_MODES.includes(b.dataset.mode)) return U.passSheet(`${b.textContent.replace('🔒', '')} mode comes with Brain Pass.`); sel.mode = b.dataset.mode; U.store.set('swift-mode', sel.mode); }
  if (b.dataset.tier) { if (!U.pass.on && !FREE_TIERS.includes(b.dataset.tier)) return U.passSheet(`${S.TIERS[b.dataset.tier].name} difficulty comes with Brain Pass.`); sel.tier = b.dataset.tier; U.store.set('swift-tier', sel.tier); }
  renderMenu();
}

let run = null;
const show = (id) => { for (const s of ['menu', 'play', 'result']) $('#' + s).hidden = s !== id; window.scrollTo(0, 0); };

function start(kind) {
  U.unlockAudio();
  if (kind === 'daily') run = { kind, mode: 'daily', tier: 'normal', items: S.dailyStream(U.today(), U.prefs.noColor), total: S.DAILY_SECONDS * 1000, day: U.today() };
  else {
    if (!U.pass.on && (PASS_MODES.includes(sel.mode) || !FREE_TIERS.includes(sel.tier))) return U.passSheet();
    if (!U.takePractice(ID, NAME)) return;
    const timed = sel.mode === 'timed';
    run = { kind: sel.mode, mode: `${sel.mode}:${sel.tier}`, tier: sel.tier, items: S.makeStream(C.randomSeed(), sel.tier, sel.mode === 'zen' ? ZEN_ITEMS : 400, U.prefs.noColor), total: timed ? S.TIERS[sel.tier].seconds * 1000 : 0, day: U.today() };
  }
  Object.assign(run, { i: 0, combo: 0, mult: 1, bestCombo: 0, score: 0, answers: [], penalty: 0, token: Symbol('run'), locked: true });
  show('play'); hud();
  $('#timer').hidden = !run.total; $('#hud-time-wrap').hidden = !run.total && run.kind !== 'zen';
  countdown();
}
async function countdown() {
  const tok = run.token;
  for (const t of ['3', '2', '1']) { if (run?.token !== tok) return; $('#prompt').textContent = 'Get ready'; $('#stage').innerHTML = `<div class="count">${t}</div>`; $('#opts').innerHTML = ''; U.sfx.tap(); await U.sleep(550); }
  if (run?.token !== tok) return;
  run.t0 = performance.now(); run.locked = false; next();
  if (run.total) tick();
}
function tick() {
  if (!run || run.ended) return;
  const left = run.total - (performance.now() - run.t0) - run.penalty;
  $('#timer i').style.transform = `scaleX(${Math.max(0, left / run.total)})`;
  $('#hud-time').textContent = Math.max(0, Math.ceil(left / 1000));
  if (left <= 0) return end();
  requestAnimationFrame(tick);
}
function hud() {
  $('#hud-score').textContent = C.fmtInt(run.score);
  $('#hud-combo').textContent = `×${run.mult}`; $('#hud-combo').dataset.m = run.mult;
  $('#hud-streak').textContent = run.combo;
  if (run.kind === 'zen') $('#hud-time').textContent = `${run.i}/${ZEN_ITEMS}`;
  if (run.kind === 'sudden') $('#hud-time').textContent = '∞';
}
const inkClass = (i) => `ink${i}`;
function render(ch) {
  $('#prompt').textContent = ch.prompt;
  const st = $('#stage'), op = $('#opts'); op.className = 'opts'; st.className = 'stage';
  if (ch.type === 'ink') {
    st.innerHTML = `<div class="word ${inkClass(ch.ink)}" aria-label="The word ${S.INKS[ch.word].name}, in ${S.INKS[ch.ink].name} ink">${S.INKS[ch.word].name.toUpperCase()}</div>`;
    op.classList.add('four');
    op.innerHTML = ch.options.map((o, k) => `<button class="opt" data-k="${k}"><span class="sw ${inkClass(o.ink)}" aria-hidden="true"></span>${o.label}</button>`).join('');
  } else if (ch.type === 'arrow') {
    st.innerHTML = `<div class="arrow" aria-label="An arrow pointing ${S.DIRS[ch.dir]}, labelled ${S.DIRS[ch.word]}"><span class="a" style="transform:rotate(${ch.dir * 90}deg)">↑</span><span class="lbl">${S.DIRS[ch.word].toUpperCase()}</span></div>`;
    op.classList.add('four');
    op.innerHTML = ch.options.map((o, k) => `<button class="opt big" data-k="${k}" aria-label="${o.aria}">${o.label}</button>`).join('');
  } else if (ch.type === 'flank') {
    st.innerHTML = `<div class="flank" aria-label="Five arrows; the middle one points ${ch.answer ? 'right' : 'left'}">${ch.row}</div>`;
    op.innerHTML = ch.options.map((o, k) => `<button class="opt big" data-k="${k}" aria-label="${o.aria}">${o.label}</button>`).join('');
  } else if (ch.type === 'odd') {
    st.innerHTML = '';
    op.classList.add('grid'); op.style.setProperty('--c', ch.cols);
    op.innerHTML = ch.options.map((o, k) => `<button class="opt cell" data-k="${k}">${U.esc(o.label)}</button>`).join('');
  } else if (ch.type === 'more') {
    const dots = (arr) => arr.map(([x, y]) => `<i style="left:${x}%;top:${y}%"></i>`).join('');
    st.innerHTML = `<div class="dots"><button class="panel" data-k="0" aria-label="Left side">${dots(ch.left)}</button><button class="panel" data-k="1" aria-label="Right side">${dots(ch.right)}</button></div>`;
    op.innerHTML = ch.options.map((o, k) => `<button class="opt" data-k="${k}">${o.label}</button>`).join('');
  } else {
    st.innerHTML = `<div class="eq">${ch.text}</div>`;
    op.innerHTML = ch.options.map((o, k) => `<button class="opt" data-k="${k}">${o.label}</button>`).join('');
  }
  if (!U.reducedMotion()) { st.classList.add('in'); }
}
function next() {
  if (!run || run.ended) return;
  if (run.i >= run.items.length) return end();
  run.cur = run.items[run.i]; run.shown = performance.now(); render(run.cur); hud();
  if (run.kind === 'sudden') { const tok = run.token, i = run.i; clearTimeout(run.slow); run.slow = setTimeout(() => { if (run?.token === tok && run.i === i && !run.ended) { $('#prompt').textContent = 'Too slow!'; U.sfx.bad(); U.haptic([40, 30, 40]); run.answers.push({ correct: false, ms: SUDDEN_MS, t: performance.now() - run.t0 }); setTimeout(end, 500); run.locked = true; } }, SUDDEN_MS); }
}
function answer(k) {
  if (!run || run.locked || run.ended || !run.cur) return;
  const ms = performance.now() - run.shown; const correct = k === run.cur.answer;
  const s = S.scoreAnswer(correct, ms, run.combo);
  run.answers.push({ correct, ms, t: performance.now() - run.t0 });
  const prevMult = run.mult; run.combo = s.combo; run.mult = s.mult; run.score += s.points; run.bestCombo = Math.max(run.bestCombo, run.combo);
  const btns = U.$$(`#opts [data-k="${k}"], #stage [data-k="${k}"]`);
  if (correct) {
    btns.forEach((b) => b.classList.add('ok')); U.haptic(8);
    if (run.mult > prevMult) { U.sfx.combo(run.mult); U.bump($('#hud-combo')); flash(`Combo ×${run.mult}!`); } else U.sfx.tap();
    U.bump($('#hud-score'));
  } else {
    btns.forEach((b) => b.classList.add('no')); U.$$(`#opts [data-k="${run.cur.answer}"], #stage [data-k="${run.cur.answer}"]`).forEach((b) => b.classList.add('ok'));
    U.sfx.bad(); U.haptic([40, 30, 40]); U.shake($('#stage'));
    if (run.total) { run.penalty += s.penalty; flash('−2s'); }
  }
  hud(); run.i++;
  if (run.kind === 'sudden' && !correct) { run.locked = true; clearTimeout(run.slow); return setTimeout(end, 600); }
  run.locked = true; setTimeout(() => { if (run) { run.locked = false; next(); } }, correct ? 140 : 420);
}
function flash(text) { const f = $('#flash'); f.textContent = text; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

function end() {
  if (!run || run.ended) return; run.ended = true; clearTimeout(run.slow);
  const r = S.scoreRun(run.answers); const daily = run.kind === 'daily'; const n = C.challengeNumber(run.day);
  const out = U.finishRun(ID, { mode: run.mode, score: run.score, daily, day: run.day });
  const streak = daily ? out.streak : U.liveGameStreak(out.g);
  const segs = run.total ? Math.round(run.total / 5000) : 8; const span = run.total || Math.max(1, run.answers.length ? run.answers[run.answers.length - 1].t + 1 : 1);
  const line = '⚡ ' + C.spark(S.buckets(run.answers, span, segs));
  const label = daily ? `Swift #${n}` : `Swift ${MODES.find(([k]) => k === run.kind)[1]} (${S.TIERS[run.tier].name})`;
  const card = C.shareText({ title: `${label} · ${C.fmtInt(run.score)} pts`, pattern: line, stats: `${r.right} right · ${r.wrong} slip${r.wrong === 1 ? '' : 's'} · best combo ${run.bestCombo}${streak > 1 ? ` · 🔥${streak}` : ''}`, game: ID });
  const maxMult = S.multFor(run.bestCombo);
  if (daily) { const g = U.loadGame(ID); g.daily[run.day] = { score: run.score, mult: maxMult, card }; U.saveGame(ID, g); }
  show('result');
  $('#r-head').textContent = daily ? `Daily Swift #${n}` : label;
  U.countUp($('#r-score'), run.score);
  $('#r-sub').textContent = `${r.right} right · ${r.wrong} slip${r.wrong === 1 ? '' : 's'} · ${Math.round(r.accuracy * 100)}% accurate · best combo ${run.bestCombo} (×${maxMult})`;
  const badges = []; if (out.newBest) badges.push('New personal best!'); if (daily && out.streak > 1) badges.push(`🔥 ${out.streak}-day streak`);
  $('#r-badges').innerHTML = badges.map((b) => `<span class="badge">${b}</span>`).join('');
  $('#r-xp').textContent = `+${out.xp} XP`;
  U.shareBlock($('#r-share'), card);
  const left = U.practiceLeft(ID);
  $('#r-note').innerHTML = !daily && !U.pass.on && left === 0 ? 'That was your last free practice run today. They come back at midnight. <button class="link-btn" id="r-pass">Brain Pass</button> makes practice unlimited.' : daily ? `Next daily in ${U.nextIn()}.` : '';
  const rp = $('#r-pass'); if (rp) rp.onclick = () => U.passSheet();
  $('#r-again').textContent = daily ? 'Practice' : 'Play again';
  if (out.newBest || daily) { U.sfx.win(); U.confetti(daily ? 36 : 24); }
  if (out.leveled) setTimeout(() => U.levelUp(out.leveled), 700);
  run = null;
}

U.boot({
  onStats: () => U.statsSheet(ID, NAME, STATS_MODES),
  onHelp: () => U.tutorial(ID, NAME, STEPS, true),
  settingsExtra: () => `<label class="setting"><span>Colour challenges <small class="muted">(off = word-direction challenges instead)</small></span><input type="checkbox" class="switch" id="set-color" ${U.prefs.noColor ? '' : 'checked'}></label>`,
  onSettings: (s) => { const c = $('#set-color', s.el); if (c) c.onchange = (e) => U.setPref('noColor', !e.target.checked); },
});
U.onPass(() => renderMenu());
$('#mode-chips').addEventListener('click', onChip); $('#tier-chips').addEventListener('click', onChip);
$('#play-practice').onclick = () => start('practice');
const pick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; e.preventDefault(); answer(Number(b.dataset.k)); };
$('#opts').addEventListener('pointerdown', pick); $('#stage').addEventListener('pointerdown', pick);
$('#opts').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') pick(e); });
addEventListener('keydown', (e) => {
  if (!run || !run.cur || $('#play').hidden) return;
  const t = run.cur.type; const map = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
  if (/^[1-9]$/.test(e.key) && Number(e.key) <= run.cur.options.length) { e.preventDefault(); return answer(Number(e.key) - 1); }
  if (t === 'arrow' && e.key in map) { e.preventDefault(); return answer(map[e.key]); }
  if ((t === 'flank' || t === 'more') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); return answer(e.key === 'ArrowLeft' ? 0 : 1); }
  if (t === 'sum' && /^[tf]$/i.test(e.key)) { e.preventDefault(); return answer(e.key.toLowerCase() === 't' ? 0 : 1); }
});
$('#quit').onclick = () => { if (run && !confirm('Leave this run? It won\'t be saved.')) return; if (run) run.ended = true; run = null; renderMenu(); show('menu'); };
$('#r-again').onclick = () => { renderMenu(); show('menu'); if ($('#r-again').textContent === 'Play again') start('practice'); else $('#practice-card').scrollIntoView({ behavior: U.reducedMotion() ? 'auto' : 'smooth' }); };
$('#r-menu').onclick = () => { renderMenu(); show('menu'); };
renderMenu();
U.tutorial(ID, NAME, STEPS).then(() => { if (new URLSearchParams(location.search).get('play') === 'daily' && !U.loadGame(ID).daily[U.today()]) start('daily'); });
