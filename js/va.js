// Vercel Web Analytics queue stub (cookie-free page visits and privacy-safe tool events).
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

// Record only the tool, action and a validated static referral tag. Never pass user-entered content.
var qwLastEvent = Object.create(null);
window.qwTrack = function (tool, event) {
  var allowedTools = ['dinner', 'copycat', 'kitchen', 'fair-price', 'proof', 'keep-the-receipt', 'double-dose', 'before-you-sign', 'roadside-sos', 'bill-radar', 'vigless', 'tradepath', 'fuelgauge', 'lotwise', 'rate-con-checker', 'haul-audit', 'royalty-check', 'audit-kit', 'plot-file-checker', 'permit-watch', 'vendor-check', 'spare-key', 'brain-pass', 'footsure', 'plus', 'commodities', 'saver', 'pilot', 'shield', 'utility-pipeline'];
  var allowedEvents = ['open', 'check'];
  if (!allowedTools.includes(tool) || !allowedEvents.includes(event)) return;
  var key = tool + ':' + event;
  var now = Date.now();
  // An open is a page-load signal: emit it once per page, even if the first-party
  // /api/event request arrives later. Checks retain a short duplicate-click guard.
  if (event === 'open' && qwLastEvent[key]) return;
  if (qwLastEvent[key] && now - qwLastEvent[key] < 250) return;
  qwLastEvent[key] = now;
  var source = 'direct';
  try {
    var ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && /^[a-z0-9-]{1,60}$/i.test(ref)) source = ref;
    else if (ref) source = 'other';
  } catch (e) {}
  try {
    window.va('event', { name: 'tool_' + event, data: { tool: tool, source: source } });
  } catch (e) {}
};

// Record one privacy-safe page-open event for every catalog tool.
// The first-party counter request may also call qwTrack for the original consumer tools;
// the per-page guard above prevents those paths from being counted twice.
(function trackCatalogToolOpen() {
  var path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  var pageTools = {
    '/dinner': 'dinner',
    '/copycat': 'copycat',
    '/kitchen': 'kitchen',
    '/fair-price': 'fair-price',
    '/proof': 'proof',
    '/keep-the-receipt': 'keep-the-receipt',
    '/double-dose': 'double-dose',
    '/before-you-sign': 'before-you-sign',
    '/roadside-sos': 'roadside-sos',
    '/bill-radar': 'bill-radar',
    '/vigless': 'vigless',
    '/tradepath': 'tradepath',
    '/fuelgauge': 'fuelgauge',
    '/lotwise': 'lotwise',
    '/rate-con-checker': 'rate-con-checker',
    '/haul-audit': 'haul-audit',
    '/royalty-check': 'royalty-check',
    '/audit-kit': 'audit-kit',
    '/plot-file-checker': 'plot-file-checker',
    '/permit-watch': 'permit-watch',
    '/vendor-check': 'vendor-check',
    '/spare-key': 'spare-key',
    '/brain-pass': 'brain-pass',
    '/footsure': 'footsure',
    '/plus': 'plus',
    '/commodities': 'commodities',
    '/saver': 'saver',
    '/pilot': 'pilot',
    '/shield': 'shield',
    '/utility-pipeline': 'utility-pipeline'
  };
  var tool = pageTools[path];
  if (tool) window.qwTrack(tool, 'open');
})();

// Pre-launch tier-interest telemetry. Only fixed tool/event labels are emitted;
// no invoice, meter, volume, weight-ticket, contact, or other visitor-entered data is read.
var qwInterestTools = ['port-watcher', 'hydro-flow', 'scale-audit'];
var qwInterestEvents = ['click_operator', 'click_manager'];
window.qwTrackInterest = function (tool, event) {
  if (!qwInterestTools.includes(tool) || !qwInterestEvents.includes(event)) return;
  var key = 'interest:' + tool + ':' + event;
  var now = Date.now();
  if (qwLastEvent[key] && now - qwLastEvent[key] < 250) return;
  qwLastEvent[key] = now;
  try {
    window.va('event', {
      name: tool + '.interest',
      data: { tool: tool, event: event }
    });
  } catch (e) {}
};

document.addEventListener('click', function (event) {
  var target = event.target && event.target.closest
    ? event.target.closest('[data-qw-interest]')
    : null;
  if (!target) return;
  window.qwTrackInterest(
    target.getAttribute('data-qw-tool'),
    target.getAttribute('data-qw-event')
  );
});

// Observe first-party event responses without changing their payload or behavior.
// Diagnostics contain only allowlisted tool/action names and HTTP status; never body, URL,
// referrer, IP, entered text, or any other visitor-provided content.
var qwOriginalFetch = window.fetch;
window.fetch = function (input, init) {
  var url = '';
  var payload = null;
  try {
    url = typeof input === 'string' ? input : input && input.url;
    if (url && new URL(url, window.location.href).pathname === '/api/event' &&
        (!init || !init.method || String(init.method).toUpperCase() === 'POST') &&
        init && typeof init.body === 'string') {
      var parsed = JSON.parse(init.body);
      var tools = ['shield', 'saver', 'bill-radar', 'fair-price', 'dinner'];
      if (tools.includes(parsed.tool) && ['open', 'check'].includes(parsed.event)) {
        payload = { tool: parsed.tool, event: parsed.event };
        window.qwTrack(payload.tool, payload.event);
      }
    }
  } catch (e) {}

  var request = qwOriginalFetch.apply(this, arguments);
  if (!payload || !request || typeof request.then !== 'function') return request;
  return request.then(function (response) {
    if (!response || !response.ok) {
      try {
        console.warn('[Quickwell event tracking] request failed', {
          tool: payload.tool, event: payload.event,
          status: response ? response.status : 'no-response'
        });
      } catch (e) {}
    } else {
      // A 2xx with stored:false means the endpoint accepted the event but had no counter store.
      try {
        var clone = response.clone();
        clone.json().then(function (result) {
          if (result && result.stored === false) {
            console.warn('[Quickwell event tracking] accepted but not persisted', {
              tool: payload.tool, event: payload.event, status: response.status
            });
          }
        }).catch(function () {});
      } catch (e) {}
    }
    return response;
  }).catch(function (error) {
    try {
      console.warn('[Quickwell event tracking] network failure', {
        tool: payload.tool, event: payload.event
      });
    } catch (e) {}
    throw error;
  });
};
