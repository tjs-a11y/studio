import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('2026 1099 copy scopes the $2,000 line and separates attorney proceeds', () => {
  const tool = read('vendor-check/index.html');
  const source = read('scripts/learn/content/1099.mjs');
  const page = read('learn/1099/threshold-2026/index.html');
  const hub = read('learn/1099/index.html');

  assert.ok(tool.includes('the $2,000 line covers specified services and rent'));
  assert.ok(tool.includes('Attorney fees for legal services (not settlement proceeds)'));
  assert.ok(tool.includes('settlement proceeds or other gross payments to an attorney are reportable'));
  assert.ok(tool.includes('26 CFR §1.6045-5'));
  assert.ok(source.includes("const R6045_5 = cfrSrc('1.6045-5'"));
  assert.ok(source.includes('R6045_5'));
  assert.ok(page.includes('the $2,000 line applies to covered service payments'));
  assert.ok(page.includes('26 CFR §1.6045-5'));
  assert.ok(hub.includes('separate royalty and attorney-payment rules'));

  const description = tool.match(/<meta name="description" content="([^"]+)"/)?.[1] || '';
  assert.ok(description.length <= 155, 'Vendor Check meta description stays within a concise search snippet');
});
