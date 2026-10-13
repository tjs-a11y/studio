// Renders og.png (1200x630) from a simple HTML card with Playwright + Chromium.
//   node scripts/make-og.mjs   (PW_MODULE_DIR / PW_CHROMIUM as in tests/browser.test.mjs)
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const SCRATCH = '/tmp/claude-0/-home-user/73fe5cbd-11c3-57e0-a78c-082286462341/scratchpad';
const require = createRequire(join(process.env.PW_MODULE_DIR || SCRATCH, 'node_modules', 'x.js'));
const { chromium } = require('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#f6f4ef;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1d2420;display:flex}
.l{flex:1;padding:70px 0 60px 80px;display:flex;flex-direction:column;justify-content:space-between}
.brand{display:flex;gap:14px;align-items:center;font-weight:800;font-size:34px}
.brand i{width:52px;height:52px;border-radius:14px;background:#1f6b52;display:grid;place-items:center}
h1{font-size:66px;line-height:1.05;margin:0;letter-spacing:-1px}
p{font-size:25px;color:#5d665f;margin:0}
.r{width:430px;padding:60px 70px 60px 0;display:flex;flex-direction:column;gap:14px;justify-content:center}
.row{background:#fffdf8;border:2px solid #e2ddd2;border-radius:18px;padding:16px 20px;display:flex;justify-content:space-between;font-size:24px;font-weight:600}
.row b{font-weight:800}.red{color:#b4442f}.amb{color:#8a5200}.ok{background:#1f6b52;color:#fff;border-color:#1f6b52}
</style></head><body><div class="l"><div class="brand"><i><svg width="34" height="34" viewBox="0 0 64 64"><path d="M32 6c9 12 17 21 17 31a17 17 0 0 1-34 0c0-10 8-19 17-31z" fill="#f6f4ef"/></svg></i>Quickwell Saver</div>
<div><h1>Find the money leaking out of your bank account.</h1></div>
<p>Subscriptions · price hikes · double charges · bank fees.<br>From your own bank export. Nothing uploaded.</p></div>
<div class="r"><div class="row"><span>Price increase</span><b class="red">+16%</b></div><div class="row"><span>Charged twice</span><b class="red">2×</b></div>
<div class="row"><span>Overdraft fees</span><b class="amb">$68</b></div><div class="row"><span>Trial turned paid</span><b class="amb">→</b></div>
<div class="row ok"><span>Saved per year</span><b>$412</b></div></div></body></html>`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(html); await p.screenshot({ path: join(root, 'og.png') });
await b.close(); console.log('og.png written');
