import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countStands, createStandCounter, timeTug, checkBalanceHold, stagesHeld, kneeAngle, wholeBodyVisible, armsCrossed, angleDeg } from '../js/pose.mjs';
import { frames, pose, cycle, STEP } from './helpers/synth.mjs';

test('geometry: knee angle reads ~90° seated and ~180° standing', () => {
  assert.ok(Math.abs(kneeAngle(pose({ knee: 90 })) - 90) < 0.5);
  assert.ok(Math.abs(kneeAngle(pose({ knee: 180 })) - 180) < 0.5);
  assert.equal(Math.round(angleDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })), 90);
});

test('whole body visible, and missing parts are named', () => {
  assert.equal(wholeBodyVisible(pose({ knee: 90 })).ok, true);
  const lm = pose({ knee: 90 });
  lm[27] = { ...lm[27], y: 1.2 }; lm[28] = { ...lm[28], visibility: 0.1 }; // feet out of frame
  assert.deepEqual(wholeBodyVisible(lm).missing, ['ankle']);
  assert.equal(wholeBodyVisible(null).ok, false);
});

test('arms crossed vs pushing on the knees', () => {
  assert.equal(armsCrossed(pose({ knee: 140 })), true);
  assert.equal(armsCrossed(pose({ knee: 140, arms: 'pushing' })), false);
});

test('chair stand: 10 clean stands in 30 s', () => {
  const f = frames(0, 30000, (t) => ({ knee: cycle(t, 3000) }));
  const r = countStands(f);
  assert.equal(r.count, 10); assert.equal(r.partial, false); assert.equal(r.armsUsed, false); assert.equal(r.score, 10);
});

test('chair stand: counts correctly with landmark jitter and dropped frames', () => {
  const f = frames(0, 30000, (t) => (Math.floor(t / STEP) % 7 === 3 ? null : { knee: cycle(t, 2500) }), { jitter: 0.004, seed: 7 });
  assert.equal(countStands(f).count, 12);
});

test('chair stand: a partial stand counts only if more than halfway up at 30 s', () => {
  // 9 full cycles of 3 s (27 s), then rising slowly: knee 90 → 150 by 30 s
  const rising = (t) => (t <= 27000 ? { knee: cycle(t, 3000) } : { knee: 90 + ((t - 27000) / 3000) * 60 });
  const over = countStands(frames(0, 30000, rising));
  assert.equal(over.fullStands, 9); assert.equal(over.partial, true); assert.equal(over.count, 10);
  const under = countStands(frames(0, 30000, (t) => (t <= 27000 ? { knee: cycle(t, 3000) } : { knee: 90 + ((t - 27000) / 3000) * 12 })));
  assert.equal(under.partial, false); assert.equal(under.count, 9);
});

test('chair stand: straightening the legs while seated is not a stand', () => {
  const f = frames(0, 10000, (t) => ({ knee: 90, legOut: (t % 2000) < 1000 ? 75 : 0 }));
  assert.ok(f.some((x) => kneeAngle(x.lm) > 160), 'fixture really straightens the knee');
  assert.equal(countStands(f).count, 0);
});

test('chair stand: using the arms flags armsUsed and scores 0', () => {
  const f = frames(0, 30000, (t) => ({ knee: cycle(t, 3000), arms: 'pushing' }));
  const r = countStands(f);
  assert.equal(r.count, 10); assert.equal(r.armsUsed, true); assert.equal(r.score, 0);
});

test('chair stand: frames after the 30 s window are ignored; live counter reports phase', () => {
  const f = frames(0, 45000, (t) => ({ knee: cycle(t, 3000) }));
  assert.equal(countStands(f, { startT: 0, durationMs: 30000 }).count, 10);
  const c = createStandCounter();
  c.push({ t: 0, lm: pose({ knee: 90 }) });
  assert.equal(c.state().phase, 'seated');
  c.push({ t: 100, lm: pose({ knee: 130 }) });
  assert.equal(c.state().phase, 'rising');
  c.push({ t: 200, lm: pose({ knee: 178 }) });
  c.push({ t: 300, lm: pose({ knee: 178 }) });
  assert.equal(c.state().count, 1);
});

// TUG fixture: Go at 0; rise 0–1.2 s; walk away (leaving the frame); turn half-way; walk back until `backAt`; sit over 1 s.
function tug({ backAt = 8000, sitMs = 1000, never = false } = {}) {
  const turn = (backAt + 1200) / 2;
  return frames(-1000, backAt + sitMs + 2000, (t) => {
    if (t < 0) return { knee: 90 };
    if (t < 1200) return { knee: 90 + (t / 1200) * 90 };
    if (t < backAt) {
      const dx = 0.9 * (t < turn ? (t - 1200) / (turn - 1200) : (backAt - t) / (backAt - turn));
      return 0.33 + dx > 0.98 ? null : { knee: 180, dx }; // null = walked out of view
    }
    if (never) return { knee: 180 };
    if (t < backAt + sitMs) return { knee: 180 - ((t - backAt) / sitMs) * 90 };
    return { knee: 90 };
  });
}

test('TUG: times rise, walk and sit; timer starts on Go', () => {
  const r = timeTug(tug(), { goT: 0 });
  assert.equal(r.status, 'done');
  assert.ok(Math.abs(r.totalSec - 8.9) < 0.25, `total ${r.totalSec}`);
  assert.ok(r.phases.riseSec > 0.1 && r.phases.riseSec < 0.5, `rise ${r.phases.riseSec}`);
  assert.ok(Math.abs(r.turnT - 4600) < 400, `turn at ${r.turnT}`);
  const sum = r.phases.riseSec + r.phases.outAndTurnSec + r.phases.backAndSitSec;
  assert.ok(Math.abs(sum - r.totalSec) < 1e-9);
});

test('TUG: startOn "rise" excludes the reaction time', () => {
  const go = timeTug(tug(), { goT: 0 });
  const rise = timeTug(tug(), { goT: 0, startOn: 'rise' });
  assert.ok(Math.abs(go.totalSec - rise.totalSec - go.phases.riseSec) < 1e-9);
});

test('TUG: slow walk reads 12 s or more; never sitting back down is incomplete', () => {
  const slow = timeTug(tug({ backAt: 11500 }), { goT: 0 });
  assert.ok(slow.totalSec >= 12, `slow ${slow.totalSec}`);
  assert.equal(timeTug(tug({ never: true }), { goT: 0 }).status, 'incomplete');
});

test('TUG: shifting on the seat before Go does not start the clock', () => {
  const fr = [...frames(-2000, -1, () => ({ knee: 95 })), ...tug()];
  const r = timeTug(fr, { goT: 0 });
  assert.ok(Math.abs(r.totalSec - 8.9) < 0.25);
});

const still = (t) => ({ knee: 180 });
test('balance: a still 10-second hold is held', () => {
  const r = checkBalanceHold(frames(0, 10500, still, { jitter: 0.003, seed: 3 }), { startT: 0 });
  assert.equal(r.status, 'held'); assert.equal(r.heldMs, 10000);
});

test('balance: a foot moving at 4.2 s fails the hold at ~4.2 s', () => {
  const r = checkBalanceHold(frames(0, 10500, (t) => ({ knee: 180, footShift: t >= 4200 ? 0.08 : 0 })), { startT: 0 });
  assert.equal(r.status, 'failed'); assert.equal(r.reason, 'foot moved');
  assert.ok(Math.abs(r.heldMs - 4200) <= STEP + 1, `held ${r.heldMs}`);
});

test('balance: reaching out for support fails the hold', () => {
  const r = checkBalanceHold(frames(0, 10500, (t) => ({ knee: 180, arms: t >= 6000 ? 'reach' : 'crossed' })), { startT: 0 });
  assert.equal(r.status, 'failed'); assert.equal(r.reason, 'reached for support');
});

test('balance: a one-frame glitch does not fail the hold', () => {
  const r = checkBalanceHold(frames(0, 10500, (t) => ({ knee: 180, footShift: Math.abs(t - 5000) < STEP / 2 ? 0.1 : 0 })), { startT: 0 });
  assert.equal(r.status, 'held');
});

test('balance: losing sight of the person reports "lost"', () => {
  const r = checkBalanceHold(frames(0, 10500, (t) => (t >= 3000 ? null : still(t))), { startT: 0 });
  assert.equal(r.status, 'lost');
});

test('balance: stages held stops at the first failure', () => {
  assert.equal(stagesHeld([{ status: 'held' }, { status: 'held' }, { status: 'failed' }, { status: 'held' }]), 2);
  assert.equal(stagesHeld([{ status: 'held' }, { status: 'held' }, { status: 'held' }, null]), 3);
  assert.equal(stagesHeld([]), 0);
});
