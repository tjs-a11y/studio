// Builds the search landing pages: /holiday/ (Gatherloom) and /carrier-checks/ (Haul Audit).
// Every page opens on a working on-device calculator; nothing typed is sent anywhere.
//   node scripts/landers/build.mjs
// Output is committed. sitemap-landers.xml is picked up by scripts/sitemap.mjs.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const origin = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8')).origin;
const data = JSON.parse(readFileSync(join(root, 'scripts/landers/data.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TAG = '<script src="/js/va.js"></script><script defer src="/_vercel/insights/script.js"></script>';

const CSS = `:root{--bg:#f7f7f4;--ink:#15171a;--muted:#5d6470;--card:#fff;--line:#e3e3dd;--accent:#1d6f73;--soft:#e9f1f1}
@media (prefers-color-scheme:dark){:root{--bg:#101414;--ink:#edf0f0;--muted:#9aa7a7;--card:#171c1c;--line:#283030;--accent:#5bb8bd;--soft:#19201f;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--ink)}
main{max-width:760px;margin:0 auto;padding:28px 16px 56px}nav.crumbs{font-size:.9rem;color:var(--muted)}a{color:var(--accent)}
h1{font-size:1.75rem;line-height:1.2;margin:10px 0 8px}h2{font-size:1.2rem;margin:26px 0 8px}.lede{color:var(--muted);margin:0 0 16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:16px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
label{display:block;font-size:.85rem;color:var(--muted)}input{width:100%;font:inherit;padding:10px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);margin-top:4px}
.out{background:var(--soft);border-radius:10px;padding:12px 14px;margin-top:14px}.out b{font-size:1.25rem}
.cta{display:inline-block;margin-top:10px;padding:11px 18px;border-radius:8px;background:var(--accent);color:#fff;text-decoration:none;font-weight:700}
.small{font-size:.88rem;color:var(--muted)}ul{padding-left:20px}li{margin:5px 0}
.list a{display:block;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--card);margin:8px 0;text-decoration:none}
footer{margin-top:30px;font-size:.88rem;color:var(--muted)}`;

// One small calculator per kind. Inputs are read on every keystroke; nothing leaves the page.
const CALC = {
  split: (p) => `<div class="grid">
<label>Total budget ($)<input id="t" type="number" inputmode="decimal" min="0" value="${p.total}"></label>
<label>${esc(p.a)}<input id="a" type="number" inputmode="numeric" min="0" value="${p.na}"></label>
<label>${esc(p.b)}<input id="b" type="number" inputmode="numeric" min="0" value="${p.nb}"></label>
<label>Held back for shipping and wrap (%)<input id="h" type="number" inputmode="decimal" min="0" max="90" value="${p.hold}"></label></div>
<div class="out" id="o" aria-live="polite"></div>
<script>(function(){var W=${p.w};function v(i){return Math.max(0,parseFloat(document.getElementById(i).value)||0)}
function m(x){return '$'+(Math.round(x*100)/100).toFixed(2)}
function run(){var t=v('t'),a=v('a'),b=v('b'),h=Math.min(90,v('h'))/100,pool=t*(1-h),u=a+b*W,o=document.getElementById('o');
if(!t||!u){o.textContent='Enter a budget and at least one person.';return}
var ca=pool/u,cb=ca*W;o.innerHTML='<b>'+m(ca)+'</b> cap per ${esc(p.aOne)}'+(b?' · <b>'+m(cb)+'</b> cap per ${esc(p.bOne)}':'')+'<br><span class="small">'+m(t*h)+' held back. Caps add up to '+m(pool)+'.</span>'}
['t','a','b','h'].forEach(function(i){document.getElementById(i).addEventListener('input',run)});run()})();</script>`,
  diff: () => `<div class="grid">
<label>Rate confirmation total ($)<input id="r" type="number" inputmode="decimal" min="0" value="2400"></label>
<label>Approved extras: detention, lumper ($)<input id="x" type="number" inputmode="decimal" min="0" value="150"></label>
<label>Amount you were paid ($)<input id="p" type="number" inputmode="decimal" min="0" value="2310"></label></div>
<div class="out" id="o" aria-live="polite"></div>
<script>(function(){function v(i){return Math.max(0,parseFloat(document.getElementById(i).value)||0)}function m(x){return '$'+x.toFixed(2)}
function run(){var due=v('r')+v('x'),p=v('p'),d=due-p,o=document.getElementById('o');if(!due){o.textContent='Enter the rate confirmation total.';return}
o.innerHTML=d>0.005?'<b>'+m(d)+' short</b> ('+(d/due*100).toFixed(1)+'% of '+m(due)+' due)':d<-0.005?'<b>'+m(-d)+' over</b> what the paperwork shows':'<b>Paid in full</b> against '+m(due)}
['r','x','p'].forEach(function(i){document.getElementById(i).addEventListener('input',run)});run()})();</script>`,
  factoring: () => `<div class="grid">
<label>Invoice amount ($)<input id="i" type="number" inputmode="decimal" min="0" value="2400"></label>
<label>Factoring fee in your contract (%)<input id="f" type="number" inputmode="decimal" min="0" max="100" value="3"></label>
<label>Reserve held in your contract (%)<input id="s" type="number" inputmode="decimal" min="0" max="100" value="0"></label>
<label>Deposit you received ($)<input id="d" type="number" inputmode="decimal" min="0" value="2300"></label></div>
<div class="out" id="o" aria-live="polite"></div>
<script>(function(){function v(i){return Math.max(0,parseFloat(document.getElementById(i).value)||0)}function m(x){return '$'+x.toFixed(2)}
function run(){var inv=v('i'),fee=inv*v('f')/100,res=inv*v('s')/100,exp=inv-fee-res,d=v('d'),g=exp-d,o=document.getElementById('o');if(!inv){o.textContent='Enter the invoice amount.';return}
o.innerHTML='Expected deposit <b>'+m(exp)+'</b> (fee '+m(fee)+', reserve '+m(res)+')<br>'+(Math.abs(g)<0.005?'Your deposit matches.':g>0?'<b>'+m(g)+' less</b> than expected. Ask what was deducted.':'<b>'+m(-g)+' more</b> than expected.')}
['i','f','s','d'].forEach(function(i){document.getElementById(i).addEventListener('input',run)});run()})();</script>`,
  detention: () => `<div class="grid">
<label>Hours at the dock<input id="w" type="number" inputmode="decimal" min="0" value="5.5"></label>
<label>Free hours in your rate con<input id="f" type="number" inputmode="decimal" min="0" value="2"></label>
<label>Detention rate in your rate con ($/hour)<input id="r" type="number" inputmode="decimal" min="0" value="50"></label>
<label>Detention you were paid ($)<input id="p" type="number" inputmode="decimal" min="0" value="0"></label></div>
<div class="out" id="o" aria-live="polite"></div>
<script>(function(){function v(i){return Math.max(0,parseFloat(document.getElementById(i).value)||0)}function m(x){return '$'+x.toFixed(2)}
function run(){var h=Math.max(0,v('w')-v('f')),owed=h*v('r'),g=owed-v('p'),o=document.getElementById('o');
o.innerHTML='<b>'+h.toFixed(2)+' billable hours</b> = <b>'+m(owed)+'</b> under those terms<br>'+(g>0.005?m(g)+' not yet paid.':'Nothing outstanding on these numbers.')}
['w','f','r','p'].forEach(function(i){document.getElementById(i).addEventListener('input',run)});run()})();</script>`,
};

const BOOKS = `<section class="card" aria-labelledby="books"><h2 id="books" style="margin-top:0">From our bookshelf</h2>
<p class="small">We publish these books ourselves.</p>
<ul><li><a href="https://books2read.com/u/mY9QMW" rel="noopener">Mindset Mastery</a>: a practical guide to habits and focus for the new year.</li>
<li><a href="https://books2read.com/u/m26Ngr" rel="noopener">Mastering Cryptocurrency Trading</a>: order types, risk and position sizing in plain English, for learning how the market works before you risk money.</li></ul>
<p class="small">Educational only. Not financial advice; no outcomes promised.</p></section>`;

const GROUP = {
  holiday: {
    hub: 'holiday', crumb: 'Holiday budget', hubTitle: 'Holiday Gift Budget Calculators | Quickwell',
    hubDesc: 'Free holiday gift budget calculators: set a spending cap per person for family, kids, coworkers and Secret Santa. Runs in your browser.',
    hubH1: 'Holiday gift budget calculators', hubLede: 'Pick the one that matches your list. Each works in your browser, and nothing you type is uploaded.',
    pitch: (slug) => `<section class="card" aria-labelledby="gl"><h2 id="gl" style="margin-top:0">Keep the caps you just set</h2>
<p>Nobody plans to overspend on the holidays. It happens because nobody is tracking the total. Gatherloom, our gift-list app, puts every person and every gift on one list with a spending cap for each, so you see planned against spent before you buy the next gift.</p>
<a class="cta" href="/go/gatherloom/?from=holiday-${slug}">Start the 14-day free trial</a>
<p class="small">Then $2.99/month or $24/year. Cancel anytime.</p></section>`,
    foot: 'A planning aid, not financial advice.',
  },
  carrier: {
    hub: 'carrier-checks', crumb: 'Carrier pay checks', hubTitle: 'Carrier Pay Calculators: Short Pay and Detention',
    hubDesc: 'Free calculators for owner-operators: broker short pay, factoring deposits and detention pay. Runs in your browser; nothing is uploaded.',
    hubH1: 'Carrier pay calculators', hubLede: 'Quick arithmetic checks for a single load. Each works in your browser, and nothing you type is uploaded.',
    pitch: (slug) => `<section class="card" aria-labelledby="ha"><h2 id="ha" style="margin-top:0">Check the whole load, line by line</h2>
<p>Small carriers lose money in the paperwork: a short-paid load, a deduction nobody explained. Haul Audit compares the rate confirmation, the settlement and the deposit line by line. It runs on your device, and your files are not uploaded.</p>
<a class="cta" href="/haul-audit/?ref=lander-${slug}">Open Haul Audit, free</a>
<p class="small">Free for 3 checks a day. Pro adds saved history and CSV export.</p></section>`,
    foot: 'An arithmetic check of the numbers you enter, not legal or accounting advice. Your contract and rate confirmation control.',
  },
};

const head = (title, desc, path) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${origin}${path}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Quickwell">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${origin}${path}">
<meta property="og:image" content="${origin}/og.png">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${origin}/og.png">
<style>${CSS}</style>
${TAG}
</head>
<body>
<main>`;
const tail = (foot) => `<footer>${esc(foot)} · <a href="/">More Quickwell tools</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></footer>
</main>
</body>
</html>
`;

const urls = [];
const write = (path, html) => { mkdirSync(join(root, path), { recursive: true }); writeFileSync(join(root, path, 'index.html'), html); urls.push(`/${path}/`); };

for (const [key, g] of Object.entries(GROUP)) {
  const pages = data.filter((p) => p.group === key);
  write(g.hub, head(g.hubTitle, g.hubDesc, `/${g.hub}/`)
    + `<nav class="crumbs"><a href="/">Quickwell</a> / ${esc(g.crumb)}</nav><h1>${esc(g.hubH1)}</h1><p class="lede">${esc(g.hubLede)}</p><div class="list">`
    + pages.map((p) => `<a href="/${g.hub}/${p.slug}/"><b>${esc(p.h1)}</b><br><span class="small">${esc(p.desc)}</span></a>`).join('')
    + `</div>` + g.pitch('hub') + tail(g.foot));
  for (const p of pages) {
    const others = pages.filter((o) => o.slug !== p.slug);
    write(`${g.hub}/${p.slug}`, head(p.title, p.desc, `/${g.hub}/${p.slug}/`)
      + `<nav class="crumbs"><a href="/">Quickwell</a> / <a href="/${g.hub}/">${esc(g.crumb)}</a></nav><h1>${esc(p.h1)}</h1><p class="lede">${esc(p.lede)}</p>`
      + `<section class="card">${CALC[p.calc](p.preset || {})}<p class="small" style="margin-bottom:0">Works in your browser. Nothing you type is uploaded.</p></section>`
      + `<h2>${esc(p.stepsTitle)}</h2><ol>${p.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
      + g.pitch(p.slug)
      + `<h2>Related calculators</h2><ul>${others.map((o) => `<li><a href="/${g.hub}/${o.slug}/">${esc(o.h1)}</a></li>`).join('')}</ul>`
      + BOOKS + tail(g.foot));
  }
}
writeFileSync(join(root, 'sitemap-landers.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${origin}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`landers: wrote ${urls.length} pages + sitemap-landers.xml`);
