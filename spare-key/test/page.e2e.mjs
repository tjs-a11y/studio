// Browser test for spare-key/index.html. Not part of `node --test` (needs Playwright).
// Run: PLAYWRIGHT_DIR=<dir containing node_modules/playwright> CHROMIUM=<path> SHOT_DIR=<dir> node spare-key/test/page.e2e.mjs
// Serves the studio root with the site's CSP header. /api/* has no server here (404), except where a test routes
// /api/access or /api/checkout in the browser to stand in for the billing server. Nothing is sent anywhere.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..', '..');
const req = createRequire(path.join(process.env.PLAYWRIGHT_DIR || process.cwd(), 'noop.js'));
const { chromium } = req('playwright');
const SHOTS = process.env.SHOT_DIR || here;
const vercel = JSON.parse(await readFile(path.join(ROOT, 'vercel.json'), 'utf8'));
const CSP = vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css' };

const server = http.createServer(async (rq, rs) => {
  let p = decodeURIComponent(new URL(rq.url, 'http://x').pathname);
  if (p === '/_vercel/insights/script.js') { rs.writeHead(200, { 'content-type': 'text/javascript' }); return rs.end(''); } // served by Vercel in production
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || p.startsWith('/api/')) { rs.writeHead(404, { 'content-type': 'text/plain' }); return rs.end('not found'); }
  try { const b = await readFile(f); rs.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'content-security-policy': CSP }); rs.end(b); }
  catch { rs.writeHead(404, { 'content-type': 'text/plain' }); rs.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const URL0 = `${ORIGIN}/spare-key/`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const errors = [], badRequests = [];
let passed = 0;
const check = async (name, fn) => { await fn(); passed++; console.log('ok -', name); };
const phone = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const desktop = { viewport: { width: 1280, height: 900 } };
const PASS = 'test-only passphrase for e2e';
// Tap the visible chip, as a person would (the radio/checkbox itself is visually hidden).
const tap = (page, name, value) => page.click(`label:has(> input[name="${name}"][value="${value}"])`);

async function open(opts, label) {
  const ctx = await browser.newContext({ acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  const apiFails = [];
  page.on('response', (r) => { if (r.status() >= 400) { const u = new URL(r.url()); if (u.pathname.startsWith('/api/')) apiFails.push(u.pathname); else errors.push(`${label}: ${r.status()} ${r.url()}`); } });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource: the server responded with a status of (404|409|503)/.test(m.text()) && apiFails.length) return; // known /api answers: no billing server in tests, prices not on sale
    errors.push(`${label}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${label}: ${e}`));
  page.on('dialog', (d) => d.accept());
  page.on('request', (r) => {
    const u = r.url();
    if (u.startsWith('data:') || u.startsWith('blob:')) return;
    const x = new URL(u);
    if (x.origin !== ORIGIN || !(x.pathname.startsWith('/spare-key/') || x.pathname === '/js/pro.js' || x.pathname === '/js/va.js' || x.pathname === '/_vercel/insights/script.js' || x.pathname.startsWith('/api/'))) badRequests.push(`${label}: ${u}`);
  });
  return { ctx, page };
}
const noHScroll = async (page) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal scroll');
const stubPrint = (page) => page.evaluate(() => { window.__printed = []; window.print = () => { window.__printed.push(document.getElementById('printArea').innerHTML); }; });
const lastPrint = (page) => page.evaluate(() => window.__printed[window.__printed.length - 1] || '');
const endPrint = (page) => page.evaluate(() => window.dispatchEvent(new Event('afterprint')));

// Five accounts with known answers: Google (app, no backup), Verizon (password), main bank (phone-only app),
// WhatsApp (SMS only), Facebook (password + recovery email, legacy set) -> 2 of 5 ready, 3 lock you out, family reaches 1.
async function makePlan(page, { country = 'US', name = '' } = {}) {
  await page.click('#goMine');
  await page.selectOption('#pCountry', country);
  if (name) await page.fill('#pName', name);
  for (const id of ['google', 'verizon', 'bank1', 'whatsapp', 'facebook']) await page.click(`[data-pid="${id}"]`);
  assert.match(await page.textContent('#pickNext'), /5 accounts/);
  await page.click('#pickNext');
  const answers = { 'Google Account': ['app', ['none'], 'no'], Verizon: ['pw', ['none'], 'na'], 'My main bank': ['phoneapp', ['none'], 'no'], WhatsApp: ['sms', ['none'], 'na'], Facebook: ['pw', ['email'], 'set'] };
  for (const [prefix, [si, bks, lg]] of Object.entries(answers)) {
    const id = await page.evaluate((p) => window.__sk.S.plan.people[window.__sk.S.cur].accounts.find((a) => a.name.startsWith(p)).id, prefix);
    await tap(page, `si-${id}`, si);
    for (const b of bks) await tap(page, `bk-${id}`, b);
    await tap(page, `lg-${id}`, lg);
  }
  await tap(page, 'carrierPin', 'no');
  await page.click('#askNext');
  await page.waitForSelector('#s-result:not([hidden])');
}

try {
  await check('free flow on a phone (light): pick, three taps, Lockout Score, fix list, quick fix raises the score', async () => {
    const { ctx, page } = await open({ ...phone, colorScheme: 'light' }, 'free-light');
    await page.goto(URL0);
    assert.match(await page.textContent('.hook'), /If you lost your phone tonight/);
    await noHScroll(page);
    await page.screenshot({ path: path.join(SHOTS, 'sk-start-phone-light.png'), fullPage: true });
    await makePlan(page);
    assert.equal((await page.textContent('#bigScore')).replace(/\s+/g, ' ').trim(), '2/5 ready');
    assert.match(await page.textContent('#lostLine'), /3 of 5 key accounts would lock you out/);
    assert.match(await page.textContent('#diedLine'), /your family could reach 1 of 5/);
    const titles = await page.$$eval('#fixList .fix .fh b', (b) => b.map((x) => x.textContent));
    assert.equal(titles[0], 'Fix email first');
    assert.equal(titles[1], 'Google Account (Gmail, Photos, Drive): would lock you out');
    assert.ok(titles.includes('Lock your phone number'));
    // official link only (no steps from unchecked help pages)
    const g = page.locator('#fixList .fix', { hasText: 'Google Account (Gmail, Photos, Drive): would lock you out' });
    assert.equal(await g.locator('a').getAttribute('href'), 'https://support.google.com/accounts');
    assert.match(await g.textContent(), /not yet checked by us/);
    await page.screenshot({ path: path.join(SHOTS, 'sk-result-phone-light.png'), fullPage: false });
    await g.locator('button[data-v="email"]').click();
    assert.equal((await page.textContent('#bigScore')).replace(/\s+/g, ' ').trim(), '3/5 ready');
    assert.match(await page.textContent('#scoreCard'), /Up from 2\/5 when you started/);
    await page.locator('#fixList button[data-act="pin"]').click();
    assert.ok(!(await page.$$eval('#fixList .fix .fh b', (b) => b.map((x) => x.textContent))).includes('Lock your phone number'));
    await noHScroll(page);
    await page.screenshot({ path: path.join(SHOTS, 'sk-result-phone-light-full.png'), fullPage: true });
    // nothing is stored unencrypted
    const stored = await page.evaluate(() => JSON.stringify(Object.assign({}, localStorage)) + JSON.stringify(Object.assign({}, sessionStorage)));
    assert.ok(!/Google|Facebook|WhatsApp/.test(stored), 'no plan data in browser storage without a passphrase');
    await ctx.close();
  });

  await check('text fields refuse codes; printable Lost-Phone Sheet; sit-down guide; yearly .ics', async () => {
    const { ctx, page } = await open({ ...phone, colorScheme: 'light' }, 'sheet');
    await page.goto(URL0); await makePlan(page, { name: 'Ana' });
    await page.fill('#codesPlace', '4471 9932');
    assert.ok(await page.isVisible('#secretWarn'));
    assert.equal(await page.evaluate(() => window.__sk.S.plan.people[0].codesPlace), '');
    await page.fill('#codesPlace', 'blue folder, top desk drawer');
    assert.ok(!(await page.isVisible('#secretWarn')));
    await page.fill('#trustedName', 'my sister Leo');
    await page.check('#handBox');
    await page.click('#toggleSheet');
    assert.match(await page.textContent('#sheetPreview'), /Recovery order/);
    await stubPrint(page);
    await page.click('#printSheet');
    const sheet = await lastPrint(page);
    for (const s of ['Lost-Phone Sheet', 'for Ana', 'The first hour', 'Verizon', 'Recovery order', 'blue folder, top desk drawer', 'my sister Leo', 'Backup codes, written by hand', 'Google Account']) assert.ok(sheet.includes(s), s);
    const order = [...sheet.matchAll(/<tr><td>(\d)<\/td><td>([^<]+)<\/td>/g)].map((m) => m[2]);
    assert.deepEqual(order, ['Google Account (Gmail, Photos, Drive)', 'Verizon', 'My main bank', 'WhatsApp', 'Facebook'], 'email first, then number, bank, messaging');
    await page.emulateMedia({ media: 'print' });
    await page.screenshot({ path: path.join(SHOTS, 'sk-sheet-print.png'), fullPage: true });
    await page.pdf({ path: path.join(SHOTS, 'sk-sheet.pdf'), format: 'Letter' });
    await page.emulateMedia({ media: 'screen' });
    await endPrint(page);
    assert.equal(await page.evaluate(() => document.getElementById('printArea').innerHTML), '', 'print view cleared after printing');
    await page.click('#guideBtn2');
    assert.match(await lastPrint(page), /Doing it together/);
    await endPrint(page);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#icsBtn')]);
    assert.equal(dl.suggestedFilename(), 'spare-key-reminders.ics');
    const ics = await readFile(await dl.path(), 'utf8');
    assert.match(ics, /^BEGIN:VCALENDAR\r\n/); assert.match(ics, /RRULE:FREQ=YEARLY/); assert.ok(!/Renew soon/.test(ics), 'no document reminders on the free plan');
    await ctx.close();
  });

  await check('encrypted export and import on a second browser; wrong passphrase refused; device save locked and reopened', async () => {
    const { ctx, page } = await open({ ...desktop, colorScheme: 'dark' }, 'export');
    await page.goto(URL0); await makePlan(page, { name: 'Ana' });
    await page.fill('#codesPlace', 'grey box, hall closet');
    await page.click('#exportFile');
    await page.waitForSelector('#passDlg[open]');
    await page.click('#pdOwnBtn'); await page.fill('#pdOwn', PASS); await page.check('#pdAck');
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.click('#pdOk')]);
    assert.equal(dl.suggestedFilename(), 'family-plan.sparekey');
    const file = path.join(SHOTS, 'sk-family-plan.sparekey'); await dl.saveAs(file); // kept after this context closes
    const text = await readFile(file, 'utf8');
    const env = JSON.parse(text);
    assert.equal(env.iter, 600000); assert.equal(env.cipher, 'AES-GCM-256');
    for (const s of ['Ana', 'Google', 'grey box', 'Facebook']) assert.ok(!text.includes(s), `plaintext in file: ${s}`);
    assert.equal(await page.evaluate(() => document.getElementById('pdGen').textContent + document.getElementById('pdOwn').value), '', 'passphrase wiped from the page');
    // device save, encrypted
    await page.click('#saveLocal'); await page.waitForSelector('#passDlg[open]');
    const gen = await page.textContent('#pdGen'); assert.match(gen, /^[a-z]+(-[a-z]+){5}$/);
    await page.click('#pdOk'); assert.match(await page.textContent('#pdMsg'), /Tick the box/);
    await page.check('#pdAck'); await page.click('#pdOk');
    await page.waitForSelector('#passDlg[open]', { state: 'detached', timeout: 30000 });
    const vault = await page.evaluate(() => localStorage.getItem('spare-key:vault'));
    assert.ok(vault && !/Ana|Google/.test(vault));
    await page.screenshot({ path: path.join(SHOTS, 'sk-result-desktop-dark.png'), fullPage: false });
    await page.reload();
    assert.ok(await page.isVisible('#vaultBanner'));
    await page.click('#vbOpen'); await page.fill('#pdPass', 'nope nope nope'); await page.click('#pdOk');
    await page.waitForFunction(() => /doesn't open this plan/.test(document.getElementById('pdMsg').textContent), null, { timeout: 30000 });
    await page.fill('#pdPass', gen); await page.click('#pdOk');
    await page.waitForSelector('#s-result:not([hidden])', { timeout: 30000 });
    assert.equal((await page.textContent('#bigScore')).replace(/\s+/g, ' ').trim(), '2/5 ready');
    await ctx.close();

    // a different browser context = another device with nothing stored
    const o = await open({ ...phone, colorScheme: 'dark' }, 'import');
    await o.page.goto(URL0);
    assert.ok(!(await o.page.isVisible('#vaultBanner')));
    await o.page.setInputFiles('#fileIn', file);
    await o.page.waitForSelector('#passDlg[open]');
    await o.page.fill('#pdPass', 'wrong passphrase'); await o.page.click('#pdOk');
    await o.page.waitForFunction(() => /doesn't open this plan/.test(document.getElementById('pdMsg').textContent), null, { timeout: 30000 });
    await o.page.fill('#pdPass', PASS); await o.page.click('#pdOk');
    await o.page.waitForSelector('#s-result:not([hidden])', { timeout: 30000 });
    assert.equal((await o.page.textContent('#bigScore')).replace(/\s+/g, ' ').trim(), '2/5 ready');
    assert.equal(await o.page.inputValue('#codesPlace'), 'grey box, hall closet');
    await noHScroll(o.page);
    await o.page.screenshot({ path: path.join(SHOTS, 'sk-result-phone-dark.png'), fullPage: false });
    await o.ctx.close();
  });

  await check('buying asks to lock the plan first, then shows a polite message while checkout is not on sale', async () => {
    const { ctx, page } = await open({ ...phone, colorScheme: 'light' }, 'buy');
    await page.route('**/api/checkout', (r) => r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'This plan is not on sale yet.' }) }));
    await page.goto(URL0); await makePlan(page);
    assert.match(await page.textContent('#upsell'), /\$4\.99/);
    await page.click('#buyBtn');
    await page.waitForSelector('#passDlg[open]');
    assert.match(await page.textContent('#pdIntro'), /Before you pay, lock your plan/);
    await page.check('#pdAck'); await page.click('#pdOk');
    await page.waitForFunction(() => /very soon/.test(document.getElementById('buyMsg').textContent), null, { timeout: 30000 });
    assert.ok(await page.evaluate(() => !!localStorage.getItem('spare-key:vault')));
    await ctx.close();
  });

  await check('Family Pack unlocked via routed /api/access: people, letter, wallet cards, binder, document reminders', async () => {
    const { ctx, page } = await open({ ...desktop, colorScheme: 'dark' }, 'family');
    const seen = [];
    await page.route('**/api/access**', (r) => { seen.push(r.request().url()); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pro: true, once: true, token: 'test-token', plan: 'family' }) }); });
    await page.goto(URL0 + '?session_id=cs_test_abc123');
    await page.waitForSelector('#welcome:not([hidden])');
    assert.ok(seen.some((u) => /tool=spare-key&session_id=cs_test_abc123/.test(u)));
    assert.ok(!page.url().includes('session_id'), 'session id removed from the address bar');
    await makePlan(page, { name: 'Ana' });
    assert.ok(await page.isHidden('#upsell')); assert.ok(await page.isVisible('#proOn')); assert.ok(await page.isVisible('#familyOpen'));
    // second person
    await page.click('#addPerson'); await page.waitForSelector('#s-pick:not([hidden])');
    await page.fill('#pName', 'Mom'); await page.click('[data-pid="apple"]'); await page.click('[data-pid="facebook"]'); await page.click('#pickNext');
    const ids = await page.evaluate(() => window.__sk.S.plan.people[1].accounts.map((a) => a.id));
    for (const id of ids) { await tap(page, `si-${id}`, 'sms'); await tap(page, `bk-${id}`, 'contact'); await tap(page, `lg-${id}`, 'set'); }
    await page.click('#askNext');
    assert.equal((await page.textContent('#bigScore')).replace(/\s+/g, ' ').trim(), '2/2 ready');
    assert.deepEqual(await page.$$eval('#people button[data-person]', (b) => b.map((x) => x.textContent)), ['Ana', 'Mom']);
    // letter
    await page.click('#addContact');
    const c = page.locator('#contacts .contact').first();
    await c.locator('input').nth(0).fill('Leo'); await c.locator('input').nth(1).fill('brother'); await c.locator('input').nth(2).fill('+1 555 0100');
    await page.fill('[data-where="will"]', 'Lawyer office, Main Street');
    await page.fill('[data-where="id"]', '000111222'); // looks like a number: refused
    assert.ok(await page.isVisible('#famWarn'));
    await page.fill('[data-where="id"]', 'grey box, bedroom closet');
    await page.fill('[data-wish="photos"]', 'share with my children');
    await page.fill('#subs', 'streaming, gym');
    await page.click('#addDoc');
    await page.fill('[data-doc="0"][data-k="expires"]', '2027-06-30');
    await page.screenshot({ path: path.join(SHOTS, 'sk-family-desktop-dark.png'), fullPage: true });
    await stubPrint(page);
    await page.click('#printLetter');
    const letter = await lastPrint(page);
    for (const s of ['For My Family', 'From Ana, Mom', 'not a will or power of attorney', 'Leo', '+1 555 0100', 'Lawyer office, Main Street', 'grey box, bedroom closet', 'share with my children', 'streaming, gym', 'Our family code word', 'Apple Account']) assert.ok(letter.includes(s), s);
    assert.ok(!letter.includes('000111222'));
    await page.emulateMedia({ media: 'print' });
    await page.screenshot({ path: path.join(SHOTS, 'sk-letter-print.png'), fullPage: true });
    await page.emulateMedia({ media: 'screen' }); await endPrint(page);
    await page.click('#printCards'); assert.match(await lastPrint(page), /Spare Key card · Ana[\s\S]*Spare Key card · Mom/); await endPrint(page);
    await page.click('#printBinder');
    const binder = await lastPrint(page);
    assert.equal((binder.match(/class="pp"/g) || []).length, 5, 'two sheets, letter, cards, guide'); await endPrint(page);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#icsBtn')]);
    const ics = await readFile(await dl.path(), 'utf8');
    assert.match(ics, /Renew soon: Passport/); assert.match(ics, /DTSTART;VALUE=DATE:20270630/);
    await noHScroll(page);
    await ctx.close();
  });

  await check('Spanish, phone, dark; then desktop light start', async () => {
    const { ctx, page } = await open({ ...phone, colorScheme: 'dark', locale: 'es-ES' }, 'es');
    await page.goto(URL0);
    assert.match(await page.textContent('.hook'), /Si perdieras tu teléfono esta noche/);
    assert.equal(await page.getAttribute('html', 'lang'), 'es');
    await page.click('#goMine'); await page.click('[data-pid="google"]');
    assert.match(await page.textContent('#pickNext'), /Siguiente: 1 cuenta/);
    await page.click('#pickNext'); await page.click('#askNext');
    assert.match(await page.textContent('#lostLine'), /Si perdieras tu teléfono hoy/);
    await noHScroll(page);
    await page.screenshot({ path: path.join(SHOTS, 'sk-es-phone-dark.png'), fullPage: false });
    await page.click('#langBtn');
    assert.match(await page.textContent('#lostLine'), /If you lost your phone today/);
    await ctx.close();
    const d = await open({ ...desktop, colorScheme: 'light' }, 'desktop');
    await d.page.goto(URL0); await noHScroll(d.page);
    await d.page.screenshot({ path: path.join(SHOTS, 'sk-start-desktop-light.png'), fullPage: true });
    await d.ctx.close();
  });

  assert.deepEqual(badRequests, [], 'only /spare-key/, /js/pro.js, the same-origin page-visit counter and /api/* were requested');
  assert.deepEqual(errors, [], 'no console errors beyond the known /api responses');
  console.log(`\n${passed} passed`);
} finally {
  await browser.close();
  server.close();
}
