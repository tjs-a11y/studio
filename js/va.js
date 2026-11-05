// Vercel Web Analytics queue stub (cookie-free page visits and privacy-safe tool events).
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

// Record only the tool, action and a validated static referral tag. Never pass user-entered content.
var qwLastEvent = Object.create(null);
window.qwTrack = function (tool, event) {
  var allowedTools = ['shield', 'saver', 'bill-radar', 'fair-price', 'dinner'];
  var allowedEvents = ['open', 'check'];
  if (!allowedTools.includes(tool) || !allowedEvents.includes(event)) return;
  var key = tool + ':' + event;
  var now = Date.now();
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

// Mirror the existing first-party /api/event actions into Web Analytics.
// The request is passed through unchanged; only allowlisted tool/action fields are read.
var qwOriginalFetch = window.fetch;
window.fetch = function (input, init) {
  try {
    var url = typeof input === 'string' ? input : input && input.url;
    var body = init && init.body;
    if (url && new URL(url, window.location.href).pathname === '/api/event' && typeof body === 'string') {
      var payload = JSON.parse(body);
      window.qwTrack(payload.tool, payload.event);
    }
  } catch (e) {}
  return qwOriginalFetch.apply(this, arguments);
};
