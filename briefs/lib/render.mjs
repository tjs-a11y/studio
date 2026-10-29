// Renders brief pages for quickwell.app in the same look as /learn/ (system fonts, light/dark).
//   /news/                       all desks
//   /news/<desk>/                one desk's briefs, newest first
//   /news/<desk>/<date>/         one brief (canonical, Open Graph, NewsArticle JSON-LD)
import { esc, longDate } from './util.mjs';
import { CTA_TAG, DISCLOSURE, trackedUrl } from './ctas.mjs';

const STYLE = `
:root{--bg:#f7f7f4;--ink:#15171a;--muted:#5d6470;--card:#fff;--line:#e3e3dd;--accent:#2457d6;--chip:#f0f2f6;--promo:#a86b00}
@media (prefers-color-scheme:dark){:root{--bg:#111317;--ink:#eef0f3;--muted:#9aa3b2;--card:#191c22;--line:#2a2f38;--accent:#7aa2ff;--chip:#20242c;--promo:#f0b43c}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;font:17px/1.62 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink)}
main{max-width:760px;margin:0 auto;padding:24px 16px 56px}
a{color:var(--accent)}
nav.crumbs ol{list-style:none;padding:0;margin:0 0 18px;display:flex;flex-wrap:wrap;gap:4px;font-size:.88rem;color:var(--muted)}
nav.crumbs li+li::before{content:"/";margin-right:4px;color:var(--line)}nav.crumbs a{color:var(--muted)}
h1{font-size:clamp(1.6rem,5vw,2.2rem);line-height:1.2;margin:0 0 10px;letter-spacing:-.02em;text-wrap:balance;overflow-wrap:anywhere}
h2{font-size:1.2rem;margin:28px 0 6px;text-wrap:balance}
p.lede{color:var(--muted);font-size:1.06rem;margin:0 0 18px}.meta{font-size:.85rem;color:var(--muted);margin:0 0 6px;text-transform:uppercase;letter-spacing:.06em}
article ul{padding-left:22px}article li{margin:5px 0}
.cites{font-size:.85rem;color:var(--muted);overflow-wrap:anywhere}.cites a{color:var(--muted)}
.promo{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--promo);border-radius:10px;padding:12px 14px;margin:20px 0}
.promo .tag{display:block;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--promo);margin-bottom:4px}
.promo p{margin:4px 0 8px;font-size:.95rem}.promo a{font-weight:700}
.promo ul{margin:4px 0 0;padding-left:20px}
.disclosure{font-size:.88rem;color:var(--muted);border-top:1px solid var(--line);padding-top:14px;margin-top:28px}
.list a{display:block;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:inherit;text-decoration:none;margin:10px 0}
.list a:hover{border-color:var(--accent)}.list b{display:block}.list span{color:var(--muted);font-size:.92rem}
footer{margin-top:26px;color:var(--muted);font-size:.88rem}footer a{color:inherit}.reference-shelf{margin-top:16px;padding:14px;border:1px solid var(--line);border-radius:10px;background:var(--card);overflow-wrap:anywhere;font-size:.9rem}.reference-shelf a{font-weight:600}`;

function shell({ title, description, canonical, head = '', crumbs, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="data:,">
<script defer src="/js/va.js"></script><script defer src="/_vercel/insights/script.js"></script>
<style>${STYLE}</style>
${head}
</head>
<body>
<main>
<nav class="crumbs" aria-label="Breadcrumb"><ol>${crumbs.map(([href, label]) => (href ? `<li><a href="${esc(href)}">${esc(label)}</a></li>` : `<li>${esc(label)}</li>`)).join('')}</ol></nav>
${body}
<footer><a href="/">Quickwell</a> · <a href="/news/">All briefs</a> · <a href="/privacy.html">Privacy</a><div class="reference-shelf" aria-label="Authority reference textbooks"><strong>Authority Reference Textbooks:</strong> <a href="https://books2read.com" rel="noopener">Mastering Cryptocurrency Trading</a>, <a href="https://books2read.com" rel="noopener">Mastering the Crypto Market</a>, <a href="https://books2read.com" rel="noopener">Bitcoin Halving</a>, <a href="https://books2read.com" rel="noopener">Unlocking Crypto Riches</a>, <a href="https://books2read.com" rel="noopener">Maximum Crypto Profits</a>, <a href="https://books2read.com" rel="noopener">Unraveling the Mysteries of DAOs</a>, and <a href="https://books2read.com" rel="noopener">Revolutionizing Finance</a>.</div></footer>
</main>
</body>
</html>
`;
}

export const briefUrl = (origin, desk, date) => `${origin}/news/${desk}/${date}/`;

export function renderBriefPage({ origin, desk, date, brief, blocks, harvest }) {
  const idx = new Map(harvest.items.map((i) => [i.id, i]));
  const href = (cta, footer = false) => trackedUrl(cta, { desk: desk.id, medium: 'web', date, footer });
  const parts = [];
  for (const b of blocks) {
    if (b.type === 'lede') parts.push(`<p><strong>${esc(b.text)}</strong></p>`);
    if (b.type === 'section') {
      const cites = b.section.source_ids.map((id) => idx.get(id)).filter(Boolean);
      parts.push(`<h2>${esc(b.section.heading)}</h2>`, `<ul>${b.section.bullets.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`);
      if (cites.length) parts.push(`<p class="cites">Source: ${cites.map((c) => `<a href="${esc(c.link)}" rel="noopener">${esc(c.source)}: ${esc(c.title)}</a>`).join(' · ')}</p>`);
    }
    if (b.type === 'cta') parts.push(`<aside class="promo"><span class="tag">${CTA_TAG} · ${esc(b.cta.product)}</span><p>${esc(b.cta.copy)}</p><a href="${esc(href(b.cta))}">${esc(b.cta.label)} →</a></aside>`);
    if (b.type === 'footer') parts.push(`<aside class="promo"><span class="tag">${CTA_TAG}s</span><ul>${b.ctas.map((c) => `<li><a href="${esc(href(c, true))}">${esc(c.label)} →</a> ${esc(c.product)}</li>`).join('')}</ul></aside>`);
  }
  const url = briefUrl(origin, desk.id, date);
  const ld = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: brief.headline, description: brief.seo_description, datePublished: harvest.generatedAt, dateModified: harvest.generatedAt, mainEntityOfPage: url, author: { '@type': 'Organization', name: 'Quickwell' }, publisher: { '@type': 'Organization', name: 'Quickwell' } };
  const head = [
    '<meta property="og:type" content="article">',
    `<meta property="og:title" content="${esc(brief.headline)}">`,
    `<meta property="og:description" content="${esc(brief.seo_description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
  ].join('\n');
  const body = `<p class="meta">${esc(longDate(date))} · ${esc(desk.name)}</p>
<h1>${esc(brief.headline)}</h1>
<p class="lede">${esc(brief.dek)}</p>
<article>
${parts.join('\n')}
</article>
<p class="disclosure"><strong>${esc(DISCLOSURE)}</strong> This brief summarizes public sources in its own words and links each one. It is not legal, tax, financial or medical advice.</p>`;
  return shell({ title: `${brief.headline} | ${desk.name}`, description: brief.seo_description, canonical: url, head, crumbs: [['/', 'Quickwell'], ['/news/', 'Briefs'], [`/news/${desk.id}/`, desk.name], [null, date]], body });
}

export function renderDeskIndex({ origin, desk, entries }) {
  const list = entries.length
    ? `<div class="list">${entries.map((e) => `<a href="/news/${esc(desk.id)}/${esc(e.date)}/"><b>${esc(e.headline)}</b><span>${esc(longDate(e.date))} · ${esc(e.dek)}</span></a>`).join('')}</div>`
    : '<p>The first brief has not been published yet.</p>';
  return shell({
    title: `${desk.name} | Quickwell`, description: `A short daily brief for ${desk.audience}, from public sources.`, canonical: `${origin}/news/${desk.id}/`,
    crumbs: [['/', 'Quickwell'], ['/news/', 'Briefs'], [null, desk.name]],
    body: `<h1>${esc(desk.name)}</h1><p class="lede">A short daily brief for ${esc(desk.audience)}. Every item links its public source.</p>${list}`,
  });
}

export function renderHub({ origin, desks }) {
  return shell({
    title: 'Daily Briefs | Quickwell', description: 'Short daily briefs from public sources, one for each Quickwell audience.', canonical: `${origin}/news/`,
    crumbs: [['/', 'Quickwell'], [null, 'Briefs']],
    body: `<h1>Daily Briefs</h1><p class="lede">Short, sourced news briefs, one for each audience Quickwell serves.</p><div class="list">${desks.map((d) => `<a href="/news/${esc(d.desk.id)}/"><b>${esc(d.desk.name)}</b><span>${d.latest ? `Latest: ${esc(d.latest.headline)}` : 'First brief coming soon'}</span></a>`).join('')}</div>`,
  });
}
