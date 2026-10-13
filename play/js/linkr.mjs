// Linkr (logic): draw one path from the start tile to the flag, moving up/down/left/right, never reusing a tile.
// The numbers on your path must add up to exactly the target, and the path must pass every gem.
// Puzzles are built backwards from a real path, so every one has at least one solution; the generator then
// prefers candidates with the fewest solutions so there is something to think about. Pure logic: no DOM.
import { rng } from './core.mjs';

export const TIERS = {
  easy: { name: 'Easy', n: 4, gems: 0, min: 5, max: 8, par: 30, base: 100 },
  normal: { name: 'Normal', n: 5, gems: 1, min: 8, max: 12, par: 60, base: 200 },
  hard: { name: 'Hard', n: 6, gems: 2, min: 11, max: 16, par: 100, base: 350 },
  expert: { name: 'Expert', n: 7, gems: 3, min: 15, max: 22, par: 150, base: 500 },
};
const CANDIDATES = 8, CAP = 40, BUDGET = 120000;
const nb = (n, c) => { const x = c % n, y = (c - x) / n, o = []; if (y > 0) o.push(c - n); if (x < n - 1) o.push(c + 1); if (y < n - 1) o.push(c + n); if (x > 0) o.push(c - 1); return o; };
export const neighbors = nb;
export const adjacent = (n, a, b) => nb(n, a).includes(b);
const dist = (n, a, b) => Math.abs((a % n) - (b % n)) + Math.abs(Math.floor(a / n) - Math.floor(b / n));

// Random self-avoiding walk of `len` cells (randomised depth-first search, seeded).
function walk(r, n, len) {
  const seen = new Uint8Array(n * n); const path = [r.int(n * n)]; seen[path[0]] = 1;
  const opts = [r.shuffle(nb(n, path[0]))];
  let steps = 0;
  while (path.length < len && path.length && steps++ < 20000) {
    const top = opts[opts.length - 1];
    const next = top.pop();
    if (next === undefined) { seen[path.pop()] = 0; opts.pop(); continue; }
    if (seen[next]) continue;
    seen[next] = 1; path.push(next); opts.push(r.shuffle(nb(n, next)));
  }
  return path.length === len ? path : null;
}

// Count solutions (up to CAP) with depth-first search, pruned by the target sum and distance to the flag.
export function solve(p, cap = CAP, budget = BUDGET) {
  const { n, grid, start, end, target, gems } = p; const gemSet = new Set(gems);
  const seen = new Uint8Array(n * n); let count = 0, nodes = 0, first = null; const path = [start];
  seen[start] = 1;
  const go = (c, sum, g) => {
    if (count >= cap || nodes++ > budget) return;
    if (c === end) { if (sum === target && g === gemSet.size) { count++; if (!first) first = path.slice(); } return; }
    for (const m of nb(n, c)) {
      if (seen[m]) continue;
      const s = sum + grid[m];
      if (s + (m === end ? 0 : dist(n, m, end)) > target) continue; // every remaining tile is worth at least 1
      seen[m] = 1; path.push(m);
      go(m, s, g + (gemSet.has(m) ? 1 : 0));
      path.pop(); seen[m] = 0;
    }
  };
  go(start, grid[start], gemSet.has(start) ? 1 : 0);
  return { count, first, exhausted: nodes <= budget }; // exhausted = the whole tree was searched
}

function candidate(r, tier) {
  const t = TIERS[tier]; const n = t.n;
  let path = null;
  while (!path) path = walk(r, n, r.range(t.min, t.max));
  const grid = Array.from({ length: n * n }, () => r.range(1, 9));
  const inner = r.shuffle(path.slice(1, -1)).slice(0, t.gems).sort((a, b) => path.indexOf(a) - path.indexOf(b));
  const target = path.reduce((a, c) => a + grid[c], 0);
  return { tier, n, grid, start: path[0], end: path[path.length - 1], target, gems: inner, solution: path };
}

// Build a puzzle from a seed. Deterministic: same seed and tier, same puzzle, on every device.
export function makePuzzle(seed, tier = 'normal') {
  const r = rng(`linkr|${tier}|${seed}`);
  let best = null;
  for (let i = 0; i < CANDIDATES; i++) {
    const c = candidate(r, tier);
    if (dist(c.n, c.start, c.end) < 2) continue; // too short a hop to be interesting
    const s = solve(c);
    // A finished search gives the true count (at least 1: the built path). If the search ran out of budget the
    // count is unknown, so rank it as "many".
    c.solutions = s.count && (s.exhausted || s.count >= CAP) ? s.count : null;
    const rank = (x) => x.solutions ?? CAP + 1;
    if (!best || rank(c) < rank(best)) best = c;
    if (rank(best) <= 2) break;
  }
  if (!best) { best = candidate(r, tier); best.solutions = null; }
  return best;
}
export const dailyPuzzle = (day, tier = 'normal') => makePuzzle(`daily|${day}`, tier);

// Is this path a full solution? Returns { ok, sum, reason }.
export function check(p, path) {
  if (!path.length || path[0] !== p.start) return { ok: false, sum: 0, reason: 'Start on the S tile.' };
  const seen = new Set(); let sum = 0;
  for (let i = 0; i < path.length; i++) {
    const c = path[i];
    if (c < 0 || c >= p.n * p.n || seen.has(c)) return { ok: false, sum, reason: 'A tile can only be used once.' };
    if (i && !adjacent(p.n, path[i - 1], c)) return { ok: false, sum, reason: 'Move to a touching tile.' };
    seen.add(c); sum += p.grid[c];
  }
  if (path[path.length - 1] !== p.end) return { ok: false, sum, reason: 'Finish on the flag.' };
  if (sum !== p.target) return { ok: false, sum, reason: sum > p.target ? `Over by ${sum - p.target}.` : `Short by ${p.target - sum}.` };
  const missed = p.gems.filter((g) => !seen.has(g)).length;
  if (missed) return { ok: false, sum, reason: `Pass every gem (${missed} missed).` };
  return { ok: true, sum, reason: '' };
}

// Stars: 3 = solved within par with no restarts, 2 = within twice par, 1 = solved.
export function stars(tier, ms, resets) { const par = TIERS[tier].par * 1000; return ms <= par && resets === 0 ? 3 : ms <= par * 2 ? 2 : 1; }
export function score(tier, ms, resets, undos) {
  const t = TIERS[tier]; const par = t.par * 1000;
  const speed = Math.max(0, (2 * par - ms) / (2 * par)); // 1 at 0s, 0 at twice par
  return Math.max(Math.round(t.base / 2), Math.round(t.base * (1 + speed)) - resets * 20 - undos * 2);
}
export const STAR = ['', '⭐', '⭐⭐', '⭐⭐⭐'];
