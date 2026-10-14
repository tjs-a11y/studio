// Adds Vercel Web Analytics (cookie-free page-visit counts) to every public page, idempotently.
//   node scripts/analytics.mjs          insert where missing
//   node scripts/analytics.mjs --check  exit 1 if a page is missing it
// Excluded: Quickwell Shield promises "No analytics" on its page; internal/test folders.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', '.github', '.vercel', 'api', 'scripts', 'test', 'tests', 'fixtures', 'vendor', '_template', 'shield']);
export const TAG = '<script defer src="/js/va.js"></script><script defer src="/_vercel/insights/script.js"></script>';
export function pages(dir = root, out = []) {
  for (const n of readdirSync(dir)) {
    if (SKIP.has(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) pages(p, out); else if (n.endsWith('.html')) out.push(p);
  }
  return out;
}
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const missing = []; let added = 0;
  for (const f of pages()) {
    const h = readFileSync(f, 'utf8');
    if (h.includes('/_vercel/insights/script.js') || !h.includes('</head>')) continue;
    if (process.argv.includes('--check')) { missing.push(relative(root, f).split(sep).join('/')); continue; }
    writeFileSync(f, h.replace('</head>', `${TAG}\n</head>`)); added++;
  }
  if (process.argv.includes('--check')) { if (missing.length) { console.error('analytics missing: ' + missing.join(', ')); process.exit(1); } console.log('analytics on every page'); }
  else console.log(`analytics added to ${added} pages`);
}
