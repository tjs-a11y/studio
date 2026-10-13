// Savings math, history, sharing text and on-device storage. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/savings.mjs';

const nf = { id: 'nf', name: 'Netflix', currency: 'USD', latest: 17.99, perYear: 12 };
const duo = { id: 'duo', name: 'Duolingo', currency: 'USD', latest: 84.99, perYear: 1 };
const gym = { id: 'gym', name: 'Gimnasio', currency: 'EUR', latest: 30, perYear: 12 };
test('per-item savings: keep, cancelled, lowered, refunded', () => {
  assert.deepEqual(S.savingFor(nf, { status: 'keep' }), { perYear: 0, oneTime: 0 });
  assert.deepEqual(S.savingFor(nf, { status: 'cancelled' }), { perYear: 215.88, oneTime: 0 });
  assert.deepEqual(S.savingFor(duo, { status: 'cancelled' }), { perYear: 84.99, oneTime: 0 });
  assert.deepEqual(S.savingFor(nf, { status: 'lowered', newPrice: 15.49 }), { perYear: 30, oneTime: 0 });
  assert.deepEqual(S.savingFor(nf, { status: 'lowered', newPrice: 20 }), { perYear: 0, oneTime: 0 }, 'a higher price is not a saving');
  assert.deepEqual(S.savingFor(nf, { status: 'lowered', newPrice: 'x' }), { perYear: 0, oneTime: 0 });
  assert.deepEqual(S.savingFor(nf, { status: 'refunded', amount: 11.99 }), { perYear: 0, oneTime: 11.99 });
  assert.deepEqual(S.savingFor(nf, { status: 'refunded', amount: -5 }), { perYear: 0, oneTime: 0 });
  assert.deepEqual(S.savingFor(nf, null), { perYear: 0, oneTime: 0 });
});
test('totals are per currency and the primary is the largest', () => {
  const tot = S.totals({ nf, duo, gym }, { nf: { status: 'cancelled' }, duo: { status: 'lowered', newPrice: 59.99 }, gym: { status: 'cancelled' }, x: { status: 'refunded', amount: 34, item: { id: 'x', currency: 'USD', latest: 34, perYear: 0 } } });
  assert.deepEqual(tot.USD, { perYear: 240.88, oneTime: 34, count: 3 });
  assert.deepEqual(tot.EUR, { perYear: 360, oneTime: 0, count: 1 });
  assert.equal(S.primaryTotal(tot).currency, 'EUR');
  assert.deepEqual(S.primaryTotal({}, 'GBP'), { currency: 'GBP', perYear: 0, oneTime: 0, count: 0 });
});
test('history: newest first, one line per item per day', () => {
  let h = S.addHistory([], nf, { status: 'lowered', newPrice: 15.49 }, '2026-10-13');
  h = S.addHistory(h, nf, { status: 'cancelled' }, '2026-10-13');
  h = S.addHistory(h, duo, { status: 'cancelled' }, '2026-10-14');
  assert.deepEqual(h.map((x) => [x.id, x.status, x.perYear]), [['duo', 'cancelled', 84.99], ['nf', 'cancelled', 215.88]]);
});
test('share text has the amount only, in both languages, and the share link carries ?ref=share-saver', () => {
  assert.equal(S.shareText('found', '$682'), 'I found $682/yr in money leaks with Quickwell Saver');
  assert.equal(S.shareText('saved', '$240'), 'I cut $240/yr in money leaks with Quickwell Saver');
  assert.equal(S.shareText('found', '682 €', 'es'), 'Encontré 682 € al año en fugas de dinero con Quickwell Saver');
  assert.equal(S.SHARE_URL, 'https://quickwell.app/saver/?ref=share-saver');
});
test('storage round-trip, and blocked storage never throws', () => {
  const mem = new Map(); const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  assert.equal(S.save({ marks: { nf: { status: 'cancelled' } }, history: [{ id: 'nf' }] }, st), true);
  assert.deepEqual(S.load(st).marks, { nf: { status: 'cancelled' } });
  S.clear(st); assert.deepEqual(S.load(st), { marks: {}, history: [], lang: null });
  const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.deepEqual(S.load(bad), { marks: {}, history: [], lang: null }); assert.equal(S.save({}, bad), false); S.clear(bad);
  mem.set('saver:v1', '{not json'); assert.deepEqual(S.load(st).marks, {});
});
