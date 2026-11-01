import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');

test('Haul Audit and Royalty Check expose specialist search intent and helpful answers', () => {
  const cases = [
    ['haul-audit/index.html', 'Freight Settlement Audit | Haul Audit', 'freight broker short-paid a load'],
    ['royalty-check/index.html', 'Mineral Royalty Decimal Calculator | Royalty Check', 'oil and gas royalty decimal'],
  ];
  for (const [path, title, phrase] of cases) {
    const html = read(path);
    assert.ok(html.includes('<title>' + title + '</title>'), path + ': title');
    const description = (/<meta name="description" content="([^"]+)">/.exec(html) || [])[1] || '';
    assert.ok(description.length > 0 && description.length <= 155, path + ': description length');
    assert.ok(html.includes(phrase), path + ': intent-focused FAQ');
    assert.ok(html.includes('"@type":"FAQPage"'), path + ': FAQ structured data');
    assert.ok(html.includes("event: 'check'"), path + ': anonymous check event');
    assert.ok(!html.includes('let PRO = false, sent = false'), path + ': event must not be once-per-page only');
    assert.ok(!html.includes('id="buyY"'), path + ': no unsupported yearly checkout option');
  }
});

test('specialist checkout fails closed unless Stripe price is exactly $15 USD monthly', () => {
  const checkout = read('api/checkout.js');
  assert.ok(checkout.includes("price.unit_amount !== 1500"));
  assert.ok(checkout.includes("String(price.currency || '').toLowerCase() !== 'usd'"));
  assert.ok(checkout.includes("price.recurring?.interval !== 'month'"));
  assert.ok(checkout.includes("'haul-audit__pro__month'"));
  assert.ok(checkout.includes("'royalty-check__pro__month'"));
});
