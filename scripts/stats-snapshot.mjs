// Snapshot the public, anonymous usage counts so the growth scoreboard can read them.
//   SITE_URL=https://quickwell.app node scripts/stats-snapshot.mjs
// Fetches GET /api/stats (public, no auth) and writes two files under metrics/:
//   metrics/stats.json      the latest snapshot (overwritten each run)
//   metrics/history.jsonl   one compact line per day, append-only, for trends
// /api/stats returns only integer counters (count:<tool>:checks[:today]); it never
// exposes a visitor, name or email. This script copies that shape verbatim and adds
// nothing personal. Runs from .github/workflows/metrics.yml on GitHub's runners,
// which can reach the live site (this family-office automation host cannot: 403).
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const metricsDir = join(root, 'metrics');
const today = new Date().toISOString().slice(0, 10);

function siteOrigin() {
  const fromEnv = process.env.SITE_URL && process.env.SITE_URL.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  try { return JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8')).origin.replace(/\/$/, ''); }
  catch { return ''; }
}

async function main() {
  const origin = siteOrigin();
  if (!origin || /quickwell\.example/.test(origin)) {
    console.log('No real site address yet; nothing to snapshot.');
    return;
  }
  const url = `${origin}/api/stats`;
  let stats;
  try {
    const r = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    stats = await r.json();
  } catch (e) {
    // Record the failure instead of crashing, so the scoreboard shows an honest gap, not a stale number.
    stats = { enabled: null, error: String(e && e.message || e) };
  }

  const snapshot = { fetched: new Date().toISOString(), date: today, source: url, ...stats };
  mkdirSync(metricsDir, { recursive: true });
  writeFileSync(join(metricsDir, 'stats.json'), JSON.stringify(snapshot, null, 2) + '\n');

  // Append-only daily history: date, enabled flag, per-tool checks, and pre-launch interest counters (integers only).
  const toolTotals = {};
  if (stats && stats.tools) for (const [id, t] of Object.entries(stats.tools)) toolTotals[id] = (t && t.checks) || 0;
  const interest = {};
  if (stats && stats.interest) {
    for (const [id, t] of Object.entries(stats.interest)) {
      interest[id] = {
        interest: Number(t.interest) || 0, interest_today: Number(t.interest_today) || 0,
        click_operator: Number(t.click_operator) || 0, click_operator_today: Number(t.click_operator_today) || 0,
        click_manager: Number(t.click_manager) || 0, click_manager_today: Number(t.click_manager_today) || 0,
      };
    }
  }
  const row = { date: today, enabled: stats.enabled ?? null, total_checks: stats.total_checks ?? null, tools: toolTotals, interest };
  const histPath = join(metricsDir, 'history.jsonl');
  // One row per day: if today's row already exists, rewrite the file without it, then append the fresh one.
  if (existsSync(histPath)) {
    const kept = readFileSync(histPath, 'utf8').split('\n').filter((l) => l.trim() && !l.includes(`"date":"${today}"`));
    writeFileSync(histPath, kept.length ? kept.join('\n') + '\n' : '');
  }
  appendFileSync(histPath, JSON.stringify(row) + '\n');

  const n = Object.keys(toolTotals).length;
  console.log(`stats: enabled=${stats.enabled} total_checks=${stats.total_checks ?? 'n/a'} tools=${n}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
