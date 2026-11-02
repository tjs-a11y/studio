// Tell IndexNow engines about changed canonical, indexable HTML pages only.
//   SITE_URL=https://your-domain.com node scripts/indexnow.mjs
//   INDEXNOW_DRY_RUN=1 SITE_URL=... node scripts/indexnow.mjs   (print the request, send nothing)
// Does nothing when SITE_URL is not set. No account is needed: the key is the <32 hex>.txt file at the site root,
// which proves we control the host. Run by .github/workflows/indexnow.yml after each push to main.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['_template', 'api', 'node_modules', 'test', '.git', '.github', '.vercel', 'scripts']);
const ENDPOINT = 'https://api.indexnow.org/indexnow';

export function findKey(dir = root) {
  const f = readdirSync(dir).find((n) => /^[0-9a-f]{32}\.txt$/.test(n));
  if (!f) throw new Error('No IndexNow key file (<32 hex characters>.txt) at the site root.');
  const key = readFileSync(join(dir, f), 'utf8').trim();
  if (key + '.txt' !== f) throw new Error(`Key file ${f} must contain exactly its own name without .txt`);
  return key;
}

export function pagePaths(dir = root) {
  const out = [];
  (function walk(d) {
    for (const name of readdirSync(d)) {
      if (SKIP.has(name)) continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.html')) {
        const rel = relative(dir, p).split(sep).join('/');
        out.push('/' + (rel === 'index.html' ? '' : rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel));
      }
    }
  })(dir);
  return out.sort();
}

export function changedPageUrls(dir = root) {
  let files;
  try {
    files = execFileSync('git', ['diff', '--name-only', 'HEAD^', 'HEAD', '--', '*.html'], { cwd: dir, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
  } catch {
    throw new Error('IndexNow needs the previous commit available. Set actions/checkout fetch-depth to 2.');
  }
  const urls = new Set();
  for (const file of files) {
    let html = '';
    try { html = readFileSync(join(dir, file), 'utf8'); }
    catch {
      try { html = execFileSync('git', ['show', `HEAD^:${file}`], { cwd: dir, encoding: 'utf8' }); } catch { continue; }
    }
    if (/<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) continue;
    const canonical = /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i.exec(html)?.[1];
    if (canonical) urls.add(canonical);
  }
  return [...urls].sort();
}

async function main() {
  const site = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
  if (!site) { console.log('SITE_URL is not set: nothing to do.'); return; }
  const u = new URL(site);
  if (u.protocol !== 'https:' || u.pathname !== '/') throw new Error('SITE_URL must look like https://your-domain.com');
  const key = findKey();
  const urlList = changedPageUrls();
  if (!urlList.length) { console.log('IndexNow: no changed canonical HTML pages.'); return; }
  // IndexNow accepts up to 10,000 URLs per request.
  for (let i = 0; i < urlList.length; i += 10000) {
    const body = { host: u.host, key, keyLocation: `${site}/${key}.txt`, urlList: urlList.slice(i, i + 10000) };
    if (process.env.INDEXNOW_DRY_RUN) { console.log(JSON.stringify(body, null, 1)); continue; }
    const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
    console.log(`IndexNow: ${r.status} ${r.statusText} for ${body.urlList.length} URLs`);
    if (!r.ok) { console.error(await r.text().catch(() => '')); process.exitCode = 1; }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
