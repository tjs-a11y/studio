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
.l{flex:1;padding:66px 0 58px 76px;display:flex;flex-direction:column;justify-content:space-between}
.brand{display:flex;gap:14px;align-items:center;font-weight:800;font-size:34px}
.brand i{width:52px;height:52px;border-radius:14px;background:#1f6b52;display:grid;place-items:center}
h1{font-size:64px;line-height:1.05;margin:0;letter-spacing:-1px}
p{font-size:25px;color:#5d665f;margin:0;line-height:1.35}
.r{width:470px;padding:56px 66px 56px 0;display:flex;align-items:center}
.card{background:#fffdf8;border:3px solid #1f6b52;border-radius:22px;padding:24px 26px;width:100%;display:grid;gap:12px}
.card h2{margin:0;font-size:17px;color:#5d665f;text-transform:uppercase;letter-spacing:.06em}
.big{font-size:33px;font-weight:800;line-height:1.15}
.row{display:flex;justify-content:space-between;align-items:center;border-top:2px solid #e2ddd2;padding-top:10px;font-size:21px}
.row span{color:#5d665f}.row b{font-weight:700}
.ok{font-size:15px;font-weight:800;background:#e3f3e8;color:#2a7a4b;border-radius:99px;padding:2px 10px;margin-left:8px}
.btns{display:flex;gap:10px;margin-top:4px}.btns div{flex:1;text-align:center;border-radius:12px;padding:11px 6px;font-weight:700;font-size:18px;background:#1f6b52;color:#fff}.btns div+div{background:#fff;color:#1d2420;border:2px solid #e2ddd2}
</style></head><body><div class="l"><div class="brand"><i><svg width="34" height="34" viewBox="0 0 64 64"><path d="M32 6c9 12 17 21 17 31a17 17 0 0 1-34 0c0-10 8-19 17-31z" fill="#f6f4ef"/></svg></i>Quickwell Pilot</div>
<div><h1>What does this letter need from you?</h1></div>
<p>Letters · bills · notices · forms.<br>The action, the deadline, the amount, who to call. On your phone. Nothing uploaded.</p></div>
<div class="r"><div class="card"><h2>What this needs from you</h2><div class="big">Pay $142.18 by Tue, Oct 27</div>
<div class="row"><span>Deadline</span><b>in 14 days<span class="ok">Clear</span></b></div>
<div class="row"><span>Late fee</span><b>$15.00</b></div>
<div class="row"><span>Contact</span><b>1-800-555-0142</b></div>
<div class="btns"><div>Add to calendar</div><div>Draft a reply</div></div></div></div></body></html>`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(html); await p.screenshot({ path: join(root, 'og.png') });
await b.close(); console.log('og.png written');
