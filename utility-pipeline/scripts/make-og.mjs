// Renders og.png (1200x630) from a simple HTML card with Playwright + Chromium.
//   node scripts/make-og.mjs
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#f5f4ef;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#14181a;display:flex}
.l{flex:1;padding:70px 0 60px 80px;display:flex;flex-direction:column;justify-content:space-between}
.brand{display:flex;gap:14px;align-items:center;font-weight:800;font-size:34px}
.brand i{width:52px;height:52px;border-radius:14px;background:#0f766e;display:grid;place-items:center}
h1{font-size:60px;line-height:1.06;margin:0;letter-spacing:-1.5px}
p{font-size:24px;color:#566069;margin:0}
.r{width:430px;padding:60px 70px 60px 0;display:flex;flex-direction:column;gap:14px;justify-content:center}
.row{background:#fff;border:2px solid #e1e0d8;border-radius:18px;padding:16px 20px;display:flex;justify-content:space-between;font-size:23px;font-weight:600}
.row b{font-weight:800;font-variant-numeric:tabular-nums}.ok{background:#0f766e;color:#fff;border-color:#0f766e}
</style></head><body><div class="l"><div class="brand"><i><svg width="34" height="34" viewBox="0 0 64 64"><path d="M14 20h36M14 32h36M14 44h22" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg></i>Quickwell Utility Pipeline</div>
<div><h1>Tidy a messy CSV. Understand a spread.</h1></div>
<p>On your device. Nothing uploaded.<br>Educational, not financial advice.</p></div>
<div class="r"><div class="row"><span>"Smith, John"</span><b>kept intact</b></div><div class="row"><span>"1,234.50"</span><b>kept intact</b></div>
<div class="row"><span>Spread width</span><b>$500</b></div><div class="row"><span>Max loss</span><b>$350</b></div>
<div class="row ok"><span>Breakeven</span><b>98.50</b></div></div></body></html>`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--headless', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(html); await p.screenshot({ path: join(root, 'og.png') });
await b.close(); console.log('og.png written');
