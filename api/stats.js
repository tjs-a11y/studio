// GET /api/stats  — anonymous, aggregate usage counts per tool, so the growth scoreboard can read them.
// No personal data: only the integer counters that /api/event increments (count:<tool>:checks[:YYYY-MM-DD]).
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
  const cmds = ids.flatMap((id) => [['GET', `count:${id}:checks`], ['GET', `count:${id}:checks:${today}`]]);
  let res;
  try { res = await run(cmds); } catch { return json({ enabled: true, error: 'unavailable' }, 200); }
  const num = (v) => { const n = Number(v && typeof v === 'object' && 'result' in v ? v.result : v); return Number.isFinite(n) ? n : 0; };
  const out = {};
  ids.forEach((id, i) => { out[id] = { checks: num(res[i * 2]), checks_today: num(res[i * 2 + 1]) }; });
  const total = Object.values(out).reduce((a, t) => a + t.checks, 0);
  return json({ enabled: true, generated: new Date().toISOString(), total_checks: total, tools: out },
    200, { 'cache-control': 'public, max-age=300' });
}
