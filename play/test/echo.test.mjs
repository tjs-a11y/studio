import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/echo.mjs';

test('daily Echo is the same for everyone on a day, and different the next day', () => {
  assert.deepEqual(E.dailyRounds('2026-10-12'), E.dailyRounds('2026-10-12'));
  assert.notDeepEqual(E.dailyRounds('2026-10-12'), E.dailyRounds('2026-10-13'));
});

test('rounds grow by one tile, stay on the grid, never repeat a tile twice in a row, and extend the previous round', () => {
  for (const tier of Object.keys(E.TIERS)) for (let k = 0; k < 30; k++) {
    const rounds = E.makeRounds(`seed${k}`, tier, 20);
    rounds.forEach((r, i) => {
      assert.equal(r.seq.length, E.TIERS[tier].len + i);
      assert.ok(r.size >= 3 && r.size <= 5);
      assert.ok(r.seq.every((c) => c >= 0 && c < r.size * r.size));
      assert.ok(r.seq.every((c, j) => j === 0 || c !== r.seq[j - 1]));
      if (i && rounds[i - 1].size === r.size) assert.deepEqual(r.seq.slice(0, -1), rounds[i - 1].seq);
    });
  }
});

test('taps: in order, mirror (reverse) order, and misses', () => {
  const seq = [4, 1, 7];
  assert.equal(E.checkTap(seq, 0, 4), 'ok'); assert.equal(E.checkTap(seq, 1, 1), 'ok'); assert.equal(E.checkTap(seq, 2, 7), 'done');
  assert.equal(E.checkTap(seq, 1, 7), 'miss');
  assert.equal(E.checkTap(seq, 0, 7, true), 'ok'); assert.equal(E.checkTap(seq, 2, 4, true), 'done'); assert.equal(E.checkTap(seq, 0, 4, true), 'miss');
});

test('scoring and the share pattern', () => {
  assert.equal(E.roundPoints({ len: 3, size: 3, firstTry: true }), 45);
  assert.equal(E.roundPoints({ len: 6, size: 4, firstTry: false }), 90);
  assert.equal(E.roundPoints({ len: 10, size: 5, firstTry: true }), 250);
  const res = [{ len: 3, size: 3, cleared: true, firstTry: true }, { len: 4, size: 3, cleared: true, firstTry: false }, { len: 7, size: 4, cleared: false }];
  assert.equal(E.runScore(res), 45 + 40);
  assert.equal(E.sharePattern(res), '🔷🔶 ✖️');
});

test('Dual: deterministic stream with real matches, and fair scoring', () => {
  const s = E.dualStream('x', 2, 20); assert.deepEqual(s, E.dualStream('x', 2, 20));
  assert.equal(s.pos.length, 22);
  let pm = 0, sm = 0; for (let i = 2; i < 22; i++) { if (s.pos[i] === s.pos[i - 2]) pm++; if (s.sym[i] === s.sym[i - 2]) sm++; }
  assert.ok(pm >= 1 && pm <= 15 && sm >= 1 && sm <= 15, `${pm} ${sm}`);
  const perfect = s.pos.map((p, i) => (i < 2 ? {} : { pos: p === s.pos[i - 2], sym: s.sym[i] === s.sym[i - 2] }));
  const r = E.dualScore(s, perfect); assert.equal(r.accuracy, 1); assert.equal(r.falseAlarms, 0); assert.equal(r.misses, 0);
  const spam = E.dualScore(s, s.pos.map(() => ({ pos: true, sym: true }))); // pressing everything is not rewarded
  assert.ok(spam.accuracy < 0.8 && spam.score < r.score);
  assert.equal(E.dualScore(s, []).hits, 0);
});
