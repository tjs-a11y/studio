// Browser test for permit-watch/index.html. Not part of `node --test` (needs Playwright).
// Run: PLAYWRIGHT_DIR=<dir containing node_modules/playwright> CHROMIUM=<path> SHOT_DIR=<dir> node permit-watch/test/page.e2e.mjs
// Serves the studio root with the site's CSP header. The populated state is produced by
// routing the JSON request to TEST fixture data in the browser; nothing is written to data/.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { parseDaily, mergeWindow } from '../scripts/update.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..', '..');
const req = createRequire(path.join(process.env.PLAYWRIGHT_DIR || process.cwd(), 'noop.js'));
const { chromium } = req('playwright');
const SHOTS = process.env.SHOT_DIR || here;
const vercel = JSON.parse(await readFile(path.join(ROOT, 'vercel.json'), 'utf8'));
const CSP = vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript', '.xml': 'application/rss+xml', '.css': 'text/css' };

const server = http.createServer(async (rq, rs) => {
  let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname);
  if (p === '/_vercel/insights/script.js') { rs.writeHead(200, { 'content-type': 'text/javascript' }); return rs.end(''); } // served by Vercel in production
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { rs.writeHead(403); return rs.end(); }
  try { const b = await readFile(f); rs.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'content-security-policy': CSP }); rs.end(b); }
  catch { rs.writeHead(404, { 'content-type': 'text/plain' }); rs.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/permit-watch/`;

const fixture = parseDaily(await readFile(path.join(here, '..', 'scripts', 'fixtures', 'daf420.test.dat'), 'latin1'));
const fixtureJson = JSON.stringify({ updated: '2026-10-11T13:20:00Z', dataDate: '2026-10-11', windowDays: 30, permits: mergeWindow([], fixture, '2026-10-11', 30) });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const errors = [];
let passed = 0;
const check = async (name, fn) => { await fn(); passed++; console.log('ok -', name); };
async function open(opts, populated) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' && !(populated === false && /404/.test(m.text()))) errors.push(`${opts.colorScheme || ''} ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(String(e)));
  if (populated) await page.route('**/permit-watch/data/latest.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: fixtureJson }));
  return { ctx, page };
}
const phone = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const desktop = { viewport: { width: 1280, height: 900 } };

try {
  // ---- pending state: no data/latest.json on the server
  await check('pending state shows "First data load pending" and no permits', async () => {
    const { ctx, page } = await open({ ...phone, colorScheme: 'light' }, false);
    await page.goto(URL0);
    await page.waitForFunction(() => /First data load pending/.test(document.getElementById('status').textContent));
    assert.equal(await page.locator('#county option').count(), 255);
    await page.selectOption('#county', 'midland');
    assert.equal(await page.locator('#list li').count(), 0);
    assert.match(await page.textContent('#empty'), /First data load pending/);
    await page.click('#watchBtn');
    assert.match(await page.inputValue('#feedUrl'), /\/permit-watch\/feeds\/midland\.xml$/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 375), 'no horizontal scroll at 375px');
    await page.screenshot({ path: path.join(SHOTS, 'permit-pending-phone.png'), fullPage: true });
    await ctx.close();
  });

  // ---- populated state (fixture routed in the browser)
  await check('populated: county list, filter, distance, pick a point, save watch', async () => {
    const { ctx, page } = await open({ ...phone, colorScheme: 'light', permissions: ['clipboard-read', 'clipboard-write'] }, true);
    await page.goto(URL0 + '?county=midland');
    await page.waitForFunction(() => /Texas permits from the last 30 days/.test(document.getElementById('status').textContent));
    assert.equal(await page.locator('#list li').count(), 2);
    assert.match(await page.locator('#list li').first().textContent(), /TEST OPERATOR TWO INC/); // newest first
    await page.fill('#q', 'a-0123');
    await page.waitForFunction(() => document.querySelectorAll('#list li').length === 1);
    await page.fill('#q', '');
    await page.click('#near summary');
    await page.fill('#lat', '31.9123'); await page.fill('#lon', '-102.0123'); await page.fill('#radius', '2');
    await page.waitForFunction(() => document.querySelectorAll('#list li').length === 1);
    assert.match(await page.textContent('#list'), /mi from your point/);
    await page.click('#clearNear');
    await page.click('#pick');
    await page.locator('#plot').click({ position: { x: 150, y: 70 } });
    const pickedLat = await page.inputValue('#lat'); assert.ok(/^\d+\.\d{4}$/.test(pickedLat), 'point picked from plot: ' + pickedLat);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 375), 'no horizontal scroll at 375px');
    await page.screenshot({ path: path.join(SHOTS, 'permit-populated-phone.png'), fullPage: true });
    await page.click('#clearNear');
    await page.fill('#q', 'TEST SURVEY TWO');
    await page.click('#watchBtn');
    await page.click('#copy');
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /feeds\/midland\.xml$/);
    await page.click('#saveWatch');
    assert.equal(await page.locator('#watches li').count(), 1);
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('#watches li').length === 1);
    await page.selectOption('#county', 'reeves');
    await page.click('#watches a.open');
    assert.equal(await page.inputValue('#county'), 'midland');
    assert.equal(await page.inputValue('#q'), 'TEST SURVEY TWO');
    await page.click('#watches [data-del]');
    assert.equal(await page.locator('#watches li').count(), 0);
    await ctx.close();
  });

  await check('populated desktop, dark mode; empty county message', async () => {
    const { ctx, page } = await open({ ...desktop, colorScheme: 'dark' }, true);
    await page.goto(URL0 + '?county=reeves');
    await page.waitForFunction(() => document.querySelectorAll('#list li').length === 1);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.equal(bg, 'rgb(16, 18, 21)');
    await page.click('#near summary');
    await page.click('#watchBtn');
    await page.screenshot({ path: path.join(SHOTS, 'permit-populated-desktop-dark.png'), fullPage: true });
    await page.selectOption('#county', 'anderson');
    assert.match(await page.textContent('#empty'), /No permits in Anderson County/);
    await ctx.close();
  });

  await check('pending desktop, dark mode', async () => {
    const { ctx, page } = await open({ ...desktop, colorScheme: 'dark' }, false);
    await page.goto(URL0);
    await page.waitForFunction(() => /First data load pending/.test(document.getElementById('status').textContent));
    await page.screenshot({ path: path.join(SHOTS, 'permit-pending-desktop-dark.png'), fullPage: true });
    await ctx.close();
  });

  await check('localStorage blocked: page still works', async () => {
    const { ctx, page } = await open({ ...desktop, colorScheme: 'light' }, true);
    await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
    await page.goto(URL0 + '?county=midland');
    await page.waitForFunction(() => document.querySelectorAll('#list li').length === 2);
    await page.click('#watchBtn'); await page.click('#saveWatch');
    assert.match(await page.textContent('#saveNote'), /Couldn't save/);
    await page.screenshot({ path: path.join(SHOTS, 'permit-populated-desktop-light.png'), fullPage: true });
    await ctx.close();
  });

  assert.deepEqual(errors, [], 'console errors: ' + errors.join('\n'));
  console.log(`\n${passed} browser checks passed, 0 console errors`);
} finally {
  await browser.close();
  server.close();
}
