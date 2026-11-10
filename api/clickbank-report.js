// GET /api/clickbank-report — Vercel Cron only; stores aggregate analytics and vendor order evidence, never customer data.
import { json, fail } from './_lib/core.js';
import { offers } from './_lib/clickbank-offers.js';

const METRICS = [
  'HOP_COUNT', 'ORDER_IMPRESSION', 'SALE_COUNT', 'SALE_AMOUNT',
  'NET_SALE_AMOUNT', 'REFUND_COUNT', 'CHARGEBACK_COUNT',
  'EARNINGS_PER_HOP', 'ORDER_FORM_SALE_CONVERSION'
];
const SUM_METRICS = [
  'HOP_COUNT', 'ORDER_IMPRESSION', 'SALE_COUNT', 'SALE_AMOUNT',
  'NET_SALE_AMOUNT', 'REFUND_COUNT', 'CHARGEBACK_COUNT'
];
let fetchOverride = null;
let storeOverride = null;
let ingestOverride = null;
export const setClickBankFetchForTests = (fn) => { fetchOverride = fn; };
export const setClickBankStoreForTests = (fn) => { storeOverride = fn; };
export const setClickBankIngestForTests = (fn) => { ingestOverride = fn; };

function rowsFrom(payload) {
  const root = payload?.analyticsResult || payload?.analyticsresult || payload;
  const rows = root?.rows?.row ?? root?.rows?.rows ?? [];
  return Array.isArray(rows) ? rows : rows ? [rows] : [];
}
function ordersFrom(payload) {
  const root = payload?.orderData ?? payload?.orderdata ?? payload?.orders ?? payload;
  return Array.isArray(root) ? root : root && typeof root === 'object' ? [root] : [];
}
function lineItemsFrom(order) {
  const items = order?.lineItemData ?? order?.lineitemdata ?? [];
  return Array.isArray(items) ? items : items ? [items] : [];
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
function numberOrNull(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function emptyMetrics() { return Object.fromEntries(METRICS.map((m) => [m, 0])); }

function safeOrderRows(payload) {
  const rows = [];
  for (const order of ordersFrom(payload)) {
    const transactionType = String(order?.transactionType ?? order?.transactiontype ?? '').toUpperCase();
    if (!transactionType || transactionType.startsWith('TEST_')) continue;
    const receipt = String(order?.receipt ?? '');
    if (!receipt) continue;
    const timeRaw = order?.transactionTime ?? order?.transactiontime ?? null;
    const parsedTime = timeRaw ? new Date(timeRaw) : null;
    const transactionTime = parsedTime && !Number.isNaN(parsedTime.getTime()) ? parsedTime.toISOString() : null;
    const lineItems = lineItemsFrom(order);
    for (const item of lineItems) {
      rows.push({
        receipt,
        transaction_time: transactionTime,
        tracking_id: order?.trackingId ?? order?.trackingid ?? null,
        transaction_type: transactionType,
        total_order_amount: numberOrNull(order?.totalOrderAmount ?? order?.totalorderamount),
        currency: String(order?.currency ?? 'USD').toUpperCase().slice(0, 3),
        vendor_nickname: order?.vendor ?? null,
        affiliate_nickname: order?.affiliate ?? null,
        role: String(order?.role ?? 'AFFILIATE').toUpperCase(),
        item_no: item?.itemNo ?? item?.itemno ?? null,
        product_title: item?.productTitle ?? item?.producttitle ?? null,
        recurring: typeof item?.recurring === 'boolean' ? item.recurring : null,
        customer_amount: numberOrNull(item?.customerAmount ?? item?.customeramount),
        account_amount: numberOrNull(item?.accountAmount ?? item?.accountamount),
        quantity: numberOrNull(item?.quantity),
        line_item_type: item?.lineItemType ?? item?.lineitemtype ?? null
      });
    }
  }
  return rows;
}

async function fetchOrders(requestFetch, apiKey, account, startDate, endDate) {
  const url = new URL('https://api.clickbank.com/rest/1.3/orders2/list');
  url.searchParams.set('role', 'AFFILIATE');
  url.searchParams.set('affiliate', account);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  const rows = [];
  for (let page = 1; page <= 50; page += 1) {
    let response;
    try {
      response = await requestFetch(url, {
        headers: { Authorization: apiKey, Accept: 'application/json', Page: String(page) }
      });
    } catch {
      return { status: 'network_error', rows };
    }
    if (!response.ok) {
      return { status: response.status === 401 || response.status === 403 ? 'permission_denied' : 'upstream_error', rows };
    }
    let payload;
    try { payload = await response.json(); } catch {
      return { status: 'upstream_error', rows };
    }
    rows.push(...safeOrderRows(payload));
    if (response.status !== 206) return { status: 'ok', rows };
  }
  return { status: 'upstream_error', rows };
}

function commissionSummary(rows, apiStatus) {
  if (apiStatus !== 'ok') return { byTid: new Map(), gross: null, net: null, saleRows: null, refundRows: null, chargebackRows: null };
  const byTid = new Map();
  let gross = 0, net = 0, saleRows = 0, refundRows = 0, chargebackRows = 0;
  for (const row of rows) {
    if (row.role !== 'AFFILIATE' || row.account_amount == null) continue;
    const type = row.transaction_type;
    if (!['SALE', 'BILL', 'RFND', 'CGBK', 'FEE'].includes(type)) continue;
    const delta = ['RFND', 'CGBK', 'FEE'].includes(type) ? -Math.abs(row.account_amount) : row.account_amount;
    net += delta;
    if ((type === 'SALE' || type === 'BILL') && row.account_amount > 0) { gross += row.account_amount; saleRows += 1; }
    if (type === 'RFND') refundRows += 1;
    if (type === 'CGBK') chargebackRows += 1;
    const tid = String(row.tracking_id || '');
    if (!tid) continue;
    const current = byTid.get(tid) || { gross: 0, net: 0, saleRows: 0, refundRows: 0, chargebackRows: 0 };
    current.net += delta;
    if ((type === 'SALE' || type === 'BILL') && row.account_amount > 0) { current.gross += row.account_amount; current.saleRows += 1; }
    if (type === 'RFND') current.refundRows += 1;
    if (type === 'CGBK') current.chargebackRows += 1;
    byTid.set(tid, current);
  }
  return { byTid, gross, net, saleRows, refundRows, chargebackRows };
}

function totalMetrics(reportOffers) {
  const total = Object.fromEntries(SUM_METRICS.map((m) => [m, reportOffers.reduce((sum, o) => sum + (Number(o[m]) || 0), 0)]));
  const hops = reportOffers.reduce((sum, o) => sum + (Number(o.HOP_COUNT) || 0), 0);
  const impressions = reportOffers.reduce((sum, o) => sum + (Number(o.ORDER_IMPRESSION) || 0), 0);
  total.EARNINGS_PER_HOP = hops > 0
    ? reportOffers.reduce((sum, o) => sum + (Number(o.EARNINGS_PER_HOP) || 0) * (Number(o.HOP_COUNT) || 0), 0) / hops
    : 0;
  total.ORDER_FORM_SALE_CONVERSION = impressions > 0
    ? reportOffers.reduce((sum, o) => sum + (Number(o.ORDER_FORM_SALE_CONVERSION) || 0) * (Number(o.ORDER_IMPRESSION) || 0), 0) / impressions
    : 0;
  return total;
}

async function persistToMonad(requestFetch, report, orderRows, orderApiStatus) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const ingestSecret = process.env.MONAD_INGEST_SECRET;
  if (!supabaseUrl || !anonKey || !ingestSecret) return { status: 'not_configured' };
  const snapshots = report.offers.map((offer) => ({
    offer_slug: `clickbank-${offer.id}`,
    tracking_id: offer.trackingId,
    hop_count: offer.HOP_COUNT,
    order_impressions: offer.ORDER_IMPRESSION,
    sale_count: offer.SALE_COUNT,
    sale_amount: offer.SALE_AMOUNT,
    net_sale_amount: offer.NET_SALE_AMOUNT,
    refund_count: offer.REFUND_COUNT,
    chargeback_count: offer.CHARGEBACK_COUNT,
    earnings_per_hop: offer.EARNINGS_PER_HOP,
    order_form_sale_conversion: offer.ORDER_FORM_SALE_CONVERSION
  }));
  const payload = {
    p_period_start: report.period.startDate,
    p_period_end: report.period.endDate,
    p_order_api_status: orderApiStatus,
    p_snapshots: snapshots,
    p_orders: orderRows
  };
  try {
    const endpoint = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/monad-clickbank-ingest`;
    const init = {
      method: 'POST',
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${ingestSecret}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    };
    const response = ingestOverride
      ? await ingestOverride(payload, { endpoint, init })
      : await requestFetch(endpoint, init);
    if (!response?.ok) return { status: 'failed', httpStatus: response?.status || 0 };
    const summary = typeof response.json === 'function' ? await response.json() : response.summary || null;
    return { status: 'stored', summary };
  } catch {
    return { status: 'failed' };
  }
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
  const startDate = day(start), endDate = day(end);
  const url = new URL('https://api.clickbank.com/rest/1.3/analytics/AFFILIATE/TRACKING_ID');
  url.searchParams.set('account', account);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  for (const metric of ['DIMENSION_VALUE', ...METRICS]) url.searchParams.append('select', metric);

  const requestFetch = fetchOverride || fetch;
  let upstream;
  try {
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

  const orderResult = await fetchOrders(requestFetch, apiKey, account, startDate, endDate);
  const commissions = commissionSummary(orderResult.rows, orderResult.status);
  const reportOffers = offers.filter((o) => o.enabled).map((offer) => {
    const tid = `qw_${offer.id.replace(/-/g, '_')}`;
    const commission = commissions.byTid.get(tid);
    return {
      id: offer.id,
      title: offer.title,
      trackingId: tid,
      ...emptyMetrics(),
      ...(byTid.get(tid) || {}),
      confirmedCommission: commission ? commission.gross : (orderResult.status === 'ok' ? 0 : null),
      netCommissionAfterAdjustments: commission ? commission.net : (orderResult.status === 'ok' ? 0 : null),
      commissionTransactions: commission ? commission.saleRows : (orderResult.status === 'ok' ? 0 : null),
      refundTransactions: commission ? commission.refundRows : (orderResult.status === 'ok' ? 0 : null),
      chargebackTransactions: commission ? commission.chargebackRows : (orderResult.status === 'ok' ? 0 : null)
    };
  });
  const total = totalMetrics(reportOffers);
  total.confirmedAffiliateCommission = commissions.gross;
  total.netAffiliateCommission = commissions.net;
  total.confirmedCommissionTransactions = commissions.saleRows;
  total.refundCommissionTransactions = commissions.refundRows;
  total.chargebackCommissionTransactions = commissions.chargebackRows;

  const report = {
    generatedAt: new Date().toISOString(),
    period: { startDate, endDate },
    account,
    source: 'ClickBank Analytics API + Orders API',
    orderReconciliation: {
      status: orderResult.status,
      lineItems: orderResult.rows.length,
      confirmedCommissionTransactions: commissions.saleRows,
      refundTransactions: commissions.refundRows,
      chargebackTransactions: commissions.chargebackRows,
      confirmedAffiliateCommission: commissions.gross,
      netAffiliateCommission: commissions.net
    },
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
        commands.push(['GET', `count:quickwell:clickbank:${offer.id}:clicks:${endDate}`]);
      }
      let results;
      if (storeOverride) {
        results = await storeOverride(commands);
      } else {
        const response = await requestFetch(`${kvUrl.replace(/\/$/, '')}/pipeline`, {
          method: 'POST',
          headers: { authorization: `Bearer ${kvToken}`, 'content-type': 'application/json' },
          body: JSON.stringify(commands)
        });
        if (!response.ok) throw new Error(`kv ${response.status}`);
        results = await response.json();
      }
      report.offers = reportOffers.map((o, i) => ({
        ...o,
        quickwellOutboundClicksLifetime: Number(results[i * 2]?.result || 0),
        quickwellOutboundClicksToday: Number(results[i * 2 + 1]?.result || 0)
      }));
    } catch {
      console.error(JSON.stringify({ tag: 'qw_clickbank_report_storage_failed' }));
    }
  }

  const centralPersistence = await persistToMonad(requestFetch, report, orderResult.rows, orderResult.status);
  report.centralPersistence = centralPersistence.status;
  report.centralPersistenceSummary = centralPersistence.summary || null;
  if (kvUrl && kvToken) {
    try {
      const latestCommand = [['SET', 'report:quickwell:clickbank:latest', JSON.stringify(report)]];
      if (storeOverride) {
        await storeOverride(latestCommand);
      } else {
        const response = await requestFetch(`${kvUrl.replace(/\/$/, '')}/pipeline`, {
          method: 'POST',
          headers: { authorization: `Bearer ${kvToken}`, 'content-type': 'application/json' },
          body: JSON.stringify(latestCommand)
        });
        if (!response.ok) throw new Error(`kv ${response.status}`);
      }
    } catch {
      console.error(JSON.stringify({ tag: 'qw_clickbank_report_latest_store_failed' }));
    }
  }
  console.log(JSON.stringify({
    tag: 'qw_clickbank_daily_report',
    period: report.period,
    orderApiStatus: orderResult.status,
    offers: report.offers,
    total: report.total,
    centralPersistence: report.centralPersistence
  }));
  return json({ ok: true, report });
}

export const parseClickBankAnalyticsRows = rowsFrom;
export const parseClickBankOrderRows = safeOrderRows;
