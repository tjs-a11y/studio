// Royalty Check engine — pure, on-device. No DOM, no network, no identity.
// ExpectedDecimal = (NetMineralAcres / SpacingUnitAcres) * RoyaltyFraction.
// Display rounds to 8 dp, but the variance is computed at full precision and compared with a tolerance,
// so display rounding can never create a false flag. Information + arithmetic — never title/legal/financial advice.

export const DP = 8;
export const THRESHOLD = 1e-7;

export function round8(x) {
  return Math.round(Number(x) * 1e8) / 1e8;
}

export function expectedDecimal({ netMineralAcres, spacingUnitAcres, royaltyFraction } = {}) {
  const nma = Number(netMineralAcres), sua = Number(spacingUnitAcres), rf = Number(royaltyFraction);
  if (!Number.isFinite(sua) || sua <= 0) throw new RangeError('spacingUnitAcres must be a number > 0');
  if (!Number.isFinite(nma) || nma < 0) throw new RangeError('netMineralAcres must be a number >= 0');
  if (!Number.isFinite(rf) || rf <= 0 || rf > 1) throw new RangeError('royaltyFraction must be a number in (0, 1]');
  return (nma / sua) * rf;
}

export function checkRoyalty(input = {}) {
  const expected = expectedDecimal(input); // throws on bad input
  const statement = Number(input.statementOwnerDecimal);
  if (!Number.isFinite(statement) || statement < 0 || statement > 1) {
    throw new RangeError('statementOwnerDecimal must be a number in [0, 1]');
  }
  const variance = statement - expected; // full precision
  const flag = Math.abs(variance) > THRESHOLD ? 'variance' : 'ok';
  return {
    expectedDecimal: round8(expected),
    expectedDecimalFull: expected,
    statementOwnerDecimal: statement,
    decimalVariance: variance,
    flag,
    message: flag === 'variance'
      ? 'Your statement decimal differs from the expected decimal by more than 0.0000001. Re-check the net acres, unit size and royalty fraction with the operator — and, if it still differs, with a landman or attorney. This is not a conclusion that anything is wrong.'
      : 'Your statement decimal matches the expected decimal within tolerance.',
  };
}
