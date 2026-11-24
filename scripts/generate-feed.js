// Zero-dependency Quickwell RSS 2.0 generator.
// Run from the repository root: node scripts/generate-feed.js
// Localized tool directories under /es and /fr are included in the tool feed.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SITE = 'https://quickwell.app';
const OUTPUT = path.join(ROOT, 'feed.xml');
const EXCLUDED_DIRS = new Set(['embed', 'api', 'js', 'css', 'node_modules', '.git', '404']);
const EXCLUDED_GUIDE_FILES = new Set(['404.html', 'privacy.html', 'terms.html', 'robots.html']);

function walk(directory, acceptFile) {
  if (!fs.existsSync(directory)) return [];
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name.toLowerCase())) {
        found.push(...walk(path.join(directory, entry.name), acceptFile));
      }
    } else if (entry.isFile() && acceptFile(entry.name)) {
      found.push(path.join(directory, entry.name));
    }
  }
  return found;
}

export function discoverPages() {
  const catalogPath = path.join(ROOT, 'catalog', 'tools.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const tools = [];
  for (const tool of catalog.tools || []) {
    const id = String(tool.id || '');
    if (!/^[a-z0-9-]+$/.test(id) || EXCLUDED_DIRS.has(id)) continue;
    const directory = path.join(ROOT, id);
    if (!fs.existsSync(path.join(directory, 'index.html'))) continue;
    tools.push(...walk(directory, (name) => name.toLowerCase() === 'index.html'));
    for (const locale of ['es', 'fr']) {
      const localized = path.join(ROOT, locale, id);
      if (fs.existsSync(path.join(localized, 'index.html'))) tools.push(...walk(localized, (name) => name.toLowerCase() === 'index.html'));
    }
  }
  for (const locale of ['es', 'fr']) {
    const alias = path.join(ROOT, locale, 'eudr', 'index.html');
    if (fs.existsSync(alias)) tools.push(alias);
  }
  const guides = walk(path.join(ROOT, 'guides'), (name) =>
    /\.html?$/i.test(name) && !EXCLUDED_GUIDE_FILES.has(name.toLowerCase()));
  return [...new Set([...tools, ...guides])]
    .filter((file) => !file.split(path.sep).some((part) => EXCLUDED_DIRS.has(part.toLowerCase())))
    .sort((a, b) => path.relative(ROOT, a).localeCompare(path.relative(ROOT, b)));
}

function parseAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attributes;
}

function decodeEntities(value) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
    hellip: '…', copy: '©', reg: '®', trade: '™', bull: '•',
    euro: '€', pound: '£', yen: '¥', deg: '°', times: '×'
  };
  return String(value).replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1].toLowerCase() === 'x';
      const number = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      try { return Number.isFinite(number) ? String.fromCodePoint(number) : whole; }
      catch { return whole; }
    }
    return named[entity.toLowerCase()] ?? whole;
  });
}

function canonicalFallback(file) {
  const imageTag = [...html.matchAll(/<meta\\b[^>]*>/gi)]
    .map((match) => parseAttributes(match[0]))
    .find((attr) => (attr.property || '').toLowerCase() === 'og:image' && attr.content);
  const relativeFile = path.relative(ROOT, file).split(path.sep).join('/');
  if (relativeFile === 'guides/index.html') return SITE + '/guides/';
  if (relativeFile.startsWith('guides/')) {
    const slug = relativeFile.slice('guides/'.length).replace(/\.html?$/i, '');
    return SITE + '/guides/' + slug.replace(/\/index$/i, '') + '/';
  }
  const directory = path.dirname(relativeFile);
  return SITE + '/' + (directory === '.' ? '' : directory + '/');
}

export function readPageMetadata(file) {
  const html = fs.readFileSync(file, 'utf8');
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html);
  const descriptionMatch = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => parseAttributes(match[0]))
    .find((attr) => (attr.name || '').toLowerCase() === 'description' && attr.content);
  const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => parseAttributes(match[0]))
    .find((attr) => (attr.rel || '').toLowerCase().split(/\s+/).includes('canonical') && attr.href);
  const relativeFile = path.relative(ROOT, file).split(path.sep).join('/');
  const title = titleMatch && decodeEntities(titleMatch[1].replace(/<[^>]*>/g, '').trim());
  const description = descriptionMatch && decodeEntities(descriptionMatch.content.trim());
  if (!title || !description) {
    throw new Error('Missing <title> or meta description in ' + relativeFile);
  }
  const canonical = canonicalTag ? decodeEntities(canonicalTag.href.trim()) : canonicalFallback(file);
  const parsed = new URL(canonical);
  if (parsed.protocol !== 'https:' || parsed.origin !== SITE) {
    throw new Error('Invalid Quickwell canonical URL in ' + relativeFile + ': ' + canonical);
  }
  return {
    path: relativeFile,
    title,
    description,
    url: canonical,
    image: imageTag ? decodeEntities(imageTag.content.trim()) : SITE + '/og.png',
    category: relativeFile.startsWith('guides/') ? 'Guide' : 'Tool',
    pubDate: fs.statSync(file).mtime
  };
}

function bookEntries() {
  const file = path.join(ROOT, 'data', 'books.json');
  if (!fs.existsSync(file)) return [];
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(catalog)) throw new Error('data/books.json must contain an array');
  const catalogMtime = fs.statSync(file).mtime;
  return catalog.filter((book) => book && book.active !== false && book.url)
    .map((book) => {
      const parsed = new URL(book.url);
      if (parsed.protocol !== 'https:' || parsed.hostname !== 'books2read.com' || !/^\/u\/[^/]+\/?$/.test(parsed.pathname)) {
        throw new Error('Unverified/non-direct Books2Read universal book URL: ' + book.url);
      }
      parsed.searchParams.set('utm_source', 'rss');
      parsed.searchParams.set('utm_medium', 'feed');
      parsed.searchParams.set('utm_campaign', 'books');
      // Distinguish feed entries even when a supplied Books2Read URL is a generic landing page.
      const slug = String(book.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      parsed.searchParams.set('utm_content', slug);
      const date = book.pubDate ? new Date(book.pubDate) : catalogMtime;
      if (Number.isNaN(date.getTime())) throw new Error('Invalid pubDate for book: ' + book.title);
      return {
        title: String(book.title || '').trim(),
        description: String(book.description || '').trim(),
        url: parsed.toString(),
        image: SITE + '/og.png',
        category: 'Book',
        pubDate: date
      };
    })
    .filter((book) => {
      if (!book.title || !book.description) throw new Error('Active books require title and description');
      return true;
    });
}

const xmlEscape = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

export function buildFeed(now = new Date()) {
  const unique = new Map();
  for (const entry of [...discoverPages().map(readPageMetadata), ...bookEntries()]) {
    if (!unique.has(entry.url)) unique.set(entry.url, entry);
  }
  const entries = [...unique.values()]
    .sort((a, b) => b.pubDate - a.pubDate || a.url.localeCompare(b.url));
  const items = entries.map((entry) => [
    '  <item>',
    '    <title>' + xmlEscape(entry.title) + '</title>',
    '    <link>' + xmlEscape(entry.url) + '</link>',
    '    <guid isPermaLink="true">' + xmlEscape(entry.url) + '</guid>',
    '    <pubDate>' + entry.pubDate.toUTCString() + '</pubDate>',
    '    <description>' + xmlEscape(entry.description) + '</description>',
    '    <enclosure url=\"' + xmlEscape(entry.image || (SITE + '/og.png')) + '\" type=\"image/png\" length=\"0\" />',
    '    <category>' + entry.category + '</category>',
    '  </item>'
  ].join('\n')).join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '<channel>',
    '  <title>Quickwell: tools, guides &amp; books</title>',
    '  <link>' + SITE + '</link>',
    '  <description>New Quickwell tools, practical guides and published books.</description>',
    '  <language>en-us</language>',
    '  <lastBuildDate>' + now.toUTCString() + '</lastBuildDate>',
    '  <generator>Quickwell RSS generator</generator>',
    items,
    '</channel>',
    '</rss>',
    ''
  ].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/generate-feed.js')) {
  const xml = buildFeed();
  fs.writeFileSync(OUTPUT, xml);
  const count = (xml.match(/<item>/g) || []).length;
  console.log('feed.xml: generated ' + count + ' unique Tool, Guide and Book items');
}
