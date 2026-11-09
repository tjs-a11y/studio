// GET /api/clickbank-report — Vercel Cron only; returns aggregated affiliate performance, never customer data.
import { json, fail } from './_lib/core.js';
import { offers } from './_lib/clickbank-offers.js';

const METRICS = [
  'HOP_COUNT', 'ORDER_IMPRESSION', 'SALE_COUNT', 'SALE_AMOUNT',
  'NET_SALE_AMOUNT', 'REFUND_COUNT', 'CHARGEBACK_COUNT',
  'EARNINGS_PER_HOP', 'ORDER_FORM_SALE_CONVERSION'
];
let fetchOverride = null;
let storeOverride = null;
export const setClickBankFetchForTests = (fn) => { fetchOverride = fn; };
export const setClickBankStoreForTests = (fn) => { storeOverride = fn; };

function rowsFrom(payload) {
  const root = payload?.analyticsResult || payload?.analyticsresult || payload;
  const rows = root?.rows?.row ?? root?.rows?.rows ?? [];
  return Array.isArray(rows) ? rows : rows ? [rows] : [];
}
function metricMap(row) {
  const out = {};
  const data = Array.isArray(row?.data) ? row.data : row?.data ? [row.data] : [];
  for (const item of data) {
    const key = typeof item?.attribute === 'string' ? item.attribute : item?.attribute?.name;
    if (key) out[key] = item.value == null ? 0 : Number(item.value);
  }
  return out;
}
function day(d) { return d.toISOString().slice(0, 10); }
function emptyMetrics() {
  return Object.fromEntries(METRICS.map((m) => [m, 0]));
}

export async function GET(request) {
  if (request.method !== 'GET') return fail(405, 'Method not allowed.');
  const secret = process.env.CRON_SECRET;
  if (!secret) return fail(503, 'Reporting schedule is not configured.');
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return fail(401, 'Unauthorized.');
  const apiKey = process.env.CLICKBANK_API_KEY;
  const account = process.env.CLICKBANK_ACCOUNT_NICKNAME || 'north88';
  if (!apiKey) return fail(503, 'ClickBank API key is not configured.');

  const end = new Date();
  const start = new Date(end.getTime() - 29 * 86400000);
  const url = new URL('https://api.clickbank.com/rest/1.3/analytics/AFFILIATE/TRACKING_ID');
  url.searchParams.set('account', account);
  url.searchParams.set('startDate', day(start));
  url.searchParams.set('endDate', day(end));
  for (const metric of ['DIMENSION_VALUE', ...METRICS]) url.searchParams.append('select', metric);

  let upstream;
  try {
    const requestFetch = fetchOverride || fetch;
    upstream = await requestFetch(url, { headers: { Authorization: apiKey, Accept: 'application/json' } });
  } catch {
    console.error(JSON.stringify({ tag: 'qw_clickbank_report_error', reason: 'upstream_unreachable' }));
    return fail(502, 'ClickBank reporting service could not be reached.');
  }
  if (!upstream.ok) {
    console.error(JSON.stringify({ tag: 'qw_clickbank_report_error', reason: 'upstream_status', status: upstream.status }));
    return fail(502, upstream.status === 401 || upstream.status === 403
      ? 'ClickBank API rejected the key or its Analytics permission.'
      : 'ClickBank reporting service returned an error.');
  }

  let payload;
  try { payload = await upstream.json(); }
  catch { return fail(502, 'ClickBank returned an unreadable report.'); }

  const byTid = new Map();
  for (const row of rowsFrom(payload)) {
    const tid = String(row?.dimensionValue ?? row?.dimensionvalue ?? '');
    if (tid) byTid.set(tid, metricMap(row));
  }
  const reportOffers = offers.filter((o) => o.enabled).map((offer) => {
    const tid = `qw_${offer.id.replace(/-/g, '_')}`;
    return { id: offer.id, title: offer.title, trackingId: tid, ...emptyMetrics(), ...(byTid.get(tid) || {}) };
  });
  const total = Object.fromEntries(METRICS.map((m) => [m, reportOffers.reduce((sum, o) => sum + (Number(o[m]) || 0), 0)]));
  const report = {
    generatedAt: new Date().toISOString(),
    period: { startDate: day(start), endDate: day(end) },
    account,
    source: 'ClickBank Analytics API',
    offers: reportOffers,
    total
  };

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (kvUrl && kvToken) {
    try {
      const commands = [];
      for (const offer of reportOffers) {
        commands.push(['GET', `count:quickwell:clickbank:${offer.id}:clicks`]);
        commands.push(['GET', `count:quickwell:clickbank:${offer.id}:clicks:${day(end)}`]);
      }
      commands.push(['SET', 'report:quickwell:clickbank:latest', JSON.stringify(report)]);
      const requestFetch = fetchOverride || fetch;
      const response = await requestFetch(`${kvUrl.replace(/\/$/, '')}/pipeline`, {
        method: 'POST',
        headers: { authorization: `Bearer ${kvToken}`, 'content-type': 'application/json' },
        body: JSON.stringify(commands)
      });
      if (response.ok) {
        const results = await response.json();
        report.offers = reportOffers.map((o, i) => ({
          ...o,
          quickwellOutboundClicksLifetime: Number(results[i * 2]?.result || 0),
          quickwellOutboundClicksToday: Number(results[i * 2 + 1]?.result || 0)
        }));
      } else console.error(JSON.stringify({ tag: 'qw_clickbank_report_storage_failed', status: response.status }));
    } catch {
      console.error(JSON.stringify({ tag: 'qw_clickbank_report_storage_failed' }));
    }
  }

  console.log(JSON.stringify({ tag: 'qw_clickbank_daily_report', period: report.period, offers: report.offers, total: report.total }));
  return json({ ok: true, report });
}

export const parseClickBankAnalyticsRows = rowsFrom;
