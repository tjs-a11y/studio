// End-to-end browser test for /plot-file-checker/ (Playwright, Chromium).
// Run from the repo root:
//   PW_NODE_MODULES=/path/to/node_modules CHROMIUM_PATH=/path/to/chrome SHOT_DIR=/tmp node plot-file-checker/test/e2e.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const SHOTS = process.env.SHOT_DIR || os.tmpdir();
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  const p = require.resolve('playwright', { paths: [process.env.PW_NODE_MODULES, '/opt/node22/lib/node_modules'].filter(Boolean) });
  ({ chromium } = require(p));
}

// tiny static server
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/_vercel/insights/script.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(''); } // served by Vercel in production
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try { const body = await readFile(file); res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/plot-file-checker/`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const results = [];
const step = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]); } };

async function newPage(opts) {
  const ctx = await browser.newContext({ acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  const errors = [], events = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  let apiMode = 'ok';
  await page.route('**/api/event', async (route) => {
    events.push(JSON.parse(route.request().postData()));
    if (apiMode === 'fail') return route.fulfill({ status: 500, body: 'nope' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.goto(URL0);
  return { ctx, page, errors, events, setApi: (m) => { apiMode = m; } };
}
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `eudr-${name}.png`), fullPage: true });
const ccw = (ring) => { let s = 0; for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]; return s > 0; };

// ---------- desktop, English ----------
const D = await newPage({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
const { page } = D;

await step('loads in English with privacy note', async () => {
  assert.equal(await page.textContent('h1'), 'EUDR Plot File Checker');
  assert.match(await page.textContent('.privacy'), /never leaves this device/);
});

await step('messy sample: errors, fixes, verdict', async () => {
  await page.click('#sampleMessy');
  await page.waitForSelector('#result:not([hidden])');
  assert.match(await page.textContent('#verdict'), /4 of 8 plots still need fixing/);
  const need = await page.textContent('#need');
  for (const s of ['Boundary crosses itself', 'Single point used for a plot over 4 ha', 'Coordinates at 0, 0', 'Line instead of a shape', 'Overlaps another plot']) assert.ok(need.includes(s), 'missing: ' + s);
  const fixed = await page.textContent('#fixed');
  for (const s of ['Swapped latitude/longitude', 'Closed the polygon', 'counter-clockwise', 'Removed repeated points', '6 decimal places', 'Removed the old "crs"']) assert.ok(fixed.includes(s), 'missing fix: ' + s);
  assert.equal(await page.locator('#map svg path, #map svg circle').count() >= 6, true);
  assert.equal(await page.locator('#tbl tbody tr').count(), 8);
  await shot(page, 'desktop-messy');
});

await step('samples do not send a usage event', async () => { assert.equal(D.events.length, 0); });

await step('map click highlights the table row', async () => {
  await page.click('#map svg path[data-i="1"]');
  assert.equal(await page.getAttribute('#row-1', 'class'), 'hl');
});

await step('download fixed GeoJSON: fixes applied', async () => {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dlGeo')]);
  assert.equal(dl.suggestedFilename(), 'sample-messy-cooperative-fixed.geojson');
  const fc = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  assert.equal(fc.type, 'FeatureCollection'); assert.equal(fc.features.length, 8);
  const r1 = fc.features[0].geometry.coordinates[0];
  assert.deepEqual(r1[0], r1[r1.length - 1], 'plot 1 closed');
  assert.ok(fc.features[1].geometry.coordinates[0].every(([lon, lat]) => lon < -6 && lat > 5), 'plot 2 swapped');
  const r3 = fc.features[2].geometry.coordinates[0];
  assert.ok(ccw(r3), 'plot 3 CCW'); assert.equal(r3.length, 5, 'plot 3 duplicate removed');
  assert.equal(fc.features[0].properties.ProducerCountry, 'CI');
  assert.equal(fc.features[0].properties.ProducerName, 'Producteur A');
  assert.match(await page.textContent('#dlMsg'), /Downloaded 8 plot/);
});

await step('leave out plots with errors', async () => {
  await page.check('#excludeErr');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dlGeo')]);
  assert.equal(JSON.parse(readFileSync(await dl.path(), 'utf8')).features.length, 4);
  await page.uncheck('#excludeErr');
});

await step('buyer summary: one printed page, fingerprint matches the downloaded file', async () => {
  await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dlGeo')]);
  const bytes = readFileSync(await dl.path());
  const want = createHash('sha256').update(bytes).digest('hex');
  await page.click('#dlSheet');
  assert.equal(await page.evaluate(() => window.__printed), 1);
  const sheet = await page.textContent('#sheet');
  assert.match(sheet, /EUDR plot file check: summary/);
  assert.match(sheet, /SAMPLE: fictional data/);
  assert.match(sheet, /4 of 8 plots still need fixing/);
  assert.match(sheet, /Boundary crosses itself/);
  assert.match(sheet, /not a deforestation or legality check/);
  assert.equal(await page.textContent('#sheetFp'), want, 'fingerprint = SHA-256 of the downloaded file');
  assert.equal(await page.locator('#sheet .shmap svg').count(), 1);
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.isVisible('#sheet'), true, 'sheet shows when printing');
  assert.equal(await page.isVisible('#drop'), false, 'the tool page is hidden when printing');
  await page.pdf({ path: path.join(SHOTS, 'eudr-buyer-summary.pdf'), format: 'A4' });
  await page.emulateMedia({ media: 'screen' });
  assert.equal(await page.isVisible('#sheet'), false, 'sheet hidden on screen');
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  assert.equal(await page.evaluate(() => document.body.classList.contains('print-sheet')), false);
});

await step('buyer summary: fingerprint follows "leave out plots with errors"', async () => {
  await page.check('#excludeErr');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dlGeo')]);
  const want = createHash('sha256').update(readFileSync(await dl.path())).digest('hex');
  await page.waitForTimeout(200);
  await page.click('#dlSheet');
  assert.equal(await page.textContent('#sheetFp'), want);
  assert.match(await page.textContent('#sheet'), /plots that still have errors left out/);
  await page.uncheck('#excludeErr');
});

await step('download CSV report', async () => {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dlCsv')]);
  const csv = readFileSync(await dl.path(), 'utf8');
  assert.match(csv, /^﻿plot,label,severity,code,message,advice/);
  assert.match(csv, /E_SELF_INTERSECT/); assert.match(csv, /F_SWAP/);
});

await step('copy report (clipboard or visible fallback)', async () => {
  await page.click('#cpRep');
  await page.waitForFunction(() => document.getElementById('dlMsg').textContent.length > 0);
  const m = await page.textContent('#dlMsg');
  if (/did not work/.test(m)) assert.match(await page.textContent('#copyOut'), /Boundary crosses itself/);
  else assert.match(m, /Copied/);
});

await step('clean sample passes', async () => {
  await page.click('#sampleClean');
  await page.waitForFunction(() => /All 4 plots pass/.test(document.getElementById('verdict').textContent));
  assert.match(await page.textContent('#need'), /Nothing left to fix/);
  assert.match(await page.textContent('#fixed'), /No changes were needed/);
  await shot(page, 'desktop-clean');
});

await step('user CSV file: converted, swap fixed via country, event has only a count', async () => {
  const csv = 'farmer,lat,lon,area_ha\nKofi,-1.620001,6.700002,1.5\nAma,-1.610003,6.710004,2\n';
  await page.setInputFiles('#file', { name: 'farms.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.waitForFunction(() => /farms\.csv/.test(document.getElementById('resTitle').textContent));
  assert.match(await page.textContent('#fixed'), /Converted CSV/);
  assert.match(await page.textContent('#fixed'), /Swapped latitude/);
  assert.equal(D.events.length, 1);
  assert.deepEqual(D.events[0], { tool: 'plot-file-checker', event: 'check', plots: 2 });
});

await step('Ethiopia swapped without country: only flagged; choosing the country fixes it', async () => {
  const gj = JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [7.678123, 36.834567] } }] });
  await page.setInputFiles('#file', { name: 'jimma.geojson', mimeType: 'application/json', buffer: Buffer.from(gj) });
  await page.waitForFunction(() => /jimma/.test(document.getElementById('resTitle').textContent));
  assert.match(await page.textContent('#need'), /may be swapped/);
  await page.selectOption('#country', 'ET');
  await page.waitForFunction(() => /Swapped latitude/.test(document.getElementById('fixed').textContent));
  await page.selectOption('#country', '');
});

await step('KML file with altitude', async () => {
  const kml = `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>Ferme 1</name><ExtendedData><Data name="pays"><value>Ghana</value></Data></ExtendedData><Polygon><outerBoundaryIs><LinearRing><coordinates>-1.620000,6.700000,120 -1.618000,6.700000,121 -1.618000,6.702000,119 -1.620000,6.702000,118 -1.620000,6.700000,120</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`;
  await page.setInputFiles('#file', { name: 'farm.kml', mimeType: 'application/vnd.google-earth.kml+xml', buffer: Buffer.from(kml) });
  await page.waitForFunction(() => /farm\.kml/.test(document.getElementById('resTitle').textContent));
  const fixed = await page.textContent('#fixed');
  assert.match(fixed, /Converted KML/); assert.match(fixed, /Removed altitude/);
  assert.match(await page.textContent('#verdict'), /All 1 plots pass/);
});

await step('WKT pasted', async () => {
  await page.click('#inputCard summary');
  await page.fill('#pasteText', 'POLYGON ((-1.62 6.70, -1.61 6.70, -1.61 6.71, -1.62 6.71))');
  await page.click('#pasteBtn');
  await page.waitForFunction(() => /pasted text/.test(document.getElementById('resTitle').textContent));
  const fixed = await page.textContent('#fixed');
  assert.match(fixed, /Converted WKT/); assert.match(fixed, /Closed the polygon/); assert.match(fixed, /6 decimal places/);
  assert.match(await page.textContent('#need'), /Low GPS precision/);
});

await step('zipped shapefile: friendly unsupported message', async () => {
  await page.setInputFiles('#file', { name: 'plots.zip', mimeType: 'application/zip', buffer: Buffer.from('PK\u0003\u0004abc') });
  await page.waitForFunction(() => /plots\.zip/.test(document.getElementById('resTitle').textContent));
  assert.match(await page.textContent('#fileErr'), /not supported yet/);
});

await step('waitlist: validation, thanks, failure message', async () => {
  const before = D.events.length;
  await page.fill('#wlEmail', 'coop@example.com');
  await page.click('#wlBtn');
  assert.match(await page.textContent('#wlMsg'), /valid email address and tick/);
  await page.check('#wlConsent');
  await page.click('#wlBtn');
  await page.waitForFunction(() => /Thank you/.test(document.getElementById('wlMsg').textContent));
  assert.deepEqual(D.events[before], { tool: 'plot-file-checker', event: 'waitlist', email: 'coop@example.com' });
  D.setApi('fail');
  await page.fill('#wlEmail', 'coop2@example.com');
  await page.click('#wlBtn');
  await page.waitForFunction(() => /Couldn't save — please try again later/.test(document.getElementById('wlMsg').textContent));
  D.setApi('ok');
});

await step('French toggle', async () => {
  await page.click('#sampleMessy');
  await page.click('[data-lang="fr"]');
  assert.equal(await page.textContent('h1'), 'Vérificateur de fichiers de parcelles EUDR');
  assert.equal(await page.getAttribute('html', 'lang'), 'fr');
  assert.match(await page.textContent('#verdict'), /4 parcelle\(s\) sur 8/);
  assert.match(await page.textContent('#need'), /Le contour se croise/);
  assert.match(await page.textContent('#fixed'), /Latitude\/longitude remises/);
  assert.match(await page.textContent('.privacy'), /ne quitte jamais/);
  await shot(page, 'desktop-fr');
  await page.click('[data-lang="en"]');
  assert.equal(await page.textContent('h1'), 'EUDR Plot File Checker');
});

await step('desktop: no console errors (except the deliberate 500 in the waitlist failure test)', async () => { const errs = D.errors.filter((e) => !/status of 500/.test(e)); assert.deepEqual(errs, [], JSON.stringify(D.errors)); });
await D.ctx.close();

// ---------- phone, French browser, light and dark ----------
for (const scheme of ['light', 'dark']) {
  const M = await newPage({ viewport: { width: 375, height: 812 }, locale: 'fr-FR', colorScheme: scheme, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await step(`phone ${scheme}: French picked from browser language`, async () => {
    assert.equal(await M.page.textContent('h1'), 'Vérificateur de fichiers de parcelles EUDR');
  });
  await step(`phone ${scheme}: messy sample, no horizontal scroll`, async () => {
    await M.page.click('#sampleMessy');
    await M.page.waitForSelector('#result:not([hidden])');
    const sw = await M.page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(sw <= 375, 'scrollWidth ' + sw);
    await shot(M.page, `phone-${scheme}`);
    await M.page.evaluate(() => window.scrollTo(0, 0));
    await M.page.screenshot({ path: path.join(SHOTS, `eudr-phone-${scheme}-top.png`) });
  });
  await step(`phone ${scheme}: buyer summary in French`, async () => {
    await M.page.evaluate(() => { window.print = () => {}; });
    await M.page.click('#dlSheet');
    assert.match(await M.page.textContent('#sheet'), /Contrôle de fichier de parcelles EUDR : résumé/);
    assert.match(await M.page.textContent('#sheetFp'), /^[0-9a-f]{64}$/);
  });
  await step(`phone ${scheme}: no console errors`, async () => { assert.deepEqual(M.errors, []); });
  await M.ctx.close();
}

await browser.close();
server.close();
for (const r of results) console.log(r.join('  '));
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
