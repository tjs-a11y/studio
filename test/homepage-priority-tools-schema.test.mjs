import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const blocks = [...html.matchAll(/<script type="application\\/ld\\+json">([\\s\\S]*?)<\\/script>/g)]
  .map((match) => JSON.parse(match[1]));
const graph = blocks.flatMap((block) => block['@graph'] || [block]);

test('homepage search snippet names concrete high-intent consumer tasks', () => {
  assert.match(html, /<title>Free Scam Text Checker &amp; Subscription Finder \\| Quickwell<\\/title>/);
  assert.match(html, /Check scam texts, find subscriptions, forecast electric bills, review repair estimates and plan dinner/);
  assert.match(html, /See each tool's data handling before you start/);
});

test('homepage ItemList maps all five featured tools to visible canonical destinations', () => {
  const list = graph.find((node) => node['@type'] === 'ItemList' && node['@id'] === 'https://quickwell.app/#priority-tools');
  assert.ok(list, 'priority tools ItemList exists');
  assert.equal(list.numberOfItems, 5);
  const items = list.itemListElement.map(({ position, item }) => ({
    position,
    name: item.name,
    url: item.url,
  }));
  assert.deepEqual(items, [
    { position: 1, name: 'Quickwell Shield', url: 'https://quickwell.app/shield/' },
    { position: 2, name: 'Quickwell Saver', url: 'https://quickwell.app/saver/' },
    { position: 3, name: 'Bill Radar', url: 'https://quickwell.app/bill-radar/' },
    { position: 4, name: 'Fair Price', url: 'https://quickwell.app/fair-price/' },
    { position: 5, name: "What's for Dinner?", url: 'https://quickwell.app/dinner/' },
  ]);
  for (const path of ['/shield/', '/saver/', '/bill-radar/', '/fair-price/', '/dinner/']) {
    assert.ok(html.includes('href="' + path), 'visible homepage link exists for ' + path);
  }
});
