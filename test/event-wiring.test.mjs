import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('each priority tool has one shared open-event owner', () => {
  const pages = ['shield/index.html','saver/index.html','bill-radar/index.html','fair-price/index.html','dinner/index.html'];
  for (const path of pages) {
    const html = readFileSync(new URL('../'+path, import.meta.url), 'utf8');
    assert.match(html, /Studio\.init\(/, path+' must initialize the shared Pro client');
    assert.doesNotMatch(html, /countEvent\(['"]open['"]\)|event:\s*['"]open['"]/, path+' must not count a second page open');
  }
  for (const path of ['shield/js/app.mjs','saver/js/app.mjs']) {
    const source = readFileSync(new URL('../'+path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /countEvent\(['"]open['"]\)/, path+' must not count a second page open');
  }
});
