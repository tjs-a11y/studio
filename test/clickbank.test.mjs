import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as redirect, setClickbankStoreForTests, setClickbankOffersForTests } from '../api/clickbank.js';
import { GET as catalog } from '../api/clickbank-catalog.js';

const request = (url) => new Request(url, { method: 'GET' });

test('unknown and draft offers never redirect', async () => {
  setClickbankStoreForTests(async () => []);
  assert.equal((await redirect(request('https://quickwell.app/api/clickbank?id=not-real'))).status, 404);
  assert.equal((await redirect(request('https://quickwell.app/api/clickbank?id=phytomem-one'))).status, 404);
  assert.equal((await redirect(request('https://quickwell.app/api/clickbank?id=bad%2Fid'))).status, 400);
  setClickbankStoreForTests(null);
});

test('approved offer redirects only to its fixed HTTPS destination and records aggregate counters', async () => {
  const commands = [];
  setClickbankOffersForTests([{ id: 'sample-offer', enabled: true, destination: 'https://vendor.example/offer?hopId=fixed' }]);
  setClickbankStoreForTests(async (...items) => { commands.push(...items); return []; });
  const response = await redirect(request('https://quickwell.app/api/clickbank?id=sample-offer'));
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://vendor.example/offer?hopId=fixed');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(commands.some((item) => item[0] === 'INCR' && item[1] === 'count:quickwell:clickbank:sample-offer:clicks'));
  assert.ok(commands.some((item) => item[0] === 'INCR' && item[1].startsWith('count:quickwell:clickbank:sample-offer:clicks:')));
  assert.ok(commands.every((item) => item.length === 2 && item[1].startsWith('count:')));
  setClickbankStoreForTests(null);
  setClickbankOffersForTests(null);
});

test('analytics outage does not break a valid affiliate redirect', async () => {
  setClickbankOffersForTests([{ id: 'sample-offer', enabled: true, destination: 'https://vendor.example/offer' }]);
  setClickbankStoreForTests(async () => { throw new Error('backend details must not leak'); });
  const oldError = console.error;
  console.error = () => {};
  try {
    const response = await redirect(request('https://quickwell.app/api/clickbank?id=sample-offer'));
    assert.equal(response.status, 302);
  } finally {
    console.error = oldError;
    setClickbankStoreForTests(null);
    setClickbankOffersForTests(null);
  }
});

test('public catalog exposes only the first reviewed offer without leaking HopLinks', async () => {
  const response = await catalog(request('https://quickwell.app/api/clickbank-catalog'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.offers.map((offer) => offer.id), ['genius-switch-original']);
  assert.match(body.offers[0].summary, /audio-based personal development series/i);
  assert.equal(JSON.stringify(body).includes('hopId='), false);
  assert.match(body.affiliateDisclosure, /commission/);
});
