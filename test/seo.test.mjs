// Search basics on every main page: unique short titles and descriptions, canonical + Open Graph + Twitter tags
// on the configured origin, valid JSON-LD, internal links that resolve, guides that end with a disclaimer and
// sources, and a sitemap/robots pair that only lists pages that exist.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const origin = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8')).origin;
const read = (f) => readFileSync(join(root, f), 'utf8');
const tools = JSON.parse(read('catalog/tools.json')).tools.map((t) => t.id);
const guideDirs = readdirSync(join(root, 'guides'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const subPages = (id) => readdirSync(join(root, id), { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(root, id, d.name, 'index.html'))).map((d) => `${id}/${d.name}/index.html`);
const play = ['play/index.html', ...subPages('play'), 'brain-pass/index.html'];
const pages = [...new Set(['index.html', ...tools.flatMap((t) => [`${t}/index.html`, ...subPages(t)]), ...play, 'guides/index.html', ...guideDirs.map((g) => `guides/${g}/index.html`), 'privacy.html', 'terms.html'])];
const urlPath = (f) => '/' + f.replace(/index\.html$/, '');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<');
const exists = (href) => { const p = join(root, decodeURIComponent(href.split(/[?#]/)[0])); return existsSync(p) && (!statSync(p).isDirectory() || existsSync(join(p, 'index.html'))); };

test('every main page has unique, short title and description, plus canonical, OG and Twitter tags', () => {
  const titles = new Set(), descs = new Set();
  for (const f of pages) {
    const h = read(f);
    const title = decode((/<title>([^<]*)<\/title>/.exec(h) || [])[1] || '');
    const desc = decode((/<meta name="description" content="([^"]*)">/.exec(h) || [])[1] || '');
    assert.ok(title && title.length <= 60, `${f}: title missing or over 60 chars (${title.length})`);
    assert.ok(desc && desc.length <= 155, `${f}: description missing or over 155 chars (${desc.length})`);
    assert.ok(!titles.has(title), `${f}: duplicate title`); titles.add(title);
    assert.ok(!descs.has(desc), `${f}: duplicate description`); descs.add(desc);
    assert.ok(h.includes(`<link rel="canonical" href="${origin}${urlPath(f)}">`), `${f}: canonical`);
    assert.ok(h.includes(`<meta property="og:url" content="${origin}${urlPath(f)}">`), `${f}: og:url`);
    for (const tag of ['og:title', 'og:description', 'og:image', 'twitter:card', 'twitter:image']) assert.ok(h.includes(tag), `${f}: ${tag}`);
    const img = /<meta property="og:image" content="([^"]+)">/.exec(h)[1];
    assert.ok(img.startsWith(origin + '/') && exists(img.slice(origin.length)), `${f}: og:image file missing`);
    assert.ok(!/MONAD/i.test(h), `${f}: internal name leaked`);
  }
});

test('JSON-LD parses, and tool offers match the real prices', () => {
  const offers = {};
  for (const f of pages) {
    for (const m of read(f).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const j = JSON.parse(m[1]);
      for (const n of j['@graph'] || [j]) if (n.offers) offers[f] = [].concat(n.offers).map((o) => o.price).sort();
    }
  }
  assert.deepEqual(offers['rate-con-checker/index.html'], ['0', '79', '9']);
  assert.deepEqual(offers['audit-kit/index.html'], ['0', '39']);
  assert.deepEqual(offers['plot-file-checker/index.html'], ['0']);
  assert.deepEqual(offers['permit-watch/index.html'], ['0']);
  for (const f of ['play/index.html', 'play/echo/index.html', 'play/swift/index.html', 'play/linkr/index.html']) assert.deepEqual(offers[f], ['0', '19.99', '2.99', '29.99'], f);
  assert.deepEqual(offers['brain-pass/index.html'], ['19.99', '2.99', '29.99']);
});

test('internal links on main pages resolve', () => {
  for (const f of pages) for (const m of read(f).matchAll(/href="(\/[^"/][^"]*|\/)"/g)) {
    if (m[1].startsWith('/api/') || m[1].includes('${') || m[1].includes('safeId')) continue; // skip API calls, template strings, and the catalog-generated href
    assert.ok(exists(m[1]), `${f}: broken link ${m[1]}`);
  }
});

test('guides end with a disclaimer and sources, and link to a tool', () => {
  assert.ok(guideDirs.length >= 8);
  for (const g of guideDirs) {
    const h = read(`guides/${g}/index.html`);
    assert.match(h, /Not legal advice|Ceci n’est pas un avis juridique|No es asesoría legal/, `${g}: disclaimer`);
    assert.match(h, /<h2>(?:Sources|Fuentes)<\/h2>\s*<ul>\s*<li>/, `${g}: sources`);
    assert.ok(tools.some((t) => h.includes(`href="/${t}/`)) || h.includes('href="/shield/'), `${g}: no tool link`);
  }
});

test('sitemap and robots list only real pages on the configured origin', () => {
  const index = read('sitemap.xml');
  const parts = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(parts.includes(`${origin}/sitemap-main.xml`));
  const locs = [];
  for (const p of parts) { assert.ok(p.startsWith(origin + '/')); const f = p.slice(origin.length + 1); assert.ok(existsSync(join(root, f)), `missing ${f}`); locs.push(...[...read(f).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])); }
  for (const f of pages) assert.ok(locs.includes(origin + urlPath(f)), `sitemap is missing ${urlPath(f)} (run node scripts/sitemap.mjs)`);
  for (const l of locs) { assert.ok(l.startsWith(origin + '/'), l); assert.ok(exists(l.slice(origin.length)), `sitemap lists a missing page: ${l}`); }
  const robots = read('robots.txt');
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
  assert.match(robots, /Disallow: \/api\//);
});


test('homepage sends its primary CTA to Shield and attributes the five priority consumer paths', () => {
  const h = read('index.html');
  assert.ok(h.includes('<a class="btn btn-primary" href="/shield/?ref=home-hero">Check a suspicious message'), "primary CTA opens Shield directly");
  const popular = h.indexOf('<section class="section" id="popular">');
  const popularEnd = h.indexOf("</section>", popular);
  const partnerOffers = h.indexOf('<section class="offer-launch" id="featured-offers"');
  assert.ok(popular >= 0 && popularEnd > popular && partnerOffers > popularEnd, "priority consumer tools appear before partner offers");
  const start = h.indexOf('<div class="featured-grid">');
  const end = h.indexOf('</div>', start);
  const grid = h.slice(start, end);
  const ids = ['shield', 'saver', 'bill-radar', 'fair-price', 'dinner'];
  const positions = ids.map((id) => grid.indexOf(`href="/${id}/?ref=home-featured-${id}"`));
  assert.ok(positions.every((position) => position >= 0), 'all five featured paths carry source labels');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'featured tools follow the CEO priority order');
  for (const id of ids) assert.ok(h.includes(`href="/${id}/?ref=home-tools-${id}"`), `${id}: searchable tool link carries a source label`);
  for (const id of ['saver', 'bill-radar', 'fair-price', 'dinner']) assert.ok(h.includes(`href="/${id}/?ref=home-hero-${id}"`), `${id}: direct hero shortcut carries a source label`);
});


test('priority consumer tools count page opens and completed checks anonymously', () => {
  const shield = read('shield/js/app.mjs');
  const saver = read('saver/js/app.mjs');
  const billRadar = read('bill-radar/index.html');
  const fairPrice = read('fair-price/index.html');
  const dinner = read('dinner/index.html');
  const eventApi = read('api/event.js');
  const statsApi = read('api/stats.js');

  assert.match(shield, /const TOOL = 'shield';[\s\S]*Studio\.init\(/);
  assert.doesNotMatch(shield, /countEvent\('open'\)/);
  assert.match(shield, /JSON\.stringify\(\{\s*tool:\s*TOOL,\s*event\s*\}\)/);
  assert.match(shield, /tool: 'shield', event: 'check'/);

  assert.match(saver, /const TOOL = 'saver';[\s\S]*Studio\.init\(/);
  assert.doesNotMatch(saver, /countEvent\('open'\)/);
  assert.match(saver, /JSON\.stringify\(\{\s*tool:\s*TOOL,\s*event\s*\}\)/);
  assert.match(saver, /tool: TOOL, event: 'check'/);

  assert.match(billRadar, /JSON\.stringify\(\{tool:'bill-radar',event:'open'\}\)/);
  assert.match(billRadar, /JSON\.stringify\(\{tool:'bill-radar',event:'check'\}\)/);

  assert.match(fairPrice, /JSON\.stringify\(\{\s*tool:\s*'fair-price',\s*event\s*\}\)/);
  assert.match(fairPrice, /Studio\.init\(/);
  assert.doesNotMatch(fairPrice, /countEvent\('open'\)/);
  assert.match(fairPrice, /countEvent\(demo \? 'demo' : 'check'\)/);
  assert.ok(fairPrice.indexOf('if (text.trim().length < 3)') < fairPrice.indexOf("countEvent(demo ? 'demo' : 'check')"), 'Fair Price counts demos separately and real checks only after its minimum-input check');
  assert.match(eventApi, /if \(event === 'demo'\)/);
  assert.match(statsApi, /demos:/);

  assert.match(dinner, /JSON\.stringify\(\{\s*tool:\s*'dinner',\s*event\s*\}\)/);
  assert.match(dinner, /Studio\.init\(/);
  assert.doesNotMatch(dinner, /countEvent\('open'\)/);
  assert.match(dinner, /countEvent\('check'\)/);
  assert.ok(dinner.indexOf('if (Object.keys(picks).length < 2)') < dinner.indexOf("countEvent('check')"), 'Dinner counts only after its minimum-ingredient check');

  assert.match(eventApi, /if \(event === 'open'\)/);
  assert.match(eventApi, /if \(event === 'check'\)/);
  assert.match(statsApi, /opens:/);
  assert.match(statsApi, /checks:/);
});
