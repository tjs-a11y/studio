#!/usr/bin/env node
// Runs the Quickwell audience briefs.
//   node briefs/run.mjs --mode=sources            fetch every desk's sources and show what came back (free)
//   node briefs/run.mjs --mode=dry                write and fact-check each brief, print it, publish nothing
//   node briefs/run.mjs --mode=publish            also write the pages under news/ and sitemap-briefs.xml
//   --desk=scams,eudr     only these desks        --force   rewrite today's brief even if already published
//   --fixtures=DIR        read DIR/<desk>.json instead of fetching (tests)
// A desk skips the day (no Claude call) when it has fewer fresh items than its minItems, when today's
// brief already exists, or when the monthly budget is used up. Exit codes: 0 ok, 1 error, 2 a brief
// failed the fact check (that desk published nothing; the others still ran).
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { DESKS } from './desks.mjs';
import { harvest } from './lib/harvest.mjs';
import { selectCtas, injectCtas, CTA_TAG, DISCLOSURE } from './lib/ctas.mjs';
import { writeChecked, MODEL, BriefWriteError } from './lib/writer.mjs';
import { renderBriefPage, renderDeskIndex, renderHub, briefUrl } from './lib/render.mjs';
import { loadLedger, saveLedger, costUsd, canAfford, monthlyCap, monthSpend } from './lib/budget.mjs';
import { localDate } from './lib/util.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '..');

export function parseArgs(argv) {
  const val = (k) => argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
  const mode = val('mode') ?? 'dry';
  if (!['sources', 'dry', 'publish'].includes(mode)) throw new Error(`--mode must be sources, dry or publish (got "${mode}")`);
  return { mode, desks: val('desk')?.split(',').filter(Boolean) ?? null, fixtures: val('fixtures'), force: argv.includes('--force'), root: val('root') ?? REPO };
}

const log = (desk, msg) => console.log(`[briefs:${desk}] ${msg}`);
const warn = (desk, msg) => console.log(process.env.GITHUB_ACTIONS ? `::warning::[${desk}] ${msg}` : `[briefs:${desk}] WARNING: ${msg}`);

function textVersion({ desk, brief, blocks }) {
  const out = [`# ${brief.headline}`, `(${desk.name}) Subject: ${brief.subject}`, '', brief.dek, ''];
  for (const b of blocks) {
    if (b.type === 'lede') out.push(`**${b.text}**`, '');
    if (b.type === 'section') out.push(`## ${b.section.heading}  [${b.section.source_ids.join(', ')}]`, ...b.section.bullets.map((t) => `- ${t}`), '');
    if (b.type === 'cta') out.push(`> ${CTA_TAG} · ${b.cta.product}: ${b.cta.copy} [${b.cta.label} →]`, '');
    if (b.type === 'footer') out.push(`${CTA_TAG}s: ${b.ctas.map((c) => c.product).join(' · ')}`, '');
  }
  out.push(DISCLOSURE);
  return out.join('\n');
}

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
}

export async function rebuildIndexes(root, origin) {
  const desks = [];
  const urls = [`${origin}/news/`];
  for (const desk of DESKS) {
    const dir = path.join(root, 'briefs/data', desk.id);
    const files = existsSync(dir) ? (await readdir(dir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse() : [];
    const entries = [];
    for (const f of files) {
      const { brief } = JSON.parse(await readFile(path.join(dir, f), 'utf8'));
      entries.push({ date: f.slice(0, 10), headline: brief.headline, dek: brief.dek });
    }
    if (!desk.enabled && entries.length === 0) continue;
    await mkdir(path.join(root, 'news', desk.id), { recursive: true });
    await writeFile(path.join(root, 'news', desk.id, 'index.html'), renderDeskIndex({ origin, desk, entries }), 'utf8');
    urls.push(`${origin}/news/${desk.id}/`, ...entries.map((e) => briefUrl(origin, desk.id, e.date)));
    desks.push({ desk, latest: entries[0] ?? null });
  }
  await writeFile(path.join(root, 'news', 'index.html'), renderHub({ origin, desks }), 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(path.join(root, 'sitemap-briefs.xml'), xml, 'utf8');
}

export async function run(opts, { env = process.env, now = new Date(), client, fetchImpl = fetch } = {}) {
  const origin = JSON.parse(await readFile(path.join(opts.root, 'site.config.json'), 'utf8')).origin.replace(/\/$/, '');
  const ledgerFile = path.join(opts.root, 'briefs/data/usage.json');
  const ledger = await loadLedger(ledgerFile);
  const cap = monthlyCap(env);
  const chosen = DESKS.filter((d) => (opts.desks ? opts.desks.includes(d.id) : d.enabled));
  const results = [];
  let published = 0;

  for (const desk of chosen) {
    const h = opts.fixtures
      ? JSON.parse(await readFile(path.join(opts.fixtures, `${desk.id}.json`), 'utf8'))
      : await harvest(desk, { now, fetchImpl });
    const { date } = h;
    log(desk.id, `${h.items.length} fresh items (${h.perSource.map((s) => `${s.source}: ${s.kept}/${s.fetched}`).join('; ')})`);
    for (const e of h.errors) warn(desk.id, `source failed: ${e.source}: ${e.message}`);
    for (const s of h.skipped) log(desk.id, `skipped non-news item: [${s.source}] ${s.title}`);

    if (opts.mode === 'sources') {
      for (const i of h.items) log(desk.id, `${i.id} [${i.source}] ${i.published?.slice(0, 10) ?? '?'} ${i.title}`);
      log(desk.id, `CTAs today: ${selectCtas(desk, h).map((c) => `${c.product} [${c.signal}]`).join(', ')}`);
      results.push({ desk: desk.id, status: 'sources' });
      continue;
    }
    if (h.items.length < desk.minItems) { log(desk.id, `only ${h.items.length} fresh items (needs ${desk.minItems}); skipping today, no brief written`); results.push({ desk: desk.id, status: 'thin' }); continue; }
    const dataFile = path.join(opts.root, 'briefs/data', desk.id, `${date}.json`);
    if (!opts.force && existsSync(dataFile)) { log(desk.id, `already published for ${date}`); results.push({ desk: desk.id, status: 'exists' }); continue; }
    if (!canAfford(ledger, { date, cap })) { warn(desk.id, `monthly budget reached ($${monthSpend(ledger, date.slice(0, 7))} of $${cap}); skipping`); results.push({ desk: desk.id, status: 'budget' }); continue; }

    let r;
    try {
      r = await writeChecked({ desk, harvest: h, client: client ?? new Anthropic(), model: MODEL });
    } catch (e) {
      if (!(e instanceof BriefWriteError)) throw e; // API errors (auth, credit) stop the whole run
      warn(desk.id, `could not write the brief: ${e.message}`);
      results.push({ desk: desk.id, status: 'error' });
      continue;
    }
    for (const u of r.usage) ledger.push({ date, desk: desk.id, model: MODEL, ...u, usd: costUsd(MODEL, u) });
    await saveLedger(ledgerFile, ledger);
    const spent = r.usage.reduce((s, u) => s + costUsd(MODEL, u), 0);
    if (!r.ok) {
      console.error(`[briefs:${desk.id}] fact check failed twice; nothing published:\n${r.problems.map((p) => `  - ${p}`).join('\n')}`);
      results.push({ desk: desk.id, status: 'rejected', usd: spent });
      continue;
    }
    const ctas = selectCtas(desk, h);
    const blocks = injectCtas(r.brief, ctas);
    log(desk.id, `brief passed the fact check ($${spent.toFixed(4)}); CTAs: ${ctas.map((c) => c.product).join(', ')}`);
    if (opts.mode === 'dry') {
      console.log(`\n===== ${desk.name} (dry run) =====\n${textVersion({ desk, brief: r.brief, blocks })}\n=====`);
      results.push({ desk: desk.id, status: 'dry', usd: spent });
      continue;
    }
    await mkdir(path.dirname(dataFile), { recursive: true });
    await writeFile(dataFile, JSON.stringify({ brief: r.brief, harvest: h, ctas }, null, 1) + '\n', 'utf8');
    const pageDir = path.join(opts.root, 'news', desk.id, date);
    await mkdir(pageDir, { recursive: true });
    await writeFile(path.join(pageDir, 'index.html'), renderBriefPage({ origin, desk, date, brief: r.brief, blocks, harvest: h }), 'utf8');
    published++;
    results.push({ desk: desk.id, status: 'published', usd: spent });
  }

  if (opts.mode === 'publish' && published) await rebuildIndexes(opts.root, origin);
  const month = localDate(now).slice(0, 7);
  console.log(`[briefs] ${results.map((r) => `${r.desk}: ${r.status}`).join(', ')}. Spend this month: $${monthSpend(ledger, month).toFixed(2)} of $${cap}.`);
  if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT, `published=${published}\n`, { flag: 'a' });
  return { code: results.some((r) => r.status === 'rejected') ? 2 : 0, results, ledger };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let code = 1;
  try {
    ({ code } = await run(parseArgs(process.argv.slice(2))));
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) console.error('[briefs] Anthropic rejected the API key (401). Replace the ANTHROPIC_API_KEY secret.');
    else if (e instanceof Anthropic.APIError) console.error(`[briefs] Anthropic API error ${e.status}: ${e.message}`);
    else if (e instanceof BriefWriteError) console.error(`[briefs] could not write a brief: ${e.message}`);
    else console.error('[briefs] FATAL:', e?.stack || e);
  }
  process.exit(code);
}
