// GET /api/stats  — anonymous, aggregate usage counts per tool, so the growth scoreboard can read them.
// No personal data: only aggregate integer counters for visits, tool opens, checks, trials and purchases.
// Public and cacheable. Returns { enabled:false } until Upstash/KV is connected on the project.
import { json, tools } from './_lib/core.js';

const day = () => new Date().toISOString().slice(0, 10);

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
  const PRELAUNCH = ['port-watcher', 'hydro-flow', 'scale-audit'];
  // Per tool: opens, checks, upgrade intent, trial starts, and completed paid/one-time purchases.
  const PER = 10;
  const cmds = [
    ['GET', 'count:quickwell:visits'], ['GET', `count:quickwell:visits:${today}`],
    ...ids.flatMap((id) => [
      ['GET', `count:${id}:opens`], ['GET', `count:${id}:opens:${today}`],
      ['GET', `count:${id}:checks`], ['GET', `count:${id}:checks:${today}`],
      ['GET', `count:${id}:upgrade_clicks`], ['GET', `count:${id}:upgrade_clicks:${today}`],
      ['GET', `count:${id}:trials`], ['GET', `count:${id}:trials:${today}`],
      ['GET', `count:${id}:subs`], ['GET', `count:${id}:subs:${today}`],
    ]),
    ...OUTBOUND.flatMap(([site, target]) => [['GET', `count:${site}:${target}:clicks`], ['GET', `count:${site}:${target}:clicks:${today}`]]),
    ...PRELAUNCH.flatMap((id) => [
      ['GET', `count:${id}:click_operator`], ['GET', `count:${id}:click_operator:${today}`],
      ['GET', `count:${id}:click_manager`], ['GET', `count:${id}:click_manager:${today}`],
    ]),
  ];
  let res;
  try { res = await run(cmds); } catch { return json({ enabled: true, error: 'unavailable' }, 200); }
  const num = (v) => { const n = Number(v && typeof v === 'object' && 'result' in v ? v.result : v); return Number.isFinite(n) ? n : 0; };
  const out = {};
  const visits = { total: num(res[0]), today: num(res[1]) };
  ids.forEach((id, i) => {
    const b = 2 + i * PER;
    out[id] = {
      opens: num(res[b]), opens_today: num(res[b + 1]),
      checks: num(res[b + 2]), checks_today: num(res[b + 3]),
      upgrade_clicks: num(res[b + 4]), upgrade_clicks_today: num(res[b + 5]),
      trials: num(res[b + 6]), trials_today: num(res[b + 7]),
      subs: num(res[b + 8]), subs_today: num(res[b + 9]),
    };
  });
  const total = Object.values(out).reduce((a, t) => a + t.checks, 0);
  const total_trials = Object.values(out).reduce((a, t) => a + t.trials, 0);
  const total_subs = Object.values(out).reduce((a, t) => a + t.subs, 0);
  const outbound = {};
  OUTBOUND.forEach(([site, target], i) => {
    const b = 2 + ids.length * PER + i * 2;
    outbound[`${site}:${target}`] = { clicks: num(res[b]), clicks_today: num(res[b + 1]) };
  });
  const prelaunch = {};
  const prelaunchBase = 2 + ids.length * PER + OUTBOUND.length * 2;
  PRELAUNCH.forEach((id, i) => {
    const b = prelaunchBase + i * 4;
    prelaunch[id] = {
      click_operator: num(res[b]), click_operator_today: num(res[b + 1]),
      click_manager: num(res[b + 2]), click_manager_today: num(res[b + 3]),
    };
  });
  return json({ enabled: true, generated: new Date().toISOString(), visits, total_checks: total, total_trials, total_subs, tools: out, outbound, prelaunch },
    200, { 'cache-control': 'public, max-age=300' });
}
