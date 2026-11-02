import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('learn/mineral-rights-spacing-units.html');

test('Texas pooled-unit guide answers the acreage question with primary sources and a local-first Royalty Check CTA', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/quickwell\.app\/learn\/mineral-rights-spacing-units\.html">/);
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /16 TAC Chapter 3, §3\.40/);
  assert.match(html, /Form P-12/);
  assert.match(html, /Natural Resources Code Chapter 102/);
  assert.match(html, /Expected decimal =/);
  assert.match(html, /surface acres/i);
  assert.match(html, /March 8, 1961/);
  assert.match(html, /anonymous check event sends only the tool and event names/i);
  assert.match(html, /not automatically the acreage denominator/i);
  assert.match(html, /Runs entirely in your local browser — nothing you enter leaves your device\./);
  assert.match(html, /General educational information only, not legal, accounting, tax, or financial advice\. Confirm parameters with original deeds or contractual terms\./);
  assert.match(html, /href="\/royalty-check\/\?ref=learn-spacing-units"/);
});

test('generated Learn discovery files include the source-backed guide and the learn sitemap is indexed', () => {
  const builder = read('scripts/learn/build.mjs');
  const learn = read('learn/index.html');
  const sitemap = read('sitemap-learn.xml');
  const index = read('sitemap.xml');
  const llms = read('llms.txt');
  const full = read('llms-full.txt');
  assert.match(builder, /mineral-rights-spacing-units/);
  assert.match(learn, /href="\/learn\/mineral-rights-spacing-units\.html"/);
  assert.match(sitemap, /https:\/\/quickwell\.app\/learn\/mineral-rights-spacing-units\.html/);
  assert.match(index, /sitemap-learn\.xml/);
  assert.match(llms, /learn\/mineral-rights-spacing-units\.html/);
  assert.match(full, /learn\/mineral-rights-spacing-units\.html/);
});
