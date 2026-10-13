// Browser smoke test for /commodities/. Not part of `node --test` (needs Playwright + Chromium).
// Run: PLAYWRIGHT_DIR=<dir containing node_modules/playwright> CHROMIUM=<path> SHOT_DIR=<dir> [STUDIO_DIR=<studio root>] node commodities/test/page.e2e.mjs
// Serves this folder at /commodities/ and the rest (/, /js/pro.js) from STUDIO_DIR, with the site's CSP when
// STUDIO_DIR/vercel.json exists. Two states: no data (first load pending) and SAMPLE data generated from the
// test fixtures into a temp folder. Nothing is fetched from the internet; /api/* is answered inside the browser.
import http from 'node:http';
import { readFile, mkdtemp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const TOOL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STUDIO = process.env.STUDIO_DIR || path.resolve(TOOL, '..');
const req = createRequire(path.join(process.env.PLAYWRIGHT_DIR || process.cwd(), 'noop.js'));
const { chromium } = req('playwright');
const SHOTS = process.env.SHOT_DIR || tmpdir();
let CSP = null;
try { CSP = JSON.parse(await readFile(path.join(STUDIO, 'vercel.json'), 'utf8')).headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value; } catch { /* page meta CSP still applies */ }
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css' };

// SAMPLE data, generated from the fixtures into a temp folder (never into commodities/data).
const SAMPLE = await mkdtemp(path.join(tmpdir(), 'cdesk-e2e-'));
const gen = spawnSync(process.execPath, [path.join(TOOL, 'scripts', 'fetch.mjs'), '--fixtures', path.join(TOOL, 'test', 'fixtures'), '--out', SAMPLE, '--today', '2026-10-13'], { encoding: 'utf8' });
assert.equal(gen.status, 0, gen.stderr);
let dataDir = null; // null = no data published yet

const server = http.createServer(async (rq, rs) => {
  let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  let f;
  if (p.startsWith('/commodities/data/')) f = dataDir ? path.join(dataDir, p.slice('/commodities/data/'.length)) : null;
  else if (p.startsWith('/commodities/')) f = path.join(TOOL, p.slice('/commodities/'.length));
  else f = path.join(STUDIO, p);
  if (!f || p.startsWith('/api/') || p.includes('..')) { rs.writeHead(404, { 'content-type': 'text/plain' }); return rs.end('not found'); }
  try { const b = await readFile(f); rs.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', ...(CSP ? { 'content-security-policy': CSP } : {}) }); rs.end(b); }
  catch { rs.writeHead(404, { 'content-type': 'text/plain' }); rs.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
if (!existsSync(path.join(STUDIO, 'js', 'pro.js'))) console.warn(`note: ${STUDIO}/js/pro.js not found; set STUDIO_DIR to the studio repo to test billing hooks`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const errors = [];
let passed = 0;
const check = async (name, fn) => { await fn(); passed++; console.log('ok -', name); };
const phone = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const desktop = { viewport: { width: 1280, height: 900 } };

async function open(opts, label, url = '/commodities/', { pro = false, scheme = 'light' } = {}) {
  const ctx = await browser.newContext({ acceptDownloads: true, colorScheme: scheme, ...opts });
  if (pro) await ctx.addInitScript(() => localStorage.setItem('studio-pro:commodities', JSON.stringify({ token: 'tok', at: Date.now(), plan: 'desk' })));
  await ctx.route('**/api/access**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pro ? { pro: true, token: 'tok', plan: 'desk' } : { pro: false }) }));
  await ctx.route('**/api/checkout', (r) => r.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Price not found: not on sale yet' }) }));
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource: the server responded with a status of 404/.test(m.text()) && (!dataDir || /checkout/.test(m.location().url || ''))) return; // expected: no data yet / plan not on sale
    errors.push(`${label}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  await page.goto(ORIGIN + url);
  await page.waitForLoadState('networkidle');
  return { ctx, page };
}
const noHScroll = async (page, label) => {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(sw <= cw, `${label}: horizontal scroll (${sw} > ${cw})`);
};

try {
  // 1. No data yet: honest "unavailable", no prices.
  for (const [vp, opts] of [['375', phone], ['1280', desktop]]) {
    await check(`no data (${vp}px): says unavailable, shows no prices, no horizontal scroll`, async () => {
      const { ctx, page } = await open(opts, `nodata-${vp}`);
      await page.waitForSelector('#status.bad');
      assert.match(await page.textContent('#status'), /not available yet/);
      assert.equal(await page.locator('ul.px li').count(), 0);
      await noHScroll(page, `nodata-${vp}`);
      await page.screenshot({ path: path.join(SHOTS, `cdesk-nodata-${vp}.png`), fullPage: true });
      await ctx.close();
    });
  }

  dataDir = SAMPLE;
  for (const [vp, opts] of [['375', phone], ['1280', desktop]]) {
    for (const scheme of ['light', 'dark']) await check(`sample data (${vp}px, ${scheme}): board, FX, yields, sample banner, no horizontal scroll`, async () => {
      const { ctx, page } = await open(opts, `board-${vp}-${scheme}`, '/commodities/', { scheme });
      await page.waitForSelector('#g-metals');
      assert.match(await page.textContent('#status'), /SAMPLE DATA/);
      assert.ok(await page.locator('ul.px li').count() >= 33);
      assert.match(await page.textContent('#g-metals'), /Monthly average/);
      assert.match(await page.textContent('#g-energy'), /Daily/);
      assert.ok(!(await page.isHidden('#fx')) && !(await page.isHidden('#yields')));
      await noHScroll(page, `board-${vp}`);
      await page.screenshot({ path: path.join(SHOTS, `cdesk-board-${vp}-${scheme}.png`), fullPage: true });
      await ctx.close();
    });
  }

  await check('tracker (375px): add holdings, switch currency and language, CSV export, free limit of 3', async () => {
    const { ctx, page } = await open(phone, 'tracker');
    await page.waitForSelector('#g-metals');
    await page.selectOption('#hItem', 'gold'); await page.selectOption('#hUnit', 'ozt'); await page.fill('#hQty', '10'); await page.click('#hAdd');
    await page.selectOption('#hItem', 'wheat_srw'); await page.selectOption('#hUnit', 't'); await page.fill('#hQty', '2'); await page.click('#hAdd');
    await page.selectOption('#hKind', 'currency'); await page.selectOption('#hItem', 'JPY'); await page.fill('#hQty', '100000'); await page.click('#hAdd');
    assert.equal(await page.locator('#holdings ul.px li').count(), 3);
    assert.ok(await page.isDisabled('#hAdd'), 'fourth holding is blocked on the free plan');
    assert.match(await page.textContent('#holdings'), /up to 3 holdings/);
    const usd = await page.textContent('#holdings .total');
    await page.selectOption('#ccy', 'EUR');
    const eurTotal = await page.textContent('#holdings .total');
    assert.notEqual(usd, eurTotal); assert.match(eurTotal, /€/);
    await page.selectOption('#lang', 'es');
    assert.match(await page.textContent('#tracker h2'), /Mis activos/);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#csv')]);
    const csv = await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8');
    assert.match(csv, /^label,kind,item,quantity,unit,value_EUR/);
    assert.equal(csv.trim().split('\r\n').length, 5);
    // Reload: holdings, currency and language are remembered on the device.
    await page.reload(); await page.waitForSelector('#g-metals');
    assert.equal(await page.locator('#holdings ul.px li').count(), 3);
    assert.equal(await page.inputValue('#ccy'), 'EUR'); assert.equal(await page.inputValue('#lang'), 'es');
    await noHScroll(page, 'tracker');
    await page.screenshot({ path: path.join(SHOTS, 'cdesk-tracker-375.png'), fullPage: true });
    // Checkout not on sale yet: friendly message.
    await page.click('#buyM');
    await page.waitForFunction(() => document.getElementById('planMsg').textContent.length > 0);
    assert.match(await page.textContent('#planMsg'), /muy pronto/);
    await ctx.close();
  });

  await check('Desk plan (1280px): unlimited holdings, alerts with .ics, chart ranges', async () => {
    const { ctx, page } = await open(desktop, 'desk', '/commodities/', { pro: true });
    await page.waitForSelector('#aItem');
    assert.ok(await page.isHidden('#planBuy'));
    for (let i = 0; i < 4; i++) { await page.selectOption('#hItem', 'silver'); await page.fill('#hQty', String(i + 1)); await page.click('#hAdd'); }
    assert.equal(await page.locator('#holdings ul.px li').count(), 4);
    await page.selectOption('#aItem', 'brent'); await page.selectOption('#aOp', 'above'); await page.fill('#aLevel', '10'); await page.click('#alForm button[type=submit]');
    await page.waitForSelector('#alertBanner:not([hidden])');
    assert.match(await page.textContent('#alertBanner'), /Brent/);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#ics')]);
    assert.match(await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8'), /BEGIN:VCALENDAR/);
    await page.click('[data-chart="gold"]');
    await page.waitForSelector('#ch-gold svg');
    await page.click('#ch-gold [data-range="all"]');
    await page.waitForSelector('#ch-gold [data-range="all"][aria-pressed="true"]');
    await noHScroll(page, 'desk');
    await page.screenshot({ path: path.join(SHOTS, 'cdesk-desk-1280.png'), fullPage: true });
    await ctx.close();
  });

  for (const [vp, opts] of [['375', phone], ['1280', desktop]]) {
    await check(`brief and where-to-buy pages (${vp}px)`, async () => {
      const { ctx, page } = await open(opts, `brief-${vp}`, '/commodities/brief/');
      await page.waitForSelector('#brief .briefdate[data-date="2026-10-13"]');
      const txt = await page.textContent('#brief');
      assert.match(txt, /SAMPLE DATA/); assert.match(txt, /Not investment advice/); assert.match(txt, /Treasury/);
      assert.match(await page.textContent('#archiveBody'), /Desk plan/);
      await noHScroll(page, `brief-${vp}`);
      await page.screenshot({ path: path.join(SHOTS, `cdesk-brief-${vp}.png`), fullPage: true });
      await page.goto(ORIGIN + '/commodities/where-to-buy/'); await page.waitForLoadState('networkidle');
      assert.match(await page.textContent('h1'), /Where to buy/);
      await noHScroll(page, `buy-${vp}`);
      await page.screenshot({ path: path.join(SHOTS, `cdesk-buy-${vp}.png`), fullPage: true });
      await ctx.close();
    });
  }
  await check('brief archive opens for Desk plan holders', async () => {
    const { ctx, page } = await open(phone, 'archive', '/commodities/brief/', { pro: true });
    await page.waitForSelector('#pick');
    assert.equal(await page.locator('#pick option').count(), 1);
    await ctx.close();
  });

  assert.deepEqual(errors, [], 'console errors');
  console.log(`\n${passed} checks passed, no console errors.`);
} finally {
  await browser.close();
  server.close();
}
