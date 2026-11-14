import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ENDPOINT = 'https://dejplqevodwfeaemrska.supabase.co/functions/v1/monad-track';
const source = readFileSync(new URL('../js/va.js', import.meta.url), 'utf8');

function harness({ path = '/', search = '', referrer = '', hostname = 'quickwell.app' } = {}) {
  const calls = [];
  const documentListeners = {};
  const windowListeners = {};
  const analyticsEvents = [];
  const response = {
    ok: true,
    status: 202,
    clone: () => ({ json: async () => ({ ok: true, stored: true }) })
  };
  const document = {
    referrer,
    addEventListener(type, handler) {
      (documentListeners[type] ||= []).push(handler);
    }
  };
  const window = {
    location: {
      hostname,
      origin: 'https://' + hostname,
      pathname: path,
      search,
      href: 'https://' + hostname + path + search
    },
    crypto: { randomUUID: () => '11111111-1111-4111-8111-111111111111' },
    addEventListener(type, handler) {
      (windowListeners[type] ||= []).push(handler);
    },
    fetch: async (url, init = {}) => {
      calls.push({ url, init });
      return response;
    },
    va: (...args) => analyticsEvents.push(args)
  };
  vm.runInNewContext(source, {
    window, document, URL, URLSearchParams, Date, Math,
    console: { warn: () => {} }
  });
  return { window, document, calls, documentListeners, windowListeners, analyticsEvents };
}
const central = (calls) => calls
  .filter((call) => String(call.url) === ENDPOINT)
  .map((call) => JSON.parse(call.init.body));

test('page_view sends path-only campaign attribution and never forwards unrelated query or referrer data', () => {
  const h = harness({
    path: '/saver/',
    search: '?ref=home-featured-saver&utm_term=private-search&session_id=cs_private_123',
    referrer: 'https://www.google.com/search?q=private-search'
  });
  const [event] = central(h.calls);
  assert.equal(event.event_type, 'page_view');
  assert.equal(event.entity_slug, 'saver');
  assert.equal(event.landing_path, '/saver/');
  assert.equal(event.source, 'quickwell');
  assert.equal(event.medium, 'owned');
  assert.equal(event.campaign, 'homepage');
  assert.equal(event.content, 'home-featured-saver');
  assert.equal(event.referrer_host, 'www.google.com');
  assert.match(event.idempotency_key, /^[a-zA-Z0-9_-]{12,100}$/);
  assert.equal('session_id' in event, false);
  assert.equal('term' in event, false);
  assert.equal('destination_host' in event, false);
  assert.doesNotMatch(JSON.stringify(event), /cs_private_123|private-search/);
});

test('homepage page_view uses the exact root path', () => {
  const h = harness({ path: '/' });
  const [event] = central(h.calls);
  assert.equal(event.event_type, 'page_view');
  assert.equal(event.entity_slug, 'quickwell');
  assert.equal(event.landing_path, '/');
});

test('outbound_click stores only the external destination host', () => {
  const h = harness({ path: '/dinner/' });
  const anchor = {
    href: 'https://northstardeliveryservice.com/quote?email=private@example.com',
    getAttribute: () => '/quote'
  };
  const event = {
    target: {
      closest: (selector) => selector === 'a[href]' ? anchor : null
    }
  };
  for (const handler of h.windowListeners.click || []) handler(event);
  const record = central(h.calls).find((item) => item.event_type === 'outbound_click');
  assert.equal(record.entity_slug, 'dinner');
  assert.equal(record.destination_host, 'northstardeliveryservice.com');
  assert.equal('destination_url' in record, false);
  assert.doesNotMatch(JSON.stringify(record), /private@example.com|\/quote/);
});

test('checkout_start fires only after a successful checkout-session response and omits plan details', async () => {
  const h = harness({ path: '/saver/', search: '?ref=home-featured-saver' });
  await h.window.fetch('/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tool: 'saver', plan: 'pro', interval: 'month', ref: 'home-featured-saver' })
  });
  const record = central(h.calls).find((item) => item.event_type === 'checkout_start');
  assert.equal(record.entity_slug, 'saver');
  assert.equal(record.content, 'home-featured-saver');
  assert.equal('plan' in record, false);
  assert.equal('interval' in record, false);
});

test('lead fires after a successful waitlist response and excludes the submitted email', async () => {
  const h = harness({ path: '/plot-file-checker/' });
  await h.window.fetch('/api/event', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tool: 'plot-file-checker', event: 'waitlist', email: 'private@example.com' })
  });
  const record = central(h.calls).find((item) => item.event_type === 'lead');
  assert.equal(record.entity_slug, 'plot-file-checker');
  assert.equal(record.landing_path, '/plot-file-checker/');
  assert.doesNotMatch(JSON.stringify(record), /private@example.com|email/);
});

test('preview domains and excluded routes do not send central events', () => {
  const preview = harness({ path: '/', hostname: 'studio-preview.vercel.app' });
  const footsure = harness({ path: '/footsure/', hostname: 'quickwell.app' });
  assert.equal(central(preview.calls).length, 0);
  assert.equal(central(footsure.calls).length, 0);
});

test('Shield stays excluded from Vercel Web Analytics while its page path can be recorded centrally', () => {
  const h = harness({ path: '/shield/' });
  assert.equal(h.analyticsEvents.length, 0);
  assert.equal(central(h.calls)[0].event_type, 'page_view');
});

test('the CSP permits only the configured Supabase project and privacy copy describes the event fields', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const csp = config.headers[0].headers.find((header) => header.key === 'Content-Security-Policy').value;
  assert.match(csp, /connect-src[^;]*https:\/\/dejplqevodwfeaemrska\.supabase\.co/);
  for (const page of ['shield/index.html', 'saver/index.html']) {
    const html = readFileSync(new URL('../' + page, import.meta.url), 'utf8');
    const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
    assert.ok(meta, page + ' has a page CSP');
    assert.match(meta[1], /connect-src[^;]*https:\/\/dejplqevodwfeaemrska\.supabase\.co/);
  }
  const privacy = readFileSync(new URL('../privacy.html', import.meta.url), 'utf8');
  assert.match(privacy, /central acquisition log/);
  assert.match(privacy, /destination host/);
  assert.match(privacy, /We do not send full URLs, query strings/);
});


test('campaign UTM fields are preserved but search terms are not collected', () => {
  const h = harness({
    path: '/saver/',
    search: '?utm_source=google&utm_medium=organic&utm_campaign=quickwell-november&utm_content=saver-guide&utm_term=private-search'
  });
  const [event] = central(h.calls);
  assert.equal(event.source, 'google');
  assert.equal(event.medium, 'organic');
  assert.equal(event.campaign, 'quickwell-november');
  assert.equal(event.content, 'saver-guide');
  assert.equal('term' in event, false);
  assert.doesNotMatch(JSON.stringify(event), /private-search/);
});

test('the Quickwell-to-NorthStar owned link carries campaign tags', () => {
  const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(homepage, /https:\/\/northstardeliveryservice\.com\/\?utm_source=quickwell&amp;utm_medium=owned&amp;utm_campaign=portfolio_crosslink&amp;utm_content=homepage-for-truckers/);
});
