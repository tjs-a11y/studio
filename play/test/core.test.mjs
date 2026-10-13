// Shared logic: seeded randomness, local days, streaks across midnight and time zones, practice limits, levels, sharing.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/core.mjs';

test('seeded random numbers are deterministic and seed-sensitive', () => {
  const a = C.rng('daily|2026-10-12'), b = C.rng('daily|2026-10-12'), c = C.rng('daily|2026-10-13');
  const xa = Array.from({ length: 50 }, () => a()), xb = Array.from({ length: 50 }, () => b()), xc = Array.from({ length: 50 }, () => c());
  assert.deepEqual(xa, xb);
  assert.notDeepEqual(xa, xc);
  assert.ok(xa.every((x) => x >= 0 && x < 1));
  // Roughly uniform: each tenth gets 6-14% of 10,000 draws.
  const r = C.rng(42); const bins = Array(10).fill(0); for (let i = 0; i < 10000; i++) bins[Math.floor(r() * 10)]++;
  assert.ok(bins.every((n) => n > 600 && n < 1400), bins.join(','));
});

test('day keys follow the player\'s own calendar date, in any time zone', () => {
  const t = new Date('2026-10-13T03:30:00Z'); // 10:30pm Oct 12 in Chicago, 12:30pm Oct 13 in Tokyo
  assert.equal(C.dayKey(t, 'America/Chicago'), '2026-10-12');
  assert.equal(C.dayKey(t, 'Asia/Tokyo'), '2026-10-13');
  assert.equal(C.dayKey(t, 'UTC'), '2026-10-13');
  assert.equal(C.dayKey(new Date('2026-03-08T07:59:00Z'), 'America/Chicago'), '2026-03-08'); // DST start night
  assert.equal(C.dayDiff('2026-12-31', '2027-01-01'), 1);
  assert.equal(C.dayDiff('2026-03-07', '2026-03-09'), 2); // across a DST change, still whole days
  assert.equal(C.addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(C.challengeNumber(C.LAUNCH_DAY), 1);
  assert.equal(C.challengeNumber('2026-10-20'), 9);
  assert.equal(C.weekKey('2026-10-18'), '2026-10-12'); // Sunday belongs to the week starting Monday 12th
  assert.equal(C.weekKey('2026-10-19'), '2026-10-19');
});

test('streaks: consecutive days grow, a missed day resets, same day counts once', () => {
  let s = C.newStreak(), pool = C.newPool();
  for (const d of ['2026-10-12', '2026-10-13', '2026-10-13', '2026-10-14']) ({ streak: s, pool } = C.recordDay(s, d, pool));
  assert.equal(s.current, 3); assert.equal(s.best, 3);
  ({ streak: s, pool } = C.recordDay(s, '2026-10-16', pool)); // missed the 15th
  assert.equal(s.current, 1); assert.equal(s.best, 3);
  // Crossing a month and a year end.
  let y = C.newStreak();
  for (const d of ['2026-12-30', '2026-12-31', '2027-01-01']) ({ streak: y } = C.recordDay(y, d, C.newPool()));
  assert.equal(y.current, 3);
});

test('streaks: playing just before and just after local midnight are two days, in every time zone', () => {
  for (const tz of ['America/Chicago', 'Asia/Kolkata', 'Pacific/Auckland', 'America/St_Johns', 'UTC']) {
    // Find the UTC instant of local midnight for Oct 13 by scanning minutes.
    let t = Date.UTC(2026, 9, 12, 0, 0);
    while (C.dayKey(new Date(t), tz) !== '2026-10-13') t += 60e3;
    const before = C.dayKey(new Date(t - 60e3), tz), after = C.dayKey(new Date(t + 60e3), tz);
    assert.equal(before, '2026-10-12', tz); assert.equal(after, '2026-10-13', tz);
    let s = C.newStreak();
    ({ streak: s } = C.recordDay(s, before, C.newPool()));
    ({ streak: s } = C.recordDay(s, after, C.newPool()));
    assert.equal(s.current, 2, tz);
  }
});

test('streaks: travelling west (clock goes back a day) never breaks or double-counts', () => {
  let s = C.newStreak();
  ({ streak: s } = C.recordDay(s, '2026-10-13', C.newPool()));
  ({ streak: s } = C.recordDay(s, '2026-10-12', C.newPool()));
  assert.equal(s.current, 1); assert.equal(s.last, '2026-10-13');
  assert.equal(C.liveStreak(s, '2026-10-12', C.newPool()), 1);
});

test('streak freezes cover missed days, are shared, and refill weekly up to 2', () => {
  let pool = C.weeklyFreeze(C.newPool(), '2026-10-12');
  assert.equal(pool.tokens, 1);
  assert.equal(C.weeklyFreeze(pool, '2026-10-18').tokens, 1); // same week: no extra
  pool = C.weeklyFreeze(pool, '2026-10-19'); assert.equal(pool.tokens, 2);
  assert.equal(C.weeklyFreeze(C.weeklyFreeze(pool, '2026-10-26'), '2026-11-02').tokens, 2); // capped
  let a = C.newStreak(), b = C.newStreak();
  ({ streak: a, pool } = C.recordDay(a, '2026-10-20', pool));
  ({ streak: b, pool } = C.recordDay(b, '2026-10-20', pool));
  assert.equal(C.liveStreak(a, '2026-10-22', pool), 1); // the 21st is missed but a token can cover it
  ({ streak: a, pool } = C.recordDay(a, '2026-10-22', pool)); // spends one token on the 21st
  assert.equal(a.current, 2); assert.equal(pool.tokens, 1); assert.deepEqual(pool.days, ['2026-10-21']);
  ({ streak: b, pool } = C.recordDay(b, '2026-10-22', pool)); // same day already covered: no second token spent
  assert.equal(b.current, 2); assert.equal(pool.tokens, 1);
  ({ streak: a, pool } = C.recordDay(a, '2026-10-26', pool)); // 3 missed days, only 1 token: reset, token kept
  assert.equal(a.current, 1); assert.equal(pool.tokens, 1);
  assert.equal(C.liveStreak({ current: 5, best: 5, last: '2026-10-01' }, '2026-10-05', { tokens: 1, days: [] }), 0);
});

test('free practice: 3 a day, resetting on a new local day', () => {
  let u = null; const d = '2026-10-12';
  assert.equal(C.practiceLeft(u, d), 3);
  for (let i = 0; i < 3; i++) u = C.usePractice(u, d);
  assert.equal(C.practiceLeft(u, d), 0);
  assert.equal(C.practiceLeft(u, '2026-10-13'), 3);
  assert.deepEqual(C.usePractice(u, '2026-10-13'), { day: '2026-10-13', n: 1 });
});

test('levels and XP', () => {
  assert.equal(C.levelFor(0), 1); assert.equal(C.levelFor(99), 1); assert.equal(C.levelFor(100), 2); assert.equal(C.levelFor(300), 3); assert.equal(C.levelFor(1000), 5);
  const p = C.levelProgress(200); assert.equal(p.level, 2); assert.equal(p.into, 100); assert.equal(p.need, 200);
  assert.equal(C.runXP(0, true), 40); assert.equal(C.runXP(100000, false), 75); // capped
});

test('history series and summary', () => {
  const h = [{ d: '2026-10-10', m: 'daily', s: 50 }, { d: '2026-10-12', m: 'daily', s: 80 }, { d: '2026-10-12', m: 'daily', s: 60 }, { d: '2026-10-12', m: 'classic:normal', s: 999 }];
  assert.deepEqual(C.dailySeries(h, 'daily', '2026-10-12', 3), [{ d: '2026-10-10', s: 50 }, { d: '2026-10-11', s: null }, { d: '2026-10-12', s: 80 }]);
  assert.deepEqual(C.summary(h, 'daily'), { runs: 3, best: 80, avg: 63, last: h[2] });
  assert.equal(C.addRun(Array(500).fill({}), { x: 1 }).length, 500);
});

test('share text carries the game link with ?ref=share-<game>, and a sparkline of our own design', () => {
  const t = C.shareText({ title: 'Echo #1', pattern: '🔷🔷', stats: '100 pts', game: 'echo' });
  assert.equal(t, 'Echo #1\n🔷🔷\n100 pts\nhttps://quickwell.app/play/echo/?ref=share-echo');
  assert.equal(C.spark([0, 5, 10]), '▁▅█');
  assert.equal(C.fmtTime(65000), '1:05');
});
