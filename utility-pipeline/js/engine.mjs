/**
 * Quickwell Open-Source Utility Pipeline  (ESM; the studio repo is ES modules)
 * On-Device Data Normalization & Educational Options Math.
 *
 * Zero-telemetry: everything here is pure, in-memory, synchronous. Nothing is
 * fetched, stored, or phoned home — no UUIDs, no source domains, no network.
 * This is the Quickwell privacy promise expressed in code (cf. saver, spare-key).
 *
 * CSV parsing reuses the battle-tested RFC-4180 parser from the Saver tool
 * (quoted fields, escaped "" , CR/LF, BOM) instead of a naive split(',') that
 * would corrupt real bank/brokerage exports like "Smith, J" or "1,234.50".
 */
import { parseCSV } from '../../saver/js/engine.mjs';

const r2 = (n) => Math.round(n * 100) / 100;

/**
 * Genuinely on-device CSV normalizer. No tracking, no telemetry, no PII leaves
 * the machine. Returns one record per data row keyed by lower-cased headers.
 * @param {string} rawCSVData
 * @returns {{status:string,total_records_processed:number,matrix:Array}}
 */
export function normalizeOnDevicePayload(rawCSVData) {
  if (typeof rawCSVData !== 'string') {
    throw new TypeError('Invalid input: Raw CSV input must be a formatted string.');
  }
  const rows = parseCSV(rawCSVData);
  if (rows.length < 1) return { status: 'EMPTY', total_records_processed: 0, matrix: [] };

  const headers = rows[0].map((h) => String(h).trim().toLowerCase());
  const body = rows.slice(1);
  const stampedAt = new Date().toISOString(); // local clock only; never transmitted

  const matrix = body.map((values, index) => {
    const record = {};
    headers.forEach((header, i) => {
      // Preserve a value under a blank header as a positional key rather than dropping it.
      const key = header || `column_${i + 1}`;
      record[key] = values[i] != null && values[i] !== '' ? String(values[i]).trim() : null;
    });
    return { local_sequence_index: index, record_data: record, localized_at: stampedAt };
  });

  return { status: 'SUCCESS', total_records_processed: matrix.length, matrix };
}

const DISCLAIMER =
  'EDUCATIONAL ONLY — NOT FINANCIAL ADVICE. Holds no funds, executes no trades, gives no buy/sell signal.';

/**
 * Educational vertical options-spread math. Pure arithmetic of the standard
 * defined-risk spread equations — NO buy/sell verdict, NO "optimal" label.
 *
 * Correctness note vs. the naive version:
 *   - A spread's MAX LOSS and BREAKEVEN cannot be known from strikes alone;
 *     they depend on the net premium. Width x 100 is only the spread's dollar
 *     width (collateral for a credit spread), not the max loss, and breakeven
 *     is NOT simply the short strike. So without a premium we return the width
 *     and say plainly what else is needed, rather than print a wrong breakeven.
 *
 * @param {number|string} shortStrike  strike of the SOLD leg
 * @param {number|string} longStrike   strike of the BOUGHT (protective) leg
 * @param {object|number} [opts]       object, or a bare number treated as contracts
 * @param {number} [opts.contracts=1]
 * @param {number} [opts.netPremiumPerShare]  credit received (>0) or debit paid (<0), per share
 * @param {'put'|'call'} [opts.optionType]
 */
export function calculateSpreadMath(shortStrike, longStrike, opts = {}) {
  if (typeof opts === 'number') opts = { contracts: opts };
  const short = parseFloat(shortStrike);
  const long = parseFloat(longStrike);
  const contracts = parseInt(opts.contracts ?? 1, 10);
  const optionType = String(opts.optionType || '').toLowerCase();
  const hasPremium = opts.netPremiumPerShare !== undefined && opts.netPremiumPerShare !== null && opts.netPremiumPerShare !== '';
  const net = hasPremium ? parseFloat(opts.netPremiumPerShare) : null;

  if (!Number.isFinite(short) || !Number.isFinite(long) || !Number.isInteger(contracts) || contracts < 1 || (hasPremium && !Number.isFinite(net))) {
    return { status: 'ERROR', message: 'Invalid numeric inputs: strikes, contracts (>=1) and any premium must be numbers.' };
  }

  const width = Math.abs(short - long);
  const mult = 100 * contracts;
  const out = {
    status: 'SUCCESS',
    informational_disclaimer: DISCLAIMER,
    option_type: optionType || 'unspecified',
    contracts,
    spread_width: r2(width),
    spread_width_dollars: r2(width * mult),
  };

  if (!hasPremium) {
    out.note =
      'Max loss, max profit and breakeven require the net premium. Pass opts.netPremiumPerShare (credit > 0, debit < 0) and opts.optionType ("put"/"call").';
    return out;
  }

  if (net >= 0) {
    // Credit spread: collect premium up front. Breakeven anchors on the SHORT strike.
    out.position = 'credit';
    out.net_credit_dollars = r2(net * mult);
    out.max_profit = r2(net * mult);
    out.max_loss = r2((width - net) * mult);
    out.breakeven = optionType === 'put' ? r2(short - net) : optionType === 'call' ? r2(short + net) : null;
  } else {
    // Debit spread: pay premium up front. Breakeven anchors on the LONG strike.
    const debit = -net;
    out.position = 'debit';
    out.net_debit_dollars = r2(debit * mult);
    out.max_loss = r2(debit * mult);
    out.max_profit = r2((width - debit) * mult);
    out.breakeven = optionType === 'call' ? r2(long + debit) : optionType === 'put' ? r2(long - debit) : null;
  }
  if (out.breakeven === null) out.breakeven_note = 'Set opts.optionType to "put" or "call" for the breakeven price.';
  return out;
}
