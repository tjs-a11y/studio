// Search landing pages (/holiday/, /carrier-checks/): complete head tags, honest claims, no hosting address.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const origin = JSON.parse(readFileSync(root + 'site.config.json', 'utf8')).origin;
const data = JSON.parse(readFileSync(root + 'scripts/landers/data.json', 'utf8'));
const hub = { holiday: 'holiday', carrier: 'carrier-checks' };
const paths = ['holiday/', 'carrier-checks/', ...data.map((p) => `${hub[p.group]}/${p.slug}/`)];
const read = (p) => readFileSync(root + p + 'index.html', 'utf8');

test('committed landers match the generator output', () => {
  const before = paths.map(read).join('\n');
  execFileSync('node', [root + 'scripts/landers/build.mjs']);
  assert.equal(paths.map(read).join('\n'), before);
});

test('every lander has unique short title/description and full head tags', () => {
  const titles = new Set(), descs = new Set();
  for (const p of paths) {
    const h = read(p);
    const title = /<title>([^<]*)<\/title>/.exec(h)[1], desc = /<meta name="description" content="([^"]*)">/.exec(h)[1];
    assert.ok(title.length <= 60 && desc.length <= 160, p);
    assert.ok(!titles.has(title) && !descs.has(desc), p + ': duplicate'); titles.add(title); descs.add(desc);
    for (const t of [`<link rel="canonical" href="${origin}/${p}">`, `og:url" content="${origin}/${p}"`, 'og:image', 'twitter:card', '/_vercel/insights/script.js']) assert.ok(h.includes(t), `${p}: ${t}`);
    for (const m of h.matchAll(/href="(\/[^"?#]*)/g)) assert.ok(existsSync(root + m[1].slice(1)) || m[1] === '/', `${p}: broken link ${m[1]}`);
  }
});

test('claims stay honest: trial price stated, no outcome promises, no hosting address', () => {
  for (const p of paths) {
    const h = read(p);
    assert.doesNotMatch(h, /vercel\.app|guarantee|generational wealth|top 1%|passive income|get rich|zero tracking|MONAD/i, p);
    if (p.startsWith('holiday/')) { assert.match(h, /14-day free trial/, p); assert.match(h, /\$2\.99\/month or \$24\/year/, p); assert.match(h, /href="\/go\/gatherloom\//, p); }
    else { assert.match(h, /Free for 3 checks a day/, p); assert.match(h, /href="\/haul-audit\//, p); }
    if (h.includes('books2read.com')) { assert.match(h, /We publish these books ourselves/, p); assert.match(h, /Not financial advice; no outcomes promised/, p); }
  }
});

test('landers are in the sitemap', () => {
  const s = readFileSync(root + 'sitemap-landers.xml', 'utf8');
  for (const p of paths) assert.ok(s.includes(`<loc>${origin}/${p}</loc>`), p);
  assert.ok(readFileSync(root + 'sitemap.xml', 'utf8').includes('sitemap-landers.xml'));
});
