import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { anyUnverified, chairStandCutoff, chairStandRow, evaluate, normSex } from '../js/cutoffs.mjs';

const C = JSON.parse(readFileSync(new URL('../cutoffs.json', import.meta.url)));
const clone = () => JSON.parse(JSON.stringify(C));

test('every cutoff names its source; verified ones name the CDC form they were checked against', () => {
  for (const k of ['chairStand', 'balance', 'tug']) {
    assert.ok(C[k].source && C[k].source.length > 10, k + ' source');
    assert.ok(C[k].sourceUrls.length >= 1, k + ' urls');
    if (C[k].verified === true) assert.match(C[k].verifiedAgainst || '', /CDC STEADI/, k + ' verifiedAgainst');
    else assert.equal(C[k].verifiedAgainst, null, k);
  }
  // All three were checked against the CDC STEADI forms (2017) in sources/.
  assert.equal(C.chairStand.verified, true);
  assert.equal(C.chairStand.scoringNotes.verified, true);
  for (const r of C.chairStand.rows) assert.equal(r.verified, true);
  assert.equal(C.balance.verified, true);
  assert.equal(C.tug.verified, true);
  assert.equal(anyUnverified(C), false, 'no pending banner once all are verified');
});

test('banner logic: one unverified row keeps the banner; all verified clears it', () => {
  const c = clone();
  for (const e of [c.chairStand, c.chairStand.scoringNotes, c.balance, c.tug, ...c.chairStand.rows]) e.verified = true;
  assert.equal(anyUnverified(c), false);
  c.chairStand.rows[3].verified = false;
  assert.equal(anyUnverified(c), true);
});

test('chair-stand cutoff by age and sex (memo table)', () => {
  const cases = [[60, 'male', 14], [64, 'female', 12], [65, 'm', 12], [69, 'f', 11], [74, 'female', 10], [75, 'male', 11],
    [79.9, 'female', 10], [80, 'male', 10], [84, 'female', 9], [85, 'male', 8], [89, 'female', 8], [90, 'male', 7], [94, 'female', 4]];
  for (const [age, sex, want] of cases) assert.equal(chairStandCutoff(C, age, sex), want, `${age} ${sex}`);
});

test('chair-stand cutoff outside the table or without sex is null', () => {
  assert.equal(chairStandCutoff(C, 59, 'male'), null);
  assert.equal(chairStandCutoff(C, 95, 'female'), null);
  assert.equal(chairStandCutoff(C, 'abc', 'female'), null);
  assert.equal(chairStandCutoff(C, 70, null), null);
  assert.equal(chairStandRow(C, 72).ageMin, 70);
  assert.equal(normSex('Woman'), 'female'); assert.equal(normSex('x'), null);
});

test('evaluate: at the cutoff is within, one below is outside; arms used scores 0', () => {
  const base = { age: 72, sex: 'female', balanceStages: 4, tugSeconds: 9 };
  assert.equal(evaluate(C, { ...base, stands: 10 }).chairStand.status, 'within');
  assert.equal(evaluate(C, { ...base, stands: 9 }).chairStand.status, 'outside');
  const arms = evaluate(C, { ...base, stands: 14, armsUsed: true });
  assert.equal(arms.chairStand.value, 0); assert.equal(arms.chairStand.status, 'outside');
});

test('evaluate: TUG 12 s or more and balance below tandem are outside', () => {
  const b = { age: 72, sex: 'male', stands: 15 };
  assert.equal(evaluate(C, { ...b, tugSeconds: 11.9, balanceStages: 3 }).tug.status, 'within');
  assert.equal(evaluate(C, { ...b, tugSeconds: 12, balanceStages: 3 }).tug.status, 'outside');
  assert.equal(evaluate(C, { ...b, tugSeconds: 9, balanceStages: 3 }).balance.status, 'within');
  assert.equal(evaluate(C, { ...b, tugSeconds: 9, balanceStages: 2 }).balance.status, 'outside');
});

test('evaluate: bands', () => {
  const ok = { age: 72, sex: 'male', stands: 15, balanceStages: 4, tugSeconds: 8 };
  assert.equal(evaluate(C, ok).band, 'steady');
  assert.equal(evaluate(C, ok).complete, true);
  assert.equal(evaluate(C, { ...ok, tugSeconds: 13 }).band, 'watch');
  assert.equal(evaluate(C, { ...ok, tugSeconds: 13, stands: 5 }).band, 'doctor');
  assert.equal(evaluate(C, { age: 72, sex: 'male' }).band, 'incomplete');
  const partial = evaluate(C, { age: 72, sex: 'male', stands: 15 });
  assert.equal(partial.band, 'steady'); assert.equal(partial.complete, false);
  assert.equal(evaluate(C, { ...ok, age: 50 }).chairStand.status, 'no-cutoff');
});
