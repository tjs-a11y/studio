import test from 'node:test';
import assert from 'node:assert/strict';
import { GET, setClickBankFetchForTests, setClickBankStoreForTests } from '../api/clickbank-report.js';

const request = (authorization) => new Request('https://quickwell.app/api/clickbank-report', {
  method: 'GET',
  headers: authorization ? { authorization } : {}
});

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

test('ClickBank report aggregates by per-offer TID without exposing customer data', async () => {
  const previous = {
    secret: process.env.CRON_SECRET,
    key: process.env.CLICKBANK_API_KEY,
    account: process.env.CLICKBANK_ACCOUNT_NICKNAME
  };
  process.env.CRON_SECRET = 'test-cron-secret';
  process.env.CLICKBANK_API_KEY = 'API-test-key';
  process.env.CLICKBANK_ACCOUNT_NICKNAME = 'north88';
  setClickBankFetchForTests(async (url, options) => {
    assert.equal(new URL(url).pathname, '/rest/1.3/analytics/AFFILIATE/TRACKING_ID');
    assert.equal(options.headers.Authorization, 'API-test-key');
    return new Response(JSON.stringify({ analyticsResult: { rows: { row: [
      { dimensionValue: 'qw_genius_switch_original', data: [
        { attribute: 'HOP_COUNT', value: 10 },
        { attribute: 'SALE_COUNT', value: 2 },
        { attribute: 'NET_SALE_AMOUNT', value: 42.5 }
      ] }
    ] } } }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  setClickBankStoreForTests(async () => new Response(JSON.stringify([]), { status: 200 }));
  try {
    const response = await GET(request('Bearer test-cron-secret'));
    assert.equal(response.status, 200);
    const body = await response.json();
    const genius = body.report.offers.find((o) => o.id === 'genius-switch-original');
    assert.equal(genius.HOP_COUNT, 10);
    assert.equal(genius.SALE_COUNT, 2);
    assert.equal(genius.NET_SALE_AMOUNT, 42.5);
    assert.equal(body.report.total.SALE_COUNT, 2);
    assert.equal(JSON.stringify(body).includes('API-test-key'), false);
    assert.equal(JSON.stringify(body).includes('customerEmail'), false);
  } finally {
    setClickBankFetchForTests(null);
    setClickBankStoreForTests(null);
    if (previous.secret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous.secret;
    if (previous.key === undefined) delete process.env.CLICKBANK_API_KEY; else process.env.CLICKBANK_API_KEY = previous.key;
    if (previous.account === undefined) delete process.env.CLICKBANK_ACCOUNT_NICKNAME; else process.env.CLICKBANK_ACCOUNT_NICKNAME = previous.account;
  }
});
