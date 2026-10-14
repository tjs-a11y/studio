// Quickwell Shield: one check = message rules + link checks + a few combinations, added up into a level.
// Levels: 'scam' (Likely scam), 'suspicious' (Suspicious), 'none' (No common warning signs found). Never "safe":
// a message with no warning signs can still be a scam, and the page says so.
import { RULES, GROUPS, runRules } from './rules.mjs';
import { findLinks, analyzeLink, looksLikeHtml, htmlToText, CHECKS, CHECK_W } from './url.mjs';

export const LIKELY = 5;      // points for "Likely scam"
export const SUSPICIOUS = 2;  // points for "Suspicious"

const TRUST = ['bank', 'gov', 'gov-ssn', 'delivery', 'toll', 'tech', 'remote', 'family-new', 'family-trouble', 'romance'];
const MONEY = ['pay-giftcard', 'pay-crypto', 'pay-wire', 'pay-p2p', 'money-ask', 'safe-account', 'invest'];
const SECRETS = ['code-ask', 'pii-ask'];
const PRESSURE = ['urgency', 'threat'];
// Combinations: each adds points when both sides are present. They are listed in "What we checked" too.
export const COMBOS = [
  { id: 'combo-trust-money', w: 2, a: TRUST, b: MONEY },
  { id: 'combo-trust-secret', w: 2, a: TRUST, b: [...SECRETS, 'link-bad', 'url-shortener'] },
  { id: 'combo-pressure', w: 1, a: PRESSURE, b: [...MONEY, ...SECRETS, 'link-bad', 'fees'] },
  { id: 'combo-trust-call', w: 2, a: TRUST, b: ['call-in'] },
  { id: 'combo-overpay', w: 2, a: ['overpay'], b: [...MONEY, ...SECRETS] },
  { id: 'combo-job', w: 2, a: ['job'], b: ['chat-app', ...MONEY, 'overpay'] },
  { id: 'combo-prize', w: 1, a: ['prize'], b: ['link-bad', 'url-shortener', 'click', ...MONEY, ...SECRETS, 'secrecy'] },
  { id: 'combo-greet-money', w: 2, a: ['family-greet', 'generic-greet', 'wrong-number'], b: [...MONEY, ...SECRETS] },
];
const LINK_BAD = ['url-at', 'url-ip', 'url-homoglyph', 'url-punycode', 'url-lookalike', 'url-brand-sub', 'url-brand-name', 'url-subdomains', 'url-mismatch', 'url-free-host'];

export function check(input) {
  const raw = String(input || '');
  let text = raw, anchors = [];
  const html = looksLikeHtml(raw);
  if (html) ({ text, anchors } = htmlToText(raw));
  const found = runRules(text);

  // links: those written in the text, plus (for HTML) where each link really goes
  const links = [];
  const seen = new Set();
  for (const l of findLinks(text)) {
    const a = analyzeLink(l.raw);
    if (!a) continue;
    const key = a.raw.toLowerCase();
    if (seen.has(key)) { links.find((x) => x.raw.toLowerCase() === key).spans.push({ s: l.start, e: l.end, text: l.raw }); continue; }
    seen.add(key); links.push({ ...a, spans: [{ s: l.start, e: l.end, text: l.raw }] });
  }
  for (const an of anchors) {
    if (!/^(https?:)?\/\/|^www\./i.test(an.href)) continue;
    const a = analyzeLink(an.href, { text: an.text });
    if (!a) continue;
    const i = an.text ? text.indexOf(an.text) : -1;
    const spans = i >= 0 ? [{ s: i, e: i + an.text.length, text: an.text }] : [];
    const same = links.find((x) => x.raw.toLowerCase() === a.raw.toLowerCase());
    if (same) { same.results = same.results.map((r, k) => (r.hit ? r : a.results[k])); continue; }
    links.push({ ...a, spans, fromHtml: true, shownText: an.text });
  }

  // findings: one per rule, one per link check (strongest link wins), then combinations
  const findings = [];
  for (const r of RULES) if (found[r.id]) findings.push({ id: r.id, group: r.group, w: r.w, spans: found[r.id].spans });
  for (const c of CHECKS) {
    const hitLinks = links.filter((l) => l.results.find((x) => x.id === c.id).hit);
    if (!hitLinks.length) continue;
    findings.push({ id: c.id, group: 'link', w: c.w, spans: hitLinks.flatMap((l) => l.spans), detail: hitLinks[0].results.find((x) => x.id === c.id).detail, link: hitLinks[0].display });
  }
  const has = new Set(findings.map((f) => f.id));
  if (LINK_BAD.some((id) => has.has(id))) has.add('link-bad');
  const combos = COMBOS.map((c) => ({ ...c, hit: c.a.some((x) => has.has(x)) && c.b.some((x) => has.has(x)) }));
  for (const c of combos) if (c.hit) findings.push({ id: c.id, group: 'combo', w: c.w, spans: [] });

  const score = findings.reduce((n, f) => n + f.w, 0);
  const level = score >= LIKELY ? 'scam' : score >= SUSPICIOUS ? 'suspicious' : 'none';
  // the full list of what ran, for the transparency panel
  const ran = [
    ...RULES.map((r) => ({ id: r.id, group: r.group, w: r.w, hit: !!found[r.id] })),
    ...CHECKS.map((c) => ({ id: c.id, group: 'link', w: c.w, hit: has.has(c.id), n: links.filter((l) => l.results.find((x) => x.id === c.id).hit).length })),
    ...combos.map((c) => ({ id: c.id, group: 'combo', w: c.w, hit: c.hit })),
  ];
  findings.sort((a, b) => b.w - a.w);
  return { level, score, text, html, findings, links, ran, groups: GROUPS, kinds: kindsOf(has) };
}

// What kind of scam this looks like (for next steps and share cards). Several can apply.
export function kindsOf(has) {
  const k = [];
  if (has.has('family-new') || has.has('family-trouble')) k.push('family');
  if (has.has('bank') || has.has('safe-account')) k.push('bank');
  if (has.has('toll')) k.push('toll');
  if (has.has('delivery')) k.push('delivery');
  if (has.has('gov') || has.has('gov-ssn')) k.push('gov');
  if (has.has('tech') || has.has('remote')) k.push('tech');
  if (has.has('job')) k.push('job');
  if (has.has('romance')) k.push('romance');
  if (has.has('invest')) k.push('invest');
  if (has.has('prize')) k.push('prize');
  if (has.has('code-ask')) k.push('code');
  return k;
}

// Split text into plain and highlighted pieces. Overlapping highlights merge; each piece lists the rules behind it.
export function segments(text, findings) {
  const marks = [];
  for (const f of findings) for (const sp of f.spans || []) if (sp.e > sp.s) marks.push({ s: sp.s, e: sp.e, id: f.id });
  if (!marks.length) return [{ text, ids: [] }];
  const cuts = [...new Set([0, text.length, ...marks.flatMap((m) => [m.s, m.e])])].filter((n) => n >= 0 && n <= text.length).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i], b = cuts[i + 1];
    const ids = [...new Set(marks.filter((m) => m.s <= a && m.e >= b).map((m) => m.id))];
    const prev = out[out.length - 1];
    if (prev && prev.ids.join() === ids.join()) prev.text += text.slice(a, b); else out.push({ text: text.slice(a, b), ids });
  }
  return out;
}
