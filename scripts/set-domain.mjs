// Swap the site's public address everywhere it is written out (canonical, og:url, og:image, JSON-LD, sitemap, robots).
//   node scripts/set-domain.mjs https://your-domain.com
// Reads the current address from site.config.json, replaces it in every HTML/XML/TXT file in the repo
// (skipping node_modules, .git and permit-watch data/feeds), then saves the new address to site.config.json.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfgPath = join(root, 'site.config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
const next = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(next)) {
  console.error('Usage: node scripts/set-domain.mjs https://your-domain.com   (https, no path, no trailing slash)');
  process.exit(1);
}
const old = cfg.origin;
const skip = new Set(['node_modules', '.git']);
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (skip.has(name) || p.startsWith(join(root, 'permit-watch', 'data')) || p.startsWith(join(root, 'permit-watch', 'feeds'))) continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(html|xml|txt)$/.test(name)) files.push(p);
  }
})(root);
let changed = 0;
for (const f of files) {
  const s = readFileSync(f, 'utf8');
  if (!s.includes(old)) continue;
  writeFileSync(f, s.split(old).join(next));
  changed++;
  console.log('updated', f.slice(root.length + 1));
}
cfg.origin = next;
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
console.log(`${old} -> ${next} in ${changed} files. Run npm test, then deploy.`);
