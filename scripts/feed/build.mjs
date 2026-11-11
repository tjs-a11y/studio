// Builds /feed.xml (RSS 2.0) listing our newest guides and calculator pages.
//   node scripts/feed/build.mjs
// First-seen dates live in scripts/feed/dates.json so the feed is stable between runs: a page gets
// today's date the first time this script sees it and keeps it after that. Output is committed.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const origin = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8')).origin;
const datesFile = join(root, 'scripts/feed/dates.json');
const dates = existsSync(datesFile) ? JSON.parse(readFileSync(datesFile, 'utf8')) : {};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const sub = (dir) => readdirSync(join(root, dir), { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(root, dir, d.name, 'index.html'))).map((d) => `${dir}/${d.name}/`).sort();
export const feedPages = () => ['holiday/', 'carrier-checks/', ...sub('holiday'), ...sub('carrier-checks'), ...sub('guides')];

const firstCommit = (p) => { try { return execFileSync('git', ['log', '--diff-filter=A', '--format=%aI', '--', p + 'index.html'], { cwd: root }).toString().trim().split('\n').pop().slice(0, 10); } catch { return ''; } };
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const today = new Date().toISOString().slice(0, 10);
  for (const p of feedPages()) if (!dates[p]) dates[p] = firstCommit(p) || today;
  for (const p of Object.keys(dates)) if (!existsSync(join(root, p, 'index.html'))) delete dates[p];
  const sorted = Object.fromEntries(Object.entries(dates).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(datesFile, JSON.stringify(sorted, null, 1) + '\n');
  const items = Object.entries(sorted).sort(([a, x], [b, y]) => y.localeCompare(x) || a.localeCompare(b)).slice(0, 50).map(([p, d]) => {
    const h = readFileSync(join(root, p, 'index.html'), 'utf8');
    const title = unesc((/<title>([^<]*)<\/title>/.exec(h) || [])[1] || p);
    const desc = unesc((/<meta name="description" content="([^"]*)">/.exec(h) || [])[1] || '');
    const url = `${origin}/${p}`;
    return `  <item><title>${esc(title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${new Date(d + 'T12:00:00Z').toUTCString()}</pubDate><description>${esc(desc)}</description></item>`;
  });
  const newest = Object.values(sorted).sort().pop();
  writeFileSync(join(root, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Quickwell: new guides and calculators</title>
  <link>${origin}/</link>
  <atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>New free calculators and practical guides from Quickwell: holiday gift budgets, carrier pay checks, bills and everyday money.</description>
  <language>en</language>
  <lastBuildDate>${new Date(newest + 'T12:00:00Z').toUTCString()}</lastBuildDate>
${items.join('\n')}
</channel>
</rss>
`);
  console.log(`feed: ${items.length} items (of ${Object.keys(sorted).length} pages)`);
}
