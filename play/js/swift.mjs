// Swift (focus and speed): a fast stream of small attention challenges. Right answers in a row build a combo
// multiplier; a slip resets it and costs 2 seconds. Pure logic: no DOM.
import { rng } from './core.mjs';

// Ink colours: Okabe–Ito colour-blind-safe set. Each answer button also shows the colour's name, and players can
// switch colour challenges off entirely (they are replaced by word-direction challenges from the same seed).
export const INKS = [
  { name: 'Blue', light: '#0072B2', dark: '#56B4E9' },
  { name: 'Orange', light: '#B86E00', dark: '#E69F00' },
  { name: 'Pink', light: '#B5468C', dark: '#E08BC0' },
  { name: 'Green', light: '#007A5A', dark: '#2BC79A' },
];
export const DIRS = ['Up', 'Right', 'Down', 'Left'];
export const ARROWS = ['↑', '→', '↓', '←'];
const ODD_PAIRS = [['b', 'd'], ['p', 'q'], ['O', 'Q'], ['E', 'F'], ['M', 'N'], ['C', 'G'], ['u', 'n'], ['5', 'S'], ['8', 'B'], ['V', 'W'], ['6', '9'], ['R', 'P']];

export const TIERS = {
  easy: { name: 'Easy', types: ['ink', 'arrow', 'more'], conflict: 0.5, odd: 3, moreGap: 3, seconds: 60 },
  normal: { name: 'Normal', types: ['ink', 'arrow', 'flank', 'odd', 'more', 'sum'], conflict: 0.75, odd: 3, moreGap: 2, seconds: 60 },
  hard: { name: 'Hard', types: ['ink', 'arrow', 'flank', 'odd', 'more', 'sum'], conflict: 0.9, odd: 4, moreGap: 1, seconds: 60 },
  expert: { name: 'Expert', types: ['ink', 'flank', 'odd', 'more', 'sum', 'odd', 'ink'], conflict: 1, odd: 5, moreGap: 1, seconds: 60 },
};
export const DAILY_SECONDS = 45;
export const PENALTY_MS = 2000;

function makeOne(r, tier, noColor) {
  const t = TIERS[tier];
  let type = r.pick(t.types);
  const conflict = r() < t.conflict;
  if (type === 'ink') {
    const word = r.int(4); let ink = word;
    if (conflict) { do ink = r.int(4); while (ink === word); }
    const order = r.shuffle([0, 1, 2, 3]);
    if (!noColor) return { type, prompt: 'Tap the INK colour', word, ink, options: order.map((i) => ({ ink: i, label: INKS[i].name })), answer: order.indexOf(ink) };
    type = 'arrow'; // same random draws are reused below, so everyone's stream stays aligned in length
  }
  if (type === 'arrow') {
    const dir = r.int(4); let word = dir;
    if (conflict) { do word = r.int(4); while (word === dir); }
    return { type: 'arrow', prompt: 'Where does the arrow point?', dir, word, options: [0, 1, 2, 3].map((i) => ({ label: ARROWS[i], aria: DIRS[i] })), answer: dir };
  }
  if (type === 'flank') {
    const center = r.int(2); const same = !conflict; const side = same ? center : 1 - center; const ch = ['←', '→'];
    return { type, prompt: 'Which way does the MIDDLE arrow point?', row: [side, side, center, side, side].map((x) => ch[x]).join(''), options: [{ label: '←', aria: 'Left' }, { label: '→', aria: 'Right' }], answer: center };
  }
  if (type === 'odd') {
    const n = t.odd; const [a, b] = r.pick(ODD_PAIRS); const flip = r() < 0.5; const base = flip ? b : a, odd = flip ? a : b; const at = r.int(n * n);
    return { type, prompt: 'Tap the odd one out', cols: n, options: Array.from({ length: n * n }, (_, i) => ({ label: i === at ? odd : base })), answer: at };
  }
  if (type === 'more') {
    const lo = r.range(3, 7); const gap = r.range(t.moreGap, t.moreGap + 2); const left = r() < 0.5;
    const L = left ? lo + gap : lo, R = left ? lo : lo + gap;
    const dots = (k) => Array.from({ length: k }, () => [r.range(8, 92), r.range(8, 92)]);
    return { type, prompt: 'Which side has MORE dots?', left: dots(L), right: dots(R), options: [{ label: 'Left' }, { label: 'Right' }], answer: left ? 0 : 1 };
  }
  // sum: is the equation true?
  const a = r.range(2, 12), b = r.range(2, 12); const truth = r() < 0.5; const shown = truth ? a + b : a + b + (r() < 0.5 ? -1 : 1) * r.range(1, 2);
  return { type: 'sum', prompt: 'True or false?', text: `${a} + ${b} = ${shown}`, options: [{ label: 'True' }, { label: 'False' }], answer: truth ? 0 : 1 };
}

// A deterministic stream of challenges. Each item uses its own sub-seed so switching colour challenges off
// never shifts the rest of the stream.
export function makeStream(seed, tier = 'normal', count = 160, noColor = false) {
  return Array.from({ length: count }, (_, i) => makeOne(rng(`swift|${tier}|${seed}|${i}`), tier, noColor));
}
export const dailyStream = (day, noColor = false) => makeStream(`daily|${day}`, 'normal', 160, noColor);

// Combo multiplier: ×2 from 5 in a row, ×3 from 10, ×4 from 20.
export const multFor = (combo) => (combo >= 20 ? 4 : combo >= 10 ? 3 : combo >= 5 ? 2 : 1);
// Score one answer. combo = right answers in a row BEFORE this one.
export function scoreAnswer(correct, ms, combo) {
  if (!correct) return { points: 0, combo: 0, mult: 1, penalty: PENALTY_MS };
  const c = combo + 1; const mult = multFor(c);
  const speed = ms < 800 ? 5 : ms < 1500 ? 2 : 0;
  return { points: (10 + speed) * mult, combo: c, mult, penalty: 0 };
}
// Replay a full run (used for tests and to double-check the final score).
export function scoreRun(answers) {
  let combo = 0, score = 0, best = 0, right = 0, wrong = 0;
  for (const a of answers) { const s = scoreAnswer(a.correct, a.ms, combo); combo = s.combo; score += s.points; best = Math.max(best, combo); a.correct ? right++ : wrong++; }
  return { score, bestCombo: best, right, wrong, accuracy: answers.length ? right / answers.length : 0 };
}
// Points earned in each slice of the run (for the share-card sparkline). answers carry t = ms since start.
export function buckets(answers, totalMs, n) {
  const out = Array(n).fill(0); let combo = 0;
  for (const a of answers) { const s = scoreAnswer(a.correct, a.ms, combo); combo = s.combo; out[Math.min(n - 1, Math.floor((a.t / totalMs) * n))] += s.points; }
  return out;
}
