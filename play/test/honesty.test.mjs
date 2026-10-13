// Plain-language guardrails for the Play pages: no brain-training claims (FTC v. Lumosity, 2016), a science note on
// every game, prices that match the catalog plan described in README, and no internal names.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url).pathname;
const pages = ['play/index.html', 'play/echo/index.html', 'play/swift/index.html', 'play/linkr/index.html', 'brain-pass/index.html'];
const scripts = ['ui.mjs', 'hub-app.mjs', 'echo-app.mjs', 'swift-app.mjs', 'linkr-app.mjs'].map((f) => `play/js/${f}`);
const text = (f) => readFileSync(root + f, 'utf8');

test('no claims that the games raise IQ, prevent decline or improve real-world performance', () => {
  const banned = [/raises? (your )?(iq|intelligence)/i, /boosts? (your )?(iq|intelligence|memory)/i, /(improves?|sharpens?) (your )?(memory|focus|attention|brain)/i, /clinically/i, /scientifically (proven|designed)/i, /prevents? (dementia|alzheimer|decline)/i, /get smarter/i, /make you smarter/i, /brain health/i];
  for (const f of [...pages, ...scripts]) {
    const t = text(f);
    // The science note itself says what research has NOT shown; only sentences without a negation are claims.
    const claims = t.split(/(?<=[.!?])\s+/).filter((x) => !/\bnot\b|n't|\bno claim|\bnever\b/i.test(x));
    for (const re of banned) for (const c of claims) assert.ok(!re.test(c), `${f}: ${re} in "${c.slice(0, 120)}"`);
    assert.ok(!/MONAD/i.test(t), `${f}: internal name`);
  }
});

test('every game page and the hub carry the science note', () => {
  for (const f of pages) assert.match(text(f), /About the science/);
  for (const f of pages) assert.match(text(f), /not shown that|has <b>not<\/b> shown/);
});

test('prices are the same everywhere', () => {
  for (const f of [...pages, 'play/js/ui.mjs']) {
    const t = text(f);
    assert.ok(t.includes('2.99') && t.includes('19.99') && t.includes('29.99'), f);
    assert.ok(!/\$\d+\.\d\d/.test(t.replace(/\$(2\.99|19\.99|29\.99|1\.67)/g, '')), `${f}: unexpected price`);
  }
});

test('each game initialises billing with the single brain-pass product, and checkout uses the agreed plans', () => {
  const ui = text('play/js/ui.mjs');
  assert.match(ui, /PASS_TOOL = 'brain-pass'/);
  assert.match(ui, /tool: PASS_TOOL/);
  assert.match(ui, /upgrade\('lifetime', 'once'\)/);
  assert.match(ui, /upgrade\('pass', kind\)/);
  for (const g of ['echo', 'swift', 'linkr']) { assert.match(text(`play/js/${g}-app.mjs`), /U\.boot\(/); assert.match(text(`play/${g}/index.html`), /<script src="\/js\/pro\.js"><\/script>/); }
  assert.match(text('play/README.md'), /"id": "brain-pass"/);
});

test('the offline worker is scoped to /play/ and never handles /api/', () => {
  const sw = text('play/sw.js');
  assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(sw, /req\.method !== 'GET'/);
  assert.match(text('play/js/ui.mjs'), /register\('\/play\/sw\.js', \{ scope: '\/play\/' \}\)/);
  const m = JSON.parse(text('play/manifest.webmanifest'));
  assert.equal(m.scope, '/play/'); assert.equal(m.start_url, '/play/');
  assert.ok(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'));
});
