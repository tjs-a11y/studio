// Adds the shared Voiceflow overlay to every public static HTML page at build time.
// This keeps the assistant site-wide even as new tool and SEO pages are added.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skip = new Set(['.git', 'node_modules', '.vercel', '.next', 'dist', 'coverage']);
const excluded = (rel) => rel.startsWith('deals/admin/') || rel.startsWith('play/embed/');
const tag = '<script defer src="/js/voiceflow.js"></script>';
let changed = 0;
let skipped = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skip.has(entry.name)) walk(join(dir, entry.name));
      continue;
    }
    const lowerName = entry.name.toLowerCase();
    if (!entry.isFile() || !(lowerName.endsWith('.html') || lowerName.endsWith('.htm'))) continue;
    const file = join(dir, entry.name);
    const rel = relative(root, file).split(sep).join('/');
    if (excluded(rel)) { skipped++; continue; }
    const html = readFileSync(file, 'utf8');
    if (html.includes('/js/voiceflow.js')) { skipped++; continue; }
    const headEnd = html.toLowerCase().lastIndexOf('</head>');
    if (headEnd < 0) { console.warn('Voiceflow injection skipped (no head): ' + rel); continue; }
    writeFileSync(file, html.slice(0, headEnd) + tag + String.fromCharCode(10) + html.slice(headEnd));
    changed++;
  }
}

walk(root);
console.log('Voiceflow site-wide injection: ' + changed + ' HTML pages updated; ' + skipped + ' skipped or already configured.');
