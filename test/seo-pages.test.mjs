// Programmatic SEO pages under /strategies/ are real and self-consistent:
// each page exists, is unique, links the calculator, and every Risk/Reward figure equals what the
// tested engine computes for that archetype (no drift, nothing fabricated).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { calculateSpreadMath, coveredCall, cashSecuredPut, ironCondor, longStraddle, longStrangle, collar } from '../utility-pipeline/js/engine.mjs';

const root = new URL('..', import.meta.url).pathname;
const origin = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8')).origin;
const matrix = JSON.parse(readFileSync(join(root, 'seo', 'matrix.json'), 'utf8'));
const all = [...(matrix.rows || []), ...(matrix.educational || [])];
const read = (f) => readFileSync(join(root, f), 'utf8');
const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const has = (h, v) => h.includes(money(v));

test('strategies: hub + og image + every page exist, hub links them all', () => {
  assert.ok(existsSync(join(root, 'strategies', 'index.html')), 'hub missing (run node scripts/seo/build.mjs)');
  assert.ok(existsSync(join(root, 'strategies', 'og.png')), 'shared og image missing');
  const hub = read('strategies/index.html');
  for (const r of all) {
    assert.ok(existsSync(join(root, 'strategies', r.slug, 'index.html')), `page missing: ${r.slug}`);
    assert.ok(hub.includes(`/strategies/${r.slug}/`), `hub missing link to ${r.slug}`);
  }
});

test('strategies: unique titles (<=60), descriptions (<=155), canonical, calculator link, disclaimer', () => {
  const titles = new Set(), descs = new Set();
  for (const r of all) {
    const h = read(`strategies/${r.slug}/index.html`);
    const title = (/<title>([^<]*)<\/title>/.exec(h) || [])[1] || '';
    const desc = (/<meta name="description" content="([^"]*)">/.exec(h) || [])[1] || '';
    assert.ok(title && title.length <= 60, `${r.slug}: title length ${title.length}`);
    assert.ok(desc && desc.length <= 155, `${r.slug}: description length ${desc.length}`);
    assert.ok(!titles.has(title), `${r.slug}: duplicate title`); titles.add(title);
    assert.ok(!descs.has(desc), `${r.slug}: duplicate description`); descs.add(desc);
    assert.ok(h.includes(`<link rel="canonical" href="${origin}/strategies/${r.slug}/">`), `${r.slug}: canonical`);
    assert.ok(h.includes('href="/utility-pipeline/'), `${r.slug}: no calculator link`);
    assert.ok(/not financial advice/i.test(h), `${r.slug}: missing disclaimer`);
    assert.ok(!/MONAD/i.test(h), `${r.slug}: internal name leaked`);
  }
});

test('strategies: the Risk/Reward figures match the engine for each archetype', () => {
  for (const r of all) {
    const h = read(`strategies/${r.slug}/index.html`);
    const e = r.example;
    if (r.archetype === 'vertical') {
      const m = calculateSpreadMath(e.short, e.long, { netPremiumPerShare: e.premium, optionType: e.type });
      assert.ok(has(h, m.max_loss) && has(h, m.max_profit), `${r.slug}: spread max loss/profit`);
      assert.ok(h.includes('>' + m.breakeven + '<'), `${r.slug}: spread breakeven`);
    } else if (r.archetype === 'covered-call') {
      const m = coveredCall(e.stock, e.strike, e.premium, 100);
      assert.ok(has(h, m.max_profit) && h.includes('>' + m.breakeven + '<'), `${r.slug}: covered call`);
    } else if (r.archetype === 'cash-secured-put') {
      const m = cashSecuredPut(e.strike, e.premium, 1);
      assert.ok(has(h, m.max_profit) && has(h, m.effective_buy_price), `${r.slug}: csp`);
    } else if (r.archetype === 'iron-condor') {
      const m = ironCondor({ putLong: e.putLong, putShort: e.putShort, callShort: e.callShort, callLong: e.callLong, netCredit: e.netCredit });
      assert.ok(has(h, m.max_profit) && has(h, m.max_loss), `${r.slug}: condor max profit/loss`);
      assert.ok(h.includes('>' + m.lower_breakeven + '<') && h.includes('>' + m.upper_breakeven + '<'), `${r.slug}: condor breakevens`);
    } else if (r.archetype === 'long-straddle') {
      const m = longStraddle({ strike: e.strike, debit: e.debit });
      assert.ok(has(h, m.max_loss) && h.includes('>' + m.upper_breakeven + '<') && h.includes('>' + m.lower_breakeven + '<'), `${r.slug}: straddle`);
    } else if (r.archetype === 'long-strangle') {
      const m = longStrangle({ callStrike: e.callStrike, putStrike: e.putStrike, debit: e.debit });
      assert.ok(has(h, m.max_loss) && h.includes('>' + m.upper_breakeven + '<') && h.includes('>' + m.lower_breakeven + '<'), `${r.slug}: strangle`);
    } else if (r.archetype === 'protective-collar') {
      const m = collar({ spot: e.spot, putStrike: e.putStrike, callStrike: e.callStrike, netCost: e.netCost });
      assert.ok(has(h, m.max_gain_from_here) && has(h, m.max_loss_from_here) && h.includes('>' + m.floor + '<'), `${r.slug}: collar`);
    } else if (r.archetype === 'wheel') {
      const put = cashSecuredPut(e.put.strike, e.put.premium, 1);
      assert.ok(has(h, put.max_profit) && has(h, put.effective_buy_price), `${r.slug}: wheel put leg`);
    }
  }
});

test('strategies: sitemap-seo.xml lists the hub and every page, correct namespace', () => {
  const xml = read('sitemap-seo.xml');
  assert.ok(xml.includes('http://www.sitemaps.org/schemas/sitemap/0.9'), 'namespace');
  assert.ok(xml.includes(`<loc>${origin}/strategies/</loc>`), 'hub');
  for (const r of all) assert.ok(xml.includes(`<loc>${origin}/strategies/${r.slug}/</loc>`), `sitemap: ${r.slug}`);
});
