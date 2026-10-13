// Quickwell Play hub: today's three challenges, overall streak, Brain Pass box, install button.
import * as C from './core.mjs';
import * as U from './ui.mjs';

const $ = U.$;
const GAMES = [['echo', 'Echo'], ['swift', 'Swift'], ['linkr', 'Linkr']];
const doneToday = (id, g, d) => (id === 'linkr' ? !!(g.daily[d] && g.daily[d].normal) : !!g.daily[d]);

function render() {
  const d = U.today(); let done = 0, level = 0;
  for (const [id, name] of GAMES) {
    const g = U.loadGame(id); const ok = doneToday(id, g, d); if (ok) done++;
    level += C.levelFor(g.xp);
    const res = g.daily[d]; const score = id === 'linkr' ? res && res.normal && res.normal.score : res && res.score;
    const streak = U.liveGameStreak(g);
    $(`.acts[data-game="${id}"]`).innerHTML = ok
      ? `<span class="done">✓ Today: ${C.fmtInt(score || 0)} pts</span><a class="btn ghost" href="/play/${id}/" style="background:transparent;color:var(--g)">Practice</a>${streak > 1 ? `<span class="small muted">🔥 ${streak}</span>` : ''}`
      : `<a class="btn" href="/play/${id}/?play=daily">Play today's ${name}</a>${streak ? `<span class="small muted">🔥 ${streak}</span>` : ''}`;
  }
  $('#h-streak').textContent = U.liveAllStreak();
  $('#h-today').textContent = `${done}/3`;
  $('#h-level').textContent = level;
  $('#next-line').textContent = done === 3 ? `All three done. New challenges in ${U.nextIn()}.` : `Challenge #${C.challengeNumber(d)} · resets at midnight your time.`;
}
U.boot({});
U.onPass((p) => { $('#pass-off').hidden = p.on; $('#pass-on').hidden = !p.on; });
$('#see-pass').onclick = () => U.passSheet();
// "Put today's puzzle on your site": copy the iframe code for the Linkr widget.
$('#copy-embed').onclick = () => U.copyText($('#embed-code').textContent);
$('#manage-pass').onclick = () => U.manageSheet();
// Install: Chrome/Android fire beforeinstallprompt; we show our own button only then (never nag).
let deferred = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('#install-card').hidden = false; });
$('#install').onclick = async () => { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch (e) { /* ignore */ } deferred = null; $('#install-card').hidden = true; };
addEventListener('pageshow', render);
render();
