// Footsure: cutoff lookup and scoring. Pure functions over the parsed cutoffs.json.

/** True while any cutoff (or any chair-stand row, or a scoring note) is still marked unverified. */
export function anyUnverified(c) {
  const entries = [c.chairStand, c.chairStand && c.chairStand.scoringNotes, c.balance, c.tug, ...((c.chairStand && c.chairStand.rows) || [])];
  return entries.some((e) => e && e.verified !== true);
}

export function normSex(sex) {
  const s = String(sex || '').toLowerCase();
  if (s === 'm' || s === 'male' || s === 'man') return 'male';
  if (s === 'f' || s === 'female' || s === 'woman') return 'female';
  return null;
}

/** The chair-stand row for an age, or null outside the table (it covers 60–94). */
export function chairStandRow(c, age) {
  const a = Math.floor(Number(age));
  if (!Number.isFinite(a)) return null;
  return c.chairStand.rows.find((r) => a >= r.ageMin && a <= r.ageMax) || null;
}

/** "Below average" number for an age and sex: a score under it is below average. Null if not in the table. */
export function chairStandCutoff(c, age, sex) {
  const row = chairStandRow(c, age);
  const k = normSex(sex);
  if (!row || !k) return null;
  return row[k];
}

/**
 * Score one check. Inputs may be null for a test that wasn't done.
 * Returns each test's value, cutoff and status ('within' | 'outside' | 'not-done' | 'no-cutoff'),
 * plus an overall band: 'steady' | 'watch' | 'doctor' | 'incomplete'.
 */
export function evaluate(c, { age, sex, stands = null, armsUsed = false, balanceStages = null, tugSeconds = null }) {
  const out = {};
  const cut = chairStandCutoff(c, age, sex);
  const score = stands == null ? null : (armsUsed ? 0 : stands);
  out.chairStand = {
    value: score, cutoff: cut,
    status: score == null ? 'not-done' : cut == null ? 'no-cutoff' : score < cut ? 'outside' : 'within',
  };
  const crit = c.balance.criticalStage;
  out.balance = {
    value: balanceStages, cutoff: crit,
    status: balanceStages == null ? 'not-done' : balanceStages >= crit ? 'within' : 'outside',
  };
  const th = c.tug.thresholdSeconds;
  out.tug = {
    value: tugSeconds, cutoff: th,
    status: tugSeconds == null ? 'not-done' : tugSeconds >= th ? 'outside' : 'within',
  };
  const list = [out.chairStand, out.balance, out.tug];
  const outside = list.filter((x) => x.status === 'outside').length;
  const scored = list.filter((x) => x.status === 'within' || x.status === 'outside').length;
  out.outsideCount = outside;
  out.band = outside >= 2 ? 'doctor' : outside === 1 ? 'watch' : scored === 0 ? 'incomplete' : 'steady';
  out.complete = scored === 3;
  return out;
}
