// Quickwell Play: shared browser layer for the hub and games. Storage (with try/catch everywhere), sound, haptics,
// sheets, Brain Pass (one product across all games), progress, stats, sharing, tutorials and the offline worker.
import * as C from './core.mjs';

// ---------- Storage: never throws (private mode, blocked storage, full quota) ----------
const P = 'qw-play:';
export const store = {
  get(k, d) { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* progress lasts this visit only */ } },
  del(k) { try { localStorage.removeItem(P + k); } catch (e) { /* ignore */ } },
};
export const today = () => C.dayKey();
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const reducedMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

// ---------- Preferences ----------
export const prefs = { sound: true, haptics: true, theme: 'auto', skin: 'classic', noColor: false, ...store.get('prefs', {}) };
export function setPref(k, v) { prefs[k] = v; store.set('prefs', prefs); applyLook(); }
export const SKINS = [['classic', 'Classic'], ['ocean', 'Ocean'], ['ember', 'Ember'], ['forest', 'Forest'], ['grape', 'Grape'], ['graphite', 'Graphite']];
export function applyLook() {
  const root = document.documentElement;
  if (prefs.theme === 'light' || prefs.theme === 'dark') root.dataset.theme = prefs.theme; else delete root.dataset.theme;
  const skin = pass.on && prefs.skin !== 'classic' ? prefs.skin : '';
  if (skin) document.body.dataset.skin = skin; else delete document.body.dataset.skin;
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.body).backgroundColor;
}

// ---------- Sound (Web Audio, created only after the player taps) and haptics ----------
let ac = null;
export function unlockAudio() {
  if (!prefs.sound) return;
  try {
    if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (A) ac = new A(); }
    if (ac && ac.state === 'suspended') ac.resume();
  } catch (e) { ac = null; }
}
export function tone(freq, dur = 0.15, type = 'sine', vol = 0.14, when = 0) {
  if (!prefs.sound || !ac) return;
  try {
    const t = ac.currentTime + when; const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.03);
  } catch (e) { /* audio is optional */ }
}
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0];
export const sfx = {
  note(i) { tone(PENTA[i % 5] * 2 ** Math.floor(i / 5) * 0.75, 0.24, 'triangle', 0.16); },
  tap() { tone(880, 0.05, 'sine', 0.06); },
  good() { tone(660, 0.08, 'sine', 0.12); tone(990, 0.12, 'sine', 0.12, 0.07); },
  bad() { tone(196, 0.22, 'sawtooth', 0.07); tone(147, 0.25, 'sawtooth', 0.06, 0.08); },
  combo(m) { tone(520 + m * 120, 0.12, 'triangle', 0.12); },
  win() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.2, 'triangle', 0.14, i * 0.09)); },
  level() { [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.16, 'sine', 0.13, i * 0.07)); },
};
export function haptic(p) { if (!prefs.haptics) return; try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* not supported */ } }

// ---------- Little UI pieces ----------
let toastTimer = null;
export function toast(msg, ms = 2400) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
export function bump(el) { if (!el || reducedMotion()) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
export function shake(el) { if (!el || reducedMotion()) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
export function countUp(el, to, ms = 700) {
  if (reducedMotion()) { el.textContent = C.fmtInt(to); return; }
  const t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / ms); el.textContent = C.fmtInt(to * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
export function confetti(n = 30) {
  if (reducedMotion()) return;
  const cols = ['#0072B2', '#E69F00', '#CC79A7', '#009E73', '#F0E442', '#56B4E9'];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i'); d.className = 'confetti';
    const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 220;
    d.style.background = cols[i % cols.length];
    d.style.setProperty('--dx', `${Math.cos(a) * r}px`); d.style.setProperty('--dy', `${Math.sin(a) * r + 120}px`); d.style.setProperty('--rot', `${Math.random() * 720}deg`);
    document.body.appendChild(d); setTimeout(() => d.remove(), 1100);
  }
}
export function levelUp(level) {
  const o = document.createElement('div'); o.className = 'levelup'; o.setAttribute('role', 'status');
  o.innerHTML = `<div>Level ${level}!</div>`; document.body.appendChild(o);
  sfx.level(); haptic([20, 40, 20]); confetti(40); setTimeout(() => o.remove(), 1000);
}

// Modal bottom sheet. Closes with ✕, Esc, a tap outside, or any [data-close] button. Returns { el, close }.
export function sheet(html, { label = 'Dialog', onClose } = {}) {
  const prev = document.activeElement;
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}"><button class="icon-btn x" data-close aria-label="Close">${ICONS.close}</button>${html}</div>`;
  document.body.appendChild(scrim);
  const el = $('.sheet', scrim);
  let closed = false;
  const close = () => { if (closed) return; closed = true; scrim.remove(); document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); if (onClose) onClose(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  scrim.addEventListener('click', (e) => { if (e.target === scrim || e.target.closest('[data-close]')) close(); });
  const first = el.querySelector('.btn, .plan, input, select, button:not(.x)'); (first || el).focus({ preventScroll: true });
  return { el, close };
}

export const ICONS = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 20V11M12 20V5M19 20v-6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17h.01"/></svg>',
};

// ---------- Brain Pass: one product unlocks premium in every game ----------
export const PASS_TOOL = 'brain-pass';
export const pass = { on: false, plan: null };
const passFns = [];
export const onPass = (fn) => { passFns.push(fn); fn(pass); };
export function initPass() {
  if (!window.Studio) return;
  window.Studio.init({
    tool: PASS_TOOL,
    onChange: (s) => {
      pass.on = !!s.pro; pass.plan = s.plan || null;
      if (pass.on) { const a = loadAll(); a.pool = C.weeklyFreeze(a.pool, today()); store.set('all', a); }
      applyLook(); passFns.forEach((f) => f(pass));
      if (s.welcome) toast('Brain Pass is on. Enjoy!');
    },
  }).catch(() => {});
}
export const PRICES = { month: '$2.99', year: '$19.99', lifetime: '$29.99' };
export function passPerks() {
  return `<ul class="perks">
    <li><b>Unlimited practice</b> in all three games (free: ${C.FREE_PRACTICE} runs per game a day)</li>
    <li><b>Every difficulty tier</b>, plus Hard and Expert daily puzzles in Linkr</li>
    <li><b>Extra modes:</b> Echo Mirror and Dual, Swift Zen and Sudden Death, Linkr Blind Total</li>
    <li><b>Full stats history</b> (30-day charts and every run)</li>
    <li><b>Colour themes</b>, and a <b>streak freeze</b> each week that covers a missed day</li>
  </ul>`;
}
// The upgrade sheet. Shown only when the player asks for something the Pass unlocks or runs out of free practice.
export function passSheet(reason = '') {
  if (pass.on) { manageSheet(); return; }
  const s = sheet(`<h2>Brain Pass</h2>
    ${reason ? `<p>${esc(reason)}</p>` : '<p>One pass for all three games.</p>'}
    ${passPerks()}
    <div class="plans">
      <button class="plan" data-buy="month"><span><b>Monthly</b><small>7 days free, then ${PRICES.month} a month</small></span><span class="price">${PRICES.month}<small>/mo</small></span></button>
      <button class="plan best" data-buy="year"><span><b>Yearly · save 44%</b><small>7 days free, then ${PRICES.year} a year (about $1.67 a month)</small></span><span class="price">${PRICES.year}<small>/yr</small></span></button>
      <button class="plan" data-buy="lifetime"><span><b>Lifetime</b><small>Pay once, keep it. No renewals.</small></span><span class="price">${PRICES.lifetime}<small> once</small></span></button>
    </div>
    <p class="small muted">Daily challenges stay free forever, with or without the Pass. Cancel a plan anytime from <b>Manage</b> in settings; you won't be charged if you cancel during the free week. Secure checkout by Stripe. Prices in US dollars.</p>
    <p class="small muted">Want to give one? Gifting a Brain Pass is coming later.</p>
    <button class="btn quiet block" data-close>Not now</button>`, { label: 'Brain Pass' });
  $$('[data-buy]', s.el).forEach((b) => { b.onclick = () => buy(b.dataset.buy, b); });
}
async function buy(kind, btn) {
  if (!window.Studio) return toast('Checkout is not available right now.');
  if (navigator.onLine === false) return toast("You're offline. Connect to get Brain Pass.");
  try { sessionStorage.setItem('qw-play-return', location.pathname); } catch (e) { /* fine */ }
  btn.disabled = true;
  try { if (kind === 'lifetime') await window.Studio.upgrade('lifetime', 'once'); else await window.Studio.upgrade('pass', kind); }
  catch (e) { toast(e && e.message && !/fetch/i.test(e.message) ? e.message : 'Checkout is not available right now. Please try again later.'); }
  finally { btn.disabled = false; }
}
export function manageSheet() {
  const life = pass.plan === 'lifetime';
  const s = sheet(`<h2>Brain Pass is on</h2>${passPerks()}
    <p class="small muted">${life ? 'You have Lifetime: nothing renews.' : 'Change your card or cancel anytime. Cancelling keeps the Pass until the end of the period you paid for.'}</p>
    ${life ? '' : '<button class="btn block" id="manage-go">Manage subscription</button>'}
    <button class="btn quiet block" data-close style="margin-top:8px">Close</button>`, { label: 'Brain Pass' });
  const m = $('#manage-go', s.el);
  if (m) m.onclick = () => window.Studio.manage().catch((e) => toast(e.message || 'Not available right now.'));
}

// ---------- Progress ----------
export function loadGame(id) { return { xp: 0, streak: C.newStreak(), history: [], best: {}, daily: {}, practice: null, tut: false, ...store.get('game:' + id, {}) }; }
export function saveGame(id, g) {
  const keys = Object.keys(g.daily || {}).sort(); if (keys.length > 120) for (const k of keys.slice(0, keys.length - 120)) delete g.daily[k];
  store.set('game:' + id, g);
}
export function loadAll() { return { streak: C.newStreak(), pool: C.newPool(), ...store.get('all', {}) }; }
export const liveGameStreak = (g) => C.liveStreak(g.streak, today(), loadAll().pool);
export const liveAllStreak = () => { const a = loadAll(); return C.liveStreak(a.streak, today(), a.pool); };

// Record a finished run. run = { mode, score, daily, day?, result? (what the daily card shows later) }.
export function finishRun(id, run) {
  const g = loadGame(id); const d = run.day || today();
  const had = g.history.some((r) => r.m === run.mode);
  const prevBest = g.best[run.mode] || 0;
  const newBest = had && run.score > prevBest;
  g.best[run.mode] = Math.max(prevBest, run.score);
  g.history = C.addRun(g.history, { d, m: run.mode, s: run.score });
  const before = C.levelFor(g.xp); const xp = C.runXP(run.score, run.daily); g.xp += xp; const after = C.levelFor(g.xp);
  if (run.daily) {
    g.daily[d] = run.result || { score: run.score };
    const all = loadAll();
    let r = C.recordDay(g.streak, d, all.pool); g.streak = r.streak; all.pool = r.pool;
    r = C.recordDay(all.streak, d, all.pool); all.streak = r.streak; all.pool = r.pool;
    store.set('all', all);
  }
  saveGame(id, g);
  return { g, xp, leveled: after > before ? after : 0, newBest, streak: g.streak.current };
}

// Free practice: FREE_PRACTICE runs per game per day. Pass = unlimited.
export const practiceLeft = (id) => (pass.on ? Infinity : C.practiceLeft(loadGame(id).practice, today()));
export function takePractice(id, name) {
  if (pass.on) return true;
  const g = loadGame(id);
  if (C.practiceLeft(g.practice, today()) <= 0) {
    passSheet(`You've played today's ${C.FREE_PRACTICE} free ${name} practice runs. They come back at midnight, free, and the daily challenge is always free. Brain Pass makes practice unlimited.`);
    return false;
  }
  g.practice = C.usePractice(g.practice, today()); saveGame(id, g); return true;
}
export const nextIn = () => C.fmtDuration(C.msToMidnight());

// ---------- Sharing ----------
export async function shareText(text) {
  if (navigator.share) {
    try { await navigator.share({ text }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  return copyText(text);
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied. Paste it anywhere.'); return 'copied'; } catch (e) { /* fall back */ }
  try {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove();
    toast(ok ? 'Copied. Paste it anywhere.' : 'Select the text above to copy it.'); return ok ? 'copied' : 'failed';
  } catch (e) { toast('Select the text above to copy it.'); return 'failed'; }
}
// Share block for a result screen: the card text plus Share / Copy buttons.
export function shareBlock(container, text) {
  container.innerHTML = `<pre class="share" aria-label="Your result card">${esc(text)}</pre>
    <div class="row" style="justify-content:center"><button class="btn" data-share>Share result</button><button class="btn ghost" data-copy>Copy</button></div>`;
  $('[data-share]', container).onclick = () => shareText(text);
  $('[data-copy]', container).onclick = () => copyText(text);
}

// ---------- Stats ----------
const fmtDay = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
function barChart(box, series, label) {
  const W = Math.max(240, box.clientWidth || 300), H = 160, pad = 4, top = 18, base = H - 22;
  const max = Math.max(1, ...series.map((x) => x.s || 0)); const n = series.length; const slot = (W - pad * 2) / n; const bw = Math.max(3, Math.min(28, slot - 2));
  const bars = series.map((x, i) => {
    const cx = pad + slot * i + slot / 2;
    if (x.s == null) return `<rect x="${cx - bw / 2}" y="${base - 2}" width="${bw}" height="2" rx="1" fill="var(--line)"><title>${fmtDay(x.d)}: not played</title></rect>`;
    const h = Math.max(4, ((base - top) * x.s) / max);
    return `<path d="M${cx - bw / 2},${base} V${base - h + 4} q0,-4 4,-4 H${cx + bw / 2 - 4} q4,0 4,4 V${base} Z" fill="var(--accent)"><title>${fmtDay(x.d)}: ${C.fmtInt(x.s)}</title></path>`;
  }).join('');
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">
    <line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="var(--line)"/>
    <text x="0" y="11" font-size="11" fill="var(--muted)">best ${C.fmtInt(max)}</text>${bars}
    <text x="${pad}" y="${H - 6}" font-size="11" fill="var(--muted)">${fmtDay(series[0].d)}</text>
    <text x="${W - pad}" y="${H - 6}" font-size="11" fill="var(--muted)" text-anchor="end">Today</text></svg><div class="tip" hidden></div>`;
  const tip = $('.tip', box); const svg = $('svg', box);
  const show = (e) => {
    const r = svg.getBoundingClientRect(); const i = Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) / r.width) * n)));
    const x = series[i]; tip.hidden = false; tip.textContent = `${fmtDay(x.d)}: ${x.s == null ? 'not played' : C.fmtInt(x.s)}`;
    tip.style.left = `${((pad + slot * i + slot / 2) / W) * 100}%`;
  };
  svg.addEventListener('pointermove', show); svg.addEventListener('pointerdown', show); svg.addEventListener('pointerleave', () => { tip.hidden = true; });
}
// modes: [{ key, label }] in display order. fmt formats a score.
export function statsSheet(id, name, modes, fmt = C.fmtInt) {
  const g = loadGame(id); const a = loadAll(); const d = today(); const days = pass.on ? 30 : 7;
  const series = C.dailySeries(g.history, 'daily', d, days); const dsum = C.summary(g.history, 'daily'); const lp = C.levelProgress(g.xp);
  const played = Object.keys(g.daily).length;
  const rows = modes.filter((m) => g.best[m.key] != null).map((m) => `<tr><td>${esc(m.label)}</td><td>${fmt(g.best[m.key])}</td><td>${g.history.filter((r) => r.m === m.key).length}</td></tr>`).join('');
  const hist = g.history.slice(-100).reverse().map((r) => `<tr><td>${fmtDay(r.d)}</td><td>${esc((modes.find((m) => m.key === r.m) || { label: r.m }).label)}</td><td>${fmt(r.s)}</td></tr>`).join('');
  const s = sheet(`<h2>${esc(name)} stats</h2>
    <div class="statgrid">
      <div><b>${lp.level}</b><span>Level (${C.fmtInt(lp.into)}/${C.fmtInt(lp.need)} XP)</span></div>
      <div><b>${liveGameStreak(g)}</b><span>Daily streak</span></div>
      <div><b>${g.streak.best || 0}</b><span>Best streak</span></div>
      <div><b>${played}</b><span>Dailies played</span></div>
      <div><b>${fmt(dsum.best)}</b><span>Daily best</span></div>
      <div><b>${fmt(dsum.avg)}</b><span>Daily average</span></div>
    </div>
    <h3 style="margin:16px 0 0;font-size:1rem">Daily scores, last ${days} days</h3>
    <div class="chart" id="chart"></div>
    <details><summary>Show as a table</summary><table class="runs"><tr><th>Day</th><th>Score</th></tr>${series.slice().reverse().map((x) => `<tr><td>${fmtDay(x.d)}</td><td>${x.s == null ? '–' : fmt(x.s)}</td></tr>`).join('')}</table></details>
    ${rows ? `<h3 style="margin:16px 0 4px;font-size:1rem">Personal bests</h3><table class="runs"><tr><th>Mode</th><th>Best</th><th>Runs</th></tr>${rows}</table>` : '<p class="muted">Play a run to start your stats.</p>'}
    ${pass.on
      ? `<p class="small muted">Streak freezes held: <b>${a.pool.tokens || 0}</b> (one more each week, up to 2).</p><details><summary>Full history (last ${Math.min(100, g.history.length)} runs)</summary><table class="runs"><tr><th>Day</th><th>Mode</th><th>Score</th></tr>${hist}</table></details>`
      : '<p class="small muted">Free stats show 7 days. <button class="link-btn" id="stats-pass">Brain Pass</button> shows 30 days and every run.</p>'}
    <p class="small muted">Your progress is saved on this device only. Nothing is uploaded.</p>`, { label: `${name} stats` });
  barChart($('#chart', s.el), series, `${name} daily scores for the last ${days} days`);
  const sp = $('#stats-pass', s.el); if (sp) sp.onclick = () => { s.close(); passSheet(); };
}

// ---------- Tutorial ----------
// Shows the 10-second how-to on a first visit (or when asked). Resolves when it is closed.
export function tutorial(id, title, steps, force = false) {
  const g = loadGame(id);
  if (g.tut && !force) return Promise.resolve();
  return new Promise((done) => sheet(`<h2>How to play ${esc(title)}</h2><ol class="steps">${steps.map(([ico, t]) => `<li><span class="ico" aria-hidden="true">${ico}</span><span>${t}</span></li>`).join('')}</ol>
    <button class="btn block big" data-close id="tut-ok">Got it</button>`, { label: `How to play ${title}`, onClose: () => { const g2 = loadGame(id); g2.tut = true; saveGame(id, g2); done(); } }));
}

// ---------- Settings ----------
export function settingsSheet(extra = '') {
  const s = sheet(`<h2>Settings</h2>
    <label class="setting"><span>Sound</span><input type="checkbox" class="switch" id="set-sound" ${prefs.sound ? 'checked' : ''}></label>
    <label class="setting"><span>Vibration <small class="muted">(phones that support it)</small></span><input type="checkbox" class="switch" id="set-haptics" ${prefs.haptics ? 'checked' : ''}></label>
    <label class="setting"><span>Appearance</span><select id="set-theme"><option value="auto">Match device</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
    <label class="setting"><span>Colour theme ${pass.on ? '' : '<small class="muted">(Brain Pass)</small>'}</span><select id="set-skin">${SKINS.map(([k, n]) => `<option value="${k}">${n}${!pass.on && k !== 'classic' ? ' 🔒' : ''}</option>`).join('')}</select></label>
    ${extra}
    <div class="setting"><span>Brain Pass</span>${pass.on ? '<button class="btn ghost" id="set-manage">Manage</button>' : '<button class="btn ghost" id="set-pass">See Brain Pass</button>'}</div>
    <div class="setting"><span class="small muted">Scores and streaks are stored on this device only.</span><button class="link-btn" id="set-erase">Erase my data</button></div>
    <button class="btn quiet block" data-close>Done</button>`, { label: 'Settings' });
  $('#set-theme', s.el).value = prefs.theme; $('#set-skin', s.el).value = pass.on ? prefs.skin : 'classic';
  $('#set-sound', s.el).onchange = (e) => { setPref('sound', e.target.checked); if (e.target.checked) unlockAudio(); syncSoundBtn(); };
  $('#set-haptics', s.el).onchange = (e) => { setPref('haptics', e.target.checked); if (e.target.checked) haptic(15); };
  $('#set-theme', s.el).onchange = (e) => setPref('theme', e.target.value);
  $('#set-skin', s.el).onchange = (e) => { if (!pass.on && e.target.value !== 'classic') { e.target.value = 'classic'; s.close(); passSheet('Colour themes come with Brain Pass.'); return; } setPref('skin', e.target.value); };
  const m = $('#set-manage', s.el); if (m) m.onclick = () => { s.close(); manageSheet(); };
  const p = $('#set-pass', s.el); if (p) p.onclick = () => { s.close(); passSheet(); };
  $('#set-erase', s.el).onclick = () => {
    if (!confirm('Erase all scores, streaks and settings for Quickwell Play on this device?')) return;
    for (const k of ['prefs', 'all', 'game:echo', 'game:swift', 'game:linkr']) store.del(k);
    location.reload();
  };
  return s;
}

// ---------- Page boot ----------
function syncSoundBtn() { const b = $('#btn-sound'); if (b) { b.innerHTML = prefs.sound ? ICONS.soundOn : ICONS.soundOff; b.setAttribute('aria-label', prefs.sound ? 'Sound on (tap to mute)' : 'Sound off (tap to turn on)'); b.setAttribute('aria-pressed', String(!prefs.sound)); } }
export function boot({ onStats, onHelp, settingsExtra, onSettings } = {}) {
  applyLook();
  const ib = (id, icon) => { const b = $(id); if (b) b.innerHTML = icon; return b; };
  ib('#btn-back', ICONS.back);
  const sb = $('#btn-sound'); if (sb) { syncSoundBtn(); sb.onclick = () => { setPref('sound', !prefs.sound); if (prefs.sound) { unlockAudio(); sfx.good(); } syncSoundBtn(); }; }
  const st = ib('#btn-stats', ICONS.stats); if (st && onStats) st.onclick = onStats;
  const hp = ib('#btn-help', ICONS.help); if (hp && onHelp) hp.onclick = onHelp;
  const gs = ib('#btn-settings', ICONS.gear); if (gs) gs.onclick = () => { const s = settingsSheet(typeof settingsExtra === 'function' ? settingsExtra() : settingsExtra || ''); if (onSettings) onSettings(s); };
  // Audio may only start after a tap; any tap on the page unlocks it.
  addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
  addEventListener('keydown', unlockAudio, { once: true, capture: true });
  onPass(() => { const pill = $('#pass-pill'); if (pill) pill.hidden = !pass.on; });
  initPass();
  registerSW();
}
export function registerSW() {
  try { if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('/play/sw.js', { scope: '/play/' }).catch(() => {}); } catch (e) { /* offline play is a bonus */ }
}
