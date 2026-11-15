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


test('Saver and Shield sample runs are counted as demos, separately from user checks', () => {
  const page = (path) => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
  const saver = page('saver/js/app.mjs');
  const shield = page('shield/js/app.mjs');
  assert.match(saver, /\$\('#sampleBtn'\)\.addEventListener\('click', \(\) => \{[\s\S]*?countEvent\('demo'\)[\s\S]*?\}\);/);
  assert.match(shield, /\$\('#sampleBtn'\)\.addEventListener\('click', \(\) => \{[\s\S]*?countEvent\('demo'\)[\s\S]*?\}\);/);
  assert.match(saver, /if \(!f\.sample && !state\.sent\)[\s\S]*?event: 'check'/);
  assert.match(shield, /if \(save\)[\s\S]*?event: 'check'/);
});


test('Bill Radar and Dinner sample runs are demos, separate from completed checks', () => {
  const page = (path) => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
  const bill = page('bill-radar/index.html');
  const dinner = page('dinner/index.html');
  const fair = page('fair-price/index.html');
  assert.match(bill, /id="sampleBtn"/);
  assert.match(bill, /function run\(isDemo\)/);
  assert.match(bill, /countEvent\(isDemo\?'demo':'check'\)/);
  assert.match(dinner, /id="sampleBtn"/);
  assert.match(dinner, /function run\(isDemo\)/);
  assert.match(dinner, /countEvent\(isDemo \? 'demo' : 'check'\)/);
  assert.match(fair, /countEvent\(demo \? 'demo' : 'check'\)/);
});

test('homepage See it in action links launch one-click local samples for all five priority tools', () => {
  const page = (path) => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
  const home = page('index.html');
  for (const tool of ['shield','saver','bill-radar','fair-price','dinner']) {
    assert.ok(home.includes('href="/'+tool+'/?ref=home-featured-demo-'+tool+'&amp;demo=1#sampleBtn"'), tool + ' sample link');
  }
  assert.doesNotMatch(home, /data-video-id=|Demo video coming soon|Short demo video/);
  for (const path of ['shield/js/app.mjs','saver/js/app.mjs','fair-price/index.html','bill-radar/index.html','dinner/index.html']) {
    assert.match(page(path), /get\(['"]demo['"]\)\s*===\s*['"]1['"]/ , path + ' auto-runs its sample');
  }
});
