// Synthetic MediaPipe-style landmark frames for tests: a side-view figure facing right.
// The pose is driven by the knee angle (90° seated → 180° standing); thigh and shin are 0.22 image units.
export const FPS = 15;
export const STEP = 1000 / FPS;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

/**
 * opts: knee (deg), dx (horizontal shift of the whole body, e.g. walking away), arms: 'crossed' | 'pushing' | 'reach',
 * legOut (deg: swings the shin forward while seated, straightening the knee without rising),
 * footShift (moves the near ankle/heel/toe), jitter (max random offset), rand (rng)
 */
export function pose({ knee = 90, dx = 0, arms = 'crossed', legOut = 0, footShift = 0, jitter = 0, rand = Math.random } = {}) {
  const T = 0.22, th = (knee * Math.PI) / 180;
  let ankle = { x: 0.55, y: 0.85 };
  const kn = { x: 0.55, y: 0.63 };
  let hip = { x: kn.x - T * Math.sin(th), y: kn.y + T * Math.cos(th) };
  if (legOut) { // seated, shin swung forward: hip stays on the seat
    hip = { x: 0.33, y: 0.63 };
    const a = (legOut * Math.PI) / 180;
    ankle = { x: kn.x + T * Math.sin(a), y: kn.y + T * Math.cos(a) };
  }
  const sh = { x: hip.x, y: hip.y - 0.25 };
  const nose = { x: sh.x + 0.03, y: sh.y - 0.1 };
  const wrist = arms === 'pushing' ? { x: kn.x - 0.06, y: kn.y - 0.03 }
    : arms === 'reach' ? { x: hip.x + 0.45, y: sh.y + 0.05 }
    : { x: sh.x + 0.04, y: sh.y + 0.06 };
  const elbow = { x: (sh.x + wrist.x) / 2 + 0.03, y: (sh.y + wrist.y) / 2 + 0.03 };
  const heel = { x: ankle.x - 0.03 + footShift, y: ankle.y + 0.01 };
  const toe = { x: ankle.x + 0.06 + footShift, y: ankle.y + 0.01 };
  const ank = { x: ankle.x + footShift, y: ankle.y };
  const lm = Array.from({ length: 33 }, () => ({ x: nose.x, y: nose.y, z: 0, visibility: 0.9 }));
  const j = () => (jitter ? (rand() * 2 - 1) * jitter : 0);
  const set = (i, p, v = 0.95) => { lm[i] = { x: p.x + dx + j(), y: p.y + j(), z: 0, visibility: v }; };
  set(0, nose);
  // near (left) side well seen; far (right) side nearly behind it and less visible
  set(11, sh); set(12, { x: sh.x + 0.01, y: sh.y }, 0.7);
  set(13, elbow); set(14, elbow, 0.6); set(15, wrist); set(16, { x: wrist.x - 0.01, y: wrist.y }, 0.7);
  set(23, hip); set(24, { x: hip.x + 0.01, y: hip.y }, 0.7);
  set(25, kn); set(26, { x: kn.x + 0.01, y: kn.y }, 0.4);
  set(27, ank); set(28, { x: ank.x + 0.01, y: ank.y }, 0.4);
  set(29, heel); set(30, heel, 0.4); set(31, toe); set(32, toe, 0.4);
  return lm;
}

/** Frames from t0 to t1 (ms) where fn(t) returns pose options (or null for "no person seen"). */
export function frames(t0, t1, fn, { seed = 1, jitter = 0 } = {}) {
  const rand = rng(seed), out = [];
  for (let t = t0; t <= t1 + 1e-9; t += STEP) {
    const o = fn(t);
    out.push({ t, lm: o ? pose({ jitter, rand, ...o }) : null });
  }
  return out;
}

/** Knee angle for a chair-stand cycle: seated → standing → seated over `period` ms. */
export const cycle = (t, period) => { const p = (t % period) / period; return 90 + 90 * (p < 0.5 ? p * 2 : (1 - p) * 2); };
