import test from 'node:test';
import assert from 'node:assert/strict';
import { audit, auditSettlement, auditFactoring } from '../haul-audit/js/engine.mjs';

test('expected gross = linehaul + fuel + approved accessorials; variance signs correctly', () => {
  const r = auditSettlement({ linehaul: 2000, fuelSurcharge: 300, approvedAccessorials: [100, 50], reportedSettlementGross: 2450 });
  assert.equal(r.expectedGross, 2450);
  assert.equal(r.grossVariance, 0);
  assert.equal(r.underpaid, false);
  const under = auditSettlement({ linehaul: 2000, fuelSurcharge: 300, approvedAccessorials: [100, 50], reportedSettlementGross: 2400 });
  assert.equal(under.grossVariance, -50);
  assert.equal(under.underpaid, true);
});

test('negative line adjustment (fuel charge-back) reduces REPORTED gross, not expected gross', () => {
  // Reported arrives as signed line items: base pay 2450, then a -150 fuel charge-back.
  const r = auditSettlement({ linehaul: 2000, fuelSurcharge: 300, approvedAccessorials: [100, 50], reportedLines: [2450, -150] });
  assert.equal(r.expectedGross, 2450, 'expected gross is unchanged by a charge-back');
  assert.equal(r.reportedSettlementGross, 2300);
  assert.equal(r.grossVariance, -150);
  assert.equal(r.underpaid, true);
});

test('isolation rule: a factoring fee changes the deposit variance but NEVER the gross variance', () => {
  const base = { linehaul: 2000, fuelSurcharge: 300, approvedAccessorials: [150], reportedSettlementGross: 2450,
    fundedInvoiceAmount: 2450, factorFees: 0, reportedFactorDeposit: 2450 };
  const a = audit(base);
  const b = audit({ ...base, factorFees: 73.5, reportedFactorDeposit: 2376.5 });
  assert.equal(a.settlement.grossVariance, 0);
  assert.equal(b.settlement.grossVariance, 0, 'factor fee must not touch broker gross variance');
  assert.equal(a.factoring.depositVariance, 0);
  assert.equal(b.factoring.expectedFactorDeposit, 2376.5);
  assert.equal(b.factoring.depositVariance, 0);
});

test('factoring: expected deposit = funded - fees - adjustments; short flag', () => {
  const r = auditFactoring({ fundedInvoiceAmount: 2450, factorFees: 73.5, factorAdjustments: [25], reportedFactorDeposit: 2300 });
  assert.equal(r.expectedFactorDeposit, 2351.5);
  assert.equal(r.depositVariance, -51.5);
  assert.equal(r.short, true);
});

test('missing fields default to 0, never NaN', () => {
  const r = audit({});
  assert.equal(r.settlement.expectedGross, 0);
  assert.equal(r.settlement.grossVariance, 0);
  assert.equal(r.factoring.expectedFactorDeposit, 0);
  assert.ok(!Number.isNaN(r.settlement.grossVariance));
});

test('cents precision: 0.1 + 0.2 style sums are exact (integer-cents path)', () => {
  const r = auditSettlement({ linehaul: 0.1, fuelSurcharge: 0.2, approvedAccessorials: [], reportedSettlementGross: 0.3 });
  assert.equal(r.expectedGross, 0.3);
  assert.equal(r.grossVariance, 0, 'no floating-point drift');
});
