// Writes sitemap-main.xml (home, tools, the Play games, guides, privacy, terms) and sitemap.xml, a sitemap index that lists
// sitemap-main.xml plus every other sitemap-*.xml at the repo root (e.g. sitemap-learn.xml).
// Each page's URL is read from its own <link rel="canonical">, and EN/FR pairs from its hreflang links,
// so the sitemap always matches the pages. Origin comes from site.config.json.
//   node scripts/sitemap.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const origin = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8')).origin;
const today = process.env.SITEMAP_DATE || new Date().toISOString().slice(0, 10);
// Each tool page, plus any sub-page a tool folder holds (e.g. audit-kit/16-rules-printable/).
const subPages = (id) => readdirSync(join(root, id), { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(root, id, d.name, 'index.html'))).map((d) => `${id}/${d.name}/index.html`).sort();
const tools = JSON.parse(readFileSync(join(root, 'catalog', 'tools.json'), 'utf8')).tools.flatMap((t) => [`${t.id}/index.html`, ...subPages(t.id)]);
const guides = existsSync(join(root, 'guides'))
  ? ['guides/index.html', ...readdirSync(join(root, 'guides'), { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(root, 'guides', d.name, 'index.html'))).map((d) => `guides/${d.name}/index.html`).sort()]
  : [];
// Sections that aren't billed tools (so aren't in the catalog): their index page plus every sub-page with an index.html,
// e.g. play/ -> play/index.html, play/echo/index.html … Standalone pages are listed one by one.
const SECTIONS = ['play'];
const STANDALONE = ['brain-pass/index.html', 'guides/trucking-settlement-disputes.html', 'guides/understanding-mineral-royalty-deductions.html', 'port-watcher/index.html', 'hydro-flow/index.html', 'scale-audit/index.html', 'weekend/index.html'];
const sections = SECTIONS.filter((s) => existsSync(join(root, s, 'index.html'))).flatMap((s) => [`${s}/index.html`, ...subPages(s)]);
const standalone = STANDALONE.filter((f) => existsSync(join(root, f)));
export const MAIN_PAGES = [...new Set(['index.html', ...tools, ...sections, ...standalone, ...guides, 'privacy.html', 'terms.html'])];

const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const entries = MAIN_PAGES.map((f) => {
  const html = readFileSync(join(root, f), 'utf8');
  const canon = /<link rel="canonical" href="([^"]+)">/.exec(html);
  if (!canon) throw new Error(`${f} has no canonical link`);
  const alts = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)];
  return `  <url><loc>${xml(canon[1])}</loc><lastmod>${today}</lastmod>${alts.map((a) => `\n    <xhtml:link rel="alternate" hreflang="${a[1]}" href="${xml(a[2])}"/>`).join('')}</url>`;
});
writeFileSync(join(root, 'sitemap-main.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`);
const parts = ['sitemap-main.xml', ...readdirSync(root).filter((n) => /^sitemap-.+\.xml$/.test(n) && n !== 'sitemap-main.xml').sort()];
writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${parts.map((p) => `  <sitemap><loc>${origin}/${p}</loc><lastmod>${today}</lastmod></sitemap>`).join('\n')}
</sitemapindex>
`);
console.log(`sitemap-main.xml: ${entries.length} pages; sitemap.xml indexes ${parts.join(', ')}`);
