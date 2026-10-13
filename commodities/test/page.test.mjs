// Static checks on the pages: search tags, brand, links, i18n hooks, catalog entry. (Browser test: page.e2e.mjs.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { STRINGS } from '../js/i18n.js';

const TOOL = new URL('..', import.meta.url).pathname;
const KIT = join(TOOL, '..');
const PAGES = { 'index.html': '/commodities/', 'brief/index.html': '/commodities/brief/', 'where-to-buy/index.html': '/commodities/where-to-buy/' };
const read = (f) => readFileSync(join(TOOL, f), 'utf8');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"');

test('search basics: short unique titles and descriptions, canonical, OG and Twitter tags', () => {
  const titles = new Set(), descs = new Set();
  for (const [f, path] of Object.entries(PAGES)) {
    const h = read(f);
    const title = decode(/<title>([^<]*)<\/title>/.exec(h)[1]);
    const desc = decode(/<meta name="description" content="([^"]*)">/.exec(h)[1]);
    assert.ok(title.length <= 60, `${f}: title ${title.length} chars`);
    assert.ok(desc.length <= 155, `${f}: description ${desc.length} chars`);
    assert.ok(!titles.has(title) && !descs.has(desc)); titles.add(title); descs.add(desc);
    assert.ok(h.includes(`<link rel="canonical" href="https://quickwell.app${path}">`), `${f} canonical`);
    assert.ok(h.includes(`<meta property="og:url" content="https://quickwell.app${path}">`), `${f} og:url`);
    for (const tag of ['og:title', 'og:description', 'og:image', 'twitter:card', 'twitter:image']) assert.ok(h.includes(tag), `${f}: ${tag}`);
    assert.ok(existsSync(join(TOOL, 'og.png')));
  }
});

test('brand: WorldSource Commodity Desk by Quickwell; the internal company name never appears in shipped files', () => {
  const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  // Launch kit layout (workflow.yml, catalog-entry.json, README.md next to the folder) or studio layout.
  const extra = ['workflow.yml', 'catalog-entry.json', 'README.md', '.github/workflows/commodity-desk.yml'].map((f) => join(KIT, f)).filter(existsSync);
  for (const f of [...walk(TOOL), ...extra]) {
    if (/\.(png|xlsx)$/.test(f)) continue;
    assert.doesNotMatch(readFileSync(f, 'utf8'), new RegExp(['MO', 'NAD'].join(''), 'i'), f);
  }
  for (const f of Object.keys(PAGES)) assert.match(read(f), /WorldSource Commodity Desk/);
});

test('JSON-LD offers match the planned prices', () => {
  const j = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(read('index.html'))[1]);
  assert.deepEqual(j['@graph'][0].offers.map((o) => o.price).sort(), ['0', '2.99', '24.99']);
});

test('every page carries the no-advice, no-funds, no-trades line', () => {
  for (const f of Object.keys(PAGES)) assert.match(read(f), /not investment advice[\s\S]*hold funds[\s\S]*(execute|trades)/i, f);
});

test('internal links point at files in this folder or at studio pages that exist', () => {
  const studioPages = ['/', '/privacy.html', '/terms.html', '/js/pro.js', '/plus/'];
  for (const f of Object.keys(PAGES)) for (const m of read(f).matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const p = m[1].split('#')[0];
    if (studioPages.includes(p)) continue;
    assert.ok(p.startsWith('/commodities/'), `${f}: ${p}`);
    const local = join(TOOL, p.slice('/commodities/'.length));
    assert.ok(existsSync(local.endsWith('/') ? join(local, 'index.html') : local), `${f}: broken ${p}`);
  }
});

test('every data-i18n key exists in the English strings', () => {
  for (const f of Object.keys(PAGES)) for (const m of read(f).matchAll(/data-i18n="([^"]+)"/g)) assert.ok(m[1] in STRINGS.en, `${f}: ${m[1]}`);
});

test('where-to-buy names no dealer, broker or exchange companies', () => {
  const h = read('where-to-buy/index.html');
  for (const name of ['CME', 'ICE Futures', 'London Metal Exchange', 'LME', 'Kitco', 'APMEX', 'JM Bullion', 'BullionVault', 'Royal Mint', 'Interactive Brokers', 'Robinhood', 'eToro', 'MCX', 'Shanghai'])
    assert.ok(!h.includes(name), name);
});

test('catalog entry matches the page: tool id = folder name, Desk plan sold monthly/yearly', () => {
  const c = existsSync(join(KIT, 'catalog-entry.json')) ? JSON.parse(readFileSync(join(KIT, 'catalog-entry.json'), 'utf8')) : JSON.parse(readFileSync(join(KIT, 'catalog', 'tools.json'), 'utf8')).tools.find((x) => x.id === 'commodities');
  assert.ok(c, 'catalog entry for commodities');
  assert.equal(c.id, 'commodities');
  assert.deepEqual(c.plans.map((p) => p.id), ['desk']);
  assert.match(read('js/chrome.js'), /tool: 'commodities'/);
  assert.match(read('js/chrome.js'), /Studio\.upgrade\('desk', interval\)/);
  assert.ok(c.tagline.length <= 160);
});

test('the page says "unavailable" (not sample prices) when latest.json is missing', () => {
  assert.match(STRINGS.en['st.unavailable'], /not available yet/);
  assert.match(read('js/app.js'), /tr\('st\.unavailable'\)/);
  assert.match(read('js/chrome.js'), /r\.ok \? r\.json\(\) : null/);
});
