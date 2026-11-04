import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { POST: postEvent, setStoreForTests: setEventStore } = await import('../api/event.js');
const { GET: getStats, setStoreForTests: setStatsStore } = await import('../api/stats.js');
const tools = ['port-watcher', 'hydro-flow', 'scale-audit'];
const post = (body) => new Request('https://studio.example/api/event', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});

test('pre-launch tier CTAs send only fixed tool and event labels', () => {
  const script = readFileSync(new URL('../js/prelaunch-tier-clicks.js', import.meta.url), 'utf8');
  assert.match(script, /JSON\.stringify\(\{\s*tool,\s*event\s*\}\)/);
  assert.match(script, /click_operator/);
  assert.match(script, /click_manager/);
  for (const tool of tools) {
    const html = readFileSync(new URL(`../${tool}/index.html`, import.meta.url), 'utf8');
    assert.ok(html.includes(`data-prelaunch-tool="${tool}"`), tool);
    assert.ok(html.includes('data-tier="operator"'), tool);
    assert.ok(html.includes('data-tier="manager"'), tool);
    assert.ok(html.includes('<script src="/js/prelaunch-tier-clicks.js" defer></script>'), tool);
  }
  const privacy = readFileSync(new URL('../privacy.html', import.meta.url), 'utf8');
  assert.match(privacy, /pre-launch operator\/manager tier clicks/);
});

test('only the three pre-launch pages can count fixed operator/manager clicks', async () => {
  const seen = [];
  setEventStore(async (...commands) => { seen.push(...commands); return []; });
  try {
    for (const tool of tools) {
      for (const event of ['click_operator', 'click_manager']) {
        assert.equal((await postEvent(post({ tool, event }))).status, 200);
      }
    }
    assert.ok(seen.some((c) => c[0] === 'INCR' && c[1] === 'count:port-watcher:click_operator'));
    assert.ok(seen.some((c) => c[0] === 'INCR' && c[1] === 'count:scale-audit:click_manager'));
    assert.ok(seen.every((c) => typeof c[1] === 'string' && c[1].startsWith('count:')));
    assert.equal((await postEvent(post({ tool: 'port-watcher', event: 'check' }))).status, 400);
    assert.equal((await postEvent(post({ tool: 'shield', event: 'click_operator' }))).status, 400);
    assert.equal((await postEvent(post({ tool: 'hydro-flow', event: 'click_unknown' }))).status, 400);
  } finally {
    setEventStore(null);
  }
});

test('stats exposes aggregate pre-launch tier click counters', async () => {
  const seen = [];
  setStatsStore(async (commands) => { seen.push(...commands); return commands.map(() => ({ result: 0 })); });
  try {
    const response = await getStats();
    assert.equal(response.status, 200);
    const body = await response.json();
    for (const tool of tools) {
      assert.ok(seen.some((c) => c[1] === `count:${tool}:click_operator`));
      assert.ok(seen.some((c) => c[1] === `count:${tool}:click_manager`));
      assert.deepEqual(body.prelaunch[tool], {
        click_operator: 0, click_operator_today: 0,
        click_manager: 0, click_manager_today: 0,
      });
    }
  } finally {
    setStatsStore(null);
  }
});
