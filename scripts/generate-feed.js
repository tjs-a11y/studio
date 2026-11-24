// Regenerate /feed.xml from every catalogued tool page and every HTML page under /guides/.
// Run: node scripts/generate-feed.js
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = JSON.parse(readFileSync(join(ROOT, 'site.config.json'), 'utf8')).origin.replace(/\/$/, '');
const OUTPUT = join(ROOT, 'feed.xml');

function walkHtml(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) return walkHtml(full);
    return entry.isFile() && /\.html?$/i.test(entry.name) ? [full] : [];
  });
}

export function discoverPages() {
  const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog/tools.json'), 'utf8'));
  const toolFiles = [...new Set(catalog.tools
    .map((tool) => tool.id)
    .filter((id) => /^[a-z0-9-]+$/.test(id))
    .filter((id) => existsSync(join(ROOT, id, 'index.html')))
    .flatMap((id) => walkHtml(join(ROOT, id))))];
  const guideFiles = walkHtml(join(ROOT, 'guides'));
  return [...new Set([...toolFiles, ...guideFiles])]
    .sort((a, b) => relative(ROOT, a).localeCompare(relative(ROOT, b)));
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map((match) => [match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '']));
}

function decodeEntities(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', copy: '©', reg: '®', trade: '™', bull: '•', euro: '€', pound: '£', yen: '¥', deg: '°', times: '×' };
  return String(value)
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, entity) => {
      if (entity[0] === '#') {
        const hex = entity[1].toLowerCase() === 'x';
        const number = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
        return Number.isFinite(number) ? String.fromCodePoint(number) : whole;
      }
      return named[entity.toLowerCase()] ?? whole;
    })
    .replace(/<[^>]*>/g, '')
    .trim();
}

export function readPageMetadata(file) {
  const html = readFileSync(file, 'utf8');
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html);
  const metaDescription = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .find((attr) => (attr.name || '').toLowerCase() === 'description' && attr.content);
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .find((attr) => (attr.rel || '').toLowerCase().split(/\s+/).includes('canonical') && attr.href);
  const path = relative(ROOT, file).split('\\').join('/');
  if (!titleMatch || !metaDescription || !canonical) {
    throw new Error('Missing <title>, meta description, or canonical URL in ' + path);
  }
  const url = decodeEntities(canonical.href);
  const parsed = new URL(url);
  if (parsed.origin !== SITE) throw new Error('Canonical URL is outside ' + SITE + ': ' + url + ' (' + path + ')');
  return {
    path,
    title: decodeEntities(titleMatch[1]),
    description: decodeEntities(metaDescription.content),
    url,
  };
}

function publicationDate(file) {
  try {
    const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', relative(ROOT, file)], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (iso && !Number.isNaN(Date.parse(iso))) return new Date(iso);
  } catch { /* Fall back for source archives without git history. */ }
  return statSync(file).mtime;
}

const xmlEscape = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export function buildFeed(files = discoverPages(), now = new Date()) {
  const seen = new Set();
  const entries = files.map((file) => {
    const metadata = readPageMetadata(file);
    if (seen.has(metadata.url)) return null;
    seen.add(metadata.url);
    return { ...metadata, pubDate: publicationDate(file) };
  }).filter(Boolean).sort((a, b) => b.pubDate - a.pubDate || a.url.localeCompare(b.url));

  const items = entries.map((entry) => [
    '  <item>',
    '    <title>' + xmlEscape(entry.title) + '</title>',
    '    <link>' + xmlEscape(entry.url) + '</link>',
    '    <guid isPermaLink="true">' + xmlEscape(entry.url) + '</guid>',
    '    <pubDate>' + entry.pubDate.toUTCString() + '</pubDate>',
    '    <description>' + xmlEscape(entry.description) + '</description>',
    '  </item>',
  ].join('\n')).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '<channel>',
    '  <title>Quickwell: tools and guides</title>',
    '  <link>' + xmlEscape(SITE) + '/</link>',
    '  <description>New and updated Quickwell tools and practical guides.</description>',
    '  <language>en</language>',
    '  <lastBuildDate>' + now.toUTCString() + '</lastBuildDate>',
    '  <generator>Quickwell RSS generator</generator>',
    items,
    '</channel>',
    '</rss>',
    '',
  ].join('\n');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const pages = discoverPages();
  const feed = buildFeed(pages);
  writeFileSync(OUTPUT, feed);
  console.log('feed.xml: generated ' + (feed.match(/<item>/g) || []).length + ' items from ' + pages.length + ' HTML files');
}
