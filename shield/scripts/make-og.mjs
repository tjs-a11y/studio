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
h1{font-size:70px;line-height:1.04;margin:0;letter-spacing:-1px}
p{font-size:25px;color:#5d665f;margin:0}
.r{width:470px;padding:56px 70px 56px 0;display:flex;flex-direction:column;gap:14px;justify-content:center}
.msg{background:#fffdf8;border:2px solid #e2ddd2;border-radius:18px;padding:18px 20px;font-size:22px;line-height:1.45}
mark{background:#fff3d6;border-bottom:3px solid #8a5200;padding:0 3px;border-radius:4px}
.lvl{background:#fde8e3;border:2px solid #b4442f;color:#b4442f;border-radius:18px;padding:14px 20px;font-size:30px;font-weight:800}
.row{display:flex;gap:10px;flex-wrap:wrap}.tag{background:#e8f1ec;color:#1f6b52;border-radius:99px;padding:6px 14px;font-size:19px;font-weight:700}
</style></head><body><div class="l"><div class="brand"><i><svg width="34" height="34" viewBox="0 0 64 64"><path d="M32 6l20 7.5v15c0 12-8.4 22.5-20 26-11.6-3.5-20-14-20-26v-15z" fill="#f6f4ef"/><path d="M23 32l6.5 6.5L42 26" stroke="#1f6b52" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></i>Quickwell Shield</div>
<div><h1>Is this message a scam?</h1></div>
<p>Every warning sign in plain words, and what to do next.<br>Checked on your device. Nothing uploaded.</p></div>
<div class="r"><div class="msg">Hi Mom, <mark>this is my new number</mark>. <mark>Can you send me $400</mark> today? <mark>Don't tell Dad.</mark></div>
<div class="lvl">Likely scam</div>
<div class="row"><span class="tag">New number</span><span class="tag">Asks for money</span><span class="tag">Keep it secret</span></div></div></body></html>`;
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(html); await p.screenshot({ path: join(root, 'og.png') });
await b.close(); console.log('og.png written');
