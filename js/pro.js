// Studio Pro: drop-in client for any tool page. No keys here; the browser only talks to our own /api.
//   Studio.init({ tool: 'my-tool', onChange: (state) => {...} })   state = { pro, plan }
//   Studio.upgrade('pro', 'month' | 'year')   -> Stripe checkout
//   Studio.manage()                           -> Stripe self-serve page (cancel, change card)
(function () {
  const KEY = (t) => `studio-pro:${t}`;
  const store = {
    get(t) { try { return JSON.parse(localStorage.getItem(KEY(t)) || 'null'); } catch (e) { return null; } },
    set(t, v) { try { localStorage.setItem(KEY(t), JSON.stringify(v)); } catch (e) { /* private mode: Pro lasts this visit */ } },
    clear(t) { try { localStorage.removeItem(KEY(t)); } catch (e) { /* ignore */ } },
  };
  let tool = null, onChange = () => {}, state = { pro: false, plan: null };
  // Visible banner so nothing fails silently (in-app browsers suppress alert() AND scripted redirects).
  function banner(msg, opts) {
    opts = opts || {};
    try {
      var b = document.getElementById('studio-pro-banner');
      if (!b) {
        b = document.createElement('div'); b.id = 'studio-pro-banner';
        b.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:2147483647;padding:13px 40px 13px 16px;font:600 14px system-ui,-apple-system,sans-serif;color:#fff;text-align:center;box-shadow:0 2px 14px rgba(0,0,0,.35)';
        (document.body || document.documentElement).appendChild(b);
      }
      b.style.background = opts.error ? '#b4231d' : '#1457d6';
      b.textContent = msg + ' ';
      if (opts.href) { var a = document.createElement('a'); a.href = opts.href; a.textContent = opts.label || 'Continue →'; a.style.cssText = 'color:#fff;text-decoration:underline;font-weight:800'; b.appendChild(a); }
      var x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', 'Dismiss');
      x.style.cssText = 'position:absolute;right:10px;top:9px;background:transparent;border:0;color:#fff;font-size:16px;line-height:1;cursor:pointer'; x.onclick = function () { b.remove(); };
      b.appendChild(x);
    } catch (e) { try { alert(msg); } catch (e2) {} }
  }
  try { window.addEventListener('error', function (e) { banner('This page hit an error: ' + ((e && e.message) || 'script error') + '. Tell support.', { error: true }); }); } catch (e) {}
  // Pre-launch B2B tier clicks: only the tool and tier event are sent; never read form fields or business records.
  const PRELAUNCH_TIER_TOOLS = new Set(['port-watcher', 'hydro-flow', 'scale-audit']);
  function trackTierClick(event) {
    try {
      const link = event.target && event.target.closest ? event.target.closest('[data-tier-click]') : null;
      if (!link) return;
      const tierTool = link.getAttribute('data-tool') || '';
      const tier = link.getAttribute('data-tier') || '';
      if (!PRELAUNCH_TIER_TOOLS.has(tierTool) || (tier !== 'operator' && tier !== 'manager')) return;
      fetch('/api/event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tool: tierTool, event: 'click_' + tier }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) { /* analytics must never interrupt navigation */ }
  }
  try { document.addEventListener('click', trackTierClick, true); } catch (e) {}
  // Where did this visitor come from? Links we share carry ?ref=<channel>; it rides along to checkout so
  // we learn which channels bring buyers. A short label only: no cookies, no tracking across sites.
  const REF = 'studio-ref';
  try {
    const r = new URL(location.href).searchParams.get('ref');
    if (r && /^[a-z0-9_-]{1,40}$/i.test(r)) sessionStorage.setItem(REF, r.toLowerCase());
  } catch (e) { /* storage blocked: no attribution */ }
  const ref = () => { try { return sessionStorage.getItem(REF) || ''; } catch (e) { return ''; } };
  const set = (s) => { state = s; onChange(state); };
  async function check() {
    const url = new URL(location.href);
    const sid = url.searchParams.get('session_id');
    if (sid) {
      const r = await fetch(`/api/access?tool=${encodeURIComponent(tool)}&session_id=${encodeURIComponent(sid)}`).then((x) => x.json()).catch(() => null);
      url.searchParams.delete('session_id'); history.replaceState(null, '', url.pathname + url.search + url.hash);
      if (r && r.pro) { store.set(tool, { token: r.token, at: Date.now(), plan: r.plan }); return set({ pro: true, plan: r.plan, welcome: true }); }
    }
    const own = store.get(tool);
    // No purchase for this tool? A Quickwell Plus pass on this device may cover it (the server decides).
    const plus = !own && tool !== 'plus' ? store.get('plus') : null;
    const saved = own || plus;
    const key = own ? tool : 'plus';
    if (!saved) return set({ pro: false, plan: null });
    if (Date.now() - saved.at < 6 * 3600e3) set({ pro: true, plan: saved.plan }); // fast path; re-verified below
    const r = await fetch(`/api/access?tool=${encodeURIComponent(tool)}&token=${encodeURIComponent(saved.token)}`).then((x) => x.json()).catch(() => null);
    if (!r) return; // offline: keep the last known state
    if (r.pro) { store.set(key, { token: r.token, at: Date.now(), plan: r.plan }); set({ pro: true, plan: r.plan }); }
    else { if (!(key === 'plus' && r.reason === 'no_access')) store.clear(key); set({ pro: false, plan: null }); }
  }
  async function post(path, body) {
    let r;
    try { r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
    catch (e) { banner('Could not reach the server — check your connection and try again.', { error: true }); throw e; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) { const m = j.error || 'Something went wrong. Please try again.'; banner(m, { error: true }); throw new Error(m); }
    // Always give a real, tappable link first — some in-app browsers block scripted redirects — then try to go.
    banner('Opening secure checkout…', { href: j.url, label: 'Continue to checkout →' });
    try { window.location.assign(j.url); } catch (e) { try { window.location.href = j.url; } catch (e2) {} }
  }
  function showUpgradeModal(config) {
    config = config || {};
    // Render copy as text, not HTML, so caller-supplied content cannot inject markup.
    const old = document.getElementById('studio-pro-upgrade-modal');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'studio-pro-upgrade-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'studio-pro-upgrade-title');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(10,14,22,.72);display:flex;align-items:center;justify-content:center;padding:18px;font:16px/1.5 system-ui,-apple-system,sans-serif;color:#171a20';
    const panel = document.createElement('section');
    panel.style.cssText = 'position:relative;width:min(100%,520px);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;padding:26px;box-shadow:0 18px 70px rgba(0,0,0,.32)';
    const close = document.createElement('button');
    close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'Close upgrade dialog');
    close.style.cssText = 'position:absolute;right:14px;top:10px;border:0;background:transparent;font-size:28px;line-height:1;cursor:pointer;color:#4b5563';
    close.onclick = () => overlay.remove();
    const title = document.createElement('h2');
    title.id = 'studio-pro-upgrade-title'; title.textContent = config.header || 'Upgrade to Pro';
    title.style.cssText = 'font-size:1.45rem;line-height:1.2;margin:0 32px 12px 0;color:#111827';
    const body = document.createElement('p');
    body.textContent = config.body || '';
    body.style.cssText = 'margin:0 0 20px;color:#374151';
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;align-items:center';
    const upgrade = document.createElement('button');
    upgrade.type = 'button'; upgrade.textContent = 'Upgrade — $15/month';
    upgrade.style.cssText = 'border:0;border-radius:8px;background:#2457d6;color:#fff;font-weight:700;padding:11px 16px;cursor:pointer';
    upgrade.onclick = () => {
      upgrade.disabled = true; upgrade.textContent = 'Opening secure checkout…';
      Promise.resolve(window.Studio.upgrade('pro', 'month')).catch(() => {
        upgrade.disabled = false; upgrade.textContent = 'Upgrade — $15/month';
      });
    };
    const later = document.createElement('button');
    later.type = 'button'; later.textContent = 'Not now';
    later.style.cssText = 'border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#374151;padding:10px 14px;cursor:pointer';
    later.onclick = () => overlay.remove();
    actions.append(upgrade, later);
    panel.append(close, title, body, actions);
    overlay.appendChild(panel);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.remove(); });
    document.addEventListener('keydown', function onKey(event) {
      if (event.key === 'Escape' && document.getElementById('studio-pro-upgrade-modal') === overlay) {
        overlay.remove(); document.removeEventListener('keydown', onKey);
      }
    });
    (document.body || document.documentElement).appendChild(overlay);
    close.focus();
  }
  window.Studio = {
    init(opts) { tool = opts.tool; onChange = opts.onChange || onChange; return check(); },
    showUpgradeModal(config) { showUpgradeModal(config); },
    upgrade(plan, interval) {
      // Anonymous purchase-intent ping (survives the redirect); never blocks checkout.
      try { fetch('/api/event', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tool: tool, event: 'upgrade', plan: plan }), keepalive: true }).catch(function () {}); } catch (e) {}
      return post('/api/checkout', { tool, plan, interval, ref: ref() });
    },
    manage() {
      const own = store.get(tool); const plus = !own && store.get('plus');
      return post('/api/portal', own ? { tool, token: own.token } : { tool: 'plus', token: plus && plus.token });
    },
    get state() { return state; },
  };
})();
