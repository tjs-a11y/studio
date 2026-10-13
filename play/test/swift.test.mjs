import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/swift.mjs';

test('daily Swift stream is deterministic per day', () => {
  assert.deepEqual(S.dailyStream('2026-10-12'), S.dailyStream('2026-10-12'));
  assert.notDeepEqual(S.dailyStream('2026-10-12'), S.dailyStream('2026-10-13'));
});

test('every challenge has a valid answer among its options', () => {
  for (const tier of Object.keys(S.TIERS)) for (const noColor of [false, true]) {
    const st = S.makeStream(`t-${tier}`, tier, 300, noColor);
    for (const c of st) {
      assert.ok(Number.isInteger(c.answer) && c.answer >= 0 && c.answer < c.options.length, JSON.stringify(c));
      if (noColor) assert.notEqual(c.type, 'ink');
      if (c.type === 'ink') assert.equal(c.options[c.answer].ink, c.ink);
      if (c.type === 'arrow') assert.equal(c.answer, c.dir);
      if (c.type === 'odd') { const labels = c.options.map((o) => o.label); const odd = labels[c.answer]; assert.equal(labels.filter((l) => l === odd).length, 1); assert.equal(new Set(labels).size, 2); }
      if (c.type === 'more') assert.equal(c.answer, c.left.length > c.right.length ? 0 : 1);
      if (c.type === 'sum') { const [a, b, sh] = c.text.match(/\d+/g).map(Number); assert.equal(c.answer, a + b === sh ? 0 : 1); }
      if (c.type === 'flank') assert.equal(c.row[2], c.answer ? '→' : '←');
    }
  }
});

test('colour-free mode keeps the same stream length and only swaps colour challenges', () => {
  const a = S.makeStream('z', 'normal', 100, false), b = S.makeStream('z', 'normal', 100, true);
  assert.equal(a.length, b.length);
  a.forEach((x, i) => { if (x.type !== 'ink') assert.deepEqual(b[i], x); else assert.equal(b[i].type, 'arrow'); });
});

test('combo multiplier and scoring', () => {
  assert.equal(S.multFor(1), 1); assert.equal(S.multFor(5), 2); assert.equal(S.multFor(10), 3); assert.equal(S.multFor(20), 4); assert.equal(S.multFor(99), 4);
  assert.deepEqual(S.scoreAnswer(true, 500, 0), { points: 15, combo: 1, mult: 1, penalty: 0 });
  assert.deepEqual(S.scoreAnswer(true, 1000, 4), { points: 24, combo: 5, mult: 2, penalty: 0 });
  assert.deepEqual(S.scoreAnswer(true, 2000, 19), { points: 40, combo: 20, mult: 4, penalty: 0 });
  assert.deepEqual(S.scoreAnswer(false, 300, 12), { points: 0, combo: 0, mult: 1, penalty: S.PENALTY_MS });
  const run = S.scoreRun([...Array(6)].map(() => ({ correct: true, ms: 2000 })).concat([{ correct: false, ms: 100 }, { correct: true, ms: 2000 }]));
  assert.deepEqual(run, { score: 10 * 4 + 20 * 2 + 10, bestCombo: 6, right: 7, wrong: 1, accuracy: 7 / 8 });
  const b = S.buckets([{ correct: true, ms: 2000, t: 100 }, { correct: true, ms: 2000, t: 44000 }], 45000, 9);
  assert.deepEqual(b, [10, 0, 0, 0, 0, 0, 0, 0, 10]);
});
