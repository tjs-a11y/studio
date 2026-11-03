import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Year-End Vendor Check scopes the 2026 $2,000 threshold by payment category', () => {
  const html = read('vendor-check/index.html');
  const catalog = JSON.parse(read('catalog/tools.json'));
  const tool = catalog.tools.find((item) => item.id === 'vendor-check');

  assert.ok(html.includes('covered 1099-NEC service payments'));
  assert.ok(html.includes('specified 1099-MISC categories such as rent'));
  assert.ok(html.includes('Royalties remain separate at <b>$10</b>'));
  assert.ok(html.includes('separate <b>$5,000</b> threshold'));
  assert.ok(html.includes('Attorney fees for legal services (not settlement proceeds)'));
  assert.ok(html.includes('26 CFR §1.6045-5'));
  assert.ok(html.includes('does not determine whether settlement proceeds or other gross payments to an attorney are reportable'));
  assert.ok(!html.includes('new $2,000 rule'));
  assert.ok(tool.tagline.includes('covered services'));
  assert.ok(!tool.tagline.includes('new $2,000 rule'));
});

test('Vendor Check reads CSV/PDF files locally and sends only anonymous check events', () => {
  const html = read('vendor-check/index.html');
  assert.ok(html.includes('Your files are read by this page, in your browser. Nothing is uploaded'));
  assert.ok(html.includes('file.text()'));
  assert.ok(html.includes('file.arrayBuffer()'));
  assert.ok(html.includes("JSON.stringify({ tool: TOOL, event: 'check' })"));
});
