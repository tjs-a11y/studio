// Playwright smoke test for Quickwell Play (not part of `npm test`: it needs a browser).
//   PLAYWRIGHT=/path/to/node_modules/playwright CHROMIUM=/path/to/chromium [SHOTS=/dir] node play/test/smoke.e2e.mjs
// Serves the repo locally (/api/* answers 404 like a site with billing off, unless a test routes it), then for a
// phone (375px) and a desktop viewport: tutorial, a full daily in each game, the share card, the free-practice
// limit prompt, checkout calls, the unlocked state via a routed /api/access, offline reload, no horizontal scroll,
// and no console errors other than the known /api 404s.
import http from 'node:http';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { dayKey } from '../js/core.mjs';
import { dailyRounds } from '../js/echo.mjs';
import { dailyStream } from '../js/swift.mjs';
import { dailyPuzzle } from '../js/linkr.mjs';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
const root = new URL('../../', import.meta.url).pathname;
const SHOTS = process.env.SHOTS || '';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain' };
const srv = http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.startsWith('/api/')) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end('{"error":"Unknown tool."}'); }
  let f = join(root, p);
  try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); const b = await readFile(f); res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end('not found'); }
}).listen(0);
const base = `http://localhost:${srv.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const today = dayKey();
let failures = 0;
const ok = (cond, msg) => { if (cond) console.log(`  ok   ${msg}`); else { failures++; console.log(`  FAIL ${msg}`); } };
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, `play-${name}.png`), fullPage: false }); };
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

const VIEWPORTS = [
  { tag: 'phone', opts: { viewport: { width: 375, height: 760 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  { tag: 'desktop', opts: { viewport: { width: 1280, height: 860 } } },
];

function watch(page, errs) {
  page.on('console', (m) => { if (m.type() === 'error' && !/\/api\//.test(m.location().url || '') && !/\/api\//.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('dialog', (d) => d.accept());
}
async function dismissTutorial(page, name, tag) {
  await page.waitForSelector('#tut-ok', { timeout: 5000 });
  await page.waitForTimeout(350);
  await shot(page, `${name}-tutorial-${tag}`);
  await page.click('#tut-ok');
  await page.waitForSelector('.scrim', { state: 'detached' });
}
async function checkShare(page, game, label) {
  const card = await page.textContent('#r-share pre');
  ok(card.includes(label) && card.includes(`https://quickwell.app/play/${game}/?ref=share-${game}`), `${game}: share card text (${JSON.stringify(card.split('\n')[0])})`);
  await page.click('#r-share [data-copy]');
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  ok(clip === card, `${game}: copy puts the card on the clipboard`);
}
async function freeLimit(page, game, tag) {
  // Use up the 3 free practice runs (start, then leave), then the 4th start must show the Brain Pass sheet.
  for (let i = 0; i < 3; i++) {
    await page.click('#r-menu').catch(() => {});
    await page.waitForSelector('#menu:not([hidden])');
    await page.click('#play-practice');
    await page.waitForSelector('#play:not([hidden])');
    await page.click('#quit');
    await page.waitForSelector('#menu:not([hidden])');
  }
  ok((await page.textContent('#practice-left')).includes('used up'), `${game}: practice counter shows used up`);
  await page.click('#play-practice');
  const sheet = await page.waitForSelector('.sheet[aria-label="Brain Pass"]', { timeout: 3000 }).catch(() => null);
  const txt = sheet ? await sheet.textContent() : '';
  ok(!!sheet && /free/.test(txt) && txt.includes('$2.99') && txt.includes('$19.99') && txt.includes('$29.99') && /coming later/.test(txt), `${game}: free-limit prompt with clear prices`);
  if (game === 'echo') { await page.waitForTimeout(400); await shot(page, `pass-sheet-${tag}`); }
  ok(await overflow(page) <= 0, `${game}: no horizontal scroll with the sheet open`);
  await page.click('.sheet [data-close].btn');
  ok(await page.$('.scrim') === null, `${game}: "Not now" closes the prompt`);
}

for (const { tag, opts } of VIEWPORTS) {
  console.log(`\n== ${tag} ==`);
  const ctx = await browser.newContext({ ...opts, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage(); const errs = []; watch(page, errs);

  // Hub
  await page.goto(`${base}/play/`);
  ok(await page.title() === 'Quickwell Play: 3 free daily brain games, no sign-up', 'hub: title');
  ok((await page.$$('.game')).length === 3, 'hub: three game cards');
  ok(await overflow(page) <= 0, 'hub: no horizontal scroll');
  await shot(page, `hub-${tag}`);

  // Echo: daily (clear two rounds, then lose all three hearts), share card, free limit.
  await page.goto(`${base}/play/echo/`);
  await dismissTutorial(page, 'echo', tag);
  ok(await overflow(page) <= 0, 'echo: menu, no horizontal scroll');
  await page.click('#play-daily');
  const rounds = dailyRounds(today);
  for (let r = 0; r < 2; r++) {
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Your turn'), null, { timeout: 15000 });
    for (const c of rounds[r].seq) await page.click(`#board .tile[data-i="${c}"]`);
    if (r === 0) await shot(page, `echo-play-${tag}`);
  }
  for (let miss = 0; miss < 3; miss++) {
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Your turn'), null, { timeout: 15000 });
    const wrong = (rounds[2].seq[0] + 1) % (rounds[2].size ** 2);
    await page.click(`#board .tile[data-i="${wrong}"]`);
  }
  await page.waitForSelector('#result:not([hidden])', { timeout: 8000 });
  await page.waitForTimeout(900);
  ok(await page.textContent('#r-head') === `Daily Echo #${Math.round((Date.parse(today) - Date.parse('2026-10-12')) / 864e5) + 1}`, 'echo: daily finished');
  await checkShare(page, 'echo', 'Echo #');
  ok((await page.textContent('#r-share pre')).includes('🔷🔷 ✖️') || (await page.textContent('#r-share pre')).includes('🔷🔷✖️'), 'echo: share pattern shows two clean rounds and the miss');
  ok(await overflow(page) <= 0, 'echo: result, no horizontal scroll');
  await shot(page, `echo-result-${tag}`);
  await freeLimit(page, 'echo', tag);

  // Checkout calls go to our server with the brain-pass tool and the agreed plans.
  const bodies = [];
  await page.route('**/api/checkout', async (route) => { bodies.push(JSON.parse(route.request().postData())); await route.fulfill({ status: 409, contentType: 'application/json', body: '{"error":"This plan is not on sale yet."}' }); });
  for (const plan of ['month', 'year', 'lifetime']) {
    await page.click('#play-practice');
    await page.waitForSelector('.sheet[aria-label="Brain Pass"]');
    await page.click(`[data-buy="${plan}"]`);
    await page.waitForTimeout(250);
    await page.click('.sheet [data-close].btn');
  }
  ok(JSON.stringify(bodies.map((b) => [b.tool, b.plan, b.interval])) === JSON.stringify([['brain-pass', 'pass', 'month'], ['brain-pass', 'pass', 'year'], ['brain-pass', 'lifetime', 'once']]), `checkout bodies ${JSON.stringify(bodies.map((b) => `${b.tool}/${b.plan}/${b.interval}`))}`);
  ok((await page.textContent('#toast')).includes('not on sale yet'), 'checkout error is shown politely');
  await page.unroute('**/api/checkout');

  // Swift: answer the daily stream (mostly right, one slip), then let the 45-second clock run out.
  await page.goto(`${base}/play/swift/`);
  await dismissTutorial(page, 'swift', tag);
  await page.click('#play-daily');
  await page.waitForFunction(() => !!document.querySelector('#opts [data-k]'), null, { timeout: 5000 });
  const stream = dailyStream(today);
  for (let i = 0; i < 14; i++) {
    const c = stream[i]; const k = i === 6 ? (c.answer + 1) % c.options.length : c.answer;
    await page.click(`#opts [data-k="${k}"]`);
    if (i === 3) await shot(page, `swift-play-${tag}`);
    await page.waitForTimeout(i === 6 ? 520 : 240);
  }
  ok(Number((await page.textContent('#hud-score')).replace(/,/g, '')) > 100, 'swift: points add up during play');
  await page.waitForSelector('#result:not([hidden])', { timeout: 50000 });
  await page.waitForTimeout(800);
  await checkShare(page, 'swift', 'Swift #');
  ok((await page.textContent('#r-sub')).startsWith('13 right · 1 slip'), `swift: result counts (${await page.textContent('#r-sub')})`);
  ok(await overflow(page) <= 0, 'swift: result, no horizontal scroll');
  await shot(page, `swift-result-${tag}`);
  await freeLimit(page, 'swift', tag);

  // Linkr: solve the daily Normal puzzle by tapping the built path.
  await page.goto(`${base}/play/linkr/`);
  await dismissTutorial(page, 'linkr', tag);
  await page.click('[data-daily="normal"]');
  const p = dailyPuzzle(today, 'normal');
  await page.waitForSelector('#board .lt');
  ok(await page.textContent('#hud-target') === String(p.target), 'linkr: target shown');
  for (const c of p.solution.slice(1, -2)) await page.click(`#board .lt[data-i="${c}"]`);
  await page.waitForTimeout(250);
  await shot(page, `linkr-play-${tag}`);
  for (const c of p.solution.slice(-2)) await page.click(`#board .lt[data-i="${c}"]`);
  await page.waitForSelector('#result:not([hidden])', { timeout: 8000 });
  await page.waitForTimeout(800);
  await checkShare(page, 'linkr', 'Linkr #');
  ok(await overflow(page) <= 0, 'linkr: result, no horizontal scroll');
  await shot(page, `linkr-result-${tag}`);
  await freeLimit(page, 'linkr', tag);

  // Stats sheet
  await page.click('#btn-stats');
  ok(await page.waitForSelector('.sheet[aria-label="Linkr stats"] svg', { timeout: 3000 }).then(() => true).catch(() => false), 'stats: chart renders');
  await page.waitForTimeout(400);
  await shot(page, `linkr-stats-${tag}`);
  await page.keyboard.press('Escape');

  // Hub reflects today's results.
  await page.goto(`${base}/play/`);
  ok(await page.textContent('#h-today') === '3/3', 'hub: 3/3 done today');
  ok(await page.textContent('#h-streak') === '1', 'hub: play streak 1');
  await shot(page, `hub-done-${tag}`);

  // Offline: the worker caches /play/ (never /api/); a reload with no network still opens the games.
  if (tag === 'desktop') {
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await page.waitForTimeout(300);
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    ok(controlled, 'offline: service worker controls /play/');
    const cached = await page.evaluate(async () => { const out = []; for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname); return out; });
    ok(!cached.some((u) => u.startsWith('/api/')), `offline: nothing under /api/ cached (${cached.length} files cached)`);
    await ctx.setOffline(true);
    await page.goto(`${base}/play/swift/?ref=share-swift`);
    ok((await page.textContent('h1')) === 'Swift', 'offline: Swift opens with no network');
    await ctx.setOffline(false);
    // The worker must not affect pages outside /play/.
    await page.goto(`${base}/rate-con-checker/`);
    ok(await page.evaluate(() => !navigator.serviceWorker.controller), 'other pages are not controlled by the Play worker');
  }
  ok(errs.length === 0, `no console errors (${JSON.stringify(errs)})`);
  await ctx.close();

  // Unlocked: checkout return with a session id, /api/access routed to grant the Pass.
  const ctx2 = await browser.newContext(opts); const page2 = await ctx2.newPage(); const errs2 = []; watch(page2, errs2);
  let accessCalls = 0;
  await ctx2.route('**/api/access**', (route) => { accessCalls++; const u = new URL(route.request().url()); route.fulfill({ contentType: 'application/json', body: JSON.stringify(u.searchParams.get('tool') === 'brain-pass' ? { pro: true, token: 'tok.test', plan: 'pass' } : { pro: false }) }); });
  await page2.goto(`${base}/brain-pass/?session_id=cs_test_abc123`);
  await page2.waitForSelector('#on:not([hidden])', { timeout: 5000 });
  ok(page2.url().endsWith('/brain-pass/'), 'unlocked: session id removed from the address bar');
  await shot(page2, `brain-pass-on-${tag}`);
  for (const g of ['echo', 'swift', 'linkr']) {
    await page2.goto(`${base}/play/${g}/`);
    await page2.click('#tut-ok');
    await page2.waitForSelector('#pass-pill:not([hidden])', { timeout: 5000 });
    ok((await page2.textContent('#practice-left')).includes('Unlimited'), `unlocked: ${g} practice unlimited`);
    ok(!(await page2.textContent('#tier-chips')).includes('🔒') && !(await page2.textContent('#mode-chips')).includes('🔒'), `unlocked: ${g} tiers and modes open`);
  }
  for (let i = 0; i < 4; i++) { await page2.click('#play-practice'); await page2.waitForSelector('#play:not([hidden])'); await page2.click('#quit'); }
  ok(await page2.$('.sheet[aria-label="Brain Pass"]') === null, 'unlocked: no upgrade prompt after 4 practice runs');
  await page2.click('#btn-settings'); await page2.selectOption('#set-skin', 'grape'); await page2.click('.sheet [data-close].btn');
  ok(await page2.evaluate(() => document.body.dataset.skin) === 'grape', 'unlocked: colour theme applies');
  await shot(page2, `linkr-unlocked-${tag}`);
  ok(accessCalls >= 1, `unlocked: /api/access was called (${accessCalls})`);
  ok(errs2.length === 0, `unlocked: no console errors (${JSON.stringify(errs2)})`);
  await ctx2.close();
}

// Dark mode, one look.
const dctx = await browser.newContext({ viewport: { width: 375, height: 760 }, colorScheme: 'dark', isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const dp = await dctx.newPage();
for (const g of ['', 'echo/', 'swift/', 'linkr/']) {
  await dp.goto(`${base}/play/${g}`); const t = await dp.$('#tut-ok'); if (t) await t.click();
  ok(await overflow(dp) <= 0, `dark: /play/${g} no horizontal scroll`);
  await shot(dp, `dark-${g.replace('/', '') || 'hub'}-phone`);
}
await dctx.close();
// Hub links (?play=daily) wait for a first-time player to close the tutorial, then start the daily.
const actx = await browser.newContext({ viewport: { width: 375, height: 760 } });
const ap = await actx.newPage();
await ap.goto(`${base}/play/swift/?play=daily`); await ap.waitForSelector('#tut-ok');
ok(await ap.isHidden('#play'), 'autostart: waits behind the tutorial');
await ap.click('#tut-ok');
ok(await ap.waitForSelector('#play:not([hidden])', { timeout: 3000 }).then(() => true).catch(() => false), 'autostart: daily starts after the tutorial');
await actx.close();
// Home page links to Play.
const hp = await browser.newPage(); await hp.goto(`${base}/`);
ok(await hp.$('a[href="/play/"]') !== null, 'home: Play link');
await browser.close(); srv.close();
console.log(failures ? `\n${failures} FAILED` : '\nALL SMOKE CHECKS PASSED');
process.exit(failures ? 1 : 0);
