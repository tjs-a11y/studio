import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../scripts/learn/layout.mjs';

const basePage = {
  path: '/learn/example/',
  lang: 'en',
  title: 'Example guide',
  description: 'A short example description.',
  h1: 'Example guide',
  crumbs: [{ name: 'Quickwell', path: '/' }],
  crumbName: 'Example',
  schema: 'Article',
  body: '<p>Example content.</p>',
  sources: [],
};

test('Learn pages always include Open Graph and Twitter metadata with the Quickwell fallback image', () => {
  const html = render(basePage, 'https://quickwell.app');
  assert.match(html, /<meta property="og:type" content="article">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/quickwell\.app\/og\.png">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
});

test('Learn collection pages use website Open Graph type and preserve an explicit image', () => {
  const html = render({ ...basePage, schema: 'CollectionPage', ogImage: '/learn/custom-og.png' }, 'https://quickwell.app');
  assert.match(html, /<meta property="og:type" content="website">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/quickwell\.app\/learn\/custom-og\.png">/);
});
