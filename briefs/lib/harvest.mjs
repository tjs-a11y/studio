// Fetches a desk's public sources. Each source fails on its own (logged, skipped).
// Items are kept only if they are recent, not sponsored/podcast/video, and match the source's
// include filter. Every kept item gets an id (S1, S2 ...) that the writer must cite.
import Parser from 'rss-parser';
import { clean, daysBefore, localDate } from './util.mjs';

const TIMEOUT_MS = 15000;
const FR_API = 'https://www.federalregister.gov/api/v1/documents.json';
const UA = 'QuickwellBriefs/1.0 (+https://quickwell.app/news/; one request per feed per day)';

// Publisher labels for paid or non-article items (FreightWaves uses "Sponsored Insights",
// "FreightWaves TV"; others use similar words).
export const NON_NEWS_TAG_RE = /\b(sponsor\w*|partner content|brand(?:ed)? content|paid (?:post|content)|advertorial|press release distribution|webinar|podcast|video)\b/i;
const NON_NEWS_TITLE_RE = /^\s*(sponsored|advertorial|partner content|paid post|webinar|podcast)\b|\[(sponsored|ad)\]/i;
export const isNonNews = (item) => (item.categories ?? []).some((c) => NON_NEWS_TAG_RE.test(c)) || NON_NEWS_TITLE_RE.test(item.title ?? '');

export function isFresh(item, { now, maxAgeDays }) {
  const t = Date.parse(item.published ?? '');
  if (!Number.isFinite(t)) return false;
  const age = (now.getTime() - t) / 864e5;
  return age <= maxAgeDays && age >= -1;
}

export async function fetchRss(source, { parser = new Parser({ timeout: TIMEOUT_MS, headers: { 'user-agent': UA } }), max = 25 } = {}) {
  const feed = await parser.parseURL(source.url);
  return (feed.items ?? []).slice(0, max).map((item) => ({
    source: source.name,
    title: clean(item.title, 240),
    link: item.link || '',
    published: item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : null),
    snippet: clean(item.contentSnippet || item.summary || '', 400),
    categories: (item.categories ?? []).map((c) => clean(typeof c === 'string' ? c : c?._ ?? c?.name ?? '', 60)).filter(Boolean),
  })).filter((i) => i.title && /^https?:\/\//.test(i.link));
}

export async function fetchFederalRegister(source, { date, fetchImpl = fetch }) {
  const url = new URL(FR_API);
  url.searchParams.set('per_page', '20');
  url.searchParams.set('order', 'newest');
  url.searchParams.append('conditions[agencies][]', source.agency);
  url.searchParams.set('conditions[publication_date][gte]', daysBefore(date, source.days ?? 7));
  if (source.term) url.searchParams.set('conditions[term]', source.term);
  for (const t of source.types ?? []) url.searchParams.append('conditions[type][]', t);
  for (const f of ['title', 'type', 'abstract', 'html_url', 'publication_date']) url.searchParams.append('fields[]', f);
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'application/json', 'user-agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  return (body?.results ?? []).map((d) => ({
    source: source.name,
    title: clean(`${d.type ? `${d.type}: ` : ''}${d.title}`, 300),
    link: d.html_url || '',
    // Federal Register dates are calendar days; noon UTC keeps them inside the freshness window.
    published: d.publication_date ? `${d.publication_date}T12:00:00.000Z` : null,
    snippet: clean(d.abstract, 500),
    categories: [],
  })).filter((d) => d.title && /^https:\/\/www\.federalregister\.gov\//.test(d.link));
}

export async function harvest(desk, { now = new Date(), fetchImpl = fetch, parser, maxAgeDays = 7 } = {}) {
  const date = localDate(now);
  const errors = [];
  const skipped = [];
  const perSource = [];
  const lists = await Promise.all(desk.sources.map(async (s) => {
    try {
      const items = s.type === 'federalRegister'
        ? await fetchFederalRegister(s, { date, fetchImpl })
        : await fetchRss(s, parser ? { parser } : {});
      const kept = items.filter((i) => {
        if (isNonNews(i)) { skipped.push({ source: s.name, title: i.title, reason: 'sponsored or non-article' }); return false; }
        if (s.include && !s.include.test(`${i.title} ${i.snippet}`)) return false;
        // Federal Register queries are already date-bounded by `days`.
        return s.type === 'federalRegister' ? true : isFresh(i, { now, maxAgeDays });
      });
      perSource.push({ source: s.name, fetched: items.length, kept: kept.length });
      return kept;
    } catch (e) {
      errors.push({ source: s.name, message: String(e?.message || e).slice(0, 200) });
      perSource.push({ source: s.name, fetched: 0, kept: 0 });
      return [];
    }
  }));
  const seen = new Set();
  const items = lists.flat()
    .filter((i) => (seen.has(i.link) ? false : seen.add(i.link)))
    .sort((a, b) => String(b.published ?? '').localeCompare(String(a.published ?? '')))
    .slice(0, 30)
    .map((i, n) => ({ id: `S${n + 1}`, ...i }));
  return { desk: desk.id, generatedAt: now.toISOString(), date, items, perSource, skipped, errors };
}
