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
var qwMonadEndpoint = 'https://dejplqevodwfeaemrska.supabase.co/functions/v1/monad-track';
var qwMonadPublishableKey = 'sb_publishable_OAboSsVE0ln5yeHTZyhRjQ_KV1bphLG';
var qwMonadHost = String(window.location && window.location.hostname || '').toLowerCase();
var qwMonadPath = String(window.location && window.location.pathname || '/');
var qwMonadEnabled = (qwMonadHost === 'quickwell.app' || qwMonadHost === 'www.quickwell.app') &&
  !/^\/(?:play\/embed|footsure|pilot|utility-pipeline)(?:\/|$)/.test(qwMonadPath);

function qwMonadEntity(path) {
  var p = String(path || qwMonadPath || '/').replace(/\/+$/, '') || '/';
  var map = {
    '/shield': 'shield',
    '/saver': 'saver',
    '/bill-radar': 'bill-radar',
    '/fair-price': 'fair-price',
    '/dinner': 'dinner'
  };
  return map[p] || 'quickwell';
}
function qwSafeEntity(value) {
  var s = String(value || '').toLowerCase();
  return /^[a-z0-9][a-z0-9-]{1,100}$/.test(s) ? s : null;
}
function qwCampaignTag(value, max) {
  if (typeof value !== 'string') return null;
  var s = value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return s && s.length <= max ? s : null;
}
function qwReferrerHost() {
  try {
    var host = new URL(document.referrer).hostname.toLowerCase();
    return host && host !== qwMonadHost ? host : null;
  } catch (e) { return null; }
}
function qwMonadAttribution() {
  var params = new URLSearchParams(window.location.search || '');
  var ref = qwCampaignTag(params.get('ref'), 60);
  var source = qwCampaignTag(params.get('utm_source'), 80);
  var medium = qwCampaignTag(params.get('utm_medium'), 80);
  var campaign = qwCampaignTag(params.get('utm_campaign'), 120);
  var content = qwCampaignTag(params.get('utm_content'), 120);
  var term = qwCampaignTag(params.get('utm_term'), 120);
  if (!source && ref) {
    if (ref.indexOf('home-featured-') === 0) {
      source = 'quickwell';
      medium = medium || 'owned';
      campaign = campaign || 'homepage';
      content = content || ref;
    } else {
      source = ref;
      medium = medium || 'referral';
      content = content || ref;
    }
  }
  var referrerHost = qwReferrerHost();
  if (!source && referrerHost) {
    source = qwCampaignTag(referrerHost, 80);
    medium = medium || 'referral';
  }
  return {
    source: source || 'direct',
    medium: medium || 'none',
    campaign: campaign,
    content: content,
    term: term,
    referrer_host: referrerHost
  };
}
function qwMonadIdempotencyKey() {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  } catch (e) {}
  return 'qw_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
}
function qwMonadSend(eventType, extra) {
  if (!qwMonadEnabled || !['page_view', 'lead', 'outbound_click', 'checkout_start'].includes(eventType)) return;
  extra = extra || {};
  var attribution = qwMonadAttribution();
  var payload = {
    event_type: eventType,
    entity_slug: qwSafeEntity(extra.entity_slug) || qwMonadEntity(),
    landing_path: qwMonadPath,
    idempotency_key: qwMonadIdempotencyKey(),
    source: attribution.source,
    medium: attribution.medium
  };
  if (attribution.campaign) payload.campaign = attribution.campaign;
  if (attribution.content) payload.content = attribution.content;
  if (attribution.term) payload.term = attribution.term;
  if (attribution.referrer_host) payload.referrer_host = attribution.referrer_host;
  if (extra.content) payload.content = qwCampaignTag(extra.content, 120) || payload.content;
  if (extra.destination_host && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(extra.destination_host)) {
    payload.destination_host = extra.destination_host.toLowerCase();
  }
  try {
    var request = qwOriginalFetch(qwMonadEndpoint, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      keepalive: true,
      headers: { apikey: qwMonadPublishableKey, 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (request && typeof request.catch === 'function') request.catch(function () {});
  } catch (e) {}
}
function qwMonadDestinationHost(href) {
  try {
    var url = new URL(href, window.location.href);
    if (!['http:', 'https:'].includes(url.protocol) || url.hostname.toLowerCase() === qwMonadHost) return null;
    return url.hostname.toLowerCase();
  } catch (e) { return null; }
}

window.fetch = function (input, init) {
  var url = '';
  var payload = null;
  var leadTool = null;
  var checkoutTool = null;
  var checkoutRef = null;
  try {
    url = typeof input === 'string' ? input : input && input.url;
    var parsedUrl = url ? new URL(url, window.location.href) : null;
    var method = (init && init.method) || (input && input.method) || 'GET';
    method = String(method).toUpperCase();
    if (parsedUrl && parsedUrl.pathname === '/api/event' && method === 'POST' &&
        init && typeof init.body === 'string') {
      var parsed = JSON.parse(init.body);
      var tools = ['shield', 'saver', 'bill-radar', 'fair-price', 'dinner'];
      if (tools.includes(parsed.tool) && ['open', 'check'].includes(parsed.event)) {
        payload = { tool: parsed.tool, event: parsed.event };
        window.qwTrack(payload.tool, payload.event);
      } else if (parsed.event === 'waitlist' && qwSafeEntity(parsed.tool)) {
        // Only the fixed tool label is retained; the email and every other field are ignored.
        leadTool = parsed.tool;
      }
    }
    if (parsedUrl && parsedUrl.pathname === '/api/checkout' && method === 'POST') {
      checkoutTool = qwSafeEntity(qwMonadEntity()) || 'quickwell';
      if (init && typeof init.body === 'string') {
        var checkoutBody = JSON.parse(init.body);
        checkoutTool = qwSafeEntity(checkoutBody.tool) || checkoutTool;
        checkoutRef = qwCampaignTag(checkoutBody.ref, 40);
      }
    }
  } catch (e) {}

  var request = qwOriginalFetch.apply(this, arguments);
  if ((!payload && !leadTool && !checkoutTool) || !request || typeof request.then !== 'function') return request;
  return request.then(function (response) {
    if (response && response.ok) {
      if (leadTool) qwMonadSend('lead', { entity_slug: leadTool });
      if (checkoutTool) qwMonadSend('checkout_start', { entity_slug: checkoutTool, content: checkoutRef });
    }
    if (!payload || !response || !response.ok) {
      if (payload && (!response || !response.ok)) {
        try {
          console.warn('[Quickwell event tracking] request failed', {
            tool: payload.tool, event: payload.event,
            status: response ? response.status : 'no-response'
          });
        } catch (e) {}
      }
      return response;
    }
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
    return response;
  }).catch(function (error) {
    if (payload) {
      try {
        console.warn('[Quickwell event tracking] network failure', {
          tool: payload.tool, event: payload.event
        });
      } catch (e) {}
    }
    throw error;
  });
};

if (qwMonadEnabled) {
  // Page paths and campaign labels only; no query string, visitor ID, or user-entered content.
  qwMonadSend('page_view');
  try {
    window.addEventListener('click', function (event) {
      var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
      if (!anchor) return;
      var host = qwMonadDestinationHost(anchor.href || (anchor.getAttribute && anchor.getAttribute('href')));
      if (host) qwMonadSend('outbound_click', { destination_host: host });
    });
  } catch (e) {}
}
