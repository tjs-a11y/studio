import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOnDevicePayload, calculateSpreadMath } from '../js/engine.mjs';

test('normalizer: basic rows keyed by lower-cased headers', () => {
  const r = normalizeOnDevicePayload('Date,Amount,Memo\n2026-11-04,12.50,Coffee\n2026-11-05,-9,Refund');
  assert.equal(r.status, 'SUCCESS');
  assert.equal(r.total_records_processed, 2);
  assert.deepEqual(r.matrix[0].record_data, { date: '2026-11-04', amount: '12.50', memo: 'Coffee' });
  assert.equal(r.matrix[1].local_sequence_index, 1);
});

test('normalizer: quoted commas and amounts are NOT corrupted (the whole point)', () => {
  const r = normalizeOnDevicePayload('name,amount\n"Smith, John","1,234.50"\nDoe,9');
  assert.equal(r.matrix[0].record_data.name, 'Smith, John');
  assert.equal(r.matrix[0].record_data.amount, '1,234.50');
  assert.equal(r.matrix[1].record_data.name, 'Doe');
});

test('normalizer: BOM, CRLF and blank lines handled', () => {
  const r = normalizeOnDevicePayload('﻿a,b\r\n1,2\r\n\r\n3,4\r\n');
  assert.equal(r.total_records_processed, 2);
  assert.deepEqual(r.matrix[0].record_data, { a: '1', b: '2' });
  assert.deepEqual(r.matrix[1].record_data, { a: '3', b: '4' });
});

test('normalizer: empty input and missing trailing values', () => {
  assert.deepEqual(normalizeOnDevicePayload(''), { status: 'EMPTY', total_records_processed: 0, matrix: [] });
  const r = normalizeOnDevicePayload('a,b,c\n1,2');
  assert.equal(r.matrix[0].record_data.c, null);
});

test('normalizer: no telemetry keys ever leak into a record', () => {
  const r = normalizeOnDevicePayload('x\n1');
  const keys = Object.keys(r.matrix[0]);
  assert.deepEqual(keys.sort(), ['local_sequence_index', 'localized_at', 'record_data']);
  for (const bad of ['id', 'tenant_source_domain', 'ingestion_path']) assert.ok(!keys.includes(bad), bad);
});

test('normalizer: rejects non-string input', () => {
  assert.throws(() => normalizeOnDevicePayload({}), TypeError);
});

test('spread: width only when no premium given, no misleading breakeven', () => {
  const m = calculateSpreadMath(100, 95, 2);
  assert.equal(m.spread_width, 5);
  assert.equal(m.spread_width_dollars, 1000);
  assert.ok(!('breakeven' in m), 'must not print a breakeven without a premium');
  assert.match(m.informational_disclaimer, /NOT FINANCIAL ADVICE/);
});

test('spread: put credit spread (bull put) math is correct', () => {
  // Sell 100 put, buy 95 put, collect 1.50/share, 1 contract.
  const m = calculateSpreadMath(100, 95, { netPremiumPerShare: 1.5, optionType: 'put' });
  assert.equal(m.position, 'credit');
  assert.equal(m.max_profit, 150);          // 1.50 x 100
  assert.equal(m.max_loss, 350);            // (5 - 1.50) x 100
  assert.equal(m.breakeven, 98.5);          // short - credit
});

test('spread: call credit spread (bear call) breakeven uses short + credit', () => {
  const m = calculateSpreadMath(50, 55, { netPremiumPerShare: 1, optionType: 'call' });
  assert.equal(m.position, 'credit');
  assert.equal(m.breakeven, 51);            // 50 + 1
  assert.equal(m.max_loss, 400);            // (5 - 1) x 100
});

test('spread: call debit spread (bull call) math is correct', () => {
  // Buy 50 call (long, lower), sell 55 call (short, higher), pay 2.00/share.
  const m = calculateSpreadMath(55, 50, { netPremiumPerShare: -2, optionType: 'call' });
  assert.equal(m.position, 'debit');
  assert.equal(m.net_debit_dollars, 200);
  assert.equal(m.max_loss, 200);            // debit paid
  assert.equal(m.max_profit, 300);          // (5 - 2) x 100
  assert.equal(m.breakeven, 52);            // long + debit
});

test('spread: breakeven withheld (null + note) when option type unknown', () => {
  const m = calculateSpreadMath(100, 95, { netPremiumPerShare: 1.5 });
  assert.equal(m.breakeven, null);
  assert.match(m.breakeven_note, /put.*call/);
});

test('spread: invalid inputs return ERROR, never NaN math', () => {
  assert.equal(calculateSpreadMath('x', 95).status, 'ERROR');
  assert.equal(calculateSpreadMath(100, 95, { contracts: 0 }).status, 'ERROR');
  assert.equal(calculateSpreadMath(100, 95, { netPremiumPerShare: 'oops', optionType: 'put' }).status, 'ERROR');
});
