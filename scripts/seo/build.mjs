// Programmatic SEO builder for quickwell.app.
// Reads seo/matrix.json (strategy x asset_context rows) and writes real, substantive pages under
// /strategies/<slug>/, plus /strategies/index.html and sitemap-seo.xml (auto-picked up by sitemap.mjs).
// Each page follows the CEO's 3-pillar archetype: (1) illustrative setup + calculator CTA,
// (2) When & Why context, (3) Risk/Reward breakdown. Every figure is computed HERE by the same
// tested engine the Utility Pipeline tool uses, so pages can't disagree with it or invent numbers.
// No live/real ticker data (no feed; fabrication is off-limits) — examples are clearly illustrative.
//   node scripts/seo/build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateSpreadMath, spreadPayoff, coveredCall, cashSecuredPut, ironCondor, longStraddle, longStrangle, collar } from '../../utility-pipeline/js/engine.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const origin = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8')).origin;
const matrix = JSON.parse(readFileSync(join(root, 'seo', 'matrix.json'), 'utf8'));
const rows = matrix.rows || [];
const edu = matrix.educational || [];
const all = [...rows, ...edu];
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CALC = '/utility-pipeline/';

const CSS = `
*{box-sizing:border-box}:root{--bg:#f5f4ef;--ink:#14181a;--muted:#566069;--card:#fff;--line:#e1e0d8;--accent:#0f766e;--accent-ink:#fff;--soft:#e6f3f1;--chip:#eeefea;--shadow:0 1px 2px rgba(20,24,26,.06),0 6px 24px rgba(20,24,26,.05)}
@media (prefers-color-scheme:dark){:root{--bg:#0f1413;--ink:#ecf0ef;--muted:#9aa6a4;--card:#171d1c;--line:#28302f;--accent:#4fd1c0;--accent-ink:#06211e;--soft:#12302c;--chip:#1f2725;--shadow:none}}
html{-webkit-text-size-adjust:100%}body{margin:0;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink);overflow-x:hidden}
main{max-width:760px;margin:0 auto;padding:8px 16px 64px}.top{max-width:760px;margin:0 auto;padding:12px 16px 0;display:flex;justify-content:space-between;gap:10px;align-items:center}
.brand{font-weight:700;color:var(--ink);text-decoration:none}.brand span{color:var(--muted);font-weight:500}
h1{font-size:clamp(1.8rem,6vw,2.5rem);margin:0;letter-spacing:-.03em;line-height:1.08}h2{font-size:1.2rem;margin:0 0 6px;letter-spacing:-.01em}
p{margin:0 0 10px}.muted{color:var(--muted)}.note{font-size:.88rem;color:var(--muted)}a{color:var(--accent);overflow-wrap:anywhere}
.crumb{font-size:.85rem;color:var(--muted);margin:10px 0 2px}.crumb a{color:var(--muted)}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;margin:14px 0;box-shadow:var(--shadow);min-width:0}
.pillar{font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin:0 0 6px}
.btn{display:inline-flex;align-items:center;gap:6px;font-weight:600;padding:11px 18px;border-radius:12px;border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink);text-decoration:none;min-height:46px}
.stat{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)}.stat:last-child{border-bottom:0}.stat b{font-variant-numeric:tabular-nums;text-align:right}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:10px;margin:10px 0}table{width:100%;border-collapse:collapse;font-size:.9rem}th,td{border-bottom:1px solid var(--line);padding:7px 10px;text-align:left}th{background:var(--chip);font-weight:600}td{font-variant-numeric:tabular-nums}
.pill{font-size:.78rem;font-weight:700;padding:2px 10px;border-radius:999px;background:var(--soft);color:var(--accent)}
.tag{font-size:.78rem;padding:2px 10px;border-radius:999px;background:var(--chip);color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:10px}
.grid a{display:block;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--card);text-decoration:none;color:var(--ink)}
.grid a:hover{border-color:var(--accent)}.grid b{display:block;color:var(--ink);margin-bottom:3px}.grid span{color:var(--muted);font-size:.9rem}
ol{margin:6px 0;padding-left:20px}ol li{margin:4px 0}
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
<meta property="og:url" content="${url}"><meta property="og:image" content="${origin}/strategies/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${origin}/strategies/og.png">
<meta name="theme-color" content="#f5f4ef" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0f1413" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230f766e'/%3E%3Cpath d='M14 44l12-14 9 7 15-20' fill='none' stroke='%23fff' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>${CSS}</style>
<script defer src="/js/va.js"></script><script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
<div class="top"><a class="brand" href="/">Quickwell <span>· Options strategies</span></a></div>
<main>
${body}
<footer><p><b>Educational only — not financial advice.</b> Quickwell holds no funds and places no trades. Options involve risk, including the loss of the full amount at risk. Figures use clearly-labeled illustrative inputs, not live market prices.</p>
<p><a href="/">More tools</a> · <a href="${CALC}">Spread calculator</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></p></footer>
</main>
</body>
</html>
`;
}

// returns { setup: [[label,val]], reward: [[label,val]], payoff?: [[price,profit]], calcNote }
function compute(row) {
  const e = row.example || {};
  if (row.archetype === 'vertical') {
    const m = calculateSpreadMath(e.short, e.long, { netPremiumPerShare: e.premium, optionType: e.type });
    const pay = spreadPayoff(e.short, e.long, { netPremiumPerShare: e.premium, optionType: e.type, steps: 7 });
    const credit = e.premium >= 0;
    return {
      setup: [['Short strike (sold)', e.short], ['Long strike (bought)', e.long], ['Type', e.type === 'put' ? 'Puts' : 'Calls'], [credit ? 'Net credit / share' : 'Net debit / share', money(Math.abs(e.premium))]],
      reward: [['Spread width', `${m.spread_width} (${money(m.spread_width_dollars)})`], ['Maximum profit', money(m.max_profit)], ['Maximum loss', money(m.max_loss)], ['Breakeven', m.breakeven]],
      payoff: pay.points.map((p) => [p.price, money(p.profit)]),
      calcNote: 'Open the on-device calculator and enter your own strikes and premium — this exact math, with a Plus payoff table.',
    };
  }
  if (row.archetype === 'covered-call') {
    const m = coveredCall(e.stock, e.strike, e.premium, 100);
    return {
      setup: [['Shares held', '100 @ ' + money(e.stock)], ['Call strike (sold)', e.strike], ['Premium / share', money(e.premium)]],
      reward: [['Net cost / share', money(m.net_cost_per_share)], ['Maximum profit (if called away)', money(m.max_profit)], ['Upside capped above', m.profit_capped_above], ['Breakeven', m.breakeven], ['Downside cushion', money(m.downside_cushion)]],
      calcNote: 'The on-device spread calculator covers vertical spreads; the figures above are the covered-call formulas worked for this illustrative setup.',
    };
  }
  if (row.archetype === 'cash-secured-put') {
    const m = cashSecuredPut(e.strike, e.premium, 1);
    return {
      setup: [['Put strike (sold)', e.strike], ['Premium / share', money(e.premium)], ['Cash secured', money(m.cash_secured)]],
      reward: [['Maximum profit', money(m.max_profit)], ['Effective buy price (if assigned)', money(m.effective_buy_price)], ['Breakeven', m.breakeven], ['Worst case (to zero)', money(m.max_loss_to_zero)]],
      calcNote: 'The on-device calculator covers vertical spreads; the figures above are the cash-secured-put formulas for this illustrative setup.',
    };
  }
  if (row.archetype === 'iron-condor') {
    const m = ironCondor({ putLong: e.putLong, putShort: e.putShort, callShort: e.callShort, callLong: e.callLong, netCredit: e.netCredit });
    return {
      setup: [['Put spread (sold)', `${e.putShort} / ${e.putLong}`], ['Call spread (sold)', `${e.callShort} / ${e.callLong}`], ['Net credit / share', money(e.netCredit)]],
      reward: [['Maximum profit', money(m.max_profit)], ['Maximum loss', money(m.max_loss)], ['Lower breakeven', m.lower_breakeven], ['Upper breakeven', m.upper_breakeven], ['Profit zone', m.profit_zone]],
      calcNote: 'An iron condor is two vertical spreads; you can model each leg in the on-device spread calculator.',
    };
  }
  if (row.archetype === 'long-straddle') {
    const m = longStraddle({ strike: e.strike, debit: e.debit });
    return {
      setup: [['Strike (call + put)', e.strike], ['Net debit / share', money(e.debit)]],
      reward: [['Net debit (maximum loss)', money(m.max_loss)], ['Upper breakeven', m.upper_breakeven], ['Lower breakeven', m.lower_breakeven], ['Beyond the breakevens', 'Open-ended, either direction']],
      calcNote: 'A straddle is a long-volatility position; the on-device calculator covers vertical spreads, so the figures above are the straddle formulas for this illustrative setup.',
    };
  }
  if (row.archetype === 'long-strangle') {
    const m = longStrangle({ callStrike: e.callStrike, putStrike: e.putStrike, debit: e.debit });
    return {
      setup: [['Call strike (bought)', e.callStrike], ['Put strike (bought)', e.putStrike], ['Net debit / share', money(e.debit)]],
      reward: [['Net debit (maximum loss)', money(m.max_loss)], ['Upper breakeven', m.upper_breakeven], ['Lower breakeven', m.lower_breakeven], ['Beyond the breakevens', 'Open-ended, either direction']],
      calcNote: 'A strangle is a long-volatility position; the on-device calculator covers vertical spreads, so the figures above are the strangle formulas for this illustrative setup.',
    };
  }
  if (row.archetype === 'protective-collar') {
    const m = collar({ spot: e.spot, putStrike: e.putStrike, callStrike: e.callStrike, netCost: e.netCost });
    return {
      setup: [['Shares, at the current price', money(e.spot)], ['Protective put (floor)', e.putStrike], ['Covered call (cap)', e.callStrike], ['Net cost / share', money(e.netCost)]],
      reward: [['Downside floor', m.floor], ['Upside cap', m.cap], ['Most you can gain from here', money(m.max_gain_from_here)], ['Most you can lose from here', money(m.max_loss_from_here)]],
      calcNote: 'Figures are measured from the current price. The on-device calculator covers vertical spreads; the collar figures above use this illustrative setup.',
    };
  }
  if (row.archetype === 'structural') {
    return {
      setup: (row.setup_rows || []).map((x) => [x[0], x[1]]),
      reward: null,
      calcNote: 'This structure has two expirations, so its profit at the near-term expiry depends on implied volatility and the longer-dated option’s remaining value — which needs an options-pricing model, not a fixed payoff. Model each leg’s risk separately; no single max-profit number is shown here on purpose.',
    };
  }
  if (row.archetype === 'wheel') {
    const put = cashSecuredPut(e.put.strike, e.put.premium, 1);
    const call = coveredCall(e.call.stock, e.call.strike, e.call.premium, 100);
    return {
      setup: [['Step 1 — sell put', `${e.put.strike} strike, ${money(e.put.premium)} credit`], ['Step 2 — if assigned, sell call', `${e.call.strike} strike, ${money(e.call.premium)} credit`]],
      reward: [['Put premium (step 1)', money(put.max_profit)], ['Effective buy price if assigned', money(put.effective_buy_price)], ['Call premium (step 2)', money(call.max_profit)], ['Called away at', call.profit_capped_above]],
      calcNote: 'The Wheel is a loop, not one payoff — model the put leg and the call leg separately in the on-device calculator.',
    };
  }
  return { setup: [], reward: [], calcNote: '' };
}

function statTable(pairs) { return (pairs || []).map(([k, v]) => `<div class="stat"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join(''); }

function page(row) {
  const c = compute(row);
  let title = row.name; // names are unique; add the longest suffix that still fits 60 chars
  for (const sfx of [': Payoff, Max Loss, Breakeven', ': Payoff and Max Loss', ': Max Loss and Breakeven']) {
    if ((row.name + sfx).length <= 60) { title = row.name + sfx; break; }
  }
  const desc = `${row.name}: how it works, max loss, breakeven and a free on-device options calculator. Educational, not advice.`;
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Article', headline: title, description: desc, inLanguage: 'en', url: origin + `/strategies/${row.slug}/`, publisher: { '@id': origin + '/#org' }, about: `${row.strategy} options strategy` },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Options strategies', item: origin + '/strategies/' },
      { '@type': 'ListItem', position: 2, name: row.name, item: origin + `/strategies/${row.slug}/` }] } ] };

  const steps = Array.isArray(row.steps) ? `<div class="card"><p class="pillar">How the loop runs</p><ol>${row.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>` : '';
  const payoff = c.payoff ? `<div class="tablewrap"><table><thead><tr><th>Underlying price</th><th>Profit / loss</th></tr></thead><tbody>${c.payoff.map(([pr, pf]) => `<tr><td>${esc(pr)}</td><td>${esc(pf)}</td></tr>`).join('')}</tbody></table></div><p class="note">Profit/loss at expiration — the same numbers the Quickwell calculator produces.</p>` : '';

  const body = `
<p class="crumb"><a href="/strategies/">Options strategies</a> › ${esc(row.name)}</p>
<h1>${esc(row.name)}</h1>
<p style="margin:8px 0 0"><span class="pill">${esc(row.strategy)}</span> ${row.context ? `<span class="tag">${esc(row.context)}</span>` : ''}</p>
<div class="card"><p>${esc(row.summary)}</p><p class="note">${esc(row.outlook)}</p></div>
${steps}
<div class="card">
  <p class="pillar">Pillar 1 · Illustrative setup</p>
  <h2>How this example is built</h2>
  <p>${esc(row.legs || '')}</p>
  <p class="note">Illustrative inputs only — not live prices.</p>
  ${statTable(c.setup)}
  <p style="margin-top:14px"><a class="btn" href="${CALC}?ref=strategies-${row.slug}">Open the on-device calculator →</a></p>
  <p class="note">${esc(c.calcNote)}</p>
</div>
<div class="card">
  <p class="pillar">Pillar 2 · When &amp; why</p>
  <h2>Why this fits ${esc(row.context || 'this view')}</h2>
  <p>${esc(row.when)}</p>
  <p>${esc(row.risk)}</p>
</div>
<div class="card" style="background:var(--soft)">
  <p class="pillar">Pillar 3 · Risk / reward</p>
  <h2>The defined-risk math</h2>
  ${statTable(c.reward)}
  ${payoff}
</div>`;
  return shell({ title, desc, path: `/strategies/${row.slug}/`, jsonld, body });
}

function hub() {
  const title = 'Options Strategy Guides & Free Calculator';
  const desc = 'Plain-English options strategy guides — credit and debit spreads, covered calls, cash-secured puts, iron condors and the wheel — each with worked max-loss math and a free on-device calculator.';
  const group = (label, items) => items.length ? `<h2 style="margin:18px 0 6px">${esc(label)}</h2><div class="grid">${items.map((r) => `<a href="/strategies/${r.slug}/"><b>${esc(r.name)}</b><span>${esc(r.strategy)}${r.context ? ' · ' + esc(r.context) : ''}</span></a>`).join('')}</div>` : '';
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', name: title, description: desc, url: origin + '/strategies/', inLanguage: 'en' },
    { '@type': 'ItemList', itemListElement: all.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: origin + `/strategies/${r.slug}/` })) } ] };
  const body = `
<p class="crumb"><a href="/">Quickwell</a> › Options strategies</p>
<h1>Options strategy guides</h1>
<div class="card"><p>Clear, plain-English guides to the most common defined-risk and income options strategies. Each one explains how it is built, when traders use it, and the exact max-profit, max-loss and breakeven math — worked on an illustrative example and ready to run with your own numbers in a free, on-device calculator.</p>
<p class="note">Educational only — not financial advice. Examples use illustrative inputs, not live market prices.</p></div>
${group('Vertical spreads', rows.filter((r) => r.archetype === 'vertical'))}
${group('Income strategies', rows.filter((r) => ['covered-call', 'cash-secured-put'].includes(r.archetype)))}
${group('Range &amp; multi-leg', rows.filter((r) => r.archetype === 'iron-condor'))}
${group('Volatility &amp; protection', rows.filter((r) => ['long-straddle', 'long-strangle', 'protective-collar'].includes(r.archetype)))}
${group('Strategy loops', edu)}
<div class="card" style="background:var(--soft);margin-top:16px"><h2>Run your own numbers</h2><p>The Quickwell spread calculator works any vertical on your device — nothing uploaded. Plus adds a payoff-at-expiration table.</p><p><a class="btn" href="${CALC}?ref=strategies-hub">Open the calculator →</a></p></div>`;
  return shell({ title, desc, path: '/strategies/', jsonld, body });
}

// --- write ---
const outRoot = join(root, 'strategies');
// migrate: remove the old /spreads/ section (now redirected to /strategies/)
if (existsSync(join(root, 'spreads'))) rmSync(join(root, 'spreads'), { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });
writeFileSync(join(outRoot, 'index.html'), hub());
for (const row of all) {
  mkdirSync(join(outRoot, row.slug), { recursive: true });
  writeFileSync(join(outRoot, row.slug, 'index.html'), page(row));
}
const today = new Date().toISOString().slice(0, 10);
const urls = [`${origin}/strategies/`, ...all.map((r) => `${origin}/strategies/${r.slug}/`)];
writeFileSync(join(root, 'sitemap-seo.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`).join('\n')}
</urlset>
`);
console.log(`seo: wrote /strategies/ hub + ${all.length} pages + sitemap-seo.xml (${urls.length} urls)`);
