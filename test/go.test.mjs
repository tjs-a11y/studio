// Outbound links to sister apps go through /go/<name> so their hosting address never appears on our pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pages } from '../scripts/analytics.mjs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('/go/gatherloom is a temporary redirect defined in one place', () => {
  const r = JSON.parse(read('vercel.json')).redirects.filter((x) => x.source.startsWith('/go/gatherloom'));
  assert.equal(r.length, 2);
  for (const x of r) { assert.equal(x.permanent, false); assert.match(x.destination, /^https:\/\/[^/]+\/\?ref=quickwell$/); }
});

test('no page or script exposes the Gatherloom hosting address', () => {
  const files = [...pages(), new URL('../saver/js/i18n.mjs', import.meta.url).pathname, new URL('../shield/index.html', import.meta.url).pathname];
  for (const f of files) assert.ok(!/gatherloom[a-z0-9-]*\.vercel\.app/i.test(readFileSync(f, 'utf8')), f);
});

test('Saver and Bill Radar results link to Gatherloom through the redirect', () => {
  assert.match(read('saver/index.html'), /href="\/go\/gatherloom\/\?from=saver"/);
  assert.match(read('bill-radar/index.html'), /href="\/go\/gatherloom\/\?from=bill-radar"/);
  assert.match(read('saver/js/i18n.mjs'), /giftLink:[^\n]*Gatherloom[\s\S]*giftLink:[^\n]*Gatherloom/);
});
