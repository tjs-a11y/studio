// GET /api/stats  — anonymous, aggregate usage counts per tool, so the growth scoreboard can read them.
// No personal data: only the integer counters that /api/event increments (count:<tool>:checks[:YYYY-MM-DD]).
// Public and cacheable. Returns { enabled:false } until Upstash/KV is connected on the project.
import { json, tools } from './_lib/core.js';

const day = () => new Date().toISOString().slice(0, 10);
const PRELAUNCH_TIER_TOOLS = ['port-watcher', 'hydro-flow', 'scale-audit'];
const INTEREST_PER = 6;

function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return async (commands) => {
    const r = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(2000),
    });
    if (!r.ok) throw new Error(`stats ${r.status}`);
    return r.json(); // [{result: ...}, ...]
  };
}

let override = null;
export const setStoreForTests = (fn) => { override = fn; };

export async function GET() {
  const run = override || store();
  if (!run) return json({ enabled: false, note: 'Usage counting is off until Upstash/KV is connected on this project.' });
  const ids = tools.map((t) => t.id).filter((id) => id !== 'plus');
  const today = day();
  // Anonymous outbound-click counters from our other sites (counts only, no identity).
  const OUTBOUND = [['northstar', 'freightsidekick']];
  // Per tool: free uses (checks), purchase intent (upgrade_clicks), and purchases (subs) — the funnel the growth sprint optimizes.
  const PER = 6;
  const interestStart = ids.length * PER + OUTBOUND.length * 2;
  const cmds = [
    ...ids.flatMap((id) => [
      ['GET', `count:${id}:checks`], ['GET', `count:${id}:checks:${today}`],
      ['GET', `count:${id}:upgrade_clicks`], ['GET', `count:${id}:upgrade_clicks:${today}`],
      ['GET', `count:${id}:subs`], ['GET', `count:${id}:subs:${today}`],
    ]),
    ...OUTBOUND.flatMap(([site, target]) => [['GET', `count:${site}:${target}:clicks`], ['GET', `count:${site}:${target}:clicks:${today}`]]),
    ...PRELAUNCH_TIER_TOOLS.flatMap((id) => [
      ['GET', `count:${id}:interest`], ['GET', `count:${id}:interest:${today}`],
      ['GET', `count:${id}:click_operator`], ['GET', `count:${id}:click_operator:${today}`],
      ['GET', `count:${id}:click_manager`], ['GET', `count:${id}:click_manager:${today}`],
    ]),
  ];
  let res;
  try { res = await run(cmds); } catch { return json({ enabled: true, error: 'unavailable' }, 200); }
  const num = (v) => { const n = Number(v && typeof v === 'object' && 'result' in v ? v.result : v); return Number.isFinite(n) ? n : 0; };
  const out = {};
  ids.forEach((id, i) => {
    const b = i * PER;
    out[id] = {
      checks: num(res[b]), checks_today: num(res[b + 1]),
      upgrade_clicks: num(res[b + 2]), upgrade_clicks_today: num(res[b + 3]),
      subs: num(res[b + 4]), subs_today: num(res[b + 5]),
    };
  });
  const total = Object.values(out).reduce((a, t) => a + t.checks, 0);
  const total_subs = Object.values(out).reduce((a, t) => a + t.subs, 0);
  const outbound = {};
  OUTBOUND.forEach(([site, target], i) => {
    const b = ids.length * PER + i * 2;
    outbound[`${site}:${target}`] = { clicks: num(res[b]), clicks_today: num(res[b + 1]) };
  });
  const interest = {};
  PRELAUNCH_TIER_TOOLS.forEach((id, i) => {
    const b = interestStart + i * INTEREST_PER;
    interest[id] = {
      interest: num(res[b]), interest_today: num(res[b + 1]),
      click_operator: num(res[b + 2]), click_operator_today: num(res[b + 3]),
      click_manager: num(res[b + 4]), click_manager_today: num(res[b + 5]),
    };
  });
  return json({ enabled: true, generated: new Date().toISOString(), total_checks: total, total_subs, tools: out, interest, outbound },
    200, { 'cache-control': 'public, max-age=300' });
}
