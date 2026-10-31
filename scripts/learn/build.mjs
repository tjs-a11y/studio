// Builds the /learn/ reference pages (and /fr/learn/eudr/, /es/learn/fall-risk-tests/) from the content modules, plus sitemap-learn.xml.
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
const MODULES = ['rate-con', 'audit', 'eudr-en', 'eudr-fr', 'texas', 'business-costs', '1099', 'power-bills'];
const sections = [];
for (const m of MODULES) {
  const f = join(root, 'scripts', 'learn', 'content', m + '.mjs');
  if (!existsSync(f)) continue;
  const mod = await import(f);
  sections.push({ id: m, S: mod.SECTION, pages: mod.PAGES || mod.TERMS });
}
// Standalone articles (one page each, any language, at their own path): modules export ARTICLES and a HUB tile.
const ARTICLE_MODULES = ['footsure', 'factoring-shortpay'];
const articles = []; const articleTiles = [];
for (const m of ARTICLE_MODULES) {
  const f = join(root, 'scripts', 'learn', 'content', m + '.mjs');
  if (!existsSync(f)) continue;
  const mod = await import(f);
  articles.push(...mod.ARTICLES); if (mod.HUB) articleTiles.push(mod.HUB);
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

for (const a of articles) {
  const page = { ...a, schema: 'Article', alternates: a.alt ? { [a.lang]: a.path, [a.altLang]: a.alt } : undefined, otherLang: a.alt, otherLangCode: a.altLang };
  out.push({ path: a.path, html: render(page, SITE), page, minWords: 400 });
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
    h1: 'Learn', description: 'Plain-English reference pages: rate confirmation terms, the FMCSA new entrant audit, EUDR plot files, Texas drilling permits, small-business recurring costs and 2026 Form 1099 rules.',
    lede: 'Reference pages that answer one specific question each, written in plain English, with the official source linked on every page.',
    body: `<p>Most sections below sit next to one of the Quickwell tools. The pages explain the rules the tool checks, so you can understand a result, or fix a problem, without the tool. The business costs and 1099 reporting sections are how-to pages for small businesses; both sit next to the Year-End Vendor Check. Every page lists the sources it was checked against and the date.</p>
<div class="grid">${en.map(({ S, pages }) => `<a class="tile" href="${S.path}"><b>${S.name}</b><span>${pages.length} pages. ${S.hubText || ''}</span></a>`).join('')}${articleTiles.map((t) => `<a class="tile" href="${t.path}"><b>${t.title}</b><span>${t.text}</span></a>`).join('')}</div>`,
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
console.log(`built ${out.length} pages (${sections.map((x) => `${x.S.path}: ${x.pages.length + 1}`).join(', ')}, articles: ${articles.length}, hub: 1) and sitemap-learn.xml; origin ${SITE}`);

// llms.txt / llms-full.txt: a plain-text map of the site for AI search assistants (https://llmstxt.org).
const TOOLS = [
  ['Rate Con Checker', '/rate-con-checker/', 'Paste a trucking broker rate confirmation; 20 checks (detention, TONU, layover, lumper, fines, setoff, payment terms, broker identity and more) give a grade and a ready-to-send fix request. Runs in the browser; nothing is uploaded. 3 free checks a day; Pro is $9/month or $79/year.'],
  ['Spare Key', '/spare-key/', 'A private lost-phone and family legacy plan for everyday people: tap through the accounts you use (never type a password) to get a Lockout Score, a fix list, a printable Lost-Phone Sheet and an encrypted family handoff file. Free for one person; Family Pack $4.99 one-time. Everything stays on the device.'],
  ['Year-End Vendor Check', '/vendor-check/', 'Upload a 2026 bank, card, QuickBooks or Xero export and see which vendors likely need a Form 1099 under the $2,000 threshold for payments after Dec 31, 2025 (26 U.S.C. 6041), who is near the line, who is probably excluded (card payments, most corporations) and the W-9s to collect, plus every recurring charge, renewal, price increase and contract cancel-by date. Free scan; $19 Owner Pack or $59 Bookkeeper Pack, one-time. Runs in the browser; nothing is uploaded. Not tax advice.'],
  ['New Authority Audit Kit', '/audit-kit/', 'Free self-check against the 16 violations that automatically fail an FMCSA new entrant safety audit (49 CFR 385.321(b)), then an optional $39 one-time kit that fills in driver files, drug and alcohol program documents, maintenance files and an audit binder. Runs in the browser. A free one-page printable of the 16 rules is at /audit-kit/16-rules-printable/.'],
  ['EUDR Plot File Checker', '/plot-file-checker/', 'Free checker for farm plot geolocation files (GeoJSON, KML, CSV, WKT) under the EU Deforestation Regulation; flags the EU Information System\'s file rules and fixes the safe ones. English, French and Spanish. Runs in the browser.'],
  ['Permit Watch (Texas)', '/permit-watch/', 'Free list of new Texas drilling permits by county from the Railroad Commission of Texas daily permit file, with filters and a free RSS feed per county. First data load pending.'],
  ['WorldSource Commodity Desk', '/commodities/', 'Commodity prices only (no stocks): metals, energy, grains and softs, fertilizers, ECB reference currency rates and the U.S. Treasury yield curve, from free official sources (World Bank Pink Sheet monthly averages, EIA spot prices via FRED, ECB, U.S. Treasury), each number labeled with source, date and frequency. A daily brief that is the same for every reader, a private holdings tracker in any currency (stored on the device), and a guide to checking that a dealer or broker is licensed. Not investment advice; it never holds funds or executes trades. Free board, brief and 3 holdings; Desk plan $2.99/month or $24.99/year, also in Quickwell Plus.'],
  ['Quickwell Saver', '/saver/', 'Reads your own bank or card export (CSV, or pasted statement text) in the browser and finds every subscription and recurring bill, price increases, double charges, free trials that turned paid, and bank fees, with a yearly total. Nothing is uploaded and it never asks for a bank login. Free scan; the Saver plan ($2.99/month or $24.99/year, also in Quickwell Plus) adds cancellation, price push-back, refund and fee-reversal letters, cancel-by calendar reminders and a running saved-per-year record. Not financial or legal advice.'],
  ['Quickwell Pilot', '/pilot/', 'Paste the text of any letter, bill, email or notice (or a text PDF; photos are read on the device where supported) and it pulls out what is needed from you: the action, the deadline, the amount, who it is from and how to contact them, with a confidence on each field. It makes a checklist, calendar reminders (7 days and 1 day before) and reply drafts (extension, payment confirmation, dispute, cancel, reschedule) in English and Spanish. Nothing is uploaded. Free for 3 saved items; the Pilot plan ($2.99/month or $24.99/year, also in Quickwell Plus) adds unlimited items, a what-is-due timeline and a weekly summary. Not legal advice.'],
  ['Quickwell Shield', '/shield/', 'Paste any text message, email, DM, voicemail transcript or link and it checks it on the device for common scam warning signs (pressure, secrecy, impersonation, gift-card/crypto/wire payment, code or password requests, look-alike and punycode links, shorteners), highlights the exact words behind each sign, explains it in plain words and gives safe next steps. It never says a message is safe; at most "no common warning signs found". Free and unlimited; the Family plan ($2.99/month or $24.99/year, also in Quickwell Plus) adds a family code-word kit, family scam-alert cards and a private check history. English and Spanish.'],
  ['Quickwell Plus', '/plus/', 'One subscription ($4.99/month or $39/year; local-currency prices where available) that unlocks the paid features of every Quickwell everyday tool: Footsure Family, Brain Pass, the Spare Key Family Pack, and each new consumer tool as it launches. Business tools are sold separately.'],
  ['Footsure', '/footsure/', 'Runs the three CDC STEADI fall-risk screening tests (30-second chair stand, 4-stage balance, Timed Up and Go) with a phone and a helper, and compares each result with the CDC cutoffs from the official 2017 forms. Optional on-device camera counting (beta); the video never leaves the phone. Free checks; Family plan $2.99/month or $24.99/year (or Quickwell Plus) adds monthly re-checks, a trend chart, encrypted family sharing and a printable summary. General wellness, not a medical device or diagnosis.'],
  ['Quickwell Play (Echo, Swift, Linkr)', '/play/', 'Three short daily browser games: Echo (repeat growing tile sequences; memory), Swift (fast attention challenges with combo multipliers; focus) and Linkr (draw a path whose numbers add up to a target; logic). A free daily challenge in each, the same for everyone, plus 3 free practice runs a day; Brain Pass ($2.99/month, $19.99/year or $29.99 once) adds unlimited practice, all difficulties and extra modes. Installable, works offline, progress stays on the device. The games train the skills they practise; no claim that they raise general intelligence.'],
];
// Auto-include every catalog tool that isn't already given a rich blurb above, so llms.txt
// advertises the whole catalog to AI-search assistants and never goes stale as tools launch.
try {
  const catalogTools = JSON.parse(readFileSync(join(root, 'catalog', 'tools.json'), 'utf8')).tools;
  const have = new Set(TOOLS.map((t) => t[1]));
  for (const t of catalogTools) {
    const path = `/${t.id}/`;
    if (!have.has(path)) { TOOLS.push([t.name, path, t.tagline || '']); have.add(path); }
  }
} catch { /* catalog optional */ }
const secs = sections;
const line = (title, path, desc) => `- [${title}](${SITE}${path}): ${desc}`;
const llms = `# Quickwell

> Quickwell is a collection of single-purpose browser tools for households, everyday money, consumer decisions, owner-operators, small fleets, Texas mineral and royalty owners, EUDR exporters, and small businesses. Consumer tools help plan dinners, forecast electricity bills, find recurring charges, review suspicious messages, compare estimates, track receipts and understand notices. Business tools include rate-confirmation and settlement checks, FMCSA audit preparation, EUDR plot-file checks, Texas permit and royalty tools, and vendor-renewal reviews. Each tool page explains its own capabilities and data handling.

Many tools process inputs locally in the browser; check the individual page for its privacy, storage and anonymous-event details. Reference pages are educational, not legal, tax, medical or financial advice, and list the date their sources were checked.

## Tools

${TOOLS.map(([t, p, d]) => line(t, p, d)).join('\n')}

## Reference pages

${secs.map(({ S, pages }) => line(S.name + (S.lang === 'fr' ? ' (French)' : ''), S.path, `${S.description} (${pages.length} pages)`)).join('\n')}
${articles.map((a) => line(a.crumbName + (a.lang === 'es' ? ' (Spanish)' : ''), a.path, a.description)).join('\n')}
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

## Health and everyday reference pages

${articles.map((a) => line(a.h1 + (a.lang === 'es' ? ' (Spanish)' : ''), a.path, a.description)).join('\n')}
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
