import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../fair-price/index.html', import.meta.url), 'utf8');
const post = (body) => new Request('https://studio.example/api/event', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});
const { POST: event, setStoreForTests: setEventStore } = await import('../api/event.js');
const { GET: stats, setStoreForTests: setStatsStore } = await import('../api/stats.js');

test('Fair Price sample quote is explicit and is not counted as a real check', () => {
  assert.match(page, /id="sampleBtn"/);
  assert.match(page, /Try a sample quote/);
  assert.match(page, /function run\(isDemo\)/);
  assert.match(page, /run\(true\)/);
  assert.match(page, /countEvent\(isDemo \? 'demo' : 'check'\)/);
  assert.match(page, /Sample only\. This is a demonstration, not a review of your quote/);
  assert.match(page, /See how Fair Price checks a sample quote/);
  assert.match(page, /body: JSON\.stringify\(\{ tool: 'fair-price', event \}\)/);
});

test('demo events write only fixed anonymous counters', async () => {
  const seen = [];
  setEventStore(async (...commands) => { seen.push(...commands); return []; });
  try {
    const response = await event(post({ tool: 'fair-price', event: 'demo', quote: 'PRIVATE SAMPLE TEXT' }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, stored: true });
    assert.ok(seen.some((command) => command[0] === 'INCR' && command[1] === 'count:fair-price:demos'));
    assert.ok(seen.some((command) => command[0] === 'INCR' && command[1].startsWith('count:fair-price:demos:')));
    assert.ok(seen.every((command) => command[0] === 'INCR' && command[1].startsWith('count:')));
    assert.doesNotMatch(JSON.stringify(seen), /PRIVATE SAMPLE TEXT/);
  } finally {
    setEventStore(null);
  }
});

test('public stats exposes demos separately from completed checks', async () => {
  let commandsSeen = [];
  setStatsStore(async (commands) => { commandsSeen = commands; return []; });
  try {
    const response = await stats();
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.total_demos, 0);
    assert.equal(data.total_checks, 0);
    assert.equal(data.tools['fair-price'].demos, 0);
    assert.equal(data.tools['fair-price'].demos_today, 0);
    assert.ok(commandsSeen.some((command) => command[0] === 'GET' && command[1] === 'count:fair-price:demos'));
    assert.ok(commandsSeen.some((command) => command[0] === 'GET' && command[1].startsWith('count:fair-price:demos:')));
  } finally {
    setStatsStore(null);
  }
});
