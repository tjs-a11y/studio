import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from '../scripts/learn/layout.mjs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Learn layout emits Open Graph and Twitter metadata with the sitewide image fallback', () => {
  const html = render({
    path: '/learn/example/',
    lang: 'en',
    title: 'Example guide',
    h1: 'Example guide',
    description: 'An example description.',
    body: '<p>Example content.</p>',
    schema: 'Article',
    crumbs: [{ name: 'Quickwell', path: '/' }],
    sources: [],
  }, 'https://quickwell.app');
  assert.match(html, /property="og:image" content="https:\/\/quickwell\.app\/og\.png"/);
  assert.match(html, /property="og:image:alt" content="Example guide"/);
  assert.match(html, /name="twitter:image" content="https:\/\/quickwell\.app\/og\.png"/);
  assert.match(html, /property="og:type" content="article"/);
});

test('recurring-charge Learn page routes to Saver with a fixed anonymous source and accurate update dates', () => {
  const source = read('scripts/learn/content/business-costs.mjs');
  const page = read('learn/business-costs/find-recurring-charges-bank-csv/index.html');
  const sitemap = read('sitemap-learn.xml');
  const full = read('llms-full.txt');
  assert.match(source, /slug: 'find-recurring-charges-bank-csv'/);
  assert.match(source, /modified: '2026-11-19'/);
  assert.match(source, /href: '\/saver\/\?ref=learn-recurring-csv'/);
  assert.match(page, /href="\/saver\/\?ref=learn-recurring-csv"/);
  assert.match(page, /Runs entirely in your local browser — nothing you enter leaves your device\./);
  assert.match(page, /"dateModified":"2026-11-19"/);
  assert.match(sitemap, /<loc>https:\/\/quickwell\.app\/learn\/business-costs\/find-recurring-charges-bank-csv\/<\/loc><lastmod>2026-11-19<\/lastmod>/);
  assert.ok(full.includes('duplicate payments and rising prices.'));
});

test('production build regenerates Learn pages before the sitemap index', () => {
  const pkg = JSON.parse(read('package.json'));
  const build = pkg.scripts.build;
  const learn = build.indexOf('node scripts/learn/build.mjs');
  const sitemap = build.indexOf('node scripts/sitemap.mjs');
  assert.ok(learn >= 0, 'production build must regenerate source-backed Learn pages');
  assert.ok(sitemap > learn, 'sitemap index must be written after the Learn sitemap');
});

test('Vercel delegates production generation to the tested package build', () => {
  const vercel = JSON.parse(read('vercel.json'));
  assert.equal(vercel.buildCommand, 'npm run build');
});

test('Learn generator has a fail-closed house-template gate for every generated page', () => {
  const build = read('scripts/learn/build.mjs');
  for (const requirement of [
    'canonical URL',
    'Open Graph image',
    'Twitter card image',
    'Vercel Analytics',
    'first-party analytics',
    'page-specific Sources',
    'visible disclaimer',
  ]) assert.ok(build.includes(requirement), `missing Learn house-template gate: ${requirement}`);
});
