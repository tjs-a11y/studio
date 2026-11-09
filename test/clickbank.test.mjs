import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as redirect, setClickbankStoreForTests, setClickbankOffersForTests } from '../api/clickbank.js';
import { GET as catalog } from '../api/clickbank-catalog.js';

const request = (url) => new Request(url, { method: 'GET' });

test('unknown and draft offers never redirect', async () => {
  setClickbankStoreForTests(async () => []);
  assert.equal((await redirect(request('https://quickwell.app/api/clickbank?id=not-real'))).status, 404);
  assert.equal((await redirect(request('https://quickwell.app/api/clickbank?id=not-a-real-offer'))).status, 404);
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

test('public catalog exposes all eight enabled offers without leaking HopLinks', async () => {
  const response = await catalog(request('https://quickwell.app/api/clickbank-catalog'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.offers.length, 8);
  assert.deepEqual(new Set(body.offers.map((offer) => offer.id)), new Set([
    'shifting-vibrations-manifest',
    'energy-revolution-system',
    'phytomem-one',
    'water-freedom-system',
    'genius-switch-original',
    'prodentim',
    'ted-plans-diy',
    'audisoothe'
  ]));
  assert.ok(body.offers.every((offer) => offer.summary && offer.disclosure.includes('commission')));
  assert.equal(JSON.stringify(body).includes('hopId='), false);
  assert.match(body.affiliateDisclosure, /commission/);
  assert.match(body.offers.find((offer) => offer.id === 'phytomem-one').summary, /does not make medical/i);
  assert.match(body.offers.find((offer) => offer.id === 'water-freedom-system').summary, /does not represent this guide as a ready-made device/i);
});
