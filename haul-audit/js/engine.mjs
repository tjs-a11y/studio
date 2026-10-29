// Haul Audit engine — pure, on-device. No DOM, no network, no identity.
// Two strictly separate ledgers: the broker SETTLEMENT and the invoice FACTORING deposit.
// A factoring fee must NEVER change the broker GrossVariance. Money is done in integer cents to avoid float drift.

const toCents = (n) => Math.round(Number(n || 0) * 100);
const sumCents = (arr) => (Array.isArray(arr) ? arr : []).reduce((s, a) => s + toCents(a), 0);
const toDollars = (c) => c / 100;

// Broker settlement ledger. ExpectedGross = Linehaul + FuelSurcharge + sum(ApprovedAccessorials).
// Reported can be a single number, or a list of signed line items (a fuel charge-back is a negative line)
// that reduces the REPORTED gross — never the expected gross.
export function auditSettlement(input = {}) {
  const expectedC = toCents(input.linehaul) + toCents(input.fuelSurcharge) + sumCents(input.approvedAccessorials);
  const reportedC = Array.isArray(input.reportedLines) ? sumCents(input.reportedLines) : toCents(input.reportedSettlementGross);
  const varianceC = reportedC - expectedC; // negative = carrier underpaid
  return {
    expectedGross: toDollars(expectedC),
    reportedSettlementGross: toDollars(reportedC),
    grossVariance: toDollars(varianceC),
    underpaid: varianceC < 0,
  };
}

// Factoring ledger, fully independent. ExpectedFactorDeposit = FundedInvoiceAmount - FactorFees - sum(FactorAdjustments).
export function auditFactoring(input = {}) {
  const expectedC = toCents(input.fundedInvoiceAmount) - toCents(input.factorFees) - sumCents(input.factorAdjustments);
  const reportedC = toCents(input.reportedFactorDeposit);
  const varianceC = reportedC - expectedC;
  return {
    expectedFactorDeposit: toDollars(expectedC),
    reportedFactorDeposit: toDollars(reportedC),
    depositVariance: toDollars(varianceC),
    short: varianceC < 0,
  };
}

// Full audit: the two ledgers never net into each other.
export function audit(input = {}) {
  return { settlement: auditSettlement(input), factoring: auditFactoring(input) };
}
