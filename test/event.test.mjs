// Usage counts and waitlists: never store anything without a store, never accept junk.
import test from 'node:test';
import assert from 'node:assert/strict';
const { POST: event, setStoreForTests } = await import('../api/event.js');
const post = (body) => new Request('https://studio.example/api/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('without storage: checks are accepted, waitlist refuses instead of dropping emails', async () => {
  delete process.env.KV_REST_API_URL; delete process.env.UPSTASH_REDIS_REST_URL;
  const response = await event(post({ tool: 'plot-file-checker', event: 'check', plots: 4 }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, stored: false });
  assert.equal((await event(post({ tool: 'plot-file-checker', event: 'waitlist', email: 'a@b.co' }))).status, 503);
});

test('with storage: counts and waitlist emails are written', async () => {
  const seen = [];
  setStoreForTests(async (...cmds) => { seen.push(...cmds); return []; });
  const checkResponse = await event(post({ tool: 'plot-file-checker', event: 'check', plots: 3 }));
  assert.equal(checkResponse.status, 200);
  assert.deepEqual(await checkResponse.json(), { ok: true, stored: true });
  assert.equal((await event(post({ tool: 'plot-file-checker', event: 'waitlist', email: ' Grower@Example.com ' }))).status, 200);
  assert.ok(seen.some((c) => c[0] === 'INCRBY' && c[2] === 3));
  assert.ok(seen.some((c) => c[0] === 'SADD' && c[2] === 'grower@example.com'));
  setStoreForTests(null);
});

test('outbound clicks: a known site+target is counted, junk is refused, no PII is stored', async () => {
  const seen = [];
  setStoreForTests(async (...cmds) => { seen.push(...cmds); return []; });
  assert.equal((await event(post({ tool: 'northstar', event: 'outbound', target: 'freightsidekick' }))).status, 200);
  assert.ok(seen.some((c) => c[0] === 'INCR' && c[1] === 'count:northstar:freightsidekick:clicks'));
  // every stored field is a fixed counter key — nothing visitor-specific
  assert.ok(seen.every((c) => typeof c[1] === 'string' && c[1].startsWith('count:')));
  assert.equal((await event(post({ tool: 'northstar', event: 'outbound', target: 'evil.example' }))).status, 400);
  assert.equal((await event(post({ tool: 'notasite', event: 'outbound', target: 'freightsidekick' }))).status, 400);
  setStoreForTests(null);
});

test('junk is refused', async () => {
  assert.equal((await event(post({ tool: 'nope', event: 'check' }))).status, 400);
  assert.equal((await event(post({ tool: 'plot-file-checker', event: 'drop-table' }))).status, 400);
  setStoreForTests(async () => []);
  assert.equal((await event(post({ tool: 'plot-file-checker', event: 'waitlist', email: 'not-an-email' }))).status, 400);
  setStoreForTests(null);
});

test('homepage visits and tool opens use anonymous aggregate counters', async () => {
  const seen = [];
  setStoreForTests(async (...cmds) => { seen.push(...cmds); return []; });
  assert.equal((await event(post({ tool: 'quickwell', event: 'visit' }))).status, 200);
  const openResponse = await event(post({ tool: 'shield', event: 'open' }));
  assert.equal(openResponse.status, 200);
  assert.deepEqual(await openResponse.json(), { ok: true, stored: true });
  assert.ok(seen.some((c) => c[0] === 'INCR' && c[1] === 'count:quickwell:visits'));
  assert.ok(seen.some((c) => c[0] === 'INCR' && c[1] === 'count:shield:opens'));
  assert.ok(seen.every((c) => typeof c[1] === 'string' && c[1].startsWith('count:')));
  assert.equal((await event(post({ tool: 'nope', event: 'open' }))).status, 400);
  assert.equal((await event(post({ tool: 'northstar', event: 'visit' }))).status, 400);
  setStoreForTests(null);
});

test('open/check storage failures are visible as 503 without leaking request data', async () => {
  const originalError = console.error;
  const diagnostics = [];
  console.error = (line) => diagnostics.push(String(line));
  setStoreForTests(async () => { throw new Error('private backend detail'); });
  try {
    const open = await event(post({ tool: 'shield', event: 'open', text: 'private message' }));
    const check = await event(post({ tool: 'dinner', event: 'check', text: 'private ingredients' }));
    assert.equal(open.status, 503);
    assert.equal(check.status, 503);
    assert.match(diagnostics[0], /qw_event_write_failed/);
    assert.doesNotMatch(diagnostics.join(' '), /private|backend detail/);
    assert.match(diagnostics[0], /"tool":"shield"/);
    assert.match(diagnostics[1], /"event":"check"/);
  } finally {
    console.error = originalError;
    setStoreForTests(null);
  }
});


test('Saver and Shield sample demos increment fixed counters without storing sample content', async () => {
  const seen = [];
  setStoreForTests(async (...cmds) => { seen.push(...cmds); return []; });
  try {
    for (const tool of ['saver', 'shield']) {
      const response = await event(post({ tool, event: 'demo', text: 'sample content must not be stored' }));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true, stored: true });
    }
    assert.ok(seen.some((c) => c[0] === 'INCR' && c[1] === 'count:saver:demos'));
    assert.ok(seen.some((c) => c[0] === 'INCR' && c[1] === 'count:shield:demos'));
    assert.ok(seen.every((c) => typeof c[1] === 'string' && c[1].startsWith('count:')));
  } finally {
    setStoreForTests(null);
  }
});
