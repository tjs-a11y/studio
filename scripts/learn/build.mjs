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
const MODULES = ['rate-con', 'audit', 'eudr-en', 'eudr-fr', 'texas', 'business-costs'];
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
      ...p, path: pathOf(S, p.slug), lang: S.lang, h1: p.h1 || p.term, crumbs: S.crumbs.concat([secCrumb]), crumbName: p.crumbName || p.term || p.h1.replace(/ \(49 CFR.*/, ''),
      schema: S.termSet ? 'DefinedTerm' : 'Article', termSet: { name: S.name, path: S.path }, related, cta: p.cta || S.cta,
      alternates: p.alt ? { [S.lang]: pathOf(S, p.slug), [S.altLang]: p.alt } : undefined, otherLang: p.alt,
      disclaimer: p.disclaimer || S.disclaimer, checked: p.checked || S.checked,
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
    alternates: S.alt ? { [S.lang]: S.path, [S.altLang]: S.alt } : undefined, otherLang: S.alt, checked: S.checked };
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
    h1: 'Learn', description: 'Plain-English reference pages: rate confirmation terms, the FMCSA new entrant audit, EUDR plot files, Texas drilling permits and small-business recurring costs.',
    lede: 'Reference pages that answer one specific question each, written in plain English, with the official source linked on every page.',
    body: `<p>Most sections below sit next to one of the Quickwell tools. The pages explain the rules the tool checks, so you can understand a result, or fix a problem, without the tool. The business costs section is a standalone set of how-to pages for small businesses. Every page lists the sources it was checked against and the date.</p>
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
${out.map((o) => `  <url><loc>${SITE}${o.path}</loc><lastmod>${(o.page.checked && o.page.checked.iso) || CHECKED}</lastmod></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(root, 'sitemap-learn.xml'), sitemap);
console.log(`built ${out.length} pages (${sections.map((x) => `${x.S.path}: ${x.pages.length + 1}`).join(', ')}, hub: 1) and sitemap-learn.xml; origin ${SITE}`);

// llms.txt / llms-full.txt: a plain-text map of the site for AI search assistants (https://llmstxt.org).
const TOOLS = [
  ['Rate Con Checker', '/rate-con-checker/', 'Paste a trucking broker rate confirmation; 20 checks (detention, TONU, layover, lumper, fines, setoff, payment terms, broker identity and more) give a grade and a ready-to-send fix request. Runs in the browser; nothing is uploaded. 3 free checks a day; Pro is $9/month or $79/year.'],
  ['New Authority Audit Kit', '/audit-kit/', 'Free self-check against the 16 violations that automatically fail an FMCSA new entrant safety audit (49 CFR 385.321(b)), then an optional $39 one-time kit that fills in driver files, drug and alcohol program documents, maintenance files and an audit binder. Runs in the browser. A free one-page printable of the 16 rules is at /audit-kit/16-rules-printable/.'],
  ['EUDR Plot File Checker', '/plot-file-checker/', 'Free checker for farm plot geolocation files (GeoJSON, KML, CSV, WKT) under the EU Deforestation Regulation; flags the EU Information System\'s file rules and fixes the safe ones. English and French. Runs in the browser.'],
  ['Permit Watch (Texas)', '/permit-watch/', 'Free list of new Texas drilling permits by county from the Railroad Commission of Texas daily permit file, with filters and a free RSS feed per county. First data load pending.'],
];
const secs = sections;
const line = (title, path, desc) => `- [${title}](${SITE}${path}): ${desc}`;
const llms = `# Quickwell

> Quickwell is a studio of small, single-purpose web tools: a trucking rate confirmation checker, an FMCSA new entrant audit self-check and kit, an EUDR plot file checker (English and French) and a Texas drilling permit watcher. Each tool has plain-English reference pages that explain the rules it checks, with official sources linked on every page. A separate reference section helps small businesses manage auto-renewals, vendor price increases and recurring charges.

All tools run in the browser; files and text people check are not uploaded. Reference pages are educational, not legal advice, and list the date their sources were checked.

## Tools

${TOOLS.map(([t, p, d]) => line(t, p, d)).join('\n')}

## Reference pages

${secs.map(({ S, pages }) => line(S.name + (S.lang === 'fr' ? ' (French)' : ''), S.path, `${S.description} (${pages.length} pages)`)).join('\n')}
${existsSync(join(root, 'guides', 'index.html')) ? line('Guides', '/guides/', 'Longer how-to guides for the same audiences.') + '\n' : ''}
## Optional

- [Full page list](${SITE}/llms-full.txt): every reference page with its one-line summary.
`;
const full = `# Quickwell: full page list

> Every reference page on Quickwell with a one-line summary. See ${SITE}/llms.txt for the overview.

## Tools

${TOOLS.map(([t, p, d]) => line(t, p, d)).join('\n')}
${secs.map(({ S, pages }) => `
## ${S.name}${S.lang === 'fr' ? ' (French)' : ''}

${line(S.h1, S.path, S.description)}
${pages.map((p) => line(p.h1 || p.term, S.path + p.slug + '/', p.description)).join('\n')}`).join('\n')}
`;
writeFileSync(join(root, 'llms.txt'), llms);
writeFileSync(join(root, 'llms-full.txt'), full);
console.log('wrote llms.txt and llms-full.txt');

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
