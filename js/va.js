// Vercel Web Analytics queue stub (cookie-free page-visit counts and privacy-safe tool events).
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

// Record only the tool, action and a validated static referral tag. Never pass user-entered content.
window.qwTrack = function (tool, event) {
  var allowedTools = ['shield', 'saver', 'bill-radar', 'fair-price', 'dinner'];
  var allowedEvents = ['open', 'check'];
  if (!allowedTools.includes(tool) || !allowedEvents.includes(event)) return;
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
