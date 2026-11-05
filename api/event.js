// POST /api/event  { tool, event, ...}  Anonymous usage counts and opt-in waitlists for free tests.
//   event 'check'    -> adds 1 to a daily counter for the tool (no file contents, no location, no IP stored)
//   event 'waitlist' -> stores an email the visitor typed and agreed to share, for that tool's launch note only
// Storage is an Upstash Redis database connected through Vercel (KV_REST_API_URL / KV_REST_API_TOKEN).
// Without it, counts go to the server log and the waitlist says it's not open, so no email is ever silently dropped.
import { json, fail, toolById } from './_lib/core.js';

const EVENTS = new Set(['check', 'waitlist', 'outbound', 'upgrade', 'open', 'visit']);
// Sites (not billable tools) that may record anonymous outbound-link clicks or homepage visits.
const SITES = new Set(['northstar', 'quickwell']);
const OUT_TARGETS = new Set(['freightsidekick']);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,200}\.[A-Za-z]{2,24}$/;
const day = () => new Date().toISOString().slice(0, 10);

function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return async (...commands) => {
    const r = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(commands),
    });
    if (!r.ok) throw new Error(`store ${r.status}`);
    return r.json();
  };
}
let override = null;
export const setStoreForTests = (fn) => { override = fn; };

// Free tests aren't billed, so they may not be in the catalog; allow those listed in FREE_TESTS too.
const FREE_TESTS = new Set(['plot-file-checker']);
const known = (id) => !!toolById(id) || FREE_TESTS.has(id);

export async function POST(request) {
  if (Number(request.headers.get('content-length') || 0) > 2048) return fail(413, 'Too large.');
  let body; try { body = await request.json(); } catch { return fail(400, 'Bad request.'); }
  const tool = String(body.tool || ''); const event = String(body.event || '');
  if ((!known(tool) && !SITES.has(tool)) || !EVENTS.has(event)) return fail(400, 'Unknown event.');
  const run = override || store();
  if (event === 'visit') {
    // One aggregate homepage visit counter; no URL, referrer, IP, or visitor identifier is sent.
    if (tool !== 'quickwell') return fail(400, 'Unknown event.');
    if (!run) { console.log(JSON.stringify({ evt: 'visit', site: tool })); return json({ ok: true }); }
    await run(['INCR', `count:${tool}:visits`], ['INCR', `count:${tool}:visits:${day()}`]);
    return json({ ok: true });
  }
  if (event === 'open') {
    // Anonymous count of a tool page being opened; no page URL or visitor identifier is retained.
    if (!toolById(tool)) return fail(400, 'Unknown event.');
    if (!run) {
      console.log(JSON.stringify({ tag: 'qw_event_not_persisted', tool, event }));
      return json({ ok: true, stored: false });
    }
    try {
      await run(['INCR', `count:${tool}:opens`], ['INCR', `count:${tool}:opens:${day()}`]);
      return json({ ok: true, stored: true });
    } catch {
      console.error(JSON.stringify({ tag: 'qw_event_write_failed', tool, event }));
      return fail(503, 'Event could not be recorded.');
    }
  }
  if (event === 'outbound') {
    // Anonymous count of clicks from one of our sites to a partner link. No IP, no identity, no URL beyond the fixed target.
    const target = String(body.target || '');
    if (!SITES.has(tool) || !OUT_TARGETS.has(target)) return fail(400, 'Unknown event.');
    if (!run) { console.log(JSON.stringify({ evt: 'outbound', site: tool, target })); return json({ ok: true }); }
    await run(['INCR', `count:${tool}:${target}:clicks`], ['INCR', `count:${tool}:${target}:clicks:${day()}`]);
    return json({ ok: true });
  }
  if (event === 'upgrade') {
    // Anonymous count of "Unlock Pro" clicks (purchase intent) per tool. No identity; fired before Stripe checkout.
    if (!run) { console.log(JSON.stringify({ evt: 'upgrade', tool })); return json({ ok: true }); }
    await run(['INCR', `count:${tool}:upgrade_clicks`], ['INCR', `count:${tool}:upgrade_clicks:${day()}`]);
    return json({ ok: true });
  }
  if (event === 'check') {
    const n = Math.max(1, Math.min(10000, Number(body.plots) || 1));
    if (!run) {
      console.log(JSON.stringify({ tag: 'qw_event_not_persisted', tool, event }));
      return json({ ok: true, stored: false });
    }
    try {
      await run(['INCR', `count:${tool}:checks`], ['INCR', `count:${tool}:checks:${day()}`], ['INCRBY', `count:${tool}:items`, n]);
      return json({ ok: true, stored: true });
    } catch {
      console.error(JSON.stringify({ tag: 'qw_event_write_failed', tool, event }));
      return fail(503, 'Event could not be recorded.');
    }
  }
  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL.test(email)) return fail(400, 'Please enter a valid email.');
  if (!run) return fail(503, 'The waitlist is not open yet. Please try again soon.');
  await run(['SADD', `waitlist:${tool}`, email], ['HSETNX', `waitlist:${tool}:joined`, email, new Date().toISOString()]);
  return json({ ok: true });
}


