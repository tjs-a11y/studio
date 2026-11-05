import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('each priority tool has exactly one page-open event owner', () => {
  const page = (path) => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
  for (const [path, source] of [
    ['shield/js/app.mjs', page('shield/js/app.mjs')],
    ['saver/js/app.mjs', page('saver/js/app.mjs')],
    ['fair-price/index.html', page('fair-price/index.html')],
    ['dinner/index.html', page('dinner/index.html')],
  ]) {
    assert.match(source, /Studio\.init\(/, path+' uses the shared Pro client open counter');
    assert.doesNotMatch(source, /countEvent\(['"]open['"]\)/, path+' must not count a second page open');
  }
  const bill = page('bill-radar/index.html');
  assert.match(bill, /tool:'bill-radar',event:'open'/, 'Bill Radar uses its standalone first-party open counter');
  assert.doesNotMatch(bill, /Studio\.init\(/, 'Bill Radar does not initialize the shared Pro client');
});
