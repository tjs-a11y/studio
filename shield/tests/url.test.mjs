// Link analyser tests: punycode, look-alike letters, misspelled brands, brand-in-subdomain, @ tricks, raw IPs,
// shorteners, endings, free hosts, link finding in text. Run: node --test tests/url.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { domainToUnicode } from 'node:url';
import { analyzeLink, findLinks, punyDecode, toUnicodeHost, skeleton, brandMatch, splitHost, editDistance, htmlToText, BRANDS } from '../js/url.mjs';

const hits = (raw) => { const a = analyzeLink(raw); return a ? a.results.filter((r) => r.hit).map((r) => r.id) : null; };

test('punycode decoding matches Node’s own IDN decoder', () => {
  for (const h of ['xn--pypal-4ve.com', 'xn--pple-43d.com', 'xn--80ak6aa92e.com', 'xn--mnchen-3ya.de', 'xn--espaa-rta.es', 'xn--fiqs8s.cn', 'xn--n3h.com', 'example.com'])
    assert.equal(toUnicodeHost(h), domainToUnicode(h), h);
  assert.equal(punyDecode('mnchen-3ya'), 'münchen');
  assert.throws(() => punyDecode('a-!'));
});

test('look-alike letters from other alphabets (homoglyphs)', () => {
  assert.equal(skeleton('аррӏе'), 'apple');                 // all Cyrillic
  assert.equal(skeleton('pаypal'), 'paypal');               // Cyrillic а
  assert.equal(skeleton('gοοgle'), 'google');               // Greek ο
  for (const [u, brand] of [['https://pаypal.com/login', 'PayPal'], ['http://аррӏе.com', 'Apple'], ['https://xn--pypal-4ve.com', 'PayPal'], ['https://gοοgle.com', 'Google'], ['https://www.chаse.com/verify', 'Chase'], ['https://аmazon.es', 'Amazon']]) {
    const a = analyzeLink(u); const r = a.results.find((x) => x.id === 'url-homoglyph');
    assert.ok(r.hit, u); assert.equal(r.detail.brand, brand, u);
  }
  // international letters without a brand are noted mildly, not as a copy
  assert.deepEqual(hits('https://münchen.de/rathaus'), ['url-punycode']);
  assert.deepEqual(hits('https://xn--espaa-rta.es'), ['url-punycode']);
});

test('misspelled brand names (look-alike domains)', () => {
  for (const [u, brand] of [['paypa1.com', 'PayPal'], ['arnazon.com/orders', 'Amazon'], ['g00gle.com', 'Google'], ['netfliix.com', 'Netflix'], ['micros0ft-support.com', 'Microsoft'], ['vvellsfargo.com', 'Wells Fargo'], ['coinbsae.com', 'Coinbase'], ['capital0ne-verify.com', 'Capital One'], ['https://track-fedx.xyz', 'FedEx']]) {
    const a = analyzeLink(u); const r = a.results.find((x) => x.id === 'url-lookalike');
    assert.ok(r.hit, `${u}: ${hits(u)}`); assert.equal(r.detail.brand, brand, u);
  }
  assert.equal(editDistance('paypal', 'paypla'), 1); assert.equal(editDistance('amazon', 'amazon'), 0);
});

test('brand name used in someone else’s address', () => {
  assert.ok(hits('https://usps.parcel-redeliver.top/track').includes('url-brand-sub'));
  assert.ok(hits('https://chase.com.secure-alert.info/a').includes('url-brand-sub'));
  assert.ok(hits('https://login.microsoftonline.com.auth.session-renew.net/keep').includes('url-brand-sub'));
  assert.ok(hits('secure-bankofamerica-login.com').includes('url-brand-name'));
  assert.ok(hits('https://wellsfargo-alerts.web.app').includes('url-brand-name'));
  assert.ok(hits('https://e-zpass-toll-pay.com/invoice').includes('url-brand-name'));
  assert.ok(hits('sat-devoluciones.online').includes('url-brand-name'));
  // short names only as whole words: "groups" is not UPS, "satellite" is not SAT, "irsa" is not IRS
  for (const u of ['https://groups.io/g/garden', 'https://satellite-news.org', 'https://www.irsa.com.ar', 'https://startups.com']) assert.ok(!hits(u).some((h) => h.startsWith('url-brand') || h === 'url-lookalike'), `${u}: ${hits(u)}`);
});

test('official domains are recognised and not flagged', () => {
  for (const u of ['https://www.paypal.com/signin', 'https://www.amazon.com/gp/your-account', 'https://www.amazon.co.uk/', 'amazon.com.mx/pedidos', 'ups.com/track', 'https://tools.usps.com/go/TrackConfirmAction', 'https://www.irs.gov/refunds', 'https://www.bbva.mx/', 'https://secure.chase.com/', 'https://www.sat.gob.mx/']) {
    const a = analyzeLink(u); assert.ok(a.official, u); assert.deepEqual(hits(u), [], u);
  }
  assert.deepEqual(hits('https://amzn.to/abc'), ['url-shortener']);
});

test('@ in the address, raw IP addresses, many subdomains, http, hyphens', () => {
  const at = analyzeLink('http://paypal.com@evil-site.top/login');
  assert.equal(at.host, 'evil-site.top'); assert.deepEqual(at.results.find((r) => r.id === 'url-at').detail, { shown: 'paypal.com', real: 'evil-site.top' });
  assert.ok(!hits('https://medium.com/@writer/post').includes('url-at'), '@ in the path is fine');
  assert.ok(hits('http://185.22.14.9/amazon').includes('url-ip'));
  assert.ok(hits('http://3232235777/login').includes('url-ip'), 'decimal IP is normalised by the URL parser');
  assert.ok(hits('https://[2001:db8::1]/x').includes('url-ip'));
  assert.ok(hits('https://secure.login.account.verify-id.net').includes('url-subdomains'));
  assert.ok(!hits('https://www.mail.google.com').includes('url-subdomains'));
  assert.ok(hits('http://example.org').includes('url-http'));
  assert.ok(hits('https://sup-port-help-desk.com').includes('url-hyphens'));
});

test('shorteners, uncommon endings and free website services', () => {
  for (const u of ['bit.ly/3xYz', 'https://tinyurl.com/abc', 'https://t.co/x', 'cutt.ly/q']) assert.ok(hits(u).includes('url-shortener'), u);
  assert.ok(hits('https://redeliver-myparcel.live').includes('url-tld'));
  assert.ok(!hits('https://gardenclub.org/news').includes('url-tld'));
  assert.ok(hits('https://my-page.pages.dev').includes('url-free-host'));
  assert.equal(splitHost('a.b.example.co.uk').reg, 'example.co.uk');
  assert.equal(splitHost('wellsfargo-alerts.web.app').reg, 'wellsfargo-alerts.web.app');
  assert.equal(brandMatch('parcel-redeliver'), null);
});

test('finding links in text: schemes, www., bare names; not emails, decimals or abbreviations', () => {
  const s = 'Visit usps.com or www.fedex.com/track. e.g. version 3.5 costs $3.50. Mail bob@gmail.com. Go to http://1.2.3.4/x, St.Louis, U.S. now, paypa1.com/login! Or 10.0.0.7/admin and (https://bit.ly/a1).';
  assert.deepEqual(findLinks(s).map((l) => l.raw), ['usps.com', 'www.fedex.com/track', 'http://1.2.3.4/x', 'paypa1.com/login', '10.0.0.7/admin', 'https://bit.ly/a1']);
  for (const l of findLinks(s)) assert.equal(s.slice(l.start, l.end), l.raw);
  assert.deepEqual(findLinks('Pagá en sat-devoluciones.online hoy').map((l) => l.raw), ['sat-devoluciones.online']);
  assert.deepEqual(findLinks('Llegó a las 9.30 y pagó 1.200,50'), []);
});

test('HTML to text keeps link text and real addresses', () => {
  const { text, anchors } = htmlToText('<div>Hi&nbsp;Sam &amp; co,<br>see <a href="https://x.top/a?b=1&amp;c=2">our site</a></div><script>alert(1)</script>');
  assert.equal(text, 'Hi Sam & co,\nsee our site');
  assert.deepEqual(anchors, [{ href: 'https://x.top/a?b=1&c=2', text: 'our site' }]);
});

test('brand list: plain names only, unique keys, official domains look like domains', () => {
  const keys = BRANDS.map((b) => b.key); assert.equal(new Set(keys).size, keys.length);
  for (const b of BRANDS) { assert.match(b.key, /^[a-z0-9]+$/); for (const d of b.domains) assert.match(d, /^[a-z0-9-]+(\.[a-z0-9-]+)+$/, d); }
});
