// Anonymous fixed-label tier-interest counters for the three pre-launch discovery pages.
(() => {
  const tool = document.body?.dataset.prelaunchTool;
  const allowed = new Set(['port-watcher', 'hydro-flow', 'scale-audit']);
  if (!allowed.has(tool)) return;
  document.querySelectorAll('[data-tier]').forEach((link) => {
    link.addEventListener('click', () => {
      const tier = link.dataset.tier;
      const event = tier === 'operator' ? 'click_operator' : tier === 'manager' ? 'click_manager' : null;
      if (!event) return;
      try {
        fetch('/api/event', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tool, event }),
          keepalive: true,
        }).catch(() => {});
      } catch {}
    });
  });
})();
