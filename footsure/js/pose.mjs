// Footsure: pose logic.
// Everything above the "MediaPipe loader" line is pure: it takes landmark frames and returns numbers,
// so it runs (and is unit-tested) in Node with synthetic data. A frame is { t: ms, lm: Landmark[33] | null },
// where each landmark is { x, y, z?, visibility? } in normalized image coordinates (0..1, y grows downward),
// the format MediaPipe Pose Landmarker returns.

export const LM = {
  NOSE: 0, L_SHOULDER: 11, R_SHOULDER: 12, L_ELBOW: 13, R_ELBOW: 14, L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24, L_KNEE: 25, R_KNEE: 26, L_ANKLE: 27, R_ANKLE: 28,
  L_HEEL: 29, R_HEEL: 30, L_FOOT: 31, R_FOOT: 32,
};
const SIDES = {
  L: { shoulder: LM.L_SHOULDER, wrist: LM.L_WRIST, hip: LM.L_HIP, knee: LM.L_KNEE, ankle: LM.L_ANKLE, heel: LM.L_HEEL, foot: LM.L_FOOT },
  R: { shoulder: LM.R_SHOULDER, wrist: LM.R_WRIST, hip: LM.R_HIP, knee: LM.R_KNEE, ankle: LM.R_ANKLE, heel: LM.R_HEEL, foot: LM.R_FOOT },
};

// ---------- geometry ----------
export const vis = (p) => (p ? (p.visibility ?? 1) : 0);
export const isVisible = (p, min = 0.5) => !!p && vis(p) >= min;
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, visibility: Math.min(vis(a), vis(b)) });

/** Angle at b (degrees) formed by a-b-c. */
export function angleDeg(a, b, c) {
  const v1x = a.x - b.x, v1y = a.y - b.y, v2x = c.x - b.x, v2y = c.y - b.y;
  const n = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (!n) return null;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** The leg the camera sees best (side view: the near leg). */
export function legSide(lm, minVis = 0.5) {
  if (!lm) return null;
  const score = (s) => Math.min(vis(lm[SIDES[s].hip]), vis(lm[SIDES[s].knee]), vis(lm[SIDES[s].ankle]));
  const l = score('L'), r = score('R');
  if (Math.max(l, r) < minVis) return null;
  return l >= r ? 'L' : 'R';
}

/** Hip–knee–ankle angle of the best-seen leg: ~90° seated, ~170–180° standing. */
export function kneeAngle(lm, side = legSide(lm)) {
  if (!side) return null;
  const s = SIDES[side];
  return angleDeg(lm[s.hip], lm[s.knee], lm[s.ankle]);
}

function legPoints(lm, side) {
  const s = SIDES[side];
  return { hip: lm[s.hip], knee: lm[s.knee], ankle: lm[s.ankle] };
}

/** Distance from the nose to the lower ankle: a body-size yardstick in image units. */
export function bodyHeight(lm) {
  const side = legSide(lm, 0.3);
  if (!side || !lm[LM.NOSE]) return null;
  return Math.abs(lm[SIDES[side].ankle].y - lm[LM.NOSE].y) || null;
}

/** "I can see the whole body": head, a shoulder, a hip, a knee and an ankle visible and inside the frame. */
export function wholeBodyVisible(lm, { minVis = 0.5, margin = 0.01 } = {}) {
  if (!lm) return { ok: false, missing: ['body'] };
  const inFrame = (p) => p.x >= margin && p.x <= 1 - margin && p.y >= margin && p.y <= 1 - margin;
  const need = {
    head: [LM.NOSE], shoulder: [LM.L_SHOULDER, LM.R_SHOULDER], hip: [LM.L_HIP, LM.R_HIP],
    knee: [LM.L_KNEE, LM.R_KNEE], ankle: [LM.L_ANKLE, LM.R_ANKLE],
  };
  const missing = Object.entries(need)
    .filter(([, idx]) => !idx.some((i) => lm[i] && isVisible(lm[i], minVis) && inFrame(lm[i])))
    .map(([name]) => name);
  return { ok: missing.length === 0, missing };
}

/** Arms crossed over the chest: every visible wrist stays near the shoulders and well above the hips. */
export function armsCrossed(lm, { minVis = 0.5, reach = 0.75 } = {}) {
  const sh = mid(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]);
  const hp = mid(lm[LM.L_HIP], lm[LM.R_HIP]);
  const torso = dist(sh, hp);
  if (!torso) return null;
  const wrists = [lm[LM.L_WRIST], lm[LM.R_WRIST]].filter((w) => isVisible(w, minVis));
  if (!wrists.length) return null; // can't tell
  return wrists.every((w) => dist(w, sh) <= reach * torso && w.y < hp.y - 0.25 * torso);
}

function median3(buf) {
  const s = [...buf].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// ---------- Test 1: 30-second chair stand ----------
/**
 * Live chair-stand counter. A stand counts when the knee straightens past `standAngle` AND the hip has risen
 * at least `minRise` thigh-lengths above the seated line (so straightening the legs while seated doesn't count).
 * The person must sit back down (knee under `sitAngle`) before the next stand can count.
 */
export function createStandCounter(opts = {}) {
  const o = { standAngle: 160, sitAngle: 110, minRise: 0.4, armsOffMs: 400, minVis: 0.5, ...opts };
  let phase = 'unknown', count = 0, seatedHipY = null, standingHipY = null, thigh = null;
  let angles = [], lastT = null, armsOffRun = 0, armsUsed = false, last = null;

  function progress(hipY, angle) {
    if (seatedHipY != null && standingHipY != null && seatedHipY > standingHipY) {
      return Math.max(0, Math.min(1, (seatedHipY - hipY) / (seatedHipY - standingHipY)));
    }
    return Math.max(0, Math.min(1, (angle - o.sitAngle) / (o.standAngle - o.sitAngle)));
  }

  function push(frame) {
    const dt = lastT == null ? 0 : Math.max(0, frame.t - lastT);
    lastT = frame.t;
    const lm = frame.lm;
    const side = lm && legSide(lm, o.minVis);
    if (!side) return state();
    const raw = kneeAngle(lm, side);
    if (raw == null) return state();
    angles.push(raw); if (angles.length > 3) angles.shift();
    const angle = median3(angles);
    const { hip, knee } = legPoints(lm, side);
    thigh = thigh == null ? dist(hip, knee) : 0.9 * thigh + 0.1 * dist(hip, knee);
    const hipY = hip.y;

    if (angle <= o.sitAngle) {
      seatedHipY = seatedHipY == null ? hipY : 0.8 * seatedHipY + 0.2 * hipY;
      phase = 'seated';
    } else if (angle >= o.standAngle && (seatedHipY == null || seatedHipY - hipY >= o.minRise * thigh)) {
      if (phase === 'seated' || phase === 'rising') count += 1;
      standingHipY = standingHipY == null ? hipY : 0.8 * standingHipY + 0.2 * hipY;
      phase = 'standing';
    } else if (phase === 'seated' || phase === 'rising') {
      phase = 'rising';
    } else if (phase === 'standing' || phase === 'lowering') {
      phase = 'lowering';
    }

    // Arms: the CDC form scores 0 if the arms are used to stand. Watch them while rising.
    if (phase === 'rising' || phase === 'standing') {
      const crossed = armsCrossed(lm, { minVis: o.minVis });
      if (crossed === false) { armsOffRun += dt; if (armsOffRun >= o.armsOffMs) armsUsed = true; }
      else armsOffRun = 0;
    } else armsOffRun = 0;

    last = { t: frame.t, phase, angle, progress: progress(hipY, angle) };
    return state();
  }

  function state() {
    return { count, phase, armsUsed, progress: last ? last.progress : 0, angle: last ? last.angle : null };
  }

  /** Call at the 30-second mark. A stand in progress counts if the person is more than halfway up. */
  function finish() {
    const partial = phase === 'rising' && !!last && last.progress > 0.5;
    const total = count + (partial ? 1 : 0);
    return { count: total, fullStands: count, partial, armsUsed, score: armsUsed ? 0 : total };
  }
  return { push, state, finish };
}

/** Batch version: count stands in frames from startT to startT + durationMs. */
export function countStands(frames, { startT = frames.length ? frames[0].t : 0, durationMs = 30000, ...opts } = {}) {
  const c = createStandCounter(opts);
  for (const f of frames) {
    if (f.t < startT) continue;
    if (f.t > startT + durationMs) break;
    c.push(f);
  }
  return c.finish();
}

// ---------- Test 3: Timed Up and Go ----------
/**
 * Live TUG timer. `goT` is when the helper says "Go".
 * Phases: rise (Go → hip leaves the seat band), out + turn (→ furthest point from the chair),
 * back + sit (→ seated again and settled for `settleMs`).
 * startOn: 'go' (default; stopwatch starts on the word Go) or 'rise' (starts when the hip leaves the seat).
 */
export function createTugTimer(opts = {}) {
  const o = { goT: 0, sitAngle: 120, seatBand: 0.35, settleMs: 300, minUpMs: 1500, startOn: 'go', minVis: 0.5, ...opts };
  let seatY = null, seatX = null, thigh = null, riseT = null, turnT = null, maxAway = 0, endT = null, settleStart = null;
  let lastSeen = null, status = 'waiting', gapStart = null, turnInGap = false;

  function push(frame) {
    if (endT != null) return result(frame.t);
    const lm = frame.lm;
    const side = lm && legSide(lm, o.minVis);
    if (!side) {
      if (status === 'up') { settleStart = null; if (gapStart == null) gapStart = lastSeen; }
      return result(frame.t);
    }
    const angle = kneeAngle(lm, side);
    const { hip, knee } = legPoints(lm, side);
    thigh = thigh == null ? dist(hip, knee) : 0.9 * thigh + 0.1 * dist(hip, knee);
    lastSeen = frame.t;
    const band = o.seatBand * thigh;

    if (riseT == null) {
      // The seat line is learned while seated before "Go" (or from the first seated frame), then frozen.
      if (angle != null && angle <= o.sitAngle && (seatY == null || (frame.t < o.goT && Math.abs(hip.y - seatY) <= band))) {
        seatY = seatY == null ? hip.y : 0.8 * seatY + 0.2 * hip.y;
        seatX = seatX == null ? hip.x : 0.8 * seatX + 0.2 * hip.x;
      }
      if (frame.t >= o.goT && seatY != null && seatY - hip.y > band) { riseT = frame.t; status = 'up'; }
      return result(frame.t);
    }

    // Walked out of view and came back: if the furthest point seen was the exit, the turn was out of view;
    // place it half-way through the gap.
    if (gapStart != null) {
      if (frame.t - gapStart > 300 && turnT === gapStart) { turnT = (gapStart + frame.t) / 2; turnInGap = true; }
      gapStart = null;
    }
    const away = Math.abs(hip.x - seatX);
    if (away > maxAway + (turnInGap ? 0.02 : 0)) { maxAway = away; turnT = frame.t; turnInGap = false; }
    const seated = angle != null && angle <= o.sitAngle && Math.abs(hip.y - seatY) <= band && away <= 2 * band;
    if (seated && frame.t - riseT >= o.minUpMs) {
      if (settleStart == null) settleStart = frame.t;
      if (frame.t - settleStart >= o.settleMs) { endT = settleStart; status = 'done'; }
    } else settleStart = null;
    return result(frame.t);
  }

  function result(now) {
    const t0 = o.startOn === 'rise' ? riseT : o.goT;
    if (endT == null) {
      return { status, elapsedSec: t0 != null && now != null && (status === 'up' || o.startOn === 'go') ? Math.max(0, (now - t0) / 1000) : 0, lastSeen };
    }
    return {
      status: 'done', totalSec: (endT - t0) / 1000, riseT, turnT, endT,
      phases: { riseSec: (riseT - o.goT) / 1000, outAndTurnSec: ((turnT ?? riseT) - riseT) / 1000, backAndSitSec: (endT - (turnT ?? riseT)) / 1000 },
    };
  }
  return { push, result: () => result(lastSeen) };
}

export function timeTug(frames, opts = {}) {
  const t = createTugTimer({ goT: frames.length ? frames[0].t : 0, ...opts });
  let r = null;
  for (const f of frames) r = t.push(f);
  return r && r.status === 'done' ? r : { status: 'incomplete' };
}

// ---------- Test 2: 4-stage balance (one stage) ----------
/**
 * One balance hold. The first `baselineMs` after start fixes where the feet are. The hold fails when a foot
 * point moves more than `footMove` × body height, or a wrist reaches out more than `reach` × body height from
 * the hips (grabbing for support), for at least `debounceMs`. Losing sight of the body for `lostMs` → 'lost'.
 */
export function createBalanceHold(opts = {}) {
  const o = { startT: 0, holdMs: 10000, baselineMs: 500, footMove: 0.06, reach: 0.45, debounceMs: 150, lostMs: 1500, minVis: 0.5, ...opts };
  const FEET = [LM.L_ANKLE, LM.R_ANKLE, LM.L_HEEL, LM.R_HEEL, LM.L_FOOT, LM.R_FOOT];
  const base = new Map(); let baseN = 0, bodyH = null;
  let badSince = null, badReason = null, lastSeen = o.startT, done = null;

  function push(frame) {
    if (done) return done;
    if (frame.t < o.startT) return status(frame.t);
    const lm = frame.lm;
    const seen = lm && legSide(lm, o.minVis);
    if (!seen) {
      if (frame.t - lastSeen >= o.lostMs) done = { status: 'lost', heldMs: lastSeen - o.startT, reason: 'out of view' };
      return done || status(frame.t);
    }
    lastSeen = frame.t;
    if (frame.t - o.startT < o.baselineMs) {
      for (const i of FEET) if (isVisible(lm[i], o.minVis)) {
        const b = base.get(i) || { x: 0, y: 0, n: 0 };
        b.x += lm[i].x; b.y += lm[i].y; b.n += 1; base.set(i, b);
      }
      const h = bodyHeight(lm); if (h) bodyH = bodyH == null ? h : (bodyH * baseN + h) / (baseN + 1);
      baseN += 1;
      return status(frame.t);
    }
    if (!bodyH) bodyH = bodyHeight(lm) || 0.6;
    let reason = null;
    for (const [i, b] of base) {
      if (!isVisible(lm[i], o.minVis)) continue;
      if (Math.hypot(lm[i].x - b.x / b.n, lm[i].y - b.y / b.n) > o.footMove * bodyH) { reason = 'foot moved'; break; }
    }
    if (!reason) {
      const hp = mid(lm[LM.L_HIP], lm[LM.R_HIP]);
      for (const w of [lm[LM.L_WRIST], lm[LM.R_WRIST]]) {
        if (isVisible(w, o.minVis) && Math.abs(w.x - hp.x) > o.reach * bodyH) { reason = 'reached for support'; break; }
      }
    }
    if (reason) {
      if (badSince == null) { badSince = frame.t; badReason = reason; }
      if (frame.t - badSince >= o.debounceMs) { done = { status: 'failed', heldMs: badSince - o.startT, reason: badReason }; return done; }
    } else { badSince = null; badReason = null; }
    if (frame.t - o.startT >= o.holdMs) { done = { status: 'held', heldMs: o.holdMs }; return done; }
    return status(frame.t);
  }
  function status(now) { return { status: 'holding', heldMs: Math.max(0, Math.min(o.holdMs, now - o.startT)) }; }
  return { push, result: () => done || status(lastSeen) };
}

export function checkBalanceHold(frames, opts = {}) {
  const h = createBalanceHold({ startT: frames.length ? frames[0].t : 0, ...opts });
  let r = null;
  for (const f of frames) { r = h.push(f); if (r.status !== 'holding') break; }
  return r || { status: 'holding', heldMs: 0 };
}

/** Stages held in a row before the first failure (0–4). */
export function stagesHeld(results) {
  let n = 0;
  for (const r of results) { if (r && r.status === 'held') n += 1; else break; }
  return n;
}

// ---------- MediaPipe loader (browser only) ----------
// Pinned version. At public launch the Launch Desk can self-host the same files and pass `base`/`modelUrl`.
export const MP_VERSION = '1.1.0';
export const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
export const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/** Loads MediaPipe Pose Landmarker (lite, VIDEO mode). Rejects if the CDN, model or WebAssembly is unavailable. */
export async function createPoseTracker({ base = MP_BASE, modelUrl = MODEL_URL, timeoutMs = 30000 } = {}) {
  const load = (async () => {
    const { FilesetResolver, PoseLandmarker } = await import(/* @vite-ignore */ `${base}/vision_bundle.mjs`);
    const fileset = await FilesetResolver.forVisionTasks(`${base}/wasm`);
    const make = (delegate) => PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: modelUrl, delegate }, runningMode: 'VIDEO', numPoses: 1,
    });
    let lmk;
    try { lmk = await make('GPU'); } catch (e) { lmk = await make('CPU'); }
    return { lmk, connections: PoseLandmarker.POSE_CONNECTIONS };
  })();
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Pose model took too long to load')), timeoutMs));
  const { lmk, connections } = await Promise.race([load, timeout]);
  let lastTs = -1;
  return {
    connections,
    detect(video, nowMs) {
      const ts = Math.max(lastTs + 1, Math.round(nowMs));
      lastTs = ts;
      const r = lmk.detectForVideo(video, ts);
      return (r && r.landmarks && r.landmarks[0]) || null;
    },
    close() { try { lmk.close(); } catch (e) { /* already closed */ } },
  };
}
