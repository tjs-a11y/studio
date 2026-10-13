// Footsure: a small single-series trend chart (SVG string) with a dashed CDC reference line.
// Pure: returns markup; the page wires hover/tap to the caption under it.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function lineChart({ points, ref = null, unit = '', title = '', width = 340, height = 190, digits = 0 }) {
  const vals = points.map((p) => p.value).filter((v) => v != null);
  if (!vals.length) return '<p class="muted small">No results yet for this test.</p>';
  const all = ref ? [...vals, ref.value] : vals;
  let lo = Math.min(...all), hi = Math.max(...all);
  const padV = Math.max(1, (hi - lo) * 0.2);
  lo = Math.max(0, Math.floor(lo - padV)); hi = Math.ceil(hi + padV);
  const L = 30, R = 12, T = 14, B = 26, W = width - L - R, H = height - T - B;
  const n = points.length;
  const X = (i) => L + (n === 1 ? W / 2 : (i * W) / (n - 1));
  const Y = (v) => T + H - ((v - lo) * H) / (hi - lo || 1);
  const fmt = (v) => (v == null ? '—' : Number(v).toFixed(digits));
  let s = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">`;
  // recessive grid: 3 lines
  for (let k = 0; k <= 2; k++) {
    const v = lo + ((hi - lo) * k) / 2, y = Y(v);
    s += `<line x1="${L}" x2="${width - R}" y1="${y}" y2="${y}" class="grid"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" class="axis">${fmt(v)}</text>`;
  }
  if (ref) {
    const y = Y(ref.value);
    s += `<line x1="${L}" x2="${width - R}" y1="${y}" y2="${y}" class="refline"/>`;
    // label on the side of the line with more room, away from the latest point
    const lastV = vals[vals.length - 1];
    const below = lastV >= ref.value ? y + 14 : y - 5;
    s += `<text x="${L + 4}" y="${below}" text-anchor="start" class="reflabel">${esc(ref.label)}</text>`;
  }
  const pts = points.map((p, i) => (p.value == null ? null : [X(i), Y(p.value)])).filter(Boolean);
  if (pts.length > 1) s += `<polyline class="series" points="${pts.map((p) => p.join(',')).join(' ')}"/>`;
  const step = Math.ceil(n / 6);
  points.forEach((p, i) => {
    if (i % step === 0 || i === n - 1) s += `<text x="${X(i)}" y="${height - 8}" text-anchor="middle" class="axis">${esc(p.label)}</text>`;
    if (p.value == null) return;
    s += `<circle cx="${X(i)}" cy="${Y(p.value)}" r="4.5" class="dot"/>`;
    if (i === n - 1) s += `<text x="${X(i)}" y="${Y(p.value) - 10}" text-anchor="middle" class="vlabel">${fmt(p.value)}</text>`;
    s += `<circle cx="${X(i)}" cy="${Y(p.value)}" r="16" class="hit" tabindex="0" data-tip="${esc(`${p.label}: ${fmt(p.value)}${unit}${p.note ? ' · ' + p.note : ''}`)}"><title>${esc(`${p.label}: ${fmt(p.value)}${unit}`)}</title></circle>`;
  });
  return s + '</svg>';
}

/** Plain-English trend line for chair stands (higher is better) or TUG seconds (lower is better). */
export function trendText(values, { higherIsBetter = true, unit = '' } = {}) {
  const v = values.filter((x) => x != null);
  if (v.length < 2) return 'One result so far. The trend appears after the next monthly check.';
  const first = v[0], last = v[v.length - 1], d = +(last - first).toFixed(1);
  if (Math.abs(d) < (higherIsBetter ? 1 : 0.5)) return `Holding steady since the first check (${first}${unit} then, ${last}${unit} now).`;
  const better = higherIsBetter ? d > 0 : d < 0;
  return `${better ? 'Better' : 'Worse'} than the first check: ${first}${unit} then, ${last}${unit} now.${better ? '' : ' A steady change is worth showing a doctor.'}`;
}
