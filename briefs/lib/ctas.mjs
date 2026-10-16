// Chooses a desk's CTAs from the day's items and places them in the brief. The model never writes
// promotions: a CTA appears only through these rules, labeled, and repeated in the footer.
//   - Each trigger whose pattern matches an item adds that tool, anchored after the section citing it.
//   - No trigger matched: the desk's default tool runs, after the lede.
//   - Friday and Saturday (America/Chicago): the Riddlebound weekend plug, at the end.
import { TOOLS, RIDDLEBOUND } from '../desks.mjs';
import { weekdayOf } from './util.mjs';

export const SITE = 'https://quickwell.app';
export const CTA_TAG = 'Our product';
export const DISCLOSURE = 'Disclosure: the tools marked "Our product" are made by Quickwell, the publisher of this brief. Riddlebound is made by a company with the same owner as Quickwell. We benefit when you use them. Promotions are labeled and are not news coverage.';

export function selectCtas(desk, harvest) {
  const out = [];
  for (const t of desk.triggers) {
    const hits = harvest.items.filter((i) => t.match.test(`${i.title} ${i.snippet}`)).map((i) => i.id);
    if (hits.length && !out.some((c) => c.id === t.tool)) out.push(tool(t.tool, 'anchor', `match-${t.tool}`, hits));
  }
  if (out.length === 0) out.push(tool(desk.defaultTool, 'top', 'default', []));
  const day = weekdayOf(harvest.date);
  if (day === 'Friday' || day === 'Saturday') out.push({ ...RIDDLEBOUND, placement: 'end', signal: 'weekend', evidence: [] });
  return out;
}

function tool(id, placement, signal, evidence) {
  const t = TOOLS[id];
  if (!t) throw new Error(`unknown tool "${id}"`);
  return { id, product: t.product, url: `${SITE}${t.path}`, ref: true, label: t.label, copy: t.copy, placement, signal, evidence };
}

export function trackedUrl(cta, { desk, medium, date, footer = false }) {
  const u = new URL(cta.url);
  u.searchParams.set('utm_source', `brief-${desk}`);
  u.searchParams.set('utm_medium', medium);
  u.searchParams.set('utm_campaign', `brief-${desk}-${date}`);
  u.searchParams.set('utm_content', footer ? `${cta.signal}-footer` : cta.signal);
  if (cta.ref) u.searchParams.set('ref', `brief-${desk}`);
  return u.toString();
}

// The injection loop: lede, top CTAs, each section followed by the CTAs anchored to it, leftover
// anchored CTAs, end CTAs, then the footer list repeating every CTA.
export function injectCtas(brief, ctas) {
  const pending = [...ctas];
  const take = (pred) => {
    const got = [];
    for (let i = 0; i < pending.length; i++) if (pred(pending[i])) { got.push(pending[i]); pending.splice(i--, 1); }
    return got;
  };
  const blocks = [{ type: 'lede', text: brief.lede }];
  for (const cta of take((c) => c.placement === 'top')) blocks.push({ type: 'cta', cta });
  for (const section of brief.sections) {
    blocks.push({ type: 'section', section });
    const ids = new Set(section.source_ids);
    for (const cta of take((c) => c.placement === 'anchor' && c.evidence.some((e) => ids.has(e)))) blocks.push({ type: 'cta', cta });
  }
  for (const cta of take((c) => c.placement === 'anchor')) blocks.push({ type: 'cta', cta });
  for (const cta of take(() => true)) blocks.push({ type: 'cta', cta });
  if (ctas.length) blocks.push({ type: 'footer', ctas });
  return blocks;
}
