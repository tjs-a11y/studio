import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/linkr.mjs';

test('daily Linkr puzzles are deterministic per day and tier', () => {
  for (const t of ['normal', 'hard', 'expert']) {
    const a = L.dailyPuzzle('2026-10-12', t), b = L.dailyPuzzle('2026-10-12', t);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a.grid, L.dailyPuzzle('2026-10-13', t).grid);
  }
});

test('every generated puzzle is solvable (built path checks out, and the solver finds a solution)', () => {
  for (const tier of Object.keys(L.TIERS)) {
    const T = L.TIERS[tier];
    for (let k = 0; k < (tier === 'expert' ? 25 : 60); k++) {
      const p = L.makePuzzle(`solv-${k}`, tier);
      assert.equal(p.n, T.n); assert.equal(p.grid.length, T.n * T.n); assert.equal(p.gems.length, T.gems);
      assert.ok(p.grid.every((v) => v >= 1 && v <= 9));
      assert.notEqual(p.start, p.end);
      assert.ok(p.solution.length >= T.min && p.solution.length <= T.max);
      assert.ok(L.check(p, p.solution).ok, `${tier} ${k}: built path fails`);
      const s = L.solve(p, 1, 5e6);
      assert.ok(s.count >= 1, `${tier} ${k}: solver found nothing`);
      assert.ok(L.check(p, s.first).ok, `${tier} ${k}: solver path fails`);
    }
  }
});

test('next 60 days of dailies are all solvable', () => {
  const start = Date.UTC(2026, 9, 12);
  for (let i = 0; i < 60; i++) {
    const d = new Date(start + i * 864e5).toISOString().slice(0, 10);
    for (const t of ['normal', 'hard', 'expert']) { const p = L.dailyPuzzle(d, t); assert.ok(L.check(p, p.solution).ok, `${d} ${t}`); }
  }
});

test('the checker explains what is wrong', () => {
  const p = { n: 3, grid: [1, 2, 3, 4, 5, 6, 7, 8, 9], start: 0, end: 8, target: 1 + 2 + 3 + 6 + 9, gems: [2] };
  assert.equal(L.check(p, [0, 1, 2, 5, 8]).ok, true);
  assert.match(L.check(p, [1, 2]).reason, /Start/);
  assert.match(L.check(p, [0, 2]).reason, /touching/);
  assert.match(L.check(p, [0, 1, 0]).reason, /once/);
  assert.match(L.check(p, [0, 1, 2, 5]).reason, /flag/);
  assert.match(L.check(p, [0, 3, 6, 7, 8]).reason, /Over|Short/);
  const q = { ...p, target: 1 + 4 + 5 + 6 + 9, gems: [2] };
  assert.match(L.check(q, [0, 3, 4, 5, 8]).reason, /gem/);
  assert.equal(L.solve(p, 10).count, 1);
});

test('stars and score reward speed and clean solves', () => {
  assert.equal(L.stars('normal', 30000, 0), 3); assert.equal(L.stars('normal', 30000, 1), 2); assert.equal(L.stars('normal', 200000, 0), 1);
  assert.ok(L.score('normal', 10000, 0, 0) > L.score('normal', 100000, 0, 0));
  assert.ok(L.score('hard', 60000, 0, 0) > L.score('normal', 60000, 0, 0));
  assert.equal(L.score('easy', 1e9, 5, 50), 50); // floor: half the tier base
});
