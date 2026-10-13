// Echo (memory): watch tiles light up on a grid, then tap them back in order. Each round adds one.
// Pure logic: no DOM. Used by the game page and by node tests.
import { rng } from './core.mjs';

// Difficulty tiers. size = starting grid (3 = 3×3), len = first sequence length, flash = ms each tile stays lit.
export const TIERS = {
  easy: { name: 'Easy', size: 3, len: 2, flash: 650, gap: 230 },
  normal: { name: 'Normal', size: 3, len: 3, flash: 520, gap: 200 },
  hard: { name: 'Hard', size: 4, len: 4, flash: 420, gap: 170 },
  expert: { name: 'Expert', size: 5, len: 5, flash: 340, gap: 140 },
};
export const DAILY_ROUNDS = 14;
export const LIVES = 3;
export const sizeFor = (tier, round) => Math.min(5, TIERS[tier].size + Math.floor(round / 4));
export const lenFor = (tier, round) => TIERS[tier].len + round;

// Next cell with no immediate repeat (a tile lighting twice in a row is hard to see).
const nextCell = (r, cells, prev) => { let c; do c = r.int(cells); while (c === prev && cells > 1); return c; };

// All rounds of a run, generated up front from one seed. Within one grid size each round repeats the previous
// sequence plus one new tile (the "growing" feel); when the grid grows, a fresh sequence starts.
export function makeRounds(seed, tier = 'normal', count = DAILY_ROUNDS) {
  const r = rng(`echo|${tier}|${seed}`);
  const rounds = []; let seq = []; let size = 0;
  for (let i = 0; i < count; i++) {
    const s = sizeFor(tier, i), len = lenFor(tier, i);
    if (s !== size) { size = s; seq = []; }
    while (seq.length < len) seq.push(nextCell(r, s * s, seq[seq.length - 1]));
    rounds.push({ size: s, seq: seq.slice(), mirror: false });
  }
  return rounds;
}
export const dailyRounds = (day) => makeRounds(`daily|${day}`, 'normal', DAILY_ROUNDS);

// Points for a cleared round: 10 per tile, ×1 / ×1.5 / ×2 for 3×3 / 4×4 / 5×5, plus 5 per tile on a first try.
export const SIZE_MULT = { 3: 1, 4: 1.5, 5: 2 };
export function roundPoints({ len, size, firstTry }) { return Math.round(len * 10 * (SIZE_MULT[size] || 1) + (firstTry ? 5 * len : 0)); }
export function runScore(results) { return results.filter((x) => x.cleared).reduce((a, x) => a + roundPoints(x), 0); }

// Check one tap. Returns 'ok' (keep going), 'done' (round cleared) or 'miss'.
export function checkTap(seq, progress, cell, mirror = false) {
  const want = mirror ? seq[seq.length - 1 - progress] : seq[progress];
  if (cell !== want) return 'miss';
  return progress + 1 === seq.length ? 'done' : 'ok';
}

// Share pattern of our own design: one gem per round. 🔷 first try, 🔶 cleared after a slip, ✖️ the round that ended it.
// Rounds are grouped by grid size so the card shows the climb.
export function sharePattern(results) {
  const out = []; let size = null;
  for (const x of results) {
    if (size !== null && x.size !== size) out.push(' ');
    size = x.size;
    out.push(x.cleared ? (x.firstTry ? '🔷' : '🔶') : '✖️');
  }
  return out.join('');
}

// ---------- Dual (Brain Pass): position + symbol "n-back lite" ----------
// A tile lights on a 3×3 grid showing a symbol. Press "Place" if the place matches n steps back,
// "Symbol" if the symbol matches n steps back. Symbols have their own shape and colour, so colour is never the only cue.
export const SYMBOLS = ['●', '▲', '■', '◆'];
export function dualStream(seed, n = 1, length = 20, rate = 0.3) {
  const r = rng(`dual|${n}|${seed}`);
  const pos = [], sym = [];
  for (let i = 0; i < length + n; i++) {
    if (i >= n && r() < rate) pos.push(pos[i - n]); else { let p; do p = r.int(9); while (i >= n && p === pos[i - n]); pos.push(p); }
    if (i >= n && r() < rate) sym.push(sym[i - n]); else { let s; do s = r.int(SYMBOLS.length); while (i >= n && s === sym[i - n]); sym.push(s); }
  }
  return { n, pos, sym };
}
// responses[i] = { pos: bool, sym: bool } for trial i (trials before n can't match and are ignored).
export function dualScore(stream, responses) {
  const { n, pos, sym } = stream; let hits = 0, misses = 0, falseAlarms = 0, correct = 0, total = 0;
  for (let i = n; i < pos.length; i++) {
    const r = responses[i] || {};
    for (const [isMatch, said] of [[pos[i] === pos[i - n], !!r.pos], [sym[i] === sym[i - n], !!r.sym]]) {
      total++;
      if (isMatch && said) { hits++; correct++; } else if (isMatch) misses++; else if (said) falseAlarms++; else correct++;
    }
  }
  const accuracy = total ? correct / total : 0;
  return { hits, misses, falseAlarms, accuracy, score: Math.round(accuracy * 100) * stream.n * 5 + hits * 5 };
}
