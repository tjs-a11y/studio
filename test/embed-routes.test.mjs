import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const config = JSON.parse(read('vercel.json'));
const tools = [
  { slug: 'bill-radar', canonical: 'https://quickwell.app/bill-radar/' },
  { slug: 'fair-price', canonical: 'https://quickwell.app/fair-price/' },
  { slug: 'dinner', canonical: 'https://quickwell.app/dinner/' },
  { slug: 'rate-con-checker', canonical: 'https://quickwell.app/rate-con-checker/' }
];
const header = (rule, name) => rule?.headers?.find((item) => item.key.toLowerCase() === name.toLowerCase())?.value;

test('external framing is allowed only on dedicated embed routes', () => {
  const global = config.headers.find((rule) => rule.source.includes('(?!play/embed/'));
  assert.ok(global);
  assert.ok(global.source.includes('embed/'));
  assert.ok(header(global, 'Content-Security-Policy').includes("frame-ancestors 'self'"));
  assert.equal(header(global, 'X-Frame-Options'), 'SAMEORIGIN');

  const embed = config.headers.find((rule) => rule.source === '/embed/(.*)');
  assert.ok(embed);
  assert.ok(header(embed, 'Content-Security-Policy').includes('frame-ancestors *'));
  assert.equal(header(embed, 'X-Frame-Options'), undefined);

  const openFrameRules = config.headers.filter((rule) => (header(rule, 'Content-Security-Policy') || '').includes('frame-ancestors *'));
  assert.deepEqual(openFrameRules.map((rule) => rule.source).sort(), ['/embed/(.*)', '/play/embed/(.*)']);
});

test('each dedicated embed page is noindex, responsive and canonical to its tool', () => {
  for (const tool of tools) {
    const html = read('embed/' + tool.slug + '/index.html');
    assert.ok(html.includes('<meta name="robots" content="noindex,follow">'));
    assert.ok(html.includes('<link rel="canonical" href="' + tool.canonical + '">'));
    assert.ok(html.includes('data-qw-embed-tool="' + tool.slug + '"'));
    assert.ok(html.includes('<iframe id="qw-embedded-tool"'));
    assert.ok(html.includes('title="Quickwell ' + tool.slug.replace(/-/g, ' ') .replace(/\b\w/g, (c) => c.toUpperCase()) + ' tool"') || html.includes('title="Quickwell '));
    assert.ok(html.includes('referrerpolicy="strict-origin-when-cross-origin"'));
    assert.ok(html.includes('allow="clipboard-write"'));
    assert.ok(html.includes('/js/embed-shell.js'));
    assert.ok(html.includes('Open '));
    assert.ok(html.includes('<meta property="og:title"'));
    assert.ok(html.includes('<meta name="twitter:title"'));
  }
});

test('tool pages expose snippets only for the four supported tools and keep checkout outside the frame', () => {
  const script = read('js/embed.js');
  assert.ok(script.includes("var selectors={'bill-radar':'#out','fair-price':'#out','dinner':'#out','rate-con-checker':'#result'};"));
  assert.ok(script.includes("new URL('/embed/'+slug+'/',origin)"));
  assert.ok(script.includes("window.Studio.upgrade=function()"));
  assert.ok(script.includes("window.Studio.manage=function()"));
  assert.ok(script.includes("link.target='_blank'"));
  assert.ok(script.includes('quickwell:tool:resize'));
  assert.ok(script.includes("window.qwTrack(slug,'embed_code_copy')"));
});

test('embed shell validates the nested frame and forwards height only', () => {
  const shell = read('js/embed-shell.js');
  assert.ok(shell.includes('event.origin!==location.origin'));
  assert.ok(shell.includes('event.source!==frame.contentWindow'));
  assert.ok(shell.includes("data.type!=='quickwell:tool:resize'"));
  assert.ok(shell.includes('window.parent.postMessage'));
  assert.ok(shell.includes("window.qwTrack(tool,'embed_open')"));
  assert.ok(shell.includes("link.target='_blank'"));
  assert.ok(shell.includes('if(frame.src!==toolUrl.href)'));\n  assert.ok(shell.includes('quickwell:embed:measure'));
  assert.equal(shell.includes('textContent'), false);
  assert.equal(shell.includes('innerText'), false);
});

test('fixed analytics event names are allowed without visitor content', () => {
  const va = read('js/va.js');
  assert.ok(va.includes("'embed_open'"));
  assert.ok(va.includes("'embed_code_copy'"));
  assert.ok(va.includes('data: { tool: tool, source: source }'));
});

test('external-origin fixture verifies origin, frame source and resize payload', () => {
  const fixture = read('test/embed-host-fixture.html');
  assert.ok(fixture.includes('new URL(src)'));
  assert.ok(fixture.includes("target.hostname==='quickwell.app'"));
  assert.ok(fixture.includes("target.hostname.endsWith('.vercel.app')"));
  assert.ok(fixture.includes('event.origin!==target.origin'));
  assert.ok(fixture.includes('event.source!==frame.contentWindow'));
  assert.ok(fixture.includes('quickwell:embed:resize'));
});

test('copy-paste documentation contains all four routes and responsive resize snippets', () => {
  const docs = read('embed-snippets.md');
  for (const tool of tools) {
    assert.ok(docs.includes('/embed/' + tool.slug + '/?ref=embed-' + tool.slug));
    assert.ok(docs.includes('quickwell-embed-' + tool.slug));
  }
  assert.ok(docs.includes('width:100%'));
  assert.ok(docs.includes('quickwell:embed:resize'));
  assert.ok(docs.includes('Powered by Quickwell'));
});

test('embed variants stay out of the canonical sitemap', () => {
  const sitemap = read('scripts/sitemap.mjs');
  for (const tool of tools) assert.equal(sitemap.includes('embed/' + tool.slug), false);
});
