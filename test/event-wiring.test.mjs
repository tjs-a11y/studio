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
  assert.match(bill, /function countEvent\(event\)[\s\S]*?JSON\.stringify\(\{tool:'bill-radar',event\}\)/, 'Bill Radar uses a fixed-label first-party event helper');
  assert.match(bill, /countEvent\('open'\)/, 'Bill Radar counts its first-party page open');
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
  assert.match(bill, /countEvent\(isDemo\?'demo':'tool_completed'\)/);
  assert.match(dinner, /id="sampleBtn"/);
  assert.match(dinner, /function run\(isDemo\)/);
  assert.match(dinner, /countEvent\(isDemo \? 'demo' : 'tool_completed'\)/);
  assert.match(fair, /countEvent\(demo \? 'demo' : 'tool_completed'\)/);
});

test('the four acquisition entry points emit tool_completed after successful result rendering', () => {
  const page = (path) => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
  for (const [path, marker] of [
    ['bill-radar/index.html', "countEvent(isDemo?'demo':'tool_completed')"],
    ['fair-price/index.html', "countEvent(demo ? 'demo' : 'tool_completed')"],
    ['dinner/index.html', "countEvent(isDemo ? 'demo' : 'tool_completed')"],
    ['rate-con-checker/index.html', "event: 'tool_completed'"],
  ]) assert.ok(page(path).includes(marker), path + ' completion event');
  const rate = page('rate-con-checker/index.html');
  assert.match(rate, /const detailed = true;/, 'all initial explanations are visible');
  assert.match(rate, /\$\('copy'\)\.disabled = false/, 'broker correction text is copyable free');
  assert.match(rate, /if \(!PRO && !isSample\)/, 'sample does not consume daily free quota');
});

test('Rate Con routes to Haul Audit only after a real result and allows dismissal', () => {
  const rate = readFileSync(new URL('../rate-con-checker/index.html', import.meta.url), 'utf8');
  const resultAt = rate.indexOf('<section id="result"');
  const nextAt = rate.indexOf('<section class="card noprint" id="freight-next-step" hidden');
  const upsellAt = rate.indexOf('<section class="card pro noprint" id="upsell"');
  assert.ok(resultAt >= 0 && nextAt > resultAt && upsellAt > nextAt, 'cross-sell follows the result');
  assert.match(rate, /\$\('freight-next-step'\)\.hidden = isSample/, 'sample runs do not show the cross-sell');
  assert.match(rate, /dismissFreightNext'\)\.addEventListener\('click'[\s\S]*?freightNext\.hidden = true/, 'cross-sell is dismissible');
  assert.match(rate, /href="\/haul-audit\/\?ref=rate-con-checker"/, 'internal destination has a short anonymous source label');
  assert.match(rate, /window\.qwTrack\(TOOL, 'cross_sell_haul_audit_click'\)/, 'click uses a fixed event');
});

test('unrelated or unverified book and gifting promotions are absent from the consumer tools', () => {
  const page = (path) => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
  assert.doesNotMatch(page('bill-radar/index.html'), /gatherloom/i);
  const dinner = page('dinner/index.html');
  assert.doesNotMatch(dinner, /books2read\.com\/u\/(?:m0BxMV|4jo1Xo)/i);
  assert.doesNotMatch(dinner, /Plant Based Diet Recipes Book|Mediterranean Diet Recipes Book/);
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


test('Fair Price first-use actions explain the real-review and sample paths', () => {
  const fair = readFileSync(new URL('../fair-price/index.html', import.meta.url), 'utf8');
  assert.match(fair, /id="go">Review my estimate/);
  assert.match(fair, /id="sampleBtn">See a sample result first/);
  assert.match(fair, /No estimate ready\? The sample uses example text only; replace it with your own estimate for a real review\./);
  assert.match(fair, /id="demoToRealBtn">Check your own estimate/);
});


test('the four primary tools have one first-party completion-event owner', () => {
  const page = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const telemetry = page('js/telemetry.js');
  const cfgStart = telemetry.indexOf('var cfg={');
  const cfgEnd = telemetry.indexOf('};', cfgStart);
  assert.ok(cfgStart >= 0 && cfgEnd > cfgStart, 'completion observer config exists');
  const observerConfig = telemetry.slice(cfgStart, cfgEnd);
  for (const slug of ['bill-radar', 'fair-price', 'dinner', 'rate-con-checker']) {
    assert.equal(observerConfig.includes("'" + slug + "':"), false, slug + ' must not be counted by both the generic observer and its page-owned event');
  }

  for (const [path, slug, marker] of [
    ['bill-radar/index.html', 'bill-radar', "countEvent(isDemo?'demo':'tool_completed')"],
    ['fair-price/index.html', 'fair-price', "countEvent(demo ? 'demo' : 'tool_completed')"],
    ['dinner/index.html', 'dinner', "countEvent(isDemo ? 'demo' : 'tool_completed')"],
  ]) {
    const source = page(path);
    assert.ok(source.includes(marker), path + ' owns the completion event');
    assert.ok(source.includes("body: JSON.stringify({ tool: '" + slug + "', event })"), path + ' sends one fixed-label first-party event');
  }

  const rate = page('rate-con-checker/index.html');
  assert.ok(rate.includes("body: JSON.stringify({ tool: TOOL, event: 'tool_completed' })"), 'Rate Con owns its fixed-label completion event');
});
