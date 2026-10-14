// Quickwell Shield link checks. Pure functions, no network: we never open, fetch or look up a link.
// Every check is listed in CHECKS so the "What we checked" panel can show each one and its result.

// Brands that scam messages often pretend to be, as plain names, with the domains they really use.
// Plain names only (no logos). `short` names (3 letters or fewer) only match a whole word in a domain.
export const BRANDS = [
  { key: 'paypal', name: 'PayPal', domains: ['paypal.com', 'paypal.me', 'paypalobjects.com'] },
  { key: 'amazon', name: 'Amazon', domains: ['amazon.com', 'amazon.co.uk', 'amazon.es', 'amazon.com.mx', 'amazon.ca', 'amazon.de', 'amazon.fr', 'amazon.it', 'amazon.in', 'amazon.com.br', 'amazon.co.jp', 'amazon.com.au', 'amazonaws.com', 'amzn.to', 'a.co', 'aws.amazon.com'] },
  { key: 'apple', name: 'Apple', domains: ['apple.com', 'icloud.com', 'me.com'] },
  { key: 'icloud', name: 'iCloud', domains: ['icloud.com', 'apple.com'] },
  { key: 'microsoft', name: 'Microsoft', domains: ['microsoft.com', 'live.com', 'outlook.com', 'office.com', 'microsoftonline.com', 'office365.com', 'windows.com', 'xbox.com'] },
  { key: 'outlook', name: 'Outlook', domains: ['outlook.com', 'live.com', 'microsoft.com', 'office.com'] },
  { key: 'office365', name: 'Office 365', domains: ['office.com', 'office365.com', 'microsoft.com'] },
  { key: 'google', name: 'Google', domains: ['google.com', 'gmail.com', 'youtube.com', 'goo.gl', 'g.co', 'google.es', 'google.com.mx', 'google.co.uk'] },
  { key: 'gmail', name: 'Gmail', domains: ['gmail.com', 'google.com'] },
  { key: 'netflix', name: 'Netflix', domains: ['netflix.com'] },
  { key: 'usps', name: 'USPS', domains: ['usps.com', 'usps.gov'] },
  { key: 'ups', name: 'UPS', domains: ['ups.com'], short: true },
  { key: 'fedex', name: 'FedEx', domains: ['fedex.com'] },
  { key: 'dhl', name: 'DHL', domains: ['dhl.com', 'dhl.de', 'dhl.es', 'dhl.com.mx'], short: true },
  { key: 'correos', name: 'Correos', domains: ['correos.es', 'correosdemexico.gob.mx'] },
  { key: 'irs', name: 'IRS', domains: ['irs.gov'], short: true },
  { key: 'ssa', name: 'Social Security', domains: ['ssa.gov'], short: true },
  { key: 'sat', name: 'SAT', domains: ['sat.gob.mx'], short: true },
  { key: 'medicare', name: 'Medicare', domains: ['medicare.gov'] },
  { key: 'chase', name: 'Chase', domains: ['chase.com', 'jpmorganchase.com'] },
  { key: 'wellsfargo', name: 'Wells Fargo', domains: ['wellsfargo.com', 'wf.com'] },
  { key: 'bankofamerica', name: 'Bank of America', domains: ['bankofamerica.com', 'bofa.com'] },
  { key: 'citi', name: 'Citi', domains: ['citi.com', 'citibank.com', 'citibanamex.com'] },
  { key: 'capitalone', name: 'Capital One', domains: ['capitalone.com'] },
  { key: 'santander', name: 'Santander', domains: ['santander.com', 'santander.es', 'santander.com.mx', 'santanderbank.com', 'santander.co.uk'] },
  { key: 'bbva', name: 'BBVA', domains: ['bbva.com', 'bbva.es', 'bbva.mx', 'bbva.com.co', 'bbva.pe'] },
  { key: 'banorte', name: 'Banorte', domains: ['banorte.com'] },
  { key: 'zelle', name: 'Zelle', domains: ['zellepay.com', 'zelle.com'] },
  { key: 'venmo', name: 'Venmo', domains: ['venmo.com'] },
  { key: 'cashapp', name: 'Cash App', domains: ['cash.app', 'cash.me', 'squareup.com'] },
  { key: 'coinbase', name: 'Coinbase', domains: ['coinbase.com'] },
  { key: 'binance', name: 'Binance', domains: ['binance.com', 'binance.us'] },
  { key: 'facebook', name: 'Facebook', domains: ['facebook.com', 'fb.com', 'fb.me', 'meta.com'] },
  { key: 'instagram', name: 'Instagram', domains: ['instagram.com'] },
  { key: 'whatsapp', name: 'WhatsApp', domains: ['whatsapp.com', 'wa.me', 'whatsapp.net'] },
  { key: 'tiktok', name: 'TikTok', domains: ['tiktok.com'] },
  { key: 'linkedin', name: 'LinkedIn', domains: ['linkedin.com', 'lnkd.in'] },
  { key: 'ebay', name: 'eBay', domains: ['ebay.com', 'ebay.es', 'ebay.co.uk'] },
  { key: 'walmart', name: 'Walmart', domains: ['walmart.com', 'walmart.com.mx'] },
  { key: 'mercadolibre', name: 'Mercado Libre', domains: ['mercadolibre.com', 'mercadolibre.com.mx', 'mercadolibre.com.ar', 'mercadolibre.com.co', 'mercadopago.com', 'mercadopago.com.mx'] },
  { key: 'att', name: 'AT&T', domains: ['att.com', 'att.net'], short: true },
  { key: 'verizon', name: 'Verizon', domains: ['verizon.com', 'verizonwireless.com', 'vzw.com'] },
  { key: 'tmobile', name: 'T-Mobile', domains: ['t-mobile.com'] },
  { key: 'docusign', name: 'DocuSign', domains: ['docusign.com', 'docusign.net'] },
  { key: 'dropbox', name: 'Dropbox', domains: ['dropbox.com'] },
  { key: 'steam', name: 'Steam', domains: ['steampowered.com', 'steamcommunity.com'] },
  { key: 'roblox', name: 'Roblox', domains: ['roblox.com'] },
  { key: 'ezpass', name: 'E-ZPass', domains: ['e-zpassiag.com', 'e-zpassny.com', 'ezpassnj.com', 'ezpassva.com', 'ezpassmd.com', 'ezpassde.com', 'paturnpike.com', 'ezpassma.com'] },
];

// Services that shorten links (the real address is hidden until you tap).
export const SHORTENERS = ['bit.ly', 'bitly.com', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 'rb.gy', 't.ly', 'tiny.cc', 's.id', 'bit.do', 'qrco.de', 'shorte.st', 'v.gd', 'tr.im', 'x.co', 'lnkd.in', 'amzn.to', 'a.co', 'wa.me', 'shrtco.de', 'urlz.fr', 'clck.ru', 'u.to', 'linktr.ee'];
// Endings our rules treat as a mild warning sign: cheap and uncommon in messages from big companies.
// Plenty of honest sites use them too, so on its own this never raises the level.
export const RISKY_TLDS = ['xyz', 'top', 'icu', 'click', 'live', 'shop', 'online', 'site', 'club', 'buzz', 'rest', 'cfd', 'sbs', 'cyou', 'bond', 'info', 'vip', 'work', 'link', 'lol', 'mom', 'beauty', 'quest', 'today', 'support', 'win', 'loan', 'cam', 'monster', 'zip', 'mov', 'gq', 'tk', 'ml', 'cf', 'ga', 'ru', 'cn', 'pw', 'cc', 'ws', 'su', 'store', 'fun', 'space', 'website', 'host', 'pro', 'top'];
// Free website services where anyone can make a page under their name.
export const FREE_HOSTS = ['github.io', 'vercel.app', 'netlify.app', 'web.app', 'firebaseapp.com', 'pages.dev', 'workers.dev', 'blogspot.com', 'wixsite.com', 'weebly.com', 'glitch.me', 'herokuapp.com', 'ngrok-free.app', 'ngrok.io', 'repl.co', 'replit.app', '000webhostapp.com', 'square.site', 'webflow.io', 'framer.app', 'carrd.co', 'mystrikingly.com', 'godaddysites.com', 'r2.dev', 'onrender.com', 'surge.sh'];
// Two-part endings (the registered name is the label before them).
const TWO_PART = ['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'com.mx', 'gob.mx', 'org.mx', 'edu.mx', 'com.br', 'gov.br', 'com.au', 'net.au', 'gov.au', 'co.jp', 'co.in', 'gov.in', 'co.nz', 'com.ar', 'gob.ar', 'com.co', 'gov.co', 'co.za', 'gov.za', 'gob.es', 'com.es', 'co.ke', 'go.ke', 'com.ng', 'gov.ng', 'com.ph', 'gov.ph', 'com.pe', 'gob.pe', 'com.cn', 'com.tr', 'com.sg', 'com.my', 'co.id', 'com.hk', 'com.ve', 'com.ec', 'com.gt', 'com.do', 'com.uy', 'com.py', 'com.bo', 'cl.ve'];
// Known endings for links typed without http:// (so "e.g." or "3.5" is never read as a link).
const BARE_TLDS = new Set(['com', 'net', 'org', 'gov', 'edu', 'mil', 'int', 'info', 'biz', 'app', 'dev', 'io', 'co', 'me', 'us', 'uk', 'mx', 'es', 'ca', 'de', 'fr', 'it', 'br', 'ar', 'cl', 'pe', 've', 'ec', 'gt', 'do', 'in', 'ke', 'ng', 'za', 'ph', 'au', 'nz', 'jp', 'cn', 'ru', 'ly', 'gl', 'gd', 'to', 'id', 'at', 'ws', 'cc', 'tv', 'eu', 'ai', 'gg', 'sh', 'so', 'tk', 'ml', 'cf', 'ga', 'gq', 'pw', 'su', 'su', 'ee', ...RISKY_TLDS]);

// Characters from other alphabets that look like Latin letters (Cyrillic, Greek, a few others), plus digit tricks.
const CONFUSABLE = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j', 'ԁ': 'd', 'ɡ': 'g', 'һ': 'h', 'ӏ': 'l', 'ѕ': 's', 'к': 'k', 'м': 'm', 'н': 'h', 'т': 't', 'в': 'b', 'ԛ': 'q', 'ԝ': 'w', 'ү': 'y', 'ɩ': 'i', 'ⅼ': 'l',
  'ο': 'o', 'α': 'a', 'ν': 'v', 'τ': 't', 'ρ': 'p', 'ι': 'i', 'κ': 'k', 'ε': 'e', 'υ': 'u', 'χ': 'x', 'β': 'b', 'η': 'n', 'ω': 'w',
  'ł': 'l', 'ı': 'i', 'ѵ': 'v', 'ɑ': 'a', 'ɐ': 'a', 'ǀ': 'l', 'ꞵ': 'b', 'ᴠ': 'v', 'ⅰ': 'i', 'ｏ': 'o', 'ａ': 'a',
};
// Accented Latin letters are folded to plain ones (é → e) before comparing names.
export function skeleton(s) {
  let out = '';
  for (const ch of String(s).toLowerCase()) out += CONFUSABLE[ch] || ch;
  return out.normalize('NFKD').replace(/[̀-ͯ]/g, '');
}
// Digit and letter-pair tricks: paypa1 → paypal, arnazon → amazon, g00gle → google, vvellsfargo → wellsfargo.
export const deTrick = (s) => s.replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/5/g, 's').replace(/4/g, 'a').replace(/7/g, 't').replace(/\$/g, 's');

// ------------------------------------------------------------------ punycode (RFC 3492), decode only
export function punyDecode(label) {
  const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700;
  const input = String(label).toLowerCase();
  const out = []; let n = 128, i = 0, bias = 72;
  let b = input.lastIndexOf('-'); if (b < 0) b = 0;
  for (let j = 0; j < b; j++) { if (input.charCodeAt(j) >= 128) throw new Error('bad'); out.push(input.charCodeAt(j)); }
  const digit = (c) => (c - 48 < 10 ? c - 22 : c - 65 < 26 ? c - 65 : c - 97 < 26 ? c - 97 : base);
  const adapt = (delta, num, first) => { delta = first ? Math.floor(delta / damp) : delta >> 1; delta += Math.floor(delta / num); let k = 0; for (; delta > ((base - tMin) * tMax) >> 1; k += base) delta = Math.floor(delta / (base - tMin)); return Math.floor(k + ((base - tMin + 1) * delta) / (delta + skew)); };
  for (let idx = b > 0 ? b + 1 : 0; idx < input.length;) {
    const oldi = i;
    for (let w = 1, k = base; ; k += base) {
      if (idx >= input.length) throw new Error('bad');
      const d = digit(input.charCodeAt(idx++));
      if (d >= base) throw new Error('bad');
      i += d * w;
      const tt = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
      if (d < tt) break;
      w *= base - tt;
    }
    bias = adapt(i - oldi, out.length + 1, oldi === 0);
    n += Math.floor(i / (out.length + 1)); i %= out.length + 1;
    out.splice(i++, 0, n);
  }
  return String.fromCodePoint(...out);
}
export const toUnicodeHost = (host) => host.split('.').map((l) => { if (!l.startsWith('xn--')) return l; try { return punyDecode(l.slice(4)); } catch (e) { return l; } }).join('.');

// ------------------------------------------------------------------ finding links in text
const TRAIL = /[).,;:!?'"\]}>»”’]+$/;
const SCHEME_RE = /\b(?:https?:\/\/|hxxps?:\/\/|www\.)[^\s<>"'`]+/giu;
const BARE_RE = /(?<![\p{L}\p{N}@._/-])((?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+([\p{L}]{2,24}|xn--[a-z0-9-]+))(?::\d{2,5})?(?:\/[^\s<>"'`]*)?(?![\p{L}\p{N}@])/giu;

// Returns [{ raw, start, end }] in the order they appear; links with a scheme win over bare names inside them.
export function findLinks(text) {
  const s = String(text || '');
  const out = [];
  for (const m of s.matchAll(SCHEME_RE)) { const raw = m[0].replace(TRAIL, ''); if (raw.length > 4) out.push({ raw, start: m.index, end: m.index + raw.length }); }
  for (const m of s.matchAll(BARE_RE)) {
    const raw = m[0].replace(TRAIL, '');
    const tld = (m[2] || '').toLowerCase();
    if (!(BARE_TLDS.has(tld) || tld.startsWith('xn--'))) continue;
    if (out.some((o) => m.index >= o.start && m.index < o.end)) continue;
    const labels = m[1].split('.');
    if (labels.slice(0, -1).every((l) => l.length < 2 && !/\p{L}/u.test(l))) continue;
    if (/^\d+(\.\d+)+$/.test(m[1])) continue; // version numbers, prices
    out.push({ raw, start: m.index, end: m.index + raw.length });
  }
  // raw IPv4 links without a scheme ("192.168.4.20/login")
  for (const m of s.matchAll(/(?<![\d.])(\d{1,3}(?:\.\d{1,3}){3})(?::\d{2,5})?\/[^\s<>"']*/g)) {
    if (out.some((o) => m.index >= o.start && m.index < o.end)) continue;
    const raw = m[0].replace(TRAIL, ''); out.push({ raw, start: m.index, end: m.index + raw.length });
  }
  return out.sort((a, b) => a.start - b.start);
}

// ------------------------------------------------------------------ pasted HTML
export const looksLikeHtml = (s) => /<a\s[^>]*href\s*=|<(html|body|div|p|br|table|span)\b[^>]*>/i.test(String(s || ''));
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
const decodeEntities = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1); try { return String.fromCodePoint(n); } catch (er) { return m; } }
  return ENT[e.toLowerCase()] ?? m;
});
// Turns pasted HTML into plain text (for the message rules) and a list of links with their visible text.
export function htmlToText(html) {
  const anchors = [];
  let s = String(html).replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (m, attrs, inner) => {
    const h = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const href = h ? decodeEntities(h[2] ?? h[3] ?? h[4] ?? '').trim() : '';
    const text = decodeEntities(inner.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    anchors.push({ href, text });
    return ` ${text} `;
  });
  s = s.replace(/<(br|\/p|\/div|\/tr|\/li|\/h\d)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s).replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text: s, anchors };
}

// ------------------------------------------------------------------ one link
export function parseLink(raw) {
  let r = String(raw).trim().replace(/^hxxp/i, 'http');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(r)) r = 'http://' + r;
  try { const u = new URL(r); if (!/^https?:$/.test(u.protocol) || !u.hostname) return null; return u; } catch (e) { return null; }
}
export function splitHost(host) {
  const h = host.replace(/\.$/, '').toLowerCase();
  if (/^\d+(\.\d+){3}$/.test(h) || h.startsWith('[')) return { reg: h, sub: [], label: h, suffix: '' };
  const labels = h.split('.');
  let n = 2;
  const last2 = labels.slice(-2).join('.');
  if (TWO_PART.includes(last2) && labels.length >= 3) n = 3;
  const free = FREE_HOSTS.find((f) => h === f || h.endsWith('.' + f));
  if (free && labels.length > free.split('.').length) n = free.split('.').length + 1;
  const regLabels = labels.slice(-n);
  return { reg: regLabels.join('.'), sub: labels.slice(0, -n), label: regLabels[0], suffix: regLabels.slice(1).join('.'), free: free || null };
}
const onDomain = (host, d) => host === d || host.endsWith('.' + d);
export const officialBrand = (host) => BRANDS.find((b) => b.domains.some((d) => onDomain(host, d))) || null;

// Damerau-Levenshtein (optimal string alignment) distance.
export function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
const words = (label) => label.split(/[-_]+/).filter(Boolean);

// Which brand does this name look like, and how? -> { brand, how: 'name'|'lookalike'|'homoglyph' } | null
export function brandMatch(label, { unicode = false } = {}) {
  const sk = skeleton(label);
  const flat = sk.replace(/[-_]/g, '');
  const tricked = deTrick(flat);
  for (const b of BRANDS) {
    if (unicode && (flat === b.key || flat.includes(b.key) && !b.short)) return { brand: b, how: 'homoglyph' };
    if (b.short) { if (words(sk).includes(b.key) || words(deTrick(sk)).includes(b.key)) return { brand: b, how: unicode ? 'homoglyph' : 'name' }; continue; }
    if (flat.includes(b.key)) return { brand: b, how: unicode ? 'homoglyph' : 'name' };
    if (tricked.includes(b.key)) return { brand: b, how: 'lookalike' };
  }
  // one letter off (added, missing, swapped or changed) from a longer brand name
  for (const b of BRANDS) {
    if (b.key.length < 5) continue;
    for (const w of [flat, tricked, ...words(sk)]) {
      if (Math.abs(w.length - b.key.length) > 2) continue;
      const dist = editDistance(w, b.key);
      if (dist === 1 || (dist === 2 && b.key.length >= 8)) return { brand: b, how: 'lookalike' };
    }
  }
  return null;
}

// Every check run on every link, in display order. weight = how much it adds to the risk score.
export const CHECKS = [
  { id: 'url-at', w: 3 },          // user@host trick
  { id: 'url-ip', w: 3 },          // raw IP address
  { id: 'url-homoglyph', w: 4 },   // other-alphabet letters copying a brand
  { id: 'url-punycode', w: 2 },    // international letters (xn--) at all
  { id: 'url-lookalike', w: 3 },   // misspelled brand
  { id: 'url-brand-sub', w: 3 },   // brand name or domain placed in front of someone else's domain
  { id: 'url-brand-name', w: 3 },  // brand name inside a domain the brand doesn't use
  { id: 'url-subdomains', w: 2 },  // many dots before the real domain
  { id: 'url-shortener', w: 1 },
  { id: 'url-tld', w: 1 },
  { id: 'url-free-host', w: 1 },
  { id: 'url-http', w: 1 },
  { id: 'url-hyphens', w: 1 },
  { id: 'url-mismatch', w: 3 },    // HTML link text shows one site, goes to another
];
export const CHECK_W = Object.fromEntries(CHECKS.map((c) => [c.id, c.w]));

// Analyse one link. Returns { raw, host, display, reg, official, results: [{ id, hit, detail }] }.
export function analyzeLink(raw, { text = null } = {}) {
  const u = parseLink(raw);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  const display = toUnicodeHost(host);
  const parts = splitHost(host);
  const uParts = splitHost(display);
  const isIp = /^\d+(\.\d+){3}$/.test(host) || host.startsWith('[');
  const hasPuny = host.split('.').some((l) => l.startsWith('xn--'));
  const nonAscii = /[^\x00-\x7f]/.test(display);
  const official = isIp ? null : officialBrand(host);
  const hits = {};
  const hit = (id, detail = {}) => { if (!hits[id]) hits[id] = detail; };
  // 1. user@host: everything before @ is ignored by the browser
  if (u.username || u.password) hit('url-at', { shown: decodeURIComponent(u.username || ''), real: display });
  if (isIp) hit('url-ip', { ip: host });
  if (!isIp && !official) {
    // brand checks on the registered name, then on the labels in front of it
    const bm = brandMatch(uParts.label, { unicode: nonAscii });
    if (bm && bm.how === 'homoglyph') hit('url-homoglyph', { brand: bm.brand.name, host: display });
    else if (bm && bm.how === 'lookalike') hit('url-lookalike', { brand: bm.brand.name, host: display, label: uParts.label });
    else if (bm) hit('url-brand-name', { brand: bm.brand.name, host: display, reg: uParts.reg });
    if (!bm) {
      const subText = uParts.sub.join('.');
      const inFront = BRANDS.find((b) => b.domains.some((d) => subText === d || subText.endsWith('.' + d) || subText.startsWith(d + '.') || subText.includes('.' + d + '.') ));
      const subBrand = inFront || uParts.sub.map((l) => brandMatch(l, { unicode: nonAscii })).find((m) => m && m.how !== 'lookalike')?.brand;
      if (subBrand) hit(nonAscii ? 'url-homoglyph' : 'url-brand-sub', { brand: subBrand.name, host: display, reg: uParts.reg });
    }
    if (parts.free) hit('url-free-host', { service: parts.free, host: display });
  }
  if ((hasPuny || nonAscii) && !hits['url-homoglyph']) hit('url-punycode', { host: display, ascii: host });
  if (!isIp && parts.sub.filter((l) => l !== 'www').length >= 3) hit('url-subdomains', { n: parts.sub.length, reg: uParts.reg });
  if (!isIp && SHORTENERS.some((d) => onDomain(host, d))) hit('url-shortener', { host });
  const tld = host.split('.').pop();
  if (!isIp && RISKY_TLDS.includes(tld) && !official) hit('url-tld', { tld: '.' + tld });
  if (/^http:\/\//i.test(String(raw).trim())) hit('url-http', {});
  if (!isIp && (uParts.label.match(/-/g) || []).length >= 3) hit('url-hyphens', { label: uParts.label });
  // HTML: the visible text names a different site than the link goes to
  if (text) {
    const shown = findLinks(text)[0];
    const su = shown && parseLink(shown.raw);
    if (su && splitHost(su.hostname).reg !== parts.reg) hit('url-mismatch', { shown: toUnicodeHost(su.hostname.toLowerCase()), real: display });
  }
  return { raw: String(raw), host, display, reg: uParts.reg, official: official ? official.name : null, results: CHECKS.map((c) => ({ id: c.id, hit: !!hits[c.id], detail: hits[c.id] || null })) };
}
