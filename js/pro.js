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
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) { const m = j.error || 'Something went wrong. Please try again.'; try { alert(m); } catch (e) {} throw new Error(m); }
    location.href = j.url;
  }
  window.Studio = {
    init(opts) { tool = opts.tool; onChange = opts.onChange || onChange; return check(); },
    upgrade(plan, interval) { return post('/api/checkout', { tool, plan, interval, ref: ref() }); },
    manage() {
      const own = store.get(tool); const plus = !own && store.get('plus');
      return post('/api/portal', own ? { tool, token: own.token } : { tool: 'plus', token: plus && plus.token });
    },
    get state() { return state; },
  };
})();
