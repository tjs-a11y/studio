// Quickwell Play: shared game logic with no browser dependencies (imported by the games and by node tests).
// Seeded randomness, local-day keys, streaks, practice limits, levels and share-card text.

// ---------- Seeded randomness ----------
// FNV-1a 32-bit hash of a string, then mulberry32. Same seed string = same sequence on every device.
export function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function rng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashStr(String(seed));
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (n) => Math.floor(next() * n);
  next.range = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.shuffle = (arr) => { const a2 = arr.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; };
  return next;
}
export const randomSeed = () => `p-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;

// ---------- Days ----------
// A "day" is the calendar date where the player is. Everyone who plays on 2026-10-12 gets the same daily
// challenge, and each player's next challenge unlocks at their own local midnight.
export function dayKey(date = new Date(), timeZone) {
  if (timeZone) {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const g = (t) => p.find((x) => x.type === t).value;
    return `${g('year')}-${g('month')}-${g('day')}`;
  }
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
const keyToUTC = (k) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const dayDiff = (from, to) => Math.round((keyToUTC(to) - keyToUTC(from)) / 864e5);
export const addDays = (k, n) => new Date(keyToUTC(k) + n * 864e5).toISOString().slice(0, 10);
export const LAUNCH_DAY = '2026-10-12';
export const challengeNumber = (k) => dayDiff(LAUNCH_DAY, k) + 1;
// ISO-like week id (Monday start), used for weekly streak-freeze refills.
export function weekKey(k) { const t = keyToUTC(k); const dow = (new Date(t).getUTCDay() + 6) % 7; return new Date(t - dow * 864e5).toISOString().slice(0, 10); }
// Milliseconds until the next local midnight (for "next challenge in 5h 12m").
export function msToMidnight(now = new Date()) { const n = new Date(now); n.setHours(24, 0, 0, 0); return n - now; }
export function fmtDuration(ms) { const m = Math.max(0, Math.round(ms / 60000)); const h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m`; }

// ---------- Streaks ----------
// streak = { current, best, last (day key or null) }.
// pool = { tokens, days, week }: Brain Pass streak-freeze tokens, shared by every streak. A token spent on a missed
// day covers that day for all games at once (days remembers which days are covered).
export const newStreak = () => ({ current: 0, best: 0, last: null });
export const newPool = () => ({ tokens: 0, days: [], week: null });
const missedDays = (last, today) => { const out = []; for (let i = 1; i < dayDiff(last, today); i++) out.push(addDays(last, i)); return out; };
// Record a completed daily on `today`. Missed days are bridged with freeze tokens (or days already covered);
// otherwise the streak restarts at 1. Returns { streak, pool }.
export function recordDay(s0, today, pool0) {
  const s = { ...newStreak(), ...s0 }; let pool = { ...newPool(), ...pool0 };
  if (s.last === today) return { streak: s, pool };
  if (s.last && dayDiff(s.last, today) < 0) return { streak: s, pool }; // clock went backwards (travel west, wrong clock): never punish
  if (!s.last) s.current = 1;
  else {
    const uncovered = missedDays(s.last, today).filter((d) => !pool.days.includes(d));
    if (uncovered.length === 0) s.current += 1;
    else if (uncovered.length <= pool.tokens) { pool = { ...pool, tokens: pool.tokens - uncovered.length, days: pool.days.concat(uncovered).slice(-60) }; s.current += 1; }
    else s.current = 1;
  }
  s.last = today; s.best = Math.max(s.best, s.current);
  return { streak: s, pool };
}
// The streak to show right now (before today's daily is played): it is alive if every missed day since the last
// daily is covered, or could still be covered by the tokens held.
export function liveStreak(s0, today, pool0) {
  const s = { ...newStreak(), ...s0 }; const pool = { ...newPool(), ...pool0 };
  if (!s.last) return 0;
  if (dayDiff(s.last, today) < 0) return s.current;
  const uncovered = missedDays(s.last, today).filter((d) => !pool.days.includes(d));
  return uncovered.length <= pool.tokens ? s.current : 0;
}
// Brain Pass: one freeze token each week (Monday start), holding up to 2.
export function weeklyFreeze(pool0, today, max = 2) {
  const pool = { ...newPool(), ...pool0 }; const w = weekKey(today);
  if (pool.week === w) return pool;
  return { ...pool, week: w, tokens: Math.min(max, pool.tokens + 1) };
}

// ---------- Free practice limit ----------
export const FREE_PRACTICE = 3;
export function practiceLeft(usage, today, limit = FREE_PRACTICE) { return !usage || usage.day !== today ? limit : Math.max(0, limit - usage.n); }
export function usePractice(usage, today) { return !usage || usage.day !== today ? { day: today, n: 1 } : { day: today, n: usage.n + 1 }; }

// ---------- Levels ----------
// Cumulative XP to reach level L is 50·L·(L-1): level 2 at 100, 3 at 300, 4 at 600, 5 at 1,000 …
export const xpForLevel = (L) => 50 * L * (L - 1);
export function levelFor(xp) { let L = 1; while (xpForLevel(L + 1) <= xp) L++; return L; }
export function levelProgress(xp) { const L = levelFor(xp); const a = xpForLevel(L), b = xpForLevel(L + 1); return { level: L, into: xp - a, need: b - a, pct: (xp - a) / (b - a) }; }
// XP for a finished run: dailies are worth more; score adds a little, capped so no one can grind a level in one go.
export const runXP = (score, daily) => (daily ? 40 : 15) + Math.min(60, Math.floor(score / 25));

// ---------- History ----------
// Keep one entry per run: { d: day, m: mode, s: score, ... }. Trim to the newest `max`.
export function addRun(history, run, max = 500) { const h = (history || []).concat([run]); return h.length > max ? h.slice(h.length - max) : h; }
// Best score per day for one mode, oldest → newest, for the last `days` days ending on `today` (missing days = null).
export function dailySeries(history, mode, today, days) {
  const best = {};
  for (const r of history || []) if (r.m === mode) best[r.d] = Math.max(best[r.d] ?? -Infinity, r.s);
  const out = [];
  for (let i = days - 1; i >= 0; i--) { const d = addDays(today, -i); out.push({ d, s: best[d] ?? null }); }
  return out;
}
export function summary(history, mode) {
  const runs = (history || []).filter((r) => !mode || r.m === mode);
  if (!runs.length) return { runs: 0, best: 0, avg: 0, last: null };
  const total = runs.reduce((a, r) => a + r.s, 0);
  return { runs: runs.length, best: Math.max(...runs.map((r) => r.s)), avg: Math.round(total / runs.length), last: runs[runs.length - 1] };
}

// ---------- Share cards ----------
export const SITE = 'https://quickwell.app';
export const shareURL = (game) => `${SITE}/play/${game}/?ref=share-${game}`;
// Challenge a friend: a link that opens today's daily of the same game (same puzzle for everyone on a given date).
// Nothing personal in it: no name, no score, no id; only the game, the daily number and the ref label.
export const challengeURL = (game) => `${SITE}/play/${game}/?play=daily&ref=challenge-${game}`;
export function challengeText({ game, name, n }) {
  return `I played today's ${name} #${n} on Quickwell Play. Same challenge for everyone today, free, no sign-up. Can you beat me?\n${challengeURL(game)}`;
}
// A plain-text card: title line, our own emoji pattern, a stat line, and the link. No personal data, no spoilers.
export function shareText({ title, pattern, stats, game }) {
  return [title, pattern, stats, shareURL(game)].filter(Boolean).join('\n');
}
// Speed sparkline used by Swift: values → ▁▂▃▄▅▆▇█.
export function spark(values, max) {
  const bars = '▁▂▃▄▅▆▇█'; const m = max || Math.max(1, ...values);
  return values.map((v) => bars[Math.max(0, Math.min(7, Math.round((v / m) * 7)))]).join('');
}
export const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
export const fmtTime = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
