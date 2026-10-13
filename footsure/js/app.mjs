// Footsure: page controller. Talks only to our own /api through /js/pro.js (Family plan checkout and access).
// Check results live in IndexedDB on this device. Camera frames never leave camera.mjs.
import { createStandCounter, createTugTimer, createBalanceHold, wholeBodyVisible, stagesHeld } from './pose.mjs';
import { createCamera, cameraSupported } from './camera.mjs';
import { anyUnverified, evaluate, chairStandRow } from './cutoffs.mjs';
import { encryptPayload, decryptPayload, sharePayload, unpackShare, buildShareUrl, tokenFromHash } from './share.mjs';
import { makeIcs, nextMonthly } from './ics.mjs';
import * as store from './store.mjs';
import { lineChart, trendText } from './chart.mjs';

const TOOL = 'footsure';
const MAX_PEOPLE = 2;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = () => performance.now();

const S = {
  cut: null, pro: false, plan: null, screen: 'home', people: [], person: null, who: 'someone', sex: null,
  mode: 'manual', cam: null, camOn: false, frameHandler: null, check: null, timers: [], seeOkSince: null,
  speak: false, stoppedFrom: null, familyPersonId: null,
};
const LABELS = {
  home: 'Start', profile: 'Step 1 of 3', safety: 'Step 2 of 3', setup: 'Step 3 of 3', stand: 'Test 1 of 3',
  balance: 'Test 2 of 3', tug: 'Test 3 of 3', stopped: 'Stopped', results: 'Results', family: 'Family', shared: 'Shared with you',
};
const ORDER = ['stand', 'balance', 'tug', 'results'];

// ---------- helpers ----------
function every(ms, fn) { const id = setInterval(fn, ms); S.timers.push(() => clearInterval(id)); return id; }
function after(ms, fn) { const id = setTimeout(fn, ms); S.timers.push(() => clearTimeout(id)); return id; }
function clearTimers() { S.timers.forEach((f) => f()); S.timers = []; }
function say(text) {
  if (!S.speak || !('speechSynthesis' in window)) return;
  try { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(String(text))); } catch (e) { /* no voice */ }
}
function show(el, on = true) { (typeof el === 'string' ? $(el) : el).classList.toggle('hidden', !on); }
function seg(id, onPick) {
  const box = $(id);
  box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { setSeg(id, b.dataset.v); onPick(b.dataset.v); }));
}
function setSeg(id, v) { $(id).querySelectorAll('button').forEach((x) => { x.classList.toggle('on', x.dataset.v === v); x.setAttribute('aria-pressed', x.dataset.v === v ? 'true' : 'false'); }); }
const fmtDate = (iso, withYear = false) => new Date(iso).toLocaleDateString(undefined, withYear ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' });
const sexWord = (s) => (s === 'male' ? 'male' : 'female');

function go(screen) {
  clearTimers();
  S.frameHandler = null;
  S.screen = screen;
  document.querySelectorAll('[data-screen]').forEach((el) => el.classList.toggle('hidden', el.dataset.screen !== screen));
  $('stepLabel').textContent = LABELS[screen] || '';
  window.scrollTo(0, 0);
  placeCamera();
  const enter = { home: enterHome, profile: enterProfile, safety: enterSafety, setup: enterSetup, stand: enterStand, balance: enterBalance, tug: enterTug, results: enterResults, family: renderFamily };
  if (enter[screen]) enter[screen]();
}

// ---------- camera panel ----------
function placeCamera() {
  const panel = $('camPanel');
  const slot = S.screen === 'setup' ? $('camHome') : document.querySelector(`[data-screen="${S.screen}"] [data-camslot]`);
  if (S.camOn && slot) { slot.appendChild(panel); show(panel, true); } else { document.body.appendChild(panel); show(panel, false); }
}
function onCamFrame(f) {
  const ok = wholeBodyVisible(f.lm).ok;
  show('seeOk', ok);
  if (ok) { if (S.seeOkSince == null) S.seeOkSince = f.t; } else S.seeOkSince = null;
  if (S.screen === 'setup') {
    const ready = S.seeOkSince != null && f.t - S.seeOkSince > 800;
    $('setupNext').disabled = !ready;
    if (ready) $('camMsg').textContent = 'Ready. The whole body is in view.';
    else $('camMsg').textContent = f.lm ? 'Move the phone or the chair until the head, hips, knees and feet are all in view.' : 'Looking for a person…';
  }
  if (S.frameHandler) S.frameHandler(f);
}
function stopCamera() { if (S.cam) S.cam.stop(); S.camOn = false; S.seeOkSince = null; placeCamera(); }

// ---------- home / profile / safety / setup ----------
async function enterHome() {
  stopCamera();
  if (tokenFromHash(location.hash)) history.replaceState(null, '', location.pathname + location.search);
  const people = await store.listPeople();
  let n = 0;
  for (const p of people) n += (await store.listChecks(p.id)).length;
  show('historyBtn', n > 0);
}

async function enterProfile() {
  S.profileTouched = false;
  S.people = await store.listPeople();
  if (S.screen !== 'profile') return;
  const sel = $('personSel');
  show('peoplePick', S.people.length > 0);
  sel.innerHTML = S.people.map((p) => `<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('') +
    (S.people.length < MAX_PEOPLE ? '<option value="">New person</option>' : '');
  const pick = S.person && S.people.find((p) => p.id === S.person.id) ? S.person.id : (S.people[0] ? S.people[0].id : '');
  sel.value = pick;
  if (!S.profileTouched) fillPerson(S.people.find((p) => p.id === pick) || null); // don't overwrite what was typed while loading
  validateProfile();
}
function fillPerson(p) {
  S.who = p ? p.who : 'someone'; setSeg('whoSeg', S.who);
  $('nick').value = p ? p.label : '';
  $('nick').placeholder = S.who === 'me' ? 'Me' : 'Mom';
  $('age').value = p && p.age ? p.age : '';
  S.sex = p ? p.sex : null; setSeg('sexSeg', S.sex || '');
}
function validateProfile() {
  const age = parseInt($('age').value, 10);
  const okAge = age >= 18 && age <= 110;
  const note = $('ageNote');
  if (okAge && S.cut && !chairStandRow(S.cut, age)) {
    note.textContent = 'The CDC chair-stand table covers ages 60 to 94. All three tests still run, but the chair stand will have no cutoff to compare with.';
    show(note, true);
  } else show(note, false);
  $('profileNext').disabled = !(okAge && S.sex);
}
async function saveProfile() {
  const id = $('personSel').value;
  const existing = S.people.find((p) => p.id === id);
  const label = $('nick').value.trim() || (S.who === 'me' ? 'Me' : 'Person ' + (S.people.length + 1));
  const p = { ...(existing || { id: store.newId(), created: new Date().toISOString() }), label, who: S.who, sex: S.sex, age: parseInt($('age').value, 10) };
  await store.putPerson(p);
  S.person = p;
  go('safety');
}

function enterSafety() {
  document.querySelectorAll('.sc').forEach((c) => { c.checked = false; });
  $('safetyNext').disabled = true;
}

function enterSetup() {
  const ok = cameraSupported();
  $('camStart').disabled = !ok || !$('camConsent').checked;
  if (!ok) $('camMsg').textContent = 'This browser can\'t use the camera here. Count by hand instead.';
  else if (!S.camOn) $('camMsg').textContent = '';
  show('setupNext', S.camOn);
  $('setupNext').disabled = !(S.seeOkSince != null);
  $('camStart').textContent = S.camOn ? 'Camera is on' : 'Turn on the camera';
}
async function startCamera() {
  $('camStart').disabled = true;
  $('camMsg').textContent = 'Starting the camera and loading the pose model… (first time can take a minute)';
  try {
    if (!S.cam) S.cam = createCamera({ video: $('camVideo'), canvas: $('camCanvas'), onFrame: onCamFrame, mpBase: document.documentElement.dataset.mpBase || undefined });
    await S.cam.start();
    S.camOn = true; S.mode = 'camera';
    placeCamera();
    show('setupNext', true); $('setupNext').disabled = true;
    $('camStart').textContent = 'Camera is on';
    $('camMsg').textContent = 'Looking for a person…';
  } catch (e) {
    if (S.cam) S.cam.stop();
    S.camOn = false; S.mode = 'manual'; placeCamera();
    const why = e && e.name === 'NotAllowedError' ? 'Camera permission was not given.' : e && e.name === 'NotFoundError' ? 'No camera was found.' : 'The camera or the pose model couldn\'t start here.';
    $('camMsg').textContent = `${why} You can count by hand instead: it works just as well.`;
    $('camStart').disabled = !$('camConsent').checked;
    $('camStart').textContent = 'Try the camera again';
  }
}
function startCheck(mode) {
  S.mode = mode;
  if (mode === 'manual') stopCamera();
  S.check = { date: null, mode, stands: null, standsAuto: null, armsUsed: false, armsAuto: null, partial: false, balanceStages: null, balanceDetail: [], tugSeconds: null, tugAuto: null, tugPhases: null, stopped: [], saved: false };
  go('stand');
}

// ---------- test 1: chair stand ----------
const RING = 326.7;
function enterStand() {
  $('standCount').textContent = '0'; $('standTimer').textContent = '30.0 s'; $('standRing').style.strokeDashoffset = '0';
  show('standGo', true); show('standTap', false); show('standFix', false); show('standDone', false);
  $('standHint').textContent = S.mode === 'camera' ? 'The camera counts. If it misses one, use +1 / −1.' : 'Tap the big button each time they are fully up.';
}
function runStand() {
  show('standGo', false);
  let n = 3;
  $('standCount').textContent = n; say(n);
  every(1000, () => {
    n -= 1;
    if (n > 0) { $('standCount').textContent = n; say(n); return; }
    if (n === 0) { clearTimers(); beginStand(); }
  });
}
function beginStand() {
  say('Go');
  const t0 = now(), dur = 30000;
  let manual = 0, adj = 0, autoCount = 0;
  const counter = S.mode === 'camera' ? createStandCounter() : null;
  const shown = () => (counter ? autoCount + adj : manual);
  const paint = () => { $('standCount').textContent = String(Math.max(0, shown())); };
  paint();
  if (counter) {
    show('standFix', true);
    S.frameHandler = (f) => {
      if (f.t < t0 || f.t > t0 + dur) return;
      const before = autoCount;
      autoCount = counter.push(f).count;
      if (autoCount !== before) { paint(); say(shown()); }
    };
    $('standMinus').onclick = () => { adj -= 1; paint(); };
    $('standPlus').onclick = () => { adj += 1; paint(); };
  } else {
    show('standTap', true);
    $('standTap').onclick = () => { manual += 1; paint(); say(manual); };
  }
  every(100, () => {
    const left = Math.max(0, dur - (now() - t0));
    $('standTimer').textContent = (left / 1000).toFixed(1) + ' s';
    $('standRing').style.strokeDashoffset = String(RING * (1 - left / dur));
    if (left <= 0) {
      clearTimers(); S.frameHandler = null; say('Stop');
      show('standTap', false); show('standFix', false);
      let base, partial = false, arms = false, line;
      if (counter) {
        const fin = counter.finish();
        base = Math.max(0, fin.fullStands + adj); partial = fin.partial; arms = fin.armsUsed;
        S.check.standsAuto = fin.count; S.check.armsAuto = fin.armsUsed;
        line = `Automatic count: <b>${fin.count}</b> stand${fin.count === 1 ? '' : 's'}${fin.partial ? ' (including one more-than-halfway stand at the end)' : ''}${adj ? `, ${adj > 0 ? '+' : ''}${adj} by you` : ''}.${fin.armsUsed ? ' The camera thinks the arms may have been used; please confirm below.' : ''} Check it against your own count.`;
      } else {
        base = manual; line = `You counted <b>${manual}</b> full stand${manual === 1 ? '' : 's'}.`;
      }
      $('standAutoLine').innerHTML = line;
      S._standBase = base; S._standEdited = false;
      setSeg('partialSeg', partial ? 'yes' : 'no'); S.check.partial = partial;
      setSeg('armsSeg', arms ? 'yes' : 'no'); S.check.armsUsed = arms;
      $('standFinal').value = base + (partial ? 1 : 0);
      show('standDone', true);
    }
  });
}

// ---------- test 2: balance ----------
const STAGE_PICS = [
  '<svg viewBox="0 0 44 44" aria-hidden="true"><ellipse cx="16" cy="22" rx="5" ry="12" fill="currentColor"/><ellipse cx="28" cy="22" rx="5" ry="12" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 44 44" aria-hidden="true"><ellipse cx="17" cy="16" rx="5" ry="12" fill="currentColor"/><ellipse cx="27" cy="27" rx="5" ry="12" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 44 44" aria-hidden="true"><ellipse cx="22" cy="11" rx="5" ry="9.5" fill="currentColor"/><ellipse cx="22" cy="32" rx="5" ry="9.5" fill="currentColor"/></svg>',
  '<svg viewBox="0 0 44 44" aria-hidden="true"><ellipse cx="22" cy="22" rx="5" ry="12" fill="currentColor"/><ellipse cx="32" cy="22" rx="5" ry="12" fill="none" stroke="currentColor" stroke-dasharray="3 3"/></svg>',
];
function stageNames() { return S.cut ? S.cut.balance.stages : ['Feet side by side', 'Semi-tandem', 'Tandem', 'Stand on one foot']; }
function enterBalance() {
  S._bal = { i: 0, results: [] };
  paintStages();
  show('balDone', false);
  stagePrompt();
}
function paintStages() {
  const r = S._bal.results;
  $('stages').innerHTML = stageNames().map((n, i) => {
    const x = r[i];
    const pill = !x ? '<span class="pill none">—</span>'
      : x.status === 'held' ? '<span class="pill ok">✓ Held 10 s</span>'
      : x.status === 'skipped' ? '<span class="pill none">Skipped</span>'
      : `<span class="pill warn">! ${Math.floor((x.heldMs || 0) / 1000)} s</span>`;
    return `<li>${STAGE_PICS[i]}<span class="nm small"><b>${i + 1}.</b> ${esc(n)}</span>${pill}</li>`;
  }).join('');
}
function stagePrompt() {
  const { i } = S._bal;
  const box = $('stageNow');
  if (i === 3) {
    box.innerHTML = `<p class="small"><b>Stage 4 is optional.</b> Only try standing on one foot with the helper right beside them, ready to steady them.</p>
      <div class="row"><button type="button" class="secondary" id="skip4">Skip stage 4</button><button type="button" id="try4">Try stage 4</button></div>`;
    $('skip4').onclick = () => { S._bal.results[3] = { status: 'skipped' }; paintStages(); balanceDone(); };
    $('try4').onclick = () => stageReady(3);
    return;
  }
  stageReady(i);
}
function stageReady(i) {
  $('stageNow').innerHTML = `<p class="small"><b>Stage ${i + 1}: ${esc(stageNames()[i])}.</b> Get into position holding the helper's arm, then let go and tap Start.</p>
    <button type="button" id="holdGo">Start the 10-second hold</button>`;
  $('holdGo').onclick = () => runHold(i);
}
function runHold(i) {
  const t0 = now(), holdMs = 10000;
  $('stageNow').innerHTML = `<div class="big" id="holdSec">0.0</div><div class="timer">of 10 seconds</div>
    <p class="small center muted">${S.mode === 'camera' ? 'The camera watches the feet. ' : ''}Tap below the moment they move their feet or reach for support.</p>
    <button type="button" class="tap" id="holdFail">They moved or needed support</button>`;
  say('Go');
  const hold = S.mode === 'camera' ? createBalanceHold({ startT: t0, holdMs }) : null;
  let finished = false;
  const finish = (res) => {
    if (finished) return; finished = true;
    clearTimers(); S.frameHandler = null;
    S._bal.results[i] = res; paintStages();
    if (res.status === 'held') {
      say('Done');
      S._bal.i = i + 1;
      if (i + 1 >= 4) return balanceDone();
      $('stageNow').innerHTML = '<p class="small center">Held. Rest a moment.</p>';
      after(900, stagePrompt);
    } else {
      say('Stop');
      balanceDone(res.reason && res.status === 'failed' && hold ? `The camera saw: ${res.reason}.` : '');
    }
  };
  if (hold) {
    S.frameHandler = (f) => {
      const r = hold.push(f);
      if (r.status === 'failed') finish({ ...r, by: 'camera' });
      else if (r.status === 'lost') askHold(i, finish);
    };
  }
  $('holdFail').onclick = () => finish({ status: 'failed', heldMs: now() - t0, by: 'you' });
  every(100, () => {
    const el = now() - t0;
    const s = $('holdSec'); if (s) s.textContent = (Math.min(el, holdMs) / 1000).toFixed(1);
    if (el >= holdMs) {
      if (hold) {
        const r = hold.result();
        if (r.status === 'failed') return finish({ ...r, by: 'camera' });
        if (r.status === 'lost') return askHold(i, finish);
      }
      finish({ status: 'held', heldMs: holdMs });
    }
  });
}
function askHold(i, finish) {
  clearTimers(); S.frameHandler = null;
  $('stageNow').innerHTML = `<p class="small">The camera lost sight of the feet. Did they hold stage ${i + 1} for the full 10 seconds?</p>
    <div class="row"><button type="button" class="secondary" id="askNo">No</button><button type="button" id="askYes">Yes, held</button></div>`;
  $('askYes').onclick = () => finish({ status: 'held', heldMs: 10000, by: 'you' });
  $('askNo').onclick = () => finish({ status: 'failed', heldMs: 0, by: 'you' });
}
function balanceDone(note = '') {
  const held = stagesHeld(S._bal.results.map((r) => (r && r.status === 'skipped' ? null : r)));
  $('stageNow').innerHTML = note ? `<p class="small">${esc(note)} If that's wrong, change the number below.</p>` : '';
  $('balFinal').value = String(held);
  show('balDone', true);
}

// ---------- test 3: TUG ----------
function enterTug() {
  $('tugTime').textContent = '0.0'; $('tugMark').checked = false; $('tugGo').disabled = true;
  show('tugGo', true); show('tugStop', false); show('tugDone', false);
  $('tugHint').textContent = S.mode === 'camera'
    ? 'Place the phone so the chair and as much of the path as possible are in view. The timer stops by itself when they sit back down; you can also tap Stop.'
    : 'Tap Go as you say "Go". Tap Stop the moment they are seated again.';
}
function runTug() {
  show('tugGo', false); show('tugStop', true);
  say('Go');
  const t0 = now();
  const timer = S.mode === 'camera' ? createTugTimer({ goT: t0 }) : null;
  let finished = false;
  const finish = (sec, auto) => {
    if (finished) return; finished = true;
    clearTimers(); S.frameHandler = null; say('Stop');
    show('tugStop', false);
    $('tugTime').textContent = sec.toFixed(1);
    if (auto) {
      S.check.tugAuto = +auto.totalSec.toFixed(1); S.check.tugPhases = auto.phases;
      const p = auto.phases;
      $('tugAutoLine').innerHTML = `Automatic time: <b>${auto.totalSec.toFixed(1)} s</b> (stand up ${p.riseSec.toFixed(1)} s, walk out and turn ${p.outAndTurnSec.toFixed(1)} s, walk back and sit ${p.backAndSitSec.toFixed(1)} s). Check it against your own stopwatch if you used one.`;
    } else {
      $('tugAutoLine').innerHTML = `Stopwatch time: <b>${sec.toFixed(1)} s</b>.`;
    }
    $('tugFinal').value = sec.toFixed(1);
    show('tugDone', true);
  };
  if (timer) {
    S.frameHandler = (f) => { const r = timer.push(f); if (r.status === 'done') finish(r.totalSec, r); };
  }
  $('tugStop').onclick = () => finish((now() - t0) / 1000, null);
  every(100, () => { $('tugTime').textContent = ((now() - t0) / 1000).toFixed(1); });
}

// ---------- stop ----------
function stopNow() {
  const from = S.screen;
  clearTimers(); S.frameHandler = null;
  if (S.check) S.check.stopped.push(from);
  S.stoppedFrom = from;
  if ('speechSynthesis' in window) try { speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  go('stopped');
}

// ---------- results ----------
function scoreOf(person, c) {
  return evaluate(S.cut, { age: c.age ?? person.age, sex: c.sex || person.sex, stands: c.stands, armsUsed: c.armsUsed, balanceStages: c.balanceStages, tugSeconds: c.tugSeconds });
}
const PILL = {
  within: '<span class="pill ok">✓ Within CDC range</span>',
  outside: '<span class="pill warn">! Outside CDC range</span>',
  'not-done': '<span class="pill none">Not done</span>',
  'no-cutoff': '<span class="pill none">No CDC cutoff for this age</span>',
};
const BAND = {
  steady: ['Steady', 'All tests done today are within the CDC screening ranges.'],
  watch: ['Watch', 'One test is outside the CDC range. Worth showing a doctor and re-checking next month.'],
  doctor: ['Talk to a doctor', 'Two or more tests are outside the CDC ranges. Show these results to a doctor or physical therapist.'],
  incomplete: ['Not enough to compare', 'No test was finished with a CDC cutoff to compare against.'],
};
function resultRows(person, c, ev) {
  const row = chairStandRow(S.cut, c.age ?? person.age);
  const standVal = c.stands == null ? '—' : c.armsUsed ? `0 <span class="small muted">(${c.stands} with arms)</span>` : `${c.stands} stand${c.stands === 1 ? '' : 's'}`;
  const standCut = ev.chairStand.cutoff == null ? '—' : `Below ${ev.chairStand.cutoff} is below average <span class="small muted">(${sexWord(c.sex || person.sex)}, ${row.ageMin}–${row.ageMax})</span>`;
  const balVal = c.balanceStages == null ? '—' : c.balanceStages >= 4 ? 'All 4 stages' : `${c.balanceStages} of 4 stages`;
  const balCut = `Hold stage ${S.cut.balance.criticalStage} (tandem) for ${S.cut.balance.holdSeconds} s`;
  const tugVal = c.tugSeconds == null ? '—' : `${Number(c.tugSeconds).toFixed(1)} s`;
  const tugCut = `${S.cut.tug.thresholdSeconds} s or more is outside the range`;
  const r = (name, val, cut, st) => `<div class="res"><div class="lbl">${name}</div>
    <div><div class="col">Today</div><div class="val">${val}</div></div>
    <div><div class="col">CDC cutoff</div><div class="cut">${cut}</div></div>${PILL[st]}</div>`;
  return r('30-second chair stand', standVal, standCut, ev.chairStand.status) + r('4-stage balance', balVal, balCut, ev.balance.status) + r('Timed Up and Go', tugVal, tugCut, ev.tug.status);
}
async function enterResults() {
  $('resCard').innerHTML = ''; $('band').className = 'band hidden';
  const c = S.check, p = S.person;
  if (!c || !p) return go('home');
  if (!S.cut) { $('resCard').innerHTML = '<p>The cutoff table didn\'t load. Check the connection and reload; your answers are still on this screen.</p>'; return; }
  c.age = p.age; c.sex = p.sex;
  if (!c.saved) {
    c.date = new Date().toISOString();
    const done = c.stands != null || c.balanceStages != null || c.tugSeconds != null;
    if (done) {
      await store.addCheck({ id: store.newId(), personId: p.id, date: c.date, age: c.age, sex: c.sex, mode: c.mode, stands: c.stands, standsAuto: c.standsAuto, armsUsed: c.armsUsed, balanceStages: c.balanceStages, tugSeconds: c.tugSeconds, tugAuto: c.tugAuto, stopped: c.stopped });
      c.saved = true;
    }
  }
  stopCamera();
  const ev = scoreOf(p, c);
  const [title, text] = BAND[ev.band];
  const band = $('band');
  band.className = 'band ' + ev.band;
  band.innerHTML = `<b>${title}</b>${text}${!ev.complete && ev.band !== 'incomplete' ? ' Not every test was done, so this is partial.' : ''}`;
  $('resCard').innerHTML = `<h2>${esc(p.label)} · ${fmtDate(c.date || new Date().toISOString(), true)}</h2>
    <p class="small muted">Age ${esc(c.age)}, ${sexWord(c.sex)} · ${c.mode === 'camera' ? 'counted by camera, checked by you' : 'counted by hand'}</p>
    ${resultRows(p, c, ev)}
    ${c.stopped.length ? '<p class="small warnline">A test was stopped early. If there was dizziness, pain or unsteadiness, mention it to a doctor.</p>' : ''}
    ${anyUnverified(S.cut) ? '<p class="small muted">Cutoffs pending verification against the CDC STEADI form.</p>' : ''}
    <p class="small muted">Not medical advice. Not a medical device.</p>`;
}

// ---------- family (paid) ----------
async function renderFamily() {
  const body = $('familyBody');
  stopCamera();
  const people = await store.listPeople();
  if (!people.length) { body.innerHTML = '<div class="card"><p>No checks on this device yet.</p><button type="button" data-go="profile">Start the check</button></div>'; return; }
  const person = people.find((p) => p.id === S.familyPersonId) || (S.person && people.find((p) => p.id === S.person.id)) || people[0];
  S.familyPersonId = person.id;
  const checks = await store.listChecks(person.id);
  if (!S.pro) {
    const studio = !!window.Studio;
    body.innerHTML = `<div class="card">
      <h2>Track it monthly with the family</h2>
      <p class="small muted">${checks.length} check${checks.length === 1 ? '' : 's'} saved on this device for ${esc(person.label)}. Family turns them into a trend.</p>
      <ul class="tight small">
        <li>Trend chart for each test, against the CDC cutoff</li>
        <li>Monthly re-check reminder (a calendar file, no email needed)</li>
        <li>Share link for family: the results travel encrypted inside the link</li>
        <li>One-page summary to bring to the doctor</li>
        <li>Up to 2 people</li>
      </ul>
      <div class="price" style="margin-top:12px"><span>Family</span><b>$4.99/month</b></div>
      <div class="muted small">or $39/year · cancel anytime</div>
      ${studio ? '<button type="button" id="buyMonth">Start Family · $4.99/month</button><button type="button" class="secondary" id="buyYear">Family yearly · $39/year</button>'
        : '<p class="small warnline">Plans open soon.</p>'}
      <p class="small warnline" id="buyErr" role="alert"></p>
      <button type="button" class="secondary" data-go="home">Back to start</button></div>`;
    const buy = (iv) => window.Studio.upgrade('family', iv).catch((e) => { $('buyErr').textContent = e.message; });
    if (studio) { $('buyMonth').onclick = () => buy('month'); $('buyYear').onclick = () => buy('year'); }
    return;
  }
  body.innerHTML = (people.length > 1 ? `<div class="card"><label class="small" for="famSel">Person</label><select id="famSel">${people.map((p) => `<option value="${esc(p.id)}"${p.id === person.id ? ' selected' : ''}>${esc(p.label)}</option>`).join('')}</select></div>` : '') +
    historyHtml(person, checks) +
    `<div class="card">
      <h2>Keep it going</h2>
      <button type="button" id="icsBtn">Download monthly reminder (.ics)</button>
      <p class="small muted" style="margin-top:6px">Opens in your calendar app. Repeats monthly for a year. No email needed.</p>
      <button type="button" class="secondary" id="shareBtn">Create a family share link</button>
      <div id="shareOut"></div>
      <button type="button" class="secondary" id="printBtn">Print a summary for the doctor</button>
      <button type="button" class="secondary" data-go="profile">Run a new check</button>
      <button type="button" class="secondary" id="manageBtn">Manage plan</button>
      <button type="button" class="stop" id="wipeBtn">Delete all checks on this device</button>
    </div>`;
  wireCharts(body);
  if ($('famSel')) $('famSel').onchange = (e) => { S.familyPersonId = e.target.value; renderFamily(); };
  $('icsBtn').onclick = () => downloadIcs(person, checks);
  $('shareBtn').onclick = () => makeShare(person, checks);
  $('printBtn').onclick = () => printSummary(person, checks);
  $('manageBtn').onclick = () => window.Studio.manage().catch((e) => alert(e.message));
  $('wipeBtn').onclick = async () => {
    if (!confirm('Delete every saved check and person on this device? This can\'t be undone.')) return;
    await store.deleteEverything(); S.person = null; S.familyPersonId = null; go('home');
  };
}

function historyHtml(person, checks) {
  if (!checks.length) return '<div class="card"><p>No checks yet.</p></div>';
  const spanYears = new Date(checks[checks.length - 1].date).getFullYear() !== new Date(checks[0].date).getFullYear();
  const latest = checks[checks.length - 1];
  const evs = checks.map((c) => scoreOf(person, c));
  const lev = evs[evs.length - 1];
  const standPts = checks.map((c, i) => ({ label: fmtDate(c.date, spanYears), value: c.stands == null ? null : (c.armsUsed ? 0 : c.stands), note: evs[i].chairStand.status === 'outside' ? 'below CDC average' : '' }));
  const tugPts = checks.map((c) => ({ label: fmtDate(c.date, spanYears), value: c.tugSeconds == null ? null : +Number(c.tugSeconds).toFixed(1) }));
  const cut = lev.chairStand.cutoff;
  const [bt] = BAND[lev.band];
  return `<div class="card">
      <h2>${esc(person.label)}: chair stands</h2>
      <p class="small muted">Stands in 30 seconds, one dot per check. ${cut != null ? `Dashed line: the CDC "below average" cutoff for age ${esc(latest.age)} (${sexWord(person.sex)}).` : ''}</p>
      <div class="chart">${lineChart({ points: standPts, ref: cut != null ? { value: cut, label: `Below ${cut} = below CDC average` } : null, title: `Chair stands per check for ${person.label}`, unit: ' stands' })}</div>
      <div class="tip" aria-live="polite"></div>
      <p class="small"><b>Trend:</b> ${esc(trendText(standPts.map((p) => p.value), { higherIsBetter: true, unit: '' }))}</p>
    </div>
    <div class="card">
      <h2>Timed Up and Go</h2>
      <p class="small muted">Seconds, lower is better. Dashed line: ${S.cut.tug.thresholdSeconds} s.</p>
      <div class="chart">${lineChart({ points: tugPts, ref: { value: S.cut.tug.thresholdSeconds, label: `${S.cut.tug.thresholdSeconds} s or more = outside range` }, title: `Timed Up and Go seconds per check for ${person.label}`, unit: ' s', digits: 1 })}</div>
      <div class="tip" aria-live="polite"></div>
      <p class="small"><b>Trend:</b> ${esc(trendText(tugPts.map((p) => p.value), { higherIsBetter: false, unit: ' s' }))}</p>
    </div>
    <div class="card">
      <h2>Every check</h2>
      <p class="small">Latest: <b>${esc(bt)}</b></p>
      <div class="tablewrap"><table class="hist"><thead><tr><th>Date</th><th>Age</th><th>Stands</th><th>Balance</th><th>TUG</th></tr></thead><tbody>
      ${checks.slice().reverse().map((c) => `<tr><td>${fmtDate(c.date, true)}</td><td>${esc(c.age)}</td><td>${c.stands == null ? '—' : c.armsUsed ? '0*' : c.stands}</td><td>${c.balanceStages == null ? '—' : c.balanceStages + '/4'}</td><td>${c.tugSeconds == null ? '—' : Number(c.tugSeconds).toFixed(1) + ' s'}</td></tr>`).join('')}
      </tbody></table></div>
      ${checks.some((c) => c.armsUsed) ? '<p class="small muted">* Arms used: the CDC form scores this 0.</p>' : ''}
    </div>`;
}
function wireCharts(root) {
  root.querySelectorAll('.chart').forEach((ch) => {
    const tip = ch.nextElementSibling;
    ch.querySelectorAll('.hit').forEach((h) => {
      const showTip = () => { tip.textContent = h.dataset.tip; };
      h.addEventListener('mouseenter', showTip); h.addEventListener('focus', showTip); h.addEventListener('click', showTip);
    });
  });
}

function downloadIcs(person, checks) {
  const last = checks.length ? new Date(checks[checks.length - 1].date) : new Date();
  const ics = makeIcs({ start: nextMonthly(last), label: person.label, url: location.origin + location.pathname });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'footsure-monthly.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function makeShare(person, checks) {
  const out = $('shareOut');
  try {
    const token = await encryptPayload(sharePayload(person, checks));
    const url = buildShareUrl(location.href, token);
    out.innerHTML = `<p class="small" style="margin-top:10px"><b>Anyone with this full link can see these results.</b> Send it only to family. The results are inside the link, encrypted; we never see them. The link doesn't update: make a new one after the next check.</p>
      <div class="sharebox" id="shareUrl">${esc(url)}</div>
      <div class="row"><button type="button" class="secondary" id="copyShare">Copy link</button>${navigator.share ? '<button type="button" class="secondary" id="sendShare">Send…</button>' : ''}</div>
      <p class="small muted" id="copyMsg" role="status"></p>`;
    $('copyShare').onclick = async () => {
      try { await navigator.clipboard.writeText(url); $('copyMsg').textContent = 'Copied.'; }
      catch (e) { $('copyMsg').textContent = 'Couldn\'t copy. Press and hold the link above to copy it.'; }
    };
    if ($('sendShare')) $('sendShare').onclick = () => navigator.share({ title: 'Footsure results', url }).catch(() => {});
  } catch (e) {
    out.innerHTML = `<p class="small warnline">${esc(e.message)}</p>`;
  }
}

function printSummary(person, checks) {
  const rows = checks.map((c) => {
    const ev = scoreOf(person, c);
    const st = (s) => (s === 'within' ? 'within' : s === 'outside' ? 'OUTSIDE' : s === 'no-cutoff' ? 'no cutoff' : '—');
    return `<tr><td>${fmtDate(c.date, true)}</td><td>${esc(c.age)}</td><td>${c.stands == null ? '—' : (c.armsUsed ? '0 (arms used)' : c.stands)}${ev.chairStand.cutoff != null ? ` / below ${ev.chairStand.cutoff}` : ''} · ${st(ev.chairStand.status)}</td><td>${c.balanceStages == null ? '—' : c.balanceStages + ' of 4'} · ${st(ev.balance.status)}</td><td>${c.tugSeconds == null ? '—' : Number(c.tugSeconds).toFixed(1) + ' s'} · ${st(ev.tug.status)}</td><td>${c.mode === 'camera' ? 'camera + family check' : 'by hand'}</td></tr>`;
  }).join('');
  $('printArea').innerHTML = `<h1 style="font-size:18pt;margin:0 0 4px">Footsure summary: ${esc(person.label)}</h1>
    <p>Sex: ${sexWord(person.sex)} · Printed ${fmtDate(new Date().toISOString(), true)}</p>
    <p>Home strength and balance checks using the CDC STEADI screening tests (30-second chair stand, 4-stage balance, Timed Up and Go), run by family members with a phone. Counts were made by phone camera or by hand and checked by the family. This is a general wellness record, not a medical diagnosis.</p>
    <table><thead><tr><th>Date</th><th>Age</th><th>Chair stands (CDC cutoff)</th><th>Balance (tandem 10 s)</th><th>TUG (12 s)</th><th>Counted</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="margin-top:8px">Cutoffs as shown in the app${anyUnverified(S.cut) ? ', pending verification against the CDC STEADI form' : ''}. Not medical advice. Not a medical device.</p>
    <p>Notes for the visit: ____________________________________________</p>`;
  window.print();
}

// ---------- shared link (read-only) ----------
async function openShared(token) {
  go('shared');
  const body = $('sharedBody');
  try {
    const { person, checks } = unpackShare(await decryptPayload(token));
    body.innerHTML = S.cut ? historyHtml(person, checks) : '<p>Couldn\'t load the cutoff table.</p>';
    wireCharts(body);
    body.insertAdjacentHTML('beforeend', '<div class="card small"><p class="muted">Not medical advice. Not a medical device.</p><button type="button" class="secondary" id="sharedHome">Run a check of your own</button></div>');
    $('sharedHome').onclick = () => { history.replaceState(null, '', location.pathname); go('home'); };
  } catch (e) {
    show('sharedNote', false);
    body.innerHTML = `<div class="card"><h2>This link didn't open</h2><p>${esc(e.message)}</p><button type="button" data-go="home">Go to Footsure</button></div>`;
  }
}

// ---------- wiring ----------
function wire() {
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); go(g.dataset.go); return; }
    if (e.target.closest('[data-stop]')) stopNow();
  });
  $('startBtn').onclick = () => go('profile');
  $('historyBtn').onclick = () => go('family');
  $('toFamily').onclick = () => go('family');
  document.querySelector('[data-screen="profile"]').addEventListener('input', () => { S.profileTouched = true; });
  document.querySelector('[data-screen="profile"]').addEventListener('click', (e) => { if (e.target.closest('.seg')) S.profileTouched = true; });
  seg('whoSeg', (v) => { S.who = v; $('nick').placeholder = v === 'me' ? 'Me' : 'Mom'; });
  seg('sexSeg', (v) => { S.sex = v; validateProfile(); });
  $('age').addEventListener('input', validateProfile);
  $('personSel').onchange = (e) => { fillPerson(S.people.find((p) => p.id === e.target.value) || null); validateProfile(); };
  $('profileNext').onclick = saveProfile;
  document.querySelectorAll('.sc').forEach((c) => c.addEventListener('change', () => {
    $('safetyNext').disabled = ![...document.querySelectorAll('.sc')].every((x) => x.checked);
  }));
  $('safetyNext').onclick = () => go('setup');
  $('speakOn').onchange = (e) => { S.speak = e.target.checked; };
  $('camConsent').onchange = (e) => { $('camStart').disabled = !e.target.checked || !cameraSupported() || S.camOn; };
  $('camStart').onclick = startCamera;
  $('camFlip').onclick = () => S.cam && S.cam.flip().catch(() => {});
  $('setupNext').onclick = () => startCheck('camera');
  $('manualStart').onclick = () => startCheck('manual');
  $('standGo').onclick = runStand;
  seg('partialSeg', (v) => { S.check.partial = v === 'yes'; if (!S._standEdited) $('standFinal').value = S._standBase + (v === 'yes' ? 1 : 0); });
  seg('armsSeg', (v) => { S.check.armsUsed = v === 'yes'; });
  $('standFinal').addEventListener('input', () => { S._standEdited = true; });
  $('standNext').onclick = () => {
    const n = parseInt($('standFinal').value, 10);
    S.check.stands = Number.isFinite(n) && n >= 0 ? n : null;
    go('balance');
  };
  $('balNext').onclick = () => {
    S.check.balanceStages = parseInt($('balFinal').value, 10);
    S.check.balanceDetail = S._bal.results;
    go('tug');
  };
  $('tugMark').onchange = (e) => { $('tugGo').disabled = !e.target.checked; };
  $('tugGo').onclick = runTug;
  $('tugNext').onclick = () => {
    const v = parseFloat($('tugFinal').value);
    S.check.tugSeconds = Number.isFinite(v) && v > 0 ? Math.round(v * 10) / 10 : null;
    go('results');
  };
  $('skipTest').onclick = () => go(ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(S.stoppedFrom) + 1)] || 'results');
  $('stoppedResults').onclick = () => go('results');
}

async function boot() {
  wire();
  try {
    S.cut = await fetch('cutoffs.json', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const pending = anyUnverified(S.cut);
    show('cutoffBanner', pending);
    $('cutoffFoot').textContent = pending ? 'CDC cutoffs pending verification' : 'CDC cutoffs verified';
  } catch (e) { S.cut = null; }
  if (window.Studio) {
    window.Studio.init({ tool: TOOL, onChange: (st) => { S.pro = !!st.pro; S.plan = st.plan; if (S.screen === 'family') renderFamily(); } }).catch(() => {});
  }
  const token = tokenFromHash(location.hash);
  if (token) openShared(token); else go('home');
  window.addEventListener('hashchange', () => { const t = tokenFromHash(location.hash); if (t) { show('sharedNote', true); openShared(t); } });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
