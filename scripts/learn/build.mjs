// Builds the /learn/ reference pages (and /fr/learn/eudr/) from the content modules, plus sitemap-learn.xml.
//   node scripts/learn/build.mjs          build
//   node scripts/learn/build.mjs --check  build, then fail if a page is thin (<400 words) or an internal link is broken
// The absolute address comes from site.config.json ("origin"); scripts/set-domain.mjs rewrites it in the built files.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, wordCount, CHECKED } from './layout.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SITE = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8')).origin.replace(/\/$/, '');

// Each module exports SECTION and PAGES (or TERMS). Missing modules are skipped.
const MODULES = ['rate-con', 'audit', 'eudr-en', 'eudr-fr', 'texas'];
const sections = [];
for (const m of MODULES) {
  const f = join(root, 'scripts', 'learn', 'content', m + '.mjs');
  if (!existsSync(f)) continue;
  const mod = await import(f);
  sections.push({ id: m, S: mod.SECTION, pages: mod.PAGES || mod.TERMS });
}

const out = []; // { path, html, page, minWords }
const pathOf = (S, slug) => S.path + slug + '/';

for (const { S, pages } of sections) {
  const fr = S.lang === 'fr';
  const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));
  const secCrumb = { name: S.name, path: S.path };
  for (const p of pages) {
    const related = (p.related || []).map((r) => {
      if (typeof r !== 'string') return r;
      const q = bySlug[r]; if (!q) throw new Error(`${S.path}${p.slug}: unknown related slug ${r}`);
      return { href: pathOf(S, r), title: q.term || q.h1, text: q.short };
    });
    related.push({ href: S.path, title: fr ? `Toutes les pages : ${S.name}` : `All of the ${S.name.toLowerCase()}`, text: '' });
    const page = {
      ...p, path: pathOf(S, p.slug), lang: S.lang, h1: p.h1 || p.term, crumbs: S.crumbs.concat([secCrumb]), crumbName: p.crumbName || p.short && p.term || p.h1,
      schema: S.termSet ? 'DefinedTerm' : 'Article', termSet: { name: S.name, path: S.path }, related, cta: p.cta || S.cta,
      alternates: p.alt ? { [S.lang]: pathOf(S, p.slug), [S.altLang]: p.alt } : undefined, otherLang: p.alt,
      disclaimer: p.disclaimer || S.disclaimer,
    };
    out.push({ path: page.path, html: render(page, SITE), page, minWords: 400 });
  }
  // section index
  const groups = S.groups || [{ title: null, slugs: pages.map((p) => p.slug) }];
  const body = `${S.intro}
${groups.map((g) => `${g.title ? `<h2>${g.title}</h2>` : ''}${g.text ? `<p>${g.text}</p>` : ''}<div class="grid">${g.slugs.map((s) => { const q = bySlug[s]; return `<a class="tile" href="${pathOf(S, s)}"><b>${q.term || q.h1}</b><span>${q.short}</span></a>`; }).join('')}</div>`).join('\n')}
${S.outro || ''}`;
  const idx = { path: S.path, lang: S.lang, title: S.title, h1: S.h1, description: S.description, lede: S.lede, body, crumbs: S.crumbs, crumbName: S.name,
    schema: 'CollectionPage', termSetLd: !!S.termSet, cta: S.cta, sources: S.sources || uniqSources(pages), disclaimer: S.disclaimer,
    alternates: S.alt ? { [S.lang]: S.path, [S.altLang]: S.alt } : undefined, otherLang: S.alt };
  out.push({ path: S.path, html: render(idx, SITE), page: idx, minWords: 150 });
}

function uniqSources(pages) {
  const seen = new Map();
  for (const p of pages) for (const s of p.sources) if (!seen.has(s.url)) seen.set(s.url, s);
  return [...seen.values()];
}

// /learn/ hub (English sections only; the French section links from its English twin)
const en = sections.filter((x) => x.S.lang === 'en');
if (en.length) {
  const hub = {
    path: '/learn/', lang: 'en', title: 'Learn: Plain-English Guides for Truckers, EUDR Exporters and Texas Mineral Owners | Quickwell',
    h1: 'Learn', description: 'Plain-English reference pages behind the Quickwell tools: rate confirmation terms, the FMCSA new entrant audit, EUDR plot file errors and Texas drilling permit districts.',
    lede: 'Reference pages that answer one specific question each, written in plain English, with the official source linked on every page.',
    body: `<p>Each section below sits next to one of the Quickwell tools. The pages explain the rules the tool checks, so you can understand a result, or fix a problem, without the tool. Every page lists the sources it was checked against and the date.</p>
<div class="grid">${en.map(({ S, pages }) => `<a class="tile" href="${S.path}"><b>${S.name}</b><span>${pages.length} pages. ${S.hubText || ''}</span></a>`).join('')}</div>`,
    crumbs: [{ name: 'Quickwell', path: '/' }], crumbName: 'Learn', schema: 'CollectionPage',
    sources: en.flatMap(({ S, pages }) => uniqSources(pages).slice(0, 2)),
  };
  out.push({ path: '/learn/', html: render(hub, SITE), page: hub, minWords: 50 });
}

for (const o of out) {
  const dir = join(root, o.path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), o.html);
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${out.map((o) => `  <url><loc>${SITE}${o.path}</loc><lastmod>${CHECKED}</lastmod></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(root, 'sitemap-learn.xml'), sitemap);
console.log(`built ${out.length} pages (${sections.map((x) => `${x.S.path}: ${x.pages.length + 1}`).join(', ')}, hub: 1) and sitemap-learn.xml; origin ${SITE}`);

if (process.argv.includes('--check')) {
  let bad = 0;
  const titles = new Map(), descs = new Map();
  for (const o of out) {
    const w = wordCount(o.page);
    if (w < o.minWords) { console.error(`THIN ${o.path}: ${w} words`); bad++; }
    for (const [m, k] of [[titles, o.page.title], [descs, o.page.description]]) { if (m.has(k)) { console.error(`DUPLICATE title/description ${o.path} and ${m.get(k)}`); bad++; } m.set(k, o.path); }
    for (const [, href] of o.html.matchAll(/href="(\/[^"#?]*)/g)) {
      const f = href.endsWith('/') ? join(root, href, 'index.html') : join(root, href);
      if (!existsSync(f)) { console.error(`BROKEN ${o.path} -> ${href}`); bad++; }
    }
  }
  const counts = out.filter((o) => o.minWords === 400).map((o) => wordCount(o.page));
  console.log(`content pages: ${counts.length}, words min ${Math.min(...counts)}, median ${counts.sort((a, b) => a - b)[counts.length >> 1]}`);
  if (bad) { console.error(`${bad} problem(s)`); process.exit(1); }
  console.log('check passed');
}
