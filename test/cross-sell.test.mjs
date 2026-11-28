import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url).pathname;
const crossSell = readFileSync(root + '/js/cross-sell.js', 'utf8');
const telemetry = readFileSync(root + '/js/va.js', 'utf8');

test('priority tool cross-sells wait for a real completed result', () => {
  assert.ok(crossSell.includes("var resultGated=['bill-radar','fair-price','dinner','rate-con-checker']"));
  assert.ok(crossSell.includes("window.addEventListener('qw:tool-completed'"));
  assert.ok(crossSell.includes('if(dismissed||!completionReady)return;'));
  assert.ok(telemetry.includes("new Event('qw:tool-completed')"));
});

test('cross-sell sections are dismissible, keyboard reachable and measured with fixed events', () => {
  assert.ok(crossSell.includes("dismissButton.type='button'"));
  assert.ok(crossSell.includes("dismissButton.setAttribute('aria-label',ui.dismissLabel)"));
  assert.ok(crossSell.includes("dismissButton.addEventListener('click'"));
  assert.ok(crossSell.includes("window.qwTrack(slug,'cross_sell_click')"));
  assert.ok(telemetry.includes("'cross_sell_click'"));
  assert.doesNotThrow(() => new vm.Script(crossSell));
});

test('Dinner offers only the approved Plant Based Diet Recipes Book destination', () => {
  const start = crossSell.indexOf("}else if(kitchen.indexOf(slug)>=0){");
  const end = crossSell.indexOf("}else if(everyday.indexOf(slug)>=0){", start);
  const branch = crossSell.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(branch.includes("if(slug==='dinner')"));
  assert.ok(branch.includes("Plant Based Diet Recipes Book"));
  assert.ok(branch.includes("https://books2read.com/u/m0BxMV"));
  assert.ok(!branch.includes("Mediterranean Diet Recipes Book"));
  assert.ok(branch.includes("not dietary or medical advice"));
});

test('Bill Radar and Fair Price keep crypto reading optional and unrelated to the core task', () => {
  const start = crossSell.indexOf("}else if(slug==='bill-radar'||slug==='fair-price'){");
  const end = crossSell.indexOf("}else if(home.indexOf(slug)>=0){", start);
  const branch = crossSell.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(branch.includes('Mastering Cryptocurrency Trading'));
  assert.ok(branch.includes('unrelated to your bill or repair estimate; not investment advice'));
  assert.ok(!branch.includes('Gatherloom'));
  assert.ok(!branch.includes('Energy Revolution System'));
});

test('Rate Con Checker cross-sells only freight software and removes unrelated book promotion', () => {
  const start = crossSell.indexOf('if(freight.indexOf(slug)>=0){');
  const end = crossSell.indexOf('}else if(trade.indexOf(slug)>=0){', start);
  const branch = crossSell.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(branch.includes('Haul Audit'));
  assert.ok(branch.includes('no driver recruitment or dispatch links'));
  assert.ok(!branch.includes('Mindset Mastery'));
});
