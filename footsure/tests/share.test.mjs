import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptPayload, decryptPayload, sharePayload, unpackShare, buildShareUrl, tokenFromHash, toB64url, fromB64url } from '../js/share.mjs';

const person = { id: 'secret-id-123', label: 'Mom', sex: 'female', who: 'someone' };
const checks = [
  { id: 'c1', personId: 'secret-id-123', date: '2026-09-13T15:00:00.000Z', age: 74, sex: 'female', stands: 11, armsUsed: false, balanceStages: 4, tugSeconds: 10.2, mode: 'camera' },
  { id: 'c2', personId: 'secret-id-123', date: '2026-10-13T15:00:00.000Z', age: 74, sex: 'female', stands: 9, armsUsed: true, balanceStages: 2, tugSeconds: 12.4, mode: 'manual' },
];

test('base64url round trip', () => {
  const b = new Uint8Array([0, 1, 250, 251, 252, 253, 254, 255]);
  assert.deepEqual(fromB64url(toB64url(b)), b);
  assert.match(toB64url(b), /^[A-Za-z0-9_-]+$/);
});

test('share link: encrypt → URL → decrypt round trip', async () => {
  const token = await encryptPayload(sharePayload(person, checks));
  const url = buildShareUrl('https://quickwell.app/footsure/?ref=x#old', token);
  assert.ok(url.startsWith('https://quickwell.app/footsure/#s=v1.'));
  const back = unpackShare(await decryptPayload(tokenFromHash(new URL(url).hash)));
  assert.equal(back.person.label, 'Mom');
  assert.equal(back.checks.length, 2);
  assert.deepEqual(back.checks.map((c) => [c.date, c.age, c.stands, c.armsUsed, c.balanceStages, c.tugSeconds]),
    checks.map((c) => [c.date, c.age, c.stands, c.armsUsed, c.balanceStages, c.tugSeconds]));
});

test('share link: data is encrypted and carries no ids', async () => {
  const p = sharePayload(person, checks);
  assert.ok(!JSON.stringify(p).includes('secret-id-123'));
  const token = await encryptPayload(p);
  const ct = token.split('.')[3];
  assert.ok(!Buffer.from(fromB64url(ct)).toString('latin1').includes('Mom'));
  const t2 = await encryptPayload(p);
  assert.notEqual(token, t2, 'fresh key and IV each time');
});

test('share link: tampering, truncation and wrong keys are rejected', async () => {
  const token = await encryptPayload(sharePayload(person, checks));
  const [v, k, iv, ct] = token.split('.');
  const flip = ct.slice(0, 5) + (ct[5] === 'A' ? 'B' : 'A') + ct.slice(6);
  await assert.rejects(decryptPayload([v, k, iv, flip].join('.')), /changed or cut off/);
  await assert.rejects(decryptPayload([v, k, iv, ct.slice(0, -4)].join('.')), /changed or cut off/);
  const other = (await encryptPayload({ x: 1 })).split('.')[1];
  await assert.rejects(decryptPayload([v, other, iv, ct].join('.')), /changed or cut off/);
  await assert.rejects(decryptPayload('v2.a.b.c'), /not complete/);
  await assert.rejects(decryptPayload(''), /not complete/);
  assert.equal(tokenFromHash('#nothing'), null);
});
