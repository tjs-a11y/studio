// "Also from Quickwell": one small cross-link strip, the same markup on every consumer tool page.
// Each page holds a marker pair; this script writes the strip between them, linking the other consumer tools plus
// Quickwell Plus, each with ?ref=xlink-<from> so we can count which tool sends visitors to which.
// Plain HTML (works without JavaScript and under every page's CSP); each page styles .qw-also with its own colours.
//   node scripts/xlinks.mjs          rewrite the strips
//   node scripts/xlinks.mjs --check  exit 1 if any page's strip is missing or out of date
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// id = ref label and folder; page = file that carries the strip. Descriptions stay inside what each tool really does.
export const TOOLS = [
  { id: 'footsure', name: 'Footsure', text: 'The CDC\'s strength and balance tests at home', page: 'footsure/index.html' },
  { id: 'play', name: 'Quickwell Play', text: 'Three free daily brain games', page: 'play/index.html' },
  { id: 'spare-key', name: 'Spare Key', text: 'A lost-phone plan for your accounts', page: 'spare-key/index.html' },
  { id: 'commodities', name: 'Commodity Desk', text: 'Commodity prices from official sources', page: 'commodities/index.html' },
];
export const PLUS = { id: 'plus', name: 'Quickwell Plus', text: 'One subscription for every everyday tool' };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function strip(from) {
  const links = [...TOOLS.filter((t) => t.id !== from), PLUS]
    .map((t) => `<li><a href="/${t.id}/?ref=xlink-${from}"><b>${esc(t.name)}</b><span>${esc(t.text)}</span></a></li>`).join('');
  return `<!-- xlinks:${from} -->\n<nav class="qw-also" aria-label="Also from Quickwell"><p>Also from Quickwell</p><ul>${links}</ul></nav>\n<!-- /xlinks -->`;
}
const RE = (id) => new RegExp(`<!-- xlinks:${id} -->[\\s\\S]*?<!-- /xlinks -->`);

export function stale() {
  return TOOLS.filter((t) => { const h = readFileSync(join(root, t.page), 'utf8'); return !h.includes(strip(t.id)); }).map((t) => t.page);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  if (process.argv.includes('--check')) {
    const s = stale();
    if (s.length) { console.error(`out of date: ${s.join(', ')} (run node scripts/xlinks.mjs)`); process.exit(1); }
    console.log('xlinks up to date');
  } else {
    for (const t of TOOLS) {
      const f = join(root, t.page); const h = readFileSync(f, 'utf8');
      if (!RE(t.id).test(h)) throw new Error(`${t.page}: add <!-- xlinks:${t.id} --><!-- /xlinks --> where the strip goes`);
      writeFileSync(f, h.replace(RE(t.id), strip(t.id)));
    }
    console.log(`xlinks written to ${TOOLS.length} pages`);
  }
}
