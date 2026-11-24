// /feed.xml must cover current Quickwell tools, guides and active book links.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { feedPages } from '../scripts/feed/build.mjs';
import { discoverPages, readPageMetadata } from '../scripts/generate-feed.js';

const root = new URL('..', import.meta.url).pathname;
const origin = JSON.parse(readFileSync(root + 'site.config.json', 'utf8')).origin;
const xml = readFileSync(root + 'feed.xml', 'utf8');
const dates = JSON.parse(readFileSync(root + 'scripts/feed/dates.json', 'utf8'));
const books = JSON.parse(readFileSync(root + 'data/books.json', 'utf8'));

function itemsFromFeed() {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
}
function tag(item, name) {
  return new RegExp('<' + name + '>([\\s\\S]*?)<\\/' + name + '>').exec(item)?.[1] ?? '';
}

test('legacy feed date registry remains complete and points to real pages', () => {
  for (const page of feedPages()) {
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(dates[page] || ''), page + ' is not in the feed date registry');
  }
  for (const page of Object.keys(dates)) {
    assert.ok(existsSync(root + page + 'index.html'), 'feed date registry lists a missing page: ' + page);
  }
});

test('feed items are valid, categorized, escaped and have unique GUIDs', () => {
  const items = itemsFromFeed();
  assert.ok(items.length >= 10);
  const guids = [];
  for (const item of items) {
    const link = tag(item, 'link');
    const category = tag(item, 'category');
    const guid = item.match(/<guid isPermaLink="true">([\s\S]*?)<\/guid>/)?.[1] || '';
    assert.ok(['Tool', 'Guide', 'Book'].includes(category), 'invalid category: ' + category);
    assert.ok(tag(item, 'title'));
    assert.ok(tag(item, 'description'));
    assert.ok(guid && guid === link, 'GUID must be the canonical item URL: ' + link);
    assert.ok(!Number.isNaN(Date.parse(tag(item, 'pubDate'))), 'invalid pubDate: ' + tag(item, 'pubDate'));
    guids.push(guid);
    if (category === 'Book') {
      const parsed = new URL(link);
      assert.equal(parsed.hostname, 'books2read.com');
      assert.equal(parsed.searchParams.get('utm_source'), 'rss');
      assert.equal(parsed.searchParams.get('utm_medium'), 'feed');
      assert.equal(parsed.searchParams.get('utm_campaign'), 'books');
    } else {
      assert.ok(link.startsWith(origin + '/'), link);
      const localPath = link.slice(origin.length + 1).split(/[?#]/)[0];
      assert.ok(existsSync(root + localPath) || existsSync(root + localPath + 'index.html'), link);
    }
  }
  assert.equal(new Set(guids).size, guids.length, 'RSS GUIDs must be unique');
  assert.doesNotMatch(xml, /vercel\.app|MONAD/i);
  assert.equal((xml.match(/&(?!amp;|lt;|gt;|quot;|apos;)/g) || []).length, 0, 'unescaped ampersand');
});

test('every discovered tool and guide page appears once in the feed', () => {
  const expected = new Set(discoverPages().map((file) => readPageMetadata(file).url));
  const actual = itemsFromFeed().filter((item) => ['Tool', 'Guide'].includes(tag(item, 'category')))
    .map((item) => item.match(/<guid isPermaLink="true">([\s\S]*?)<\/guid>/)?.[1]);
  assert.equal(actual.length, expected.size);
  assert.equal(new Set(actual).size, actual.length);
  assert.deepEqual(new Set(actual), expected);
});

test('all active books are included and inactive placeholders are excluded', () => {
  const items = itemsFromFeed().filter((item) => tag(item, 'category') === 'Book');
  const active = books.filter((book) => book.active !== false && book.url);
  const inactive = books.filter((book) => book.active === false);
  assert.equal(items.length, active.length);
  for (const book of active) {
    const url = new URL(book.url);
    url.searchParams.set('utm_source', 'rss');
    url.searchParams.set('utm_medium', 'feed');
    url.searchParams.set('utm_campaign', 'books');
    assert.ok(items.some((item) => tag(item, 'link') === url.toString()), 'missing book: ' + book.title);
  }
  for (const book of inactive) {
    assert.ok(!items.some((item) => tag(item, 'title') === book.title), 'inactive book leaked into feed: ' + book.title);
  }
});

test('the home page advertises the feed', () => {
  assert.match(readFileSync(root + 'index.html', 'utf8'), /rel="alternate" type="application\/rss\+xml"[^>]*href="\/feed\.xml"/);
});
