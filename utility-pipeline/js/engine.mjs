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
  const short = Number(shortStrike);
  const long = Number(longStrike);
  const contracts = Number(opts.contracts ?? 1);
  const optionType = String(opts.optionType || '').toLowerCase();
  const hasPremium = opts.netPremiumPerShare !== undefined && opts.netPremiumPerShare !== null && opts.netPremiumPerShare !== '';
  const net = hasPremium ? Number(opts.netPremiumPerShare) : null;

  if (!Number.isFinite(short) || short <= 0 || !Number.isFinite(long) || long <= 0 || !Number.isInteger(contracts) || contracts < 1 || (hasPremium && !Number.isFinite(net))) {
    return { status: 'ERROR', message: 'Invalid numeric inputs: strikes, contracts (>=1) and any premium must be numbers.' };
  }

  const width = Math.abs(short - long);
  if (width === 0 || (hasPremium && Math.abs(net) > width)) {
    return { status: 'ERROR', message: 'Invalid spread: strikes must differ, and the absolute net premium cannot exceed the spread width.' };
  }
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

/* ------------------------------------------------------------------ Plus extras
   Pure, on-device, deterministic. Gated to Quickwell Plus in the UI; the free
   tiers above stay free. Kept here (not in the page) so they are unit-tested. */

/**
 * Keep only chosen columns (in the given order) and optionally drop duplicate rows.
 * @param {object} result  the object returned by normalizeOnDevicePayload
 * @param {object} [opts]
 * @param {string[]} [opts.columns]  header keys to keep, in order (default: all, original order)
 * @param {boolean} [opts.dedupe]    drop rows identical across the kept columns
 */
export function projectRows(result, opts = {}) {
  const rows = (result && Array.isArray(result.matrix)) ? result.matrix : [];
  const all = rows.length ? Object.keys(rows[0].record_data) : [];
  const cols = Array.isArray(opts.columns) && opts.columns.length ? opts.columns.filter((c) => all.includes(c)) : all;
  const seen = new Set();
  const matrix = [];
  for (const row of rows) {
    const record = {};
    cols.forEach((c) => { record[c] = row.record_data[c] ?? null; });
    if (opts.dedupe) {
      const key = cols.map((c) => String(record[c] ?? '')).join('\u0001');
      if (seen.has(key)) continue;
      seen.add(key);
    }
    matrix.push({ local_sequence_index: matrix.length, record_data: record });
  }
  return { status: matrix.length ? 'SUCCESS' : 'EMPTY', columns: cols, total_records_processed: matrix.length, matrix };
}

/**
 * Profit/loss of a vertical spread at expiration across a range of underlying prices.
 * Requires the net premium. Pure payoff math; no advice.
 * perShareP/L(S) = netPremium − payoff(short leg, S) + payoff(long leg, S)
 * @returns {{status:string, informational_disclaimer:string, points:Array<{price:number,profit:number}>}}
 */
export function spreadPayoff(shortStrike, longStrike, opts = {}) {
  const short = Number(shortStrike);
  const long = Number(longStrike);
  const contracts = Number(opts.contracts ?? 1);
  const net = Number(opts.netPremiumPerShare);
  const type = String(opts.optionType || '').toLowerCase();
  const steps = Number(opts.steps ?? 9);
  if (!Number.isFinite(short) || short <= 0 || !Number.isFinite(long) || long <= 0 || !Number.isFinite(net) || !Number.isInteger(contracts) || contracts < 1 || !Number.isInteger(steps) || steps < 3 || steps > 25 || (type !== 'put' && type !== 'call')) {
    return { status: 'ERROR', message: 'spreadPayoff needs numeric strikes, a net premium, contracts (>=1) and optionType "put"/"call".' };
  }
  const width = Math.abs(short - long);
  if (width === 0 || Math.abs(net) > width) return { status: 'ERROR', message: 'Strikes must differ and the absolute net premium cannot exceed the spread width.' };
  const lo = Math.max(0, Math.min(short, long) - width);
  const hi = Math.max(short, long) + width;
  const leg = (K, S) => (type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0));
  const mult = 100 * contracts;
  const points = [];
  for (let i = 0; i < steps; i++) {
    const S = r2(lo + ((hi - lo) * i) / (steps - 1));
    const perShare = net - leg(short, S) + leg(long, S);
    points.push({ price: S, profit: r2(perShare * mult) });
  }
  return { status: 'SUCCESS', informational_disclaimer: DISCLAIMER, points };
}

/**
 * Spreadsheet-safe CSV export. Formula-like text is prefixed with an apostrophe;
 * negative numeric values remain numeric. Runs entirely in memory.
 */
export function toSpreadsheetCSV(result) {
  if (!result || !Array.isArray(result.matrix) || result.matrix.length === 0) return '';
  const headers = Object.keys(result.matrix[0]?.record_data || {});
  const cell = (value) => {
    let text = value == null ? '' : String(value);
    const trimmed = text.replace(/^[\t\r ]+/, '');
    const formulaLike = /^[=+@]/.test(trimmed) ||
      (trimmed.startsWith('-') && !/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed));
    if (formulaLike) text = "'" + text;
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  return [headers, ...result.matrix.map((row) => headers.map((header) => row.record_data[header]))]
    .map((row) => row.map(cell).join(',')).join('\r\n');
}

/* ------------------------------------------------------------ more strategy math
   Pure, deterministic payoff math for single-underlying strategies, so the
   programmatic strategy pages can show a real, engine-computed Risk/Reward table.
   Educational only; no advice. All figures are per the share counts given. */

/**
 * Covered call: own `shares` of stock at cost `stockPrice`, sell calls at `strike` for `premium`/share.
 * @returns max profit (if called away), breakeven, the cap, and downside cushion.
 */
export function coveredCall(stockPrice, strike, premium, shares = 100) {
  const s = parseFloat(stockPrice), k = parseFloat(strike), p = parseFloat(premium), n = parseInt(shares, 10);
  if (![s, k, p].every(Number.isFinite) || !Number.isInteger(n) || n < 1 || s <= 0 || k <= 0) {
    return { status: 'ERROR', message: 'coveredCall needs positive stock price and strike, a premium, and shares >= 1.' };
  }
  return {
    status: 'SUCCESS', informational_disclaimer: DISCLAIMER, strategy: 'covered-call',
    net_cost_per_share: r2(s - p),
    max_profit: r2(((k - s) + p) * n),           // called away at the strike
    profit_capped_above: r2(k),
    breakeven: r2(s - p),
    downside_cushion: r2(p * n),                  // premium offsets the first bit of a drop
    max_loss_to_zero: r2((s - p) * n),            // if the stock went to 0
  };
}

/**
 * Cash-secured put: sell puts at `strike` for `premium`/share, hold strike*100 cash per contract.
 */
export function cashSecuredPut(strike, premium, contracts = 1) {
  const k = parseFloat(strike), p = parseFloat(premium), n = parseInt(contracts, 10);
  if (![k, p].every(Number.isFinite) || !Number.isInteger(n) || n < 1 || k <= 0) {
    return { status: 'ERROR', message: 'cashSecuredPut needs a positive strike, a premium, and contracts >= 1.' };
  }
  const mult = 100 * n;
  return {
    status: 'SUCCESS', informational_disclaimer: DISCLAIMER, strategy: 'cash-secured-put',
    max_profit: r2(p * mult),                     // put expires worthless
    effective_buy_price: r2(k - p),               // if assigned
    breakeven: r2(k - p),
    cash_secured: r2(k * mult),
    max_loss_to_zero: r2((k - p) * mult),         // if assigned and the stock went to 0
  };
}

/**
 * Iron condor: short put spread + short call spread for a net credit.
 * putLong < putShort < callShort < callLong. netCredit is per share (total of both spreads).
 */
export function ironCondor({ putLong, putShort, callShort, callLong, netCredit, contracts = 1 } = {}) {
  const pl = parseFloat(putLong), ps = parseFloat(putShort), cs = parseFloat(callShort), cl = parseFloat(callLong);
  const credit = parseFloat(netCredit), n = parseInt(contracts, 10);
  if (![pl, ps, cs, cl, credit].every(Number.isFinite) || !Number.isInteger(n) || n < 1 || !(pl < ps && ps < cs && cs < cl) || credit <= 0) {
    return { status: 'ERROR', message: 'ironCondor needs putLong < putShort < callShort < callLong, a positive net credit, and contracts >= 1.' };
  }
  const putWidth = ps - pl, callWidth = cl - cs, mult = 100 * n;
  return {
    status: 'SUCCESS', informational_disclaimer: DISCLAIMER, strategy: 'iron-condor',
    max_profit: r2(credit * mult),                // both spreads expire worthless
    max_loss: r2((Math.max(putWidth, callWidth) - credit) * mult),
    lower_breakeven: r2(ps - credit),
    upper_breakeven: r2(cs + credit),
    profit_zone: `${r2(ps - credit)} to ${r2(cs + credit)}`,
  };
}
