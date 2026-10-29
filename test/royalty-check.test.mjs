import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRoyalty, expectedDecimal, round8, THRESHOLD } from '../royalty-check/js/engine.mjs';

test('expected decimal = (net acres / unit) * royalty fraction, rounded to 8 dp for display', () => {
  const r = checkRoyalty({ netMineralAcres: 20, spacingUnitAcres: 640, royaltyFraction: 0.1875, statementOwnerDecimal: 0.00585938 });
  // 20/640*0.1875 = 0.005859375 -> 8 dp 0.00585938
  assert.equal(r.expectedDecimal, 0.00585938);
  assert.equal(r.flag, 'ok', 'an 8-dp-rounded statement is within tolerance');
});

test('variance flag fires just over the threshold and stays quiet just under it', () => {
  const inputs = { netMineralAcres: 20, spacingUnitAcres: 640, royaltyFraction: 0.1875 };
  const expected = expectedDecimal(inputs); // 0.005859375
  const over = checkRoyalty({ ...inputs, statementOwnerDecimal: expected + 2e-7 });
  assert.equal(over.flag, 'variance');
  assert.ok(Math.abs(over.decimalVariance) > THRESHOLD);
  const under = checkRoyalty({ ...inputs, statementOwnerDecimal: expected + 5e-8 });
  assert.equal(under.flag, 'ok', 'a difference below 1e-7 does not flag');
});

test('8-dp display rounding does not itself trip the flag', () => {
  // expected full precision vs its own 8-dp round: the tiny rounding gap must stay within tolerance.
  const inputs = { netMineralAcres: 1, spacingUnitAcres: 3, royaltyFraction: 0.125 }; // 0.0416666...
  const expected = expectedDecimal(inputs);
  const r = checkRoyalty({ ...inputs, statementOwnerDecimal: round8(expected) });
  assert.equal(r.flag, 'ok');
});

test('float safety: repeating decimals and 0.1+0.2 style do not create false flags', () => {
  const inputs = { netMineralAcres: 10, spacingUnitAcres: 30, royaltyFraction: 0.125 }; // (1/3)*0.125 = 0.041666...
  const expected = expectedDecimal(inputs);
  assert.equal(checkRoyalty({ ...inputs, statementOwnerDecimal: expected }).flag, 'ok');
});

test('divide-by-zero and out-of-range inputs throw a structured error, never NaN/Infinity', () => {
  assert.throws(() => expectedDecimal({ netMineralAcres: 20, spacingUnitAcres: 0, royaltyFraction: 0.1875 }), RangeError);
  assert.throws(() => expectedDecimal({ netMineralAcres: -1, spacingUnitAcres: 640, royaltyFraction: 0.1875 }), RangeError);
  assert.throws(() => expectedDecimal({ netMineralAcres: 20, spacingUnitAcres: 640, royaltyFraction: 1.5 }), RangeError);
  assert.throws(() => expectedDecimal({ netMineralAcres: 20, spacingUnitAcres: 640, royaltyFraction: 0 }), RangeError);
});

test('a bad statement decimal is rejected, not silently NaN-compared', () => {
  assert.throws(() => checkRoyalty({ netMineralAcres: 20, spacingUnitAcres: 640, royaltyFraction: 0.1875, statementOwnerDecimal: 'oops' }), RangeError);
});
