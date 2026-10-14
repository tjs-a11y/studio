// Quickwell Shield Family helpers: code word, alert text, and the on-device history. Pure where possible.
// Storage: 'shield:v1' = { history: [{ at, level, ids }] }, 'shield:word' (only if the user ticks "remember").
// The message itself is never stored.
export const KEY = 'shield:v1';
export const WORD_KEY = 'shield:word';
export const MAX_HISTORY = 200;
export const ALERT_KINDS = ['toll', 'delivery', 'family', 'bank', 'code', 'job', 'invest', 'tech', 'gov', 'prize'];

const sget = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const sset = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
const sdel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } };

// Two random words from the list ("lantern-meadow"), using the browser's secure random numbers when present.
export function suggestWord(words, rand = secureRandom) {
  const a = words[Math.floor(rand() * words.length)];
  let b = a;
  for (let i = 0; i < 10 && b === a; i++) b = words[Math.floor(rand() * words.length)];
  return `${a} ${b}`;
}
function secureRandom() {
  try { const u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] / 2 ** 32; } catch (e) { return Math.random(); }
}
export const cleanWord = (w) => String(w || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);

export const scriptText = (t) => [t('scriptTitle'), '1. ' + t('script1'), '2. ' + t('script2'), '3. ' + t('script3')].join('\n');

// Share text for a scam pattern: generic wording only. Never includes the user's message, names or numbers.
export function alertText(t, kind) {
  const [title, body] = t('al.' + kind);
  return `${t('alertHead')}: ${title}. ${body}\n— ${t('alertFoot')}`;
}

export function load() {
  try { const j = JSON.parse(sget(KEY) || 'null'); if (j && Array.isArray(j.history)) return { history: j.history.filter(validEntry).slice(-MAX_HISTORY) }; } catch (e) { /* bad data */ }
  return { history: [] };
}
const LEVELS = ['scam', 'suspicious', 'none'];
const validEntry = (e) => e && typeof e.at === 'string' && LEVELS.includes(e.level) && Array.isArray(e.ids);
export function entryFrom(result, at = new Date().toISOString()) {
  // only the date, the level and which rules fired: no text, links or numbers from the message
  return { at, level: result.level, ids: result.findings.map((f) => f.id).filter((id) => /^[a-z0-9-]+$/.test(id)).slice(0, 30) };
}
export function save(state) { return sset(KEY, JSON.stringify({ history: state.history.slice(-MAX_HISTORY) })); }
export function addEntry(state, result, at) { state.history.push(entryFrom(result, at)); state.history = state.history.slice(-MAX_HISTORY); save(state); return state; }
export function clearAll() { sdel(KEY); sdel(WORD_KEY); sdel('shield:lang'); }
export const loadWord = () => cleanWord(sget(WORD_KEY) || '');
export const saveWord = (w) => (w ? sset(WORD_KEY, cleanWord(w)) : (sdel(WORD_KEY), true));
