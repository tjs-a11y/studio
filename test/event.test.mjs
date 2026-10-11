// Usage counts and waitlists: never store anything without a store, never accept junk.
import test from 'node:test';
import assert from 'node:assert/strict';
const { POST: event, setStoreForTests } = await import('../api/event.js');
const post = (body) => new Request('https://studio.example/api/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('without storage: checks are accepted, waitlist refuses instead of dropping emails', async () => {
  delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL;
  assert.equal((await event(post({ tool: 'plot-file-checker', event: 'check', plots: 4 }))).status, 200);
  assert.equal((await event(post({ tool: 'plot-file-checker', event: 'waitlist', email: 'a@b.co' }))).status, 503);
});

test('with storage: counts and waitlist emails are written', async () => {
  const seen = [];
  setStoreForTests(async (...cmds) => { seen.push(...cmds); return []; });
  assert.equal((await event(post({ tool: 'plot-file-checker', event: 'check', plots: 3 }))).status, 200);
  assert.equal((await event(post({ tool: 'plot-file-checker', event: 'waitlist', email: ' Grower@Example.com ' }))).status, 200);
  assert.ok(seen.some((c) => c[0] === 'INCRBY' && c[2] === 3));
  assert.ok(seen.some((c) => c[0] === 'SADD' && c[2] === 'grower@example.com'));
  setStoreForTests(null);
});

test('junk is refused', async () => {
  assert.equal((await event(post({ tool: 'nope', event: 'check' }))).status, 400);
  assert.equal((await event(post({ tool: 'plot-file-checker', event: 'drop-table' }))).status, 400);
  setStoreForTests(async () => []);
  assert.equal((await event(post({ tool: 'plot-file-checker', event: 'waitlist', email: 'not-an-email' }))).status, 400);
  setStoreForTests(null);
});
