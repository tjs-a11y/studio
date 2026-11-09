import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GET, setClickBankFetchForTests, setClickBankStoreForTests, setClickBankIngestForTests
} from '../api/clickbank-report.js';

const request = (authorization) => new Request('https://quickwell.app/api/clickbank-report', {
  method: 'GET',
  headers: authorization ? { authorization } : {}
});
const analyticsPayload = {
  analyticsResult: { rows: { row: [
    { dimensionValue: 'qw_genius_switch_original', data: [
      { attribute: 'HOP_COUNT', value: 10 },
      { attribute: 'SALE_COUNT', value: 2 },
      { attribute: 'SALE_AMOUNT', value: 50 },
      { attribute: 'NET_SALE_AMOUNT', value: 42.5 },
      { attribute: 'EARNINGS_PER_HOP', value: 4.25 },
      { attribute: 'ORDER_FORM_SALE_CONVERSION', value: 0.2 }
    ] }
  ] } }
};
const orderPayload = {
  orderData: [{
    transactionTime: '2026-11-08T12:00:00Z',
    receipt: 'CB-TEST-RECEIPT',
    trackingId: 'qw_genius_switch_original',
    transactionType: 'SALE',
    totalOrderAmount: 50,
    currency: 'USD',
    vendor: 'vendor-nickname',
    affiliate: 'north88',
    role: 'AFFILIATE',
    firstName: 'Private',
    email: 'private@example.com',
    lineItemData: [{
      itemNo: 'GS-001',
      productTitle: 'Genius Switch Original',
      recurring: false,
      customerAmount: 50,
      accountAmount: 30,
      quantity: 1,
      lineItemType: 'STANDARD'
    }]
  }]
};
function mockFetch({ ordersStatus = 200 } = {}) {
  return async (url, options) => {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith('/analytics/AFFILIATE/TRACKING_ID')) {
      assert.equal(options.headers.Authorization, 'API-test-key');
      return new Response(JSON.stringify(analyticsPayload), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (pathname.endsWith('/orders2/list')) {
      assert.equal(options.headers.Authorization, 'API-test-key');
      assert.equal(options.headers.Page, '1');
      assert.equal(new URL(url).searchParams.get('role'), 'AFFILIATE');
      return new Response(JSON.stringify(orderPayload), { status: ordersStatus, headers: { 'content-type': 'application/json' } });
    }
    throw new Error('Unexpected upstream URL');
  };
}

test('ClickBank report is private to the scheduled job', async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'test-cron-secret';
  try {
    assert.equal((await GET(request())).status, 401);
    assert.equal((await GET(request('Bearer wrong'))).status, 401);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous;
  }
});

test('ClickBank report separates analytics sales from confirmed affiliate account amounts and excludes customer PII', async () => {
  const previous = {
    secret: process.env.CRON_SECRET,
    key: process.env.CLICKBANK_API_KEY,
    account: process.env.CLICKBANK_ACCOUNT_NICKNAME,
    supabaseUrl: process.env.SUPABASE_URL,
    anon: process.env.SUPABASE_ANON_KEY,
    ingest: process.env.MONAD_INGEST_SECRET
  };
  process.env.CRON_SECRET = 'test-cron-secret';
  process.env.CLICKBANK_API_KEY = 'API-test-key';
  process.env.CLICKBANK_ACCOUNT_NICKNAME = 'north88';
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.MONAD_INGEST_SECRET;
  setClickBankFetchForTests(mockFetch());
  setClickBankStoreForTests(async () => []);
  try {
    const response = await GET(request('Bearer test-cron-secret'));
    assert.equal(response.status, 200);
    const body = await response.json();
    const genius = body.report.offers.find((o) => o.id === 'genius-switch-original');
    assert.equal(genius.HOP_COUNT, 10);
    assert.equal(genius.SALE_COUNT, 2);
    assert.equal(genius.NET_SALE_AMOUNT, 42.5);
    assert.equal(genius.confirmedCommission, 30);
    assert.equal(genius.netCommissionAfterAdjustments, 30);
    assert.equal(genius.commissionTransactions, 1);
    assert.equal(body.report.total.SALE_COUNT, 2);
    assert.equal(body.report.total.confirmedAffiliateCommission, 30);
    assert.equal(body.report.total.netAffiliateCommission, 30);
    assert.equal(body.report.orderReconciliation.status, 'ok');
    assert.equal(body.report.centralPersistence, 'not_configured');
    assert.equal(JSON.stringify(body).includes('API-test-key'), false);
    assert.equal(JSON.stringify(body).includes('private@example.com'), false);
    assert.equal(JSON.stringify(body).includes('Private'), false);
  } finally {
    setClickBankFetchForTests(null);
    setClickBankStoreForTests(null);
    if (previous.secret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous.secret;
    if (previous.key === undefined) delete process.env.CLICKBANK_API_KEY; else process.env.CLICKBANK_API_KEY = previous.key;
    if (previous.account === undefined) delete process.env.CLICKBANK_ACCOUNT_NICKNAME; else process.env.CLICKBANK_ACCOUNT_NICKNAME = previous.account;
    if (previous.supabaseUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previous.supabaseUrl;
    if (previous.anon === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = previous.anon;
    if (previous.ingest === undefined) delete process.env.MONAD_INGEST_SECRET; else process.env.MONAD_INGEST_SECRET = previous.ingest;
  }
});

test('Analytics sales do not become commissions when Orders API access is denied', async () => {
  const previous = { secret: process.env.CRON_SECRET, key: process.env.CLICKBANK_API_KEY };
  process.env.CRON_SECRET = 'test-cron-secret';
  process.env.CLICKBANK_API_KEY = 'API-test-key';
  setClickBankFetchForTests(mockFetch({ ordersStatus: 403 }));
  setClickBankStoreForTests(async () => []);
  try {
    const response = await GET(request('Bearer test-cron-secret'));
    const body = await response.json();
    const genius = body.report.offers.find((o) => o.id === 'genius-switch-original');
    assert.equal(genius.SALE_COUNT, 2);
    assert.equal(genius.confirmedCommission, null);
    assert.equal(body.report.total.confirmedAffiliateCommission, null);
    assert.equal(body.report.orderReconciliation.status, 'permission_denied');
  } finally {
    setClickBankFetchForTests(null);
    setClickBankStoreForTests(null);
    if (previous.secret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous.secret;
    if (previous.key === undefined) delete process.env.CLICKBANK_API_KEY; else process.env.CLICKBANK_API_KEY = previous.key;
  }
});

test('ClickBank report sends privacy-filtered snapshots and orders to the MONAD reconciliation RPC', async () => {
  const previous = {
    secret: process.env.CRON_SECRET,
    key: process.env.CLICKBANK_API_KEY,
    url: process.env.SUPABASE_URL,
    anon: process.env.SUPABASE_ANON_KEY,
    ingest: process.env.MONAD_INGEST_SECRET
  };
  process.env.CRON_SECRET = 'test-cron-secret';
  process.env.CLICKBANK_API_KEY = 'API-test-key';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'public-anon-test-key';
  process.env.MONAD_INGEST_SECRET = 'server-only-ingest-test-secret-123456789';
  let captured;
  let capturedRequest;
  setClickBankFetchForTests(mockFetch());
  setClickBankStoreForTests(async () => []);
  setClickBankIngestForTests(async (payload, requestOptions) => {
    captured = payload;
    capturedRequest = requestOptions;
    return new Response(JSON.stringify({ batch_id: 'batch-test', commission_records_imported: 1 }), { status: 200 });
  });
  try {
    const response = await GET(request('Bearer test-cron-secret'));
    const body = await response.json();
    assert.equal(body.report.centralPersistence, 'stored');
    assert.equal(body.report.centralPersistenceSummary.batch_id, 'batch-test');
    assert.equal('p_secret' in captured, false);
    assert.equal(capturedRequest.endpoint, 'https://example.supabase.co/functions/v1/monad-clickbank-ingest');
    assert.equal(capturedRequest.init.headers['x-monad-ingest-secret'], 'server-only-ingest-test-secret-123456789');
    assert.equal(captured.p_order_api_status, 'ok');
    assert.equal(captured.p_snapshots.find((s) => s.offer_slug === 'clickbank-genius-switch-original').tracking_id, 'qw_genius_switch_original');
    assert.equal(captured.p_orders[0].account_amount, 30);
    assert.equal('email' in captured.p_orders[0], false);
    assert.equal('firstName' in captured.p_orders[0], false);
    assert.equal(JSON.stringify(body).includes('server-only-ingest-test-secret-123456789'), false);
  } finally {
    setClickBankFetchForTests(null);
    setClickBankStoreForTests(null);
    setClickBankIngestForTests(null);
    if (previous.secret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous.secret;
    if (previous.key === undefined) delete process.env.CLICKBANK_API_KEY; else process.env.CLICKBANK_API_KEY = previous.key;
    if (previous.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previous.url;
    if (previous.anon === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = previous.anon;
    if (previous.ingest === undefined) delete process.env.MONAD_INGEST_SECRET; else process.env.MONAD_INGEST_SECRET = previous.ingest;
  }
});
