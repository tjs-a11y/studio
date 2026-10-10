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
  const set = (s) => { state = s; onChange(state); };
  async function check() {
    const url = new URL(location.href);
    const sid = url.searchParams.get('session_id');
    if (sid) {
      const r = await fetch(`/api/access?tool=${encodeURIComponent(tool)}&session_id=${encodeURIComponent(sid)}`).then((x) => x.json()).catch(() => null);
      url.searchParams.delete('session_id'); history.replaceState(null, '', url.pathname + url.search + url.hash);
      if (r && r.pro) { store.set(tool, { token: r.token, at: Date.now(), plan: r.plan }); return set({ pro: true, plan: r.plan, welcome: true }); }
    }
    const saved = store.get(tool);
    if (!saved) return set({ pro: false, plan: null });
    if (Date.now() - saved.at < 6 * 3600e3) set({ pro: true, plan: saved.plan }); // fast path; re-verified below
    const r = await fetch(`/api/access?tool=${encodeURIComponent(tool)}&token=${encodeURIComponent(saved.token)}`).then((x) => x.json()).catch(() => null);
    if (!r) return; // offline: keep the last known state
    if (r.pro) { store.set(tool, { token: r.token, at: Date.now(), plan: r.plan }); set({ pro: true, plan: r.plan }); }
    else { store.clear(tool); set({ pro: false, plan: null }); }
  }
  async function post(path, body) {
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) throw new Error(j.error || 'Something went wrong. Please try again.');
    location.href = j.url;
  }
  window.Studio = {
    init(opts) { tool = opts.tool; onChange = opts.onChange || onChange; return check(); },
    upgrade(plan, interval) { return post('/api/checkout', { tool, plan, interval }); },
    manage() { const s = store.get(tool); return post('/api/portal', { tool, token: s && s.token }); },
    get state() { return state; },
  };
})();
