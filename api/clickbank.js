// GET /api/clickbank?id=<approved-offer-id>
// Fixed allowlist redirect: no caller-supplied destination, no open redirect, no visitor identifiers.
import { json, fail } from './_lib/core.js';
import { offerById } from './_lib/clickbank-offers.js';

const day = () => new Date().toISOString().slice(0, 10);
function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return async (...commands) => {
    const response = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(commands),
    });
    if (!response.ok) throw new Error(`store ${response.status}`);
    return response.json();
  };
}
let storeOverride = null;
let offersOverride = null;
export const setClickbankStoreForTests = (fn) => { storeOverride = fn; };
export const setClickbankOffersForTests = (list) => { offersOverride = list; };

export async function GET(request) {
  if (request.method !== 'GET') return fail(405, 'Method not allowed.');
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[a-z0-9-]{2,80}$/.test(id)) return fail(400, 'Invalid offer.');
  const list = offersOverride || null;
  const offer = list ? list.find((item) => item.id === id) : offerById(id);
  if (!offer || offer.enabled !== true) return fail(404, 'Offer not available.');
  const variant = new URL(request.url).searchParams.get('variant') || 'primary';
  if (!/^[a-z0-9-]{2,40}$/.test(variant)) return fail(400, 'Invalid offer variant.');
  const alternate = variant === 'primary' ? null : (offer.alternateDestinations || []).find((item) => item.id === variant);
  if (variant !== 'primary' && !alternate) return fail(404, 'Offer variant not available.');
  const destination = new URL(alternate ? alternate.destination : offer.destination);
  if (destination.protocol !== 'https:' || !destination.hostname) return fail(500, 'Offer destination is not configured.');

  const run = storeOverride || store();
  const date = day();
  const metricId = variant === 'primary' ? id : `${id}:${variant}`;
  if (run) {
    try {
      await run(
        ['INCR', `count:quickwell:clickbank:${metricId}:clicks`],
        ['INCR', `count:quickwell:clickbank:${metricId}:clicks:${date}`],
      );
    } catch {
      // Preserve the affiliate journey if analytics storage is temporarily unavailable.
      console.error(JSON.stringify({ tag: 'qw_clickbank_counter_failed', offer: id }));
    }
  } else {
    console.log(JSON.stringify({ tag: 'qw_clickbank_click_not_persisted', offer: id }));
  }
  return new Response(null, {
    status: 302,
    headers: {
      location: destination.toString(),
      'cache-control': 'no-store',
      'referrer-policy': 'strict-origin-when-cross-origin',
    },
  });
}
