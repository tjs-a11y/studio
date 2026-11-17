import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const html = readFileSync(join(root, 'guides/check-suspicious-text-message/index.html'), 'utf8');

test('Shield guide provides a printable, source-backed unexpected-text checklist', () => {
  assert.match(html, /id="printable-checklist"/);
  assert.match(html, /onclick="window\.print\(\)"/);
  assert.match(html, /@media print/);
  assert.match(html, /dateModified":"2026-11-17"/);
  assert.match(html, /https:\/\/consumer\.ftc\.gov\/consumer-alerts\/2026\/05\/how-are-scammers-trying-reach-you/);
  assert.match(html, /https:\/\/consumer\.ftc\.gov\/consumer-alerts\/2025\/04\/unexpected-text-scam/);
  assert.match(html, /https:\/\/consumer\.ftc\.gov\/articles\/how-recognize-and-report-spam-text-messages/);
  assert.match(html, /jurisdiction: United States/);
  assert.match(html, /retrieved 17 November 2026/);
  assert.match(html, /Not legal advice/);
  assert.match(html, /href="\/shield\//);
  assert.match(html, /utm_campaign=quickwell_shield_printable_20261117/);
});
