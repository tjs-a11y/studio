// Small inline-SVG charts (no library). Colors come from CSS variables, so light and dark both work.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Line chart of [[date, value], ...]. fmtY formats axis values, fmtX formats dates.
export function lineChart(points, { title, fmtY = (v) => v.toFixed(2), fmtX = (d) => d, w = 640, h = 220 } = {}) {
  if (!points || points.length < 2) return '<p class="note">Not enough history yet to draw a chart.</p>';
  const pad = { l: 8, r: 8, t: 22, b: 24 };
  const ys = points.map((p) => p[1]);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= 1; hi += 1; }
  const x = (i) => pad.l + (i / (points.length - 1)) * (w - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join('');
  const last = points.at(-1), first = points[0];
  const summary = `${title}: ${points.length} points from ${fmtX(first[0])} (${fmtY(first[1])}) to ${fmtX(last[0])} (${fmtY(last[1])}); low ${fmtY(Math.min(...ys))}, high ${fmtY(Math.max(...ys))}.`;
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(summary)}">
<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(hi)}" y2="${y(hi)}" stroke="var(--line)"/><line x1="${pad.l}" x2="${w - pad.r}" y1="${y(lo)}" y2="${y(lo)}" stroke="var(--line)"/>
<text class="ax" x="${pad.l}" y="${y(hi) - 6}">${esc(fmtY(hi))}</text><text class="ax" x="${pad.l}" y="${y(lo) + 14}">${esc(fmtY(lo))}</text>
<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
<circle cx="${x(points.length - 1)}" cy="${y(last[1])}" r="3.5" fill="var(--accent)"/>
<text class="ax" x="${pad.l}" y="${h - 6}">${esc(fmtX(first[0]))}</text><text class="ax" x="${w - pad.r}" y="${h - 6}" text-anchor="end">${esc(fmtX(last[0]))}</text>
</svg>`;
}

// Yield curve: tenors evenly spaced (labelled), latest vs previous day.
export function curveChart(tenors, { labels, w = 640, h = 220, latestLabel = 'Latest', prevLabel = 'Previous' } = {}) {
  const pts = tenors.filter((t) => Number.isFinite(t.value));
  if (pts.length < 2) return '';
  const vals = pts.flatMap((t) => [t.value, t.prev]).filter(Number.isFinite);
  let lo = Math.min(...vals), hi = Math.max(...vals); if (lo === hi) { lo -= 0.5; hi += 0.5; }
  const pad = { l: 34, r: 8, t: 26, b: 26 };
  const x = (i) => pad.l + (i / (pts.length - 1)) * (w - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  const path = (k) => pts.map((t, i) => (Number.isFinite(t[k]) ? `${i && Number.isFinite(pts[i - 1][k]) ? 'L' : 'M'}${x(i).toFixed(1)},${y(t[k]).toFixed(1)}` : '')).join('');
  const every = Math.ceil(pts.length / 7);
  const ticks = pts.map((t, i) => (i % every === 0 || i === pts.length - 1 ? `<text class="ax" x="${x(i)}" y="${h - 8}" text-anchor="middle">${esc(labels(t))}</text>` : '')).join('');
  const summary = `Yield curve: ${pts.map((t) => `${labels(t)} ${t.value.toFixed(2)}%`).join(', ')}.`;
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(summary)}">
<text class="ax" x="2" y="${y(hi) + 4}">${hi.toFixed(2)}%</text><text class="ax" x="2" y="${y(lo) + 4}">${lo.toFixed(2)}%</text>
<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(hi)}" y2="${y(hi)}" stroke="var(--line)"/><line x1="${pad.l}" x2="${w - pad.r}" y1="${y(lo)}" y2="${y(lo)}" stroke="var(--line)"/>
<path d="${path('prev')}" fill="none" stroke="var(--series2)" stroke-width="2" stroke-dasharray="5 4"/>
<path d="${path('value')}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
<rect x="${pad.l}" y="4" width="14" height="3" fill="var(--accent)"/><text class="ax" x="${pad.l + 18}" y="10">${esc(latestLabel)}</text>
<rect x="${pad.l + 120}" y="4" width="14" height="3" fill="var(--series2)"/><text class="ax" x="${pad.l + 138}" y="10">${esc(prevLabel)}</text>
${ticks}</svg>`;
}
