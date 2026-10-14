// Shared page shell for the /learn/ reference pages (and /fr/learn/).
// (English, French and Spanish.) Same look as /index.html and /_template/: light/dark from the system, phone-first, no external assets.

export const CHECKED = '2026-10-11';
export const CHECKED_EN = 'October 11, 2026';
export const CHECKED_FR = '11 octobre 2026';

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

export const CSS = `
  :root { --bg:#f7f7f4; --ink:#15171a; --muted:#5d6470; --card:#fff; --line:#e3e3dd; --accent:#2457d6; --chip:#f0f2f6; --warn:#a86b00; }
  @media (prefers-color-scheme: dark) { :root { --bg:#111317; --ink:#eef0f3; --muted:#9aa3b2; --card:#191c22; --line:#2a2f38; --accent:#7aa2ff; --chip:#20242c; --warn:#f0b43c; } }
  * { box-sizing:border-box; } html { -webkit-text-size-adjust:100%; }
  body { margin:0; font:17px/1.62 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; background:var(--bg); color:var(--ink); }
  main { max-width:760px; margin:0 auto; padding:24px 16px 56px; }
  a { color:var(--accent); } a:hover { text-decoration-thickness:2px; }
  nav.crumbs ol { list-style:none; padding:0; margin:0 0 18px; display:flex; flex-wrap:wrap; gap:4px; font-size:.88rem; color:var(--muted); }
  nav.crumbs li + li::before { content:"/"; margin-right:4px; color:var(--line); }
  nav.crumbs a { color:var(--muted); }
  h1 { font-size:clamp(1.65rem,5vw,2.3rem); line-height:1.2; margin:0 0 10px; letter-spacing:-.02em; overflow-wrap:anywhere; }
  h2 { font-size:1.28rem; margin:32px 0 8px; letter-spacing:-.01em; } h3 { font-size:1.05rem; margin:22px 0 6px; }
  p.lede { color:var(--muted); font-size:1.08rem; margin:0 0 20px; }
  .meta { font-size:.85rem; color:var(--muted); margin:-8px 0 20px; }
  article ul, article ol { padding-left:22px; } article li { margin:4px 0; }
  code, .mono { font:.9em/1.4 ui-monospace,Menlo,Consolas,monospace; background:var(--chip); padding:1px 5px; border-radius:5px; overflow-wrap:anywhere; }
  pre { font:13.5px/1.45 ui-monospace,Menlo,Consolas,monospace; background:var(--chip); padding:12px; border-radius:10px; overflow-x:auto; max-width:100%; white-space:pre; }
  blockquote { margin:12px 0; padding:10px 14px; border-left:3px solid var(--accent); background:var(--card); border-radius:0 10px 10px 0; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; margin:20px 0; }
  .cta { border-color:var(--accent); } .cta b { display:block; margin-bottom:4px; } .cta a.btn { display:inline-block; margin-top:10px; padding:9px 14px; border-radius:9px; background:var(--accent); color:#fff; text-decoration:none; font-weight:600; }
  @media (prefers-color-scheme: dark) { .cta a.btn { color:#0d1117; } }
  .tbl { overflow-x:auto; max-width:100%; margin:12px 0; } table { border-collapse:collapse; width:100%; font-size:.93rem; }
  th, td { text-align:left; vertical-align:top; padding:7px 8px; border-top:1px solid var(--line); } th { font-weight:600; }
  .grid { display:grid; gap:12px; grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr)); margin:12px 0; }
  a.tile { display:block; padding:14px; border:1px solid var(--line); border-radius:12px; background:var(--card); color:inherit; text-decoration:none; }
  a.tile:hover { border-color:var(--accent); } a.tile b { display:block; margin-bottom:2px; } a.tile span { color:var(--muted); font-size:.92rem; }
  .note { font-size:.9rem; color:var(--muted); } .warn { color:var(--warn); font-weight:600; }
  .sources ul { padding-left:20px; font-size:.9rem; overflow-wrap:anywhere; }
  .disclaimer { font-size:.88rem; color:var(--muted); border-top:1px solid var(--line); padding-top:14px; margin-top:28px; }
  footer { margin-top:26px; color:var(--muted); font-size:.88rem; } footer a { color:inherit; }
`;

// Open Graph and Twitter tags, for pages that set ogImage (a 1200x630 image path on this site).
const OG_LOCALE = { en: 'en_US', es: 'es_US', fr: 'fr_FR' };
function og(page, abs) {
  const t = esc(page.title), d = esc(page.description), img = esc(abs(page.ogImage));
  return `<meta property="og:type" content="article">
<meta property="og:site_name" content="Quickwell">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${esc(abs(page.path))}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="${OG_LOCALE[page.lang] || 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">
`;
}

// page: { path, lang, title, h1, description, lede, body, schema: 'DefinedTerm'|'Article'|'CollectionPage',
//         term, termSet: {name, path}, crumbs: [{name, path}], cta: {title, text, href, label}, related: [{href, title, text}],
//         sources: [{label, url}], alternates: {en, fr} }
export function render(page, SITE) {
  const fr = page.lang === 'fr';
  const abs = (p) => SITE.replace(/\/$/, '') + p;
  const crumbs = page.crumbs.concat([{ name: page.crumbName || page.h1, path: page.path }]);
  const ld = [{
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.path) })),
  }];
  const base = { headline: page.h1, description: page.description, inLanguage: page.lang, url: abs(page.path), dateModified: (page.checked && page.checked.iso) || CHECKED,
    publisher: { '@type': 'Organization', name: 'Quickwell' } };
  if (page.schema === 'DefinedTerm') {
    ld.push({ '@context': 'https://schema.org', '@type': 'DefinedTerm', name: page.term, description: page.description, url: abs(page.path),
      inDefinedTermSet: { '@type': 'DefinedTermSet', name: page.termSet.name, url: abs(page.termSet.path) } });
    ld.push({ '@context': 'https://schema.org', '@type': 'Article', ...base });
  } else if (page.schema === 'CollectionPage') {
    ld.push({ '@context': 'https://schema.org', '@type': page.termSetLd ? ['CollectionPage', 'DefinedTermSet'] : 'CollectionPage', name: page.h1, description: page.description, url: abs(page.path), inLanguage: page.lang });
  } else {
    ld.push({ '@context': 'https://schema.org', '@type': 'Article', ...base });
  }
  const alt = page.alternates ? Object.entries(page.alternates).map(([l, p]) => `<link rel="alternate" hreflang="${l}" href="${esc(abs(p))}">`).join('\n') + '\n' : '';
  const es = page.lang === 'es';
  const T = fr
    ? { crumbs: "Fil d'Ariane", related: 'Voir aussi', sources: 'Sources', checked: `Sources ouvertes et vérifiées le ${CHECKED_FR}.`, home: 'Accueil Quickwell', privacy: 'Confidentialité', terms: 'Conditions' }
    : es
      ? { crumbs: 'Ruta de navegación', related: 'Relacionado', sources: 'Fuentes', checked: `Fuentes abiertas y verificadas el ${(page.checked && page.checked.es) || page.checked.iso}.`, home: 'Inicio de Quickwell', privacy: 'Privacidad', terms: 'Condiciones' }
      : { crumbs: 'Breadcrumb', related: 'Related', sources: 'Sources', checked: `Sources opened and checked on ${(page.checked && page.checked.en) || CHECKED_EN}.`, home: 'Quickwell home', privacy: 'Privacy', terms: 'Terms' };
  // The link to the page's twin in the other language, labelled in that language.
  const otherLang = page.otherLangCode || (fr ? 'en' : 'fr');
  const OTHER = { en: 'English version', fr: 'Version française', es: 'Versión en español' }[otherLang];
  const disclaimer = page.disclaimer || (fr
    ? "Ceci n'est pas un avis juridique. Ces pages expliquent des règles techniques publiques ; elles ne garantissent pas qu'un fichier ou une déclaration sera accepté. Vérifiez toujours la documentation officielle à jour."
    : 'Not legal advice. This page explains public rules and common contract terms in plain English; it is not a substitute for reading your own documents or asking a qualified professional. Rules change, so check the official source.');
  return `<!doctype html>
<html lang="${page.lang}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${esc(abs(page.path))}">
<link rel="icon" href="data:,">
${page.ogImage ? og(page, abs) : ''}${alt}<style>${CSS}</style>
${ld.map((o) => `<script type="application/ld+json">${json(o)}</script>`).join('\n')}
<script defer src="/js/va.js"></script><script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
<main>
  <nav class="crumbs" aria-label="${T.crumbs}"><ol>${crumbs.map((c, i) => i === crumbs.length - 1 ? `<li aria-current="page">${esc(c.name)}</li>` : `<li><a href="${c.path}">${esc(c.name)}</a></li>`).join('')}</ol></nav>
  <article>
    <h1>${esc(page.h1)}</h1>
    ${page.lede ? `<p class="lede">${page.lede}</p>` : ''}
    ${page.otherLang ? `<p class="meta"><a href="${page.otherLang}" hreflang="${otherLang}" lang="${otherLang}">${OTHER}</a></p>` : ''}
${page.body}
  </article>
${page.cta ? `  <aside class="card cta"><b>${esc(page.cta.title)}</b>${page.cta.text}<br><a class="btn" href="${page.cta.href}">${esc(page.cta.label)}</a></aside>\n` : ''}${page.related && page.related.length ? `  <section><h2>${T.related}</h2><div class="grid">${page.related.map((r) => `<a class="tile" href="${r.href}"><b>${esc(r.title)}</b>${r.text ? `<span>${esc(r.text)}</span>` : ''}</a>`).join('')}</div></section>\n` : ''}  <section class="sources"><h2>${T.sources}</h2><ul>${page.sources.map((s) => `<li>${esc(s.label)}: <a href="${esc(s.url)}" rel="noopener">${esc(s.url)}</a></li>`).join('')}</ul><p class="note">${T.checked}</p></section>
  <p class="disclaimer">${disclaimer}</p>
  <footer><a href="/">${T.home}</a> · <a href="/learn/">Learn</a> · <a href="/privacy.html">${T.privacy}</a> · <a href="/terms.html">${T.terms}</a></footer>
</main>
</body>
</html>
`;
}

// Words of real content: article body + lede, tags stripped.
export function wordCount(page) {
  const t = (page.lede || '') + ' ' + page.body;
  return t.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
