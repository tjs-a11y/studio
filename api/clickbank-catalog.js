// GET /api/clickbank-catalog — only explicitly enabled offers are visible to the public.
import { json } from './_lib/core.js';
import { offers, publicOffer } from './_lib/clickbank-offers.js';

export async function GET(request) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, { allow: 'GET' });
  const published = offers.filter((offer) => offer.enabled === true).map(publicOffer);
  return json({
    offers: published,
    affiliateDisclosure: 'Quickwell may earn a commission if you purchase through a link. This does not change your price.',
  }, 200, { 'cache-control': 'public, max-age=60, stale-while-revalidate=300' });
}
