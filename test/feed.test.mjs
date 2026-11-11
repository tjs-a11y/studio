// /feed.xml lists real pages on our origin and stays in step with the pages it covers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { feedPages } from '../scripts/feed/build.mjs';

const root = new URL('..', import.meta.url).pathname;
const origin = JSON.parse(readFileSync(root + 'site.config.json', 'utf8')).origin;
const xml = readFileSync(root + 'feed.xml', 'utf8');
const dates = JSON.parse(readFileSync(root + 'scripts/feed/dates.json', 'utf8'));

test('every guide and calculator page has a feed date', () => {
  for (const p of feedPages()) assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(dates[p] || ''), `${p} is not in the feed (run node scripts/feed/build.mjs)`);
  for (const p of Object.keys(dates)) assert.ok(existsSync(root + p + 'index.html'), `feed lists a missing page: ${p}`);
});

test('feed items are well formed, on our origin and point at real pages', () => {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  assert.ok(items.length >= 10 && items.length <= 50);
  for (const it of items) {
    const link = /<link>([^<]+)<\/link>/.exec(it)[1];
    assert.ok(link.startsWith(origin + '/') && existsSync(root + link.slice(origin.length + 1) + 'index.html'), link);
    assert.ok(/<title>[^<]+<\/title>/.test(it) && /<description>[^<]+<\/description>/.test(it) && !Number.isNaN(Date.parse(/<pubDate>([^<]+)</.exec(it)[1])), link);
  }
  assert.doesNotMatch(xml, /vercel\.app|MONAD/i);
  assert.equal((xml.match(/&(?!amp;|lt;|gt;)/g) || []).length, 0, 'unescaped ampersand');
});

test('the home page advertises the feed', () => {
  assert.match(readFileSync(root + 'index.html', 'utf8'), /rel="alternate" type="application\/rss\+xml"[^>]*href="\/feed\.xml"/);
});
