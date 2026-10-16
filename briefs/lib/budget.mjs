// Spend guard. Every Claude call is logged to data/usage.json with its token counts and cost.
// Before a desk calls Claude, this month's logged spend plus a worst-case brief must fit under
// BRIEFS_MONTHLY_BUDGET_USD (default $15), or the desk skips the day.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// USD per million tokens for the models this pipeline may use (Anthropic list prices).
export const PRICES = { 'claude-opus-5-5': { input: 4, output: 20 } };
// A brief that needs its one rewrite: two calls of about 5k in / 2k out each (measured 2026-10-16: 4,517 / 1,813).
export const WORST_CASE_USD = 0.12;

export function costUsd(model, { input_tokens = 0, output_tokens = 0 }) {
  const p = PRICES[model] ?? PRICES['claude-opus-5-5'];
  return Math.round(((input_tokens * p.input + output_tokens * p.output) / 1e6) * 10000) / 10000;
}

export const monthlyCap = (env = process.env) => {
  const n = Number(env.BRIEFS_MONTHLY_BUDGET_USD);
  return Number.isFinite(n) && n > 0 ? n : 15;
};

export async function loadLedger(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}
export async function saveLedger(file, ledger) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(ledger, null, 1) + '\n', 'utf8');
}
export const monthSpend = (ledger, month) => Math.round(ledger.filter((r) => r.date.startsWith(month)).reduce((s, r) => s + r.usd, 0) * 10000) / 10000;
export const canAfford = (ledger, { date, cap }) => monthSpend(ledger, date.slice(0, 7)) + WORST_CASE_USD <= cap;
