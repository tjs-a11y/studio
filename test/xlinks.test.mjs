// "Also from Quickwell" strip: present and current on every consumer tool page, linking every other consumer tool
// and Quickwell Plus with ?ref=xlink-<from>, to pages that exist, inside a labelled <nav>.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { TOOLS, stale } from '../scripts/xlinks.mjs';

const root = new URL('..', import.meta.url).pathname;

test('every consumer tool page carries the current strip (run node scripts/xlinks.mjs if this fails)', () => {
  assert.deepEqual(stale(), []);
});

test('each strip links the other consumer tools plus Quickwell Plus, with the right ref, to real pages', () => {
  for (const t of TOOLS) {
    const h = readFileSync(join(root, t.page), 'utf8');
    const nav = /<nav class="qw-also" aria-label="Also from Quickwell">([\s\S]*?)<\/nav>/.exec(h);
    assert.ok(nav, t.page);
    const hrefs = [...nav[1].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    const want = [...TOOLS.filter((o) => o.id !== t.id).map((o) => o.id), 'plus'].map((id) => `/${id}/?ref=xlink-${t.id}`);
    assert.deepEqual(hrefs, want, t.page);
    for (const href of hrefs) assert.ok(existsSync(join(root, href.split('?')[0], 'index.html')), href);
    assert.ok(!h.includes(`/${t.id}/?ref=xlink-${t.id}`), `${t.page} links to itself`);
  }
});
