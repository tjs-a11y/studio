// Deal desk API (private tool for the owner's off-market deals; pages under /deals/, all noindex).
//   POST ?a=submit&k=<link key>  broker pastes a deal email            -> parsed, priced, stored as "new"
//   POST ?a=join                 investor signs up with a buy box        -> stored with consent
//   GET  ?a=deal&id=             investor view of an approved deal      -> never the purchase price or spread
//   POST ?a=interest&id=         investor says "I'm in"                 -> queued for the owner, first come first served
//   admin (header x-admin-key = DEALS_ADMIN_KEY): ?a=admin (deals, investors, interest), ?a=update, ?a=config
// Storage: the Upstash Redis database connected through Vercel. Money never moves through this tool:
// earnest money goes from the investor to the closing attorney's escrow.
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { json, fail } from './_lib/core.js';
import { parseDeal, underwrite, publicDeal, matches, COUNTIES } from './_lib/deals-core.js';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,200}\.[A-Za-z]{2,24}$/;
const TYPES = ['flip', 'rental', 'teardown'];

function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return async (...commands) => {
    const r = await fetch(`${url.replace(/\/$/, '')}/pipeline`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(commands) });
    if (!r.ok) throw new Error(`store ${r.status}`);
    return (await r.json()).map((x) => x.result);
  };
}
let override = null;
export const setDealStoreForTests = (fn) => { override = fn; };
const db = () => override || store();

const adminKey = () => process.env.DEALS_ADMIN_KEY || '';
export const submitKey = () => (adminKey() ? createHmac('sha256', adminKey()).update('deal-desk-submit').digest('hex').slice(0, 24) : '');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && x.length > 0 && timingSafeEqual(x, y); };
const isAdmin = (req) => adminKey().length >= 12 && same(req.headers.get('x-admin-key') || '', adminKey());
const newId = () => randomBytes(6).toString('base64url');
const clean = (s, n = 200) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const cleanText = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, n);
const parse = (s) => { try { return JSON.parse(s); } catch { return null; } };

async function body(req, max = 20000) {
  if (Number(req.headers.get('content-length') || 0) > max) return null;
  try { return await req.json(); } catch { return null; }
}
async function loadList(run, list, prefix, n = 200) {
  const [ids] = await run(['LRANGE', list, 0, n - 1]);
  if (!ids?.length) return [];
  const [vals] = await run(['MGET', ...ids.map((id) => prefix + id)]);
  return vals.map(parse).filter(Boolean);
}

export async function GET(req) {
  const u = new URL(req.url); const a = u.searchParams.get('a');
  const run = db(); if (!run) return fail(503, 'Not set up yet.');
  if (a === 'deal') {
    const [raw] = await run(['GET', 'deal:' + clean(u.searchParams.get('id'), 20)]);
    const deal = parse(raw);
    if (!deal || !['sent', 'locked'].includes(deal.status)) return fail(404, 'This deal is not available.');
    return json(publicDeal(deal), 200, { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });
  }
  if (a === 'counties') return json({ counties: COUNTIES });
  if (!isAdmin(req)) return fail(401, 'Wrong password.');
  if (a === 'config') return json({ submitPath: `/deals/submit/?k=${submitKey()}` });
  if (a === 'admin') {
    const deals = await loadList(run, 'deals', 'deal:');
    const investors = await loadList(run, 'investors', 'investor:', 2000);
    const interest = {};
    for (const d of deals) { const [list] = await run(['LRANGE', 'interest:' + d.id, 0, 99]); interest[d.id] = (list || []).map(parse).filter(Boolean); }
    return json({ deals: deals.map((d) => ({ ...d, matched: matches(d, investors).map((i) => i.id) })), investors, interest }, 200, { 'cache-control': 'no-store' });
  }
  return fail(400, 'Unknown action.');
}

export async function POST(req) {
  const u = new URL(req.url); const a = u.searchParams.get('a');
  const run = db(); if (!run) return fail(503, 'Not set up yet.');

  if (a === 'submit') {
    if (!submitKey() || !same(u.searchParams.get('k') || '', submitKey())) return fail(401, 'This link is not valid.');
    const b = await body(req); const text = cleanText(b?.text, 15000);
    if (text.length < 40) return fail(400, 'Paste the whole deal email.');
    const parsed = parseDeal(text);
    if (!parsed.address || !parsed.price) return fail(400, 'Could not find the address and price. Paste the full email, please.');
    const deal = { id: newId(), createdAt: new Date().toISOString(), status: 'new', raw: text, parsed, uw: underwrite(parsed), photos: clean(b?.photos, 500) || null };
    await run(['SET', 'deal:' + deal.id, JSON.stringify(deal)], ['LPUSH', 'deals', deal.id]);
    return json({ ok: true, address: parsed.address });
  }

  if (a === 'join') {
    const b = await body(req, 4000); if (!b) return fail(400, 'Bad request.');
    const inv = {
      id: newId(), createdAt: new Date().toISOString(), name: clean(b.name, 80), company: clean(b.company, 120), email: clean(b.email, 254).toLowerCase(), phone: clean(b.phone, 30),
      counties: (Array.isArray(b.counties) ? b.counties : []).filter((c) => COUNTIES.includes(c)),
      types: (Array.isArray(b.types) ? b.types : []).filter((t) => TYPES.includes(t)),
      maxPrice: Math.max(0, Math.min(5e6, Number(b.maxPrice) || 0)) || null, closeDays: Math.max(0, Math.min(90, Number(b.closeDays) || 0)) || null,
      cash: !!b.cash, consent: b.consent === true,
    };
    if (!inv.name || !EMAIL.test(inv.email)) return fail(400, 'Name and a valid email, please.');
    if (!inv.consent) return fail(400, 'Please tick the box so we can email you deals.');
    const [exists] = await run(['SET', 'investor-email:' + inv.email, inv.id, 'NX']);
    if (exists === null) return json({ ok: true, again: true });
    await run(['SET', 'investor:' + inv.id, JSON.stringify(inv)], ['LPUSH', 'investors', inv.id]);
    return json({ ok: true });
  }

  if (a === 'interest') {
    const id = clean(u.searchParams.get('id'), 20);
    const [raw] = await run(['GET', 'deal:' + id]); const deal = parse(raw);
    if (!deal || deal.status !== 'sent') return fail(404, 'This deal is no longer available.');
    const b = await body(req, 4000); if (!b) return fail(400, 'Bad request.');
    const r = { at: new Date().toISOString(), name: clean(b.name, 80), company: clean(b.company, 120), email: clean(b.email, 254).toLowerCase(), phone: clean(b.phone, 30), pof: clean(b.pof, 300), emdOk: b.emdOk === true, price: deal.uw.investorPrice };
    if (!r.name || !EMAIL.test(r.email) || !r.phone) return fail(400, 'Name, email and phone, please.');
    if (!r.emdOk) return fail(400, 'Please confirm the earnest money terms.');
    const [n] = await run(['RPUSH', 'interest:' + id, JSON.stringify(r)]);
    return json({ ok: true, place: n });
  }

  if (!isAdmin(req)) return fail(401, 'Wrong password.');
  if (a === 'update') {
    const b = await body(req); const id = clean(b?.id, 20);
    const [raw] = await run(['GET', 'deal:' + id]); const deal = parse(raw);
    if (!deal) return fail(404, 'No such deal.');
    const o = {};
    if (b.purchase != null) o.purchase = Number(b.purchase) || deal.parsed.price;
    if (b.investorPrice != null) o.investorPrice = Number(b.investorPrice) || undefined; // 0/blank = use the suggested price
    if (b.parsed && typeof b.parsed === 'object') for (const k of ['arv', 'rent', 'sqft', 'kind', 'rehab', 'county']) if (b.parsed[k] != null && b.parsed[k] !== '') deal.parsed[k] = ['arv', 'rent', 'sqft'].includes(k) ? Number(b.parsed[k]) || deal.parsed[k] : String(b.parsed[k]);
    deal.overrides = { ...(deal.overrides || {}), ...o };
    deal.uw = underwrite(deal.parsed, undefined, deal.overrides);
    if (['new', 'sent', 'locked', 'dead'].includes(b.status)) deal.status = b.status;
    if (b.photos != null) deal.photos = clean(b.photos, 500) || null;
    if (b.respondBy != null) deal.respondBy = clean(b.respondBy, 60) || null;
    if (b.publicNote != null) deal.publicNote = clean(b.publicNote, 400) || null;
    await run(['SET', 'deal:' + id, JSON.stringify(deal)]);
    return json({ ok: true, deal });
  }
  return fail(400, 'Unknown action.');
}
