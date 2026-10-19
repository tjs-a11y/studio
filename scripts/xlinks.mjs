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
  { id: 'dinner', name: "What's for Dinner?", text: 'Dinners from what you already have in the fridge', page: 'dinner/index.html' },
  { id: 'copycat', name: 'Copycat Kitchen', text: 'Rebuild a restaurant dish at home, with the trick behind it', page: 'copycat/index.html' },
  { id: 'kitchen', name: 'Weekly Kitchen', text: 'Plan a week of dinners from your saved pantry', page: 'kitchen/index.html' },
  { id: 'fair-price', name: 'Fair Price', text: 'Is this quote fair? Spot the padding before you pay', page: 'fair-price/index.html' },
  { id: 'proof', name: 'Proof', text: 'Timestamp and fingerprint a photo for a dispute', page: 'proof/index.html' },
  { id: 'keep-the-receipt', name: 'Keep the Receipt', text: 'Never miss a return window or a warranty again', page: 'keep-the-receipt/index.html' },
  { id: 'double-dose', name: 'Double Dose', text: 'Catch two medicines that share an active ingredient', page: 'double-dose/index.html' },
  { id: 'before-you-sign', name: 'Before You Sign', text: 'Spot the costly clauses in any contract before you sign', page: 'before-you-sign/index.html' },
  { id: 'saver', name: 'Quickwell Saver', text: 'Find and stop the money leaks in your bank export', page: 'saver/index.html' },
  { id: 'pilot', name: 'Quickwell Pilot', text: 'What every letter and bill needs from you, by when', page: 'pilot/index.html' },
  { id: 'shield', name: 'Quickwell Shield', text: 'Is this message a scam? See the warning signs', page: 'shield/index.html' },
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
