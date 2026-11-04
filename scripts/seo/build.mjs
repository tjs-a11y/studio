// Programmatic SEO builder for quickwell.app.
// Reads seo/matrix.json and writes real, substantive options-spread pages under /spreads/,
// plus /spreads/index.html and sitemap-seo.xml (auto-picked up by scripts/sitemap.mjs).
// Every max-profit / max-loss / breakeven figure is computed HERE by the same tested engine
// the Utility Pipeline tool uses, so the pages can never disagree with the calculator.
//   node scripts/seo/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateSpreadMath, spreadPayoff } from '../../utility-pipeline/js/engine.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const origin = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8')).origin;
const matrix = JSON.parse(readFileSync(join(root, 'seo', 'matrix.json'), 'utf8')).rows;
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CSS = `
*{box-sizing:border-box}:root{--bg:#f5f4ef;--ink:#14181a;--muted:#566069;--card:#fff;--line:#e1e0d8;--accent:#0f766e;--accent-ink:#fff;--soft:#e6f3f1;--chip:#eeefea;--shadow:0 1px 2px rgba(20,24,26,.06),0 6px 24px rgba(20,24,26,.05)}
@media (prefers-color-scheme:dark){:root{--bg:#0f1413;--ink:#ecf0ef;--muted:#9aa6a4;--card:#171d1c;--line:#28302f;--accent:#4fd1c0;--accent-ink:#06211e;--soft:#12302c;--chip:#1f2725;--shadow:none}}
html{-webkit-text-size-adjust:100%}body{margin:0;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink);overflow-x:hidden}
main{max-width:760px;margin:0 auto;padding:8px 16px 64px}.top{max-width:760px;margin:0 auto;padding:12px 16px 0;display:flex;justify-content:space-between;gap:10px;align-items:center}
.brand{font-weight:700;color:var(--ink);text-decoration:none}.brand span{color:var(--muted);font-weight:500}
h1{font-size:clamp(1.8rem,6vw,2.5rem);margin:0;letter-spacing:-.03em;line-height:1.08}h2{font-size:1.25rem;margin:0 0 6px;letter-spacing:-.01em}
p{margin:0 0 10px}.muted{color:var(--muted)}.note{font-size:.88rem;color:var(--muted)}a{color:var(--accent);overflow-wrap:anywhere}
.crumb{font-size:.85rem;color:var(--muted);margin:10px 0 2px}.crumb a{color:var(--muted)}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;margin:14px 0;box-shadow:var(--shadow);min-width:0}
.btn{display:inline-flex;align-items:center;gap:6px;font-weight:600;padding:11px 18px;border-radius:12px;border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink);text-decoration:none;min-height:46px}
.btn.ghost{background:transparent;color:var(--accent)}
.stat{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)}.stat:last-child{border-bottom:0}.stat b{font-variant-numeric:tabular-nums}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:10px;margin:10px 0}table{width:100%;border-collapse:collapse;font-size:.9rem}th,td{border-bottom:1px solid var(--line);padding:7px 10px;text-align:left}th{background:var(--chip);font-weight:600}td{font-variant-numeric:tabular-nums}
.callout{border-radius:12px;padding:12px 14px;margin:10px 0;font-size:.93rem;background:var(--soft-amber,#fff3d6);color:#5f4100}
@media (prefers-color-scheme:dark){.callout{background:#33280f;color:#f2b84b}}
.pill{font-size:.78rem;font-weight:700;padding:2px 10px;border-radius:999px;background:var(--soft);color:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:10px}
.grid a{display:block;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--card);text-decoration:none;color:var(--ink)}
.grid a:hover{border-color:var(--accent)}.grid b{display:block;color:var(--ink);margin-bottom:3px}.grid span{color:var(--muted);font-size:.9rem}
footer{margin-top:36px;font-size:.88rem;color:var(--muted)}
`;

function shell({ title, desc, path, jsonld, body }) {
  const url = origin + path;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Quickwell">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${origin}/spreads/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${origin}/spreads/og.png">
<meta name="theme-color" content="#f5f4ef" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0f1413" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230f766e'/%3E%3Cpath d='M14 44l12-14 9 7 15-20' fill='none' stroke='%23fff' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>${CSS}</style>
<script defer src="/js/va.js"></script><script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
<div class="top"><a class="brand" href="/">Quickwell <span>· Options spreads</span></a></div>
<main>
${body}
<footer><p><b>Educational only — not financial advice.</b> Quickwell holds no funds and places no trades. Options involve risk, including the loss of the full amount at risk.</p>
<p><a href="/">More tools</a> · <a href="/utility-pipeline/">Spread calculator</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></p></footer>
</main>
</body>
</html>
`;
}

function strategyPage(row) {
  const m = calculateSpreadMath(row.short, row.long, { netPremiumPerShare: row.premium, optionType: row.type });
  const pay = spreadPayoff(row.short, row.long, { netPremiumPerShare: row.premium, optionType: row.type, steps: 7 });
  const credit = row.premium >= 0;
  const premShare = Math.abs(row.premium).toFixed(2);
  const beFormula = credit
    ? (row.type === 'put' ? 'short strike − net credit' : 'short strike + net credit')
    : (row.type === 'call' ? 'long strike + net debit' : 'long strike − net debit');
  const title = `${row.name}: Max Loss, Breakeven & Calculator`;
  const desc = `${row.name} (${row.kind.toLowerCase()}): how it works, max profit, max loss and breakeven, with a worked example and a free on-device calculator. Educational, not advice.`;
  const payRows = pay.points.map((p) => `<tr><td>${p.price}</td><td>${money(p.profit)}</td></tr>`).join('');
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', headline: title, description: desc, inLanguage: 'en', url: origin + `/spreads/${row.slug}/`, publisher: { '@id': origin + '/#org' }, about: `${row.name} options strategy` },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Options spreads', item: origin + '/spreads/' },
        { '@type': 'ListItem', position: 2, name: row.name, item: origin + `/spreads/${row.slug}/` } ] }
    ]
  };
  const body = `
<p class="crumb"><a href="/spreads/">Options spreads</a> › ${esc(row.name)}</p>
<h1>${esc(row.name)}</h1>
<p class="muted" style="margin:8px 0 0"><span class="pill">${esc(row.kind)}</span></p>
<div class="card"><p>${esc(row.summary)}</p><p class="note">${esc(row.outlook)}</p></div>

<div class="card">
  <h2>How it is built</h2>
  <p>${esc(row.legs)}</p>
</div>

<div class="card">
  <h2>The defined-risk math</h2>
  <div class="stat"><span>Spread width</span><b>${m.spread_width} (${money(m.spread_width_dollars)} per spread)</b></div>
  <div class="stat"><span>Position</span><b>${credit ? 'Credit' : 'Debit'} — ${credit ? 'you receive' : 'you pay'} ${money(Math.abs(row.premium) * 100)} per spread</b></div>
  <div class="stat"><span>Maximum profit</span><b>${money(m.max_profit)}</b></div>
  <div class="stat"><span>Maximum loss</span><b>${money(m.max_loss)}</b></div>
  <div class="stat"><span>Breakeven</span><b>${m.breakeven}</b></div>
  <p class="note" style="margin-top:10px">Breakeven = ${beFormula}. Maximum ${credit ? 'loss = width − net credit' : 'profit = width − net debit'}; maximum ${credit ? 'profit = the net credit' : 'loss = the net debit'}. Figures are per one spread (×100 shares).</p>
</div>

<div class="card">
  <h2>Worked example</h2>
  <p>Short strike ${row.short}, long strike ${row.long}, ${credit ? 'net credit' : 'net debit'} ${money(premShare)} per share, one contract. Profit or loss at expiration by the price of the underlying:</p>
  <div class="tablewrap"><table><thead><tr><th>Underlying price</th><th>Profit / loss</th></tr></thead><tbody>${payRows}</tbody></table></div>
  <p class="note">These are the same numbers the Quickwell spread calculator produces.</p>
</div>

<div class="card">
  <h2>When it is used, and the risk</h2>
  <p>${esc(row.when)}</p>
  <p>${esc(row.risk)}</p>
</div>

<div class="card" style="background:var(--soft)">
  <h2>Work your own numbers</h2>
  <p>Put your strikes and premium into the free, on-device spread calculator — nothing is uploaded. Quickwell Plus adds a full profit/loss-at-expiration table.</p>
  <p><a class="btn" href="/utility-pipeline/?ref=spreads-${row.slug}">Open the spread calculator →</a></p>
</div>`;
  return shell({ title, desc, path: `/spreads/${row.slug}/`, jsonld, body });
}

function hubPage() {
  const title = 'Options Spread Calculator & Strategy Guides';
  const desc = 'Plain-English guides to the four vertical options spreads — bull put, bear call, bull call, bear put — with max loss, breakeven and a free on-device calculator.';
  const cards = matrix.map((r) => `<a href="/spreads/${r.slug}/"><b>${esc(r.name)}</b><span>${esc(r.kind)} — ${esc(r.outlook)}</span></a>`).join('');
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', name: title, description: desc, url: origin + '/spreads/', inLanguage: 'en' },
      { '@type': 'ItemList', itemListElement: matrix.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: origin + `/spreads/${r.slug}/` })) }
    ]
  };
  const body = `
<p class="crumb"><a href="/">Quickwell</a> › Options spreads</p>
<h1>Options spread guides</h1>
<div class="card"><p>Vertical spreads are defined-risk option trades: your maximum profit and maximum loss are both fixed when you open them. These plain-English guides explain each one, with the exact max-loss and breakeven math and a worked example — then let you run your own numbers in a free, on-device calculator.</p>
<p class="note">Educational only — not financial advice.</p></div>
<div class="grid">${cards}</div>
<div class="card" style="background:var(--soft);margin-top:14px"><h2>Run your own spread</h2><p>The Quickwell spread calculator works any vertical on your device — nothing uploaded. Plus adds a payoff-at-expiration table.</p><p><a class="btn" href="/utility-pipeline/?ref=spreads-hub">Open the calculator →</a></p></div>`;
  return shell({ title, desc, path: '/spreads/', jsonld, body });
}

// write pages
mkdirSync(join(root, 'spreads'), { recursive: true });
writeFileSync(join(root, 'spreads', 'index.html'), hubPage());
for (const row of matrix) {
  mkdirSync(join(root, 'spreads', row.slug), { recursive: true });
  writeFileSync(join(root, 'spreads', row.slug, 'index.html'), strategyPage(row));
}

// sitemap-seo.xml (auto-included by scripts/sitemap.mjs's index, which globs sitemap-*.xml)
const today = new Date().toISOString().slice(0, 10);
const urls = [`${origin}/spreads/`, ...matrix.map((r) => `${origin}/spreads/${r.slug}/`)];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(root, 'sitemap-seo.xml'), xml);
console.log(`seo: wrote /spreads/ hub + ${matrix.length} strategy pages + sitemap-seo.xml (${urls.length} urls)`);
