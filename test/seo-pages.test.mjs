// Programmatic SEO pages under /spreads/ are real and self-consistent:
// each page exists, is unique, links the tool, and every max-loss / max-profit / breakeven
// figure on the page equals what the tested engine computes (no drift, nothing made up).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { calculateSpreadMath } from '../utility-pipeline/js/engine.mjs';

const root = new URL('..', import.meta.url).pathname;
const origin = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8')).origin;
const matrix = JSON.parse(readFileSync(join(root, 'seo', 'matrix.json'), 'utf8')).rows;
const read = (f) => readFileSync(join(root, f), 'utf8');
const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

test('spreads: hub + every strategy page exist and the hub lists them all', () => {
  assert.ok(existsSync(join(root, 'spreads', 'index.html')), 'hub missing (run node scripts/seo/build.mjs)');
  assert.ok(existsSync(join(root, 'spreads', 'og.png')), 'shared og image missing');
  const hub = read('spreads/index.html');
  for (const r of matrix) assert.ok(hub.includes(`/spreads/${r.slug}/`), `hub missing link to ${r.slug}`);
});

test('spreads: pages have unique titles (<=60) and a canonical to the right URL', () => {
  const titles = new Set();
  for (const r of matrix) {
    const h = read(`spreads/${r.slug}/index.html`);
    const title = (/<title>([^<]*)<\/title>/.exec(h) || [])[1] || '';
    assert.ok(title && title.length <= 60, `${r.slug}: title length ${title.length}`);
    assert.ok(!titles.has(title), `${r.slug}: duplicate title`); titles.add(title);
    assert.ok(h.includes(`<link rel="canonical" href="${origin}/spreads/${r.slug}/">`), `${r.slug}: canonical`);
    assert.ok(h.includes('href="/utility-pipeline/'), `${r.slug}: no calculator link`);
    assert.ok(/not financial advice/i.test(h), `${r.slug}: missing not-advice disclaimer`);
    assert.ok(!/MONAD/i.test(h), `${r.slug}: internal name leaked`);
  }
});

test('spreads: the numbers on each page match the engine exactly', () => {
  for (const r of matrix) {
    const h = read(`spreads/${r.slug}/index.html`);
    const m = calculateSpreadMath(r.short, r.long, { netPremiumPerShare: r.premium, optionType: r.type });
    assert.equal(m.status, 'SUCCESS', r.slug);
    assert.ok(h.includes(money(m.max_loss)), `${r.slug}: max loss ${money(m.max_loss)} not on page`);
    assert.ok(h.includes(money(m.max_profit)), `${r.slug}: max profit ${money(m.max_profit)} not on page`);
    assert.ok(h.includes('>' + m.breakeven + '<'), `${r.slug}: breakeven ${m.breakeven} not on page`);
  }
});

test('spreads: sitemap-seo.xml lists the hub and every page, on the right origin', () => {
  const xml = read('sitemap-seo.xml');
  assert.ok(xml.includes('http://www.sitemaps.org/schemas/sitemap/0.9'), 'correct sitemap namespace');
  assert.ok(xml.includes(`<loc>${origin}/spreads/</loc>`), 'hub in sitemap');
  for (const r of matrix) assert.ok(xml.includes(`<loc>${origin}/spreads/${r.slug}/</loc>`), `${r.slug} in sitemap`);
});
