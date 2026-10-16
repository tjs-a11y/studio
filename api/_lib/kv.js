// Minimal Redis-over-REST client for Vercel KV / Upstash (no SDK, no dependencies).
// Env (either naming works): KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
// Every call has a hard timeout. On any failure the caller gets `null` and falls back to Stripe, the source
// of truth: a cache outage can make access slower, never wrongly granted.
const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const TIMEOUT_MS = 400;

let override = null; // tests inject an in-memory store
export const setKvForTests = (store) => { override = store; };
export const kvEnabled = () => !!override || !!(url() && token());

async function command(args) {
  if (!override && (!url() || !token())) return null;
  try {
    if (override) return await override.command(args);
    const r = await fetch(url(), {
      method: 'POST',
      headers: { authorization: `Bearer ${token()}`, 'content-type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j && 'result' in j ? j.result : null;
  } catch {
    return null;
  }
}

// Returns the parsed JSON value, or null when missing / unreachable / corrupt.
export async function kvGetJson(key) {
  const raw = await command(['GET', key]);
  if (typeof raw !== 'string') return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Writes a JSON value with a TTL in seconds. Returns true on success.
export async function kvSetJson(key, value, ttlSeconds) {
  const ttl = Math.max(60, Math.floor(ttlSeconds));
  return (await command(['SET', key, JSON.stringify(value), 'EX', String(ttl)])) === 'OK';
}

// In-memory store with the same command surface (tests and local development).
export function memoryKv() {
  const m = new Map();
  return {
    m,
    async command([op, key, value, , ttl]) {
      if (op === 'GET') {
        const e = m.get(key);
        if (!e || e.exp < Date.now()) { m.delete(key); return null; }
        return e.v;
      }
      if (op === 'SET') { m.set(key, { v: value, exp: Date.now() + Number(ttl) * 1000 }); return 'OK'; }
      return null;
    },
  };
}
