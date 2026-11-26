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
  assert.ok(global, 'site-wide frame protection rule exists');
  assert.match(global.source, /embed\//, 'global rule excludes the dedicated embed path');
  assert.match(header(global, 'Content-Security-Policy'), /frame-ancestors 'self'/);
  assert.equal(header(global, 'X-Frame-Options'), 'SAMEORIGIN');

  const embed = config.headers.find((rule) => rule.source === '/embed/(.*)');
  assert.ok(embed, 'dedicated embed header rule exists');
  assert.match(header(embed, 'Content-Security-Policy'), /frame-ancestors \*/);
  assert.equal(header(embed, 'X-Frame-Options'), undefined, 'no conflicting X-Frame-Options header is sent on embed routes');

  const openFrameRules = config.headers.filter((rule) => /frame-ancestors \*/.test(header(rule, 'Content-Security-Policy') || ''));
  assert.deepEqual(openFrameRules.map((rule) => rule.source).sort(), ['/embed/(.*)', '/play/embed/(.*)']);
});

test('each dedicated embed page is noindex, responsive and canonical to its tool', () => {
  for (const tool of tools) {
    const html = read('embed/' + tool.slug + '/index.html');
    assert.match(html, /<meta name="robots" content="noindex,follow">/);
    assert.ok(html.includes('<link rel="canonical" href="' + tool.canonical + '">'));
    assert.ok(html.includes('data-qw-embed-tool="' + tool.slug + '"'));
    assert.match(html, /<iframe id="qw-embedded-tool"/);
    assert.match(html, /title="Quickwell .+ tool"/);
    assert.match(html, /referrerpolicy="strict-origin-when-cross-origin"/);
    assert.match(html, /allow="clipboard-write"/);
    assert.match(html, //js/embed-shell\.js/);
    assert.match(html, /Open .+ on Quickwell/);
    assert.match(html, /<meta property="og:title"/);
    assert.match(html, /<meta name="twitter:title"/);
  }
});

test('tool pages copy dedicated embed routes and keep checkout outside the frame', () => {
  const script = read('js/embed.js');
  assert.match(script, /new URL\('\/embed\/' \+ slug/);
  assert.match(script, /window\.Studio\.upgrade=function\(\)/);
  assert.match(script, /window\.Studio\.manage=function\(\)/);
  assert.match(script, /link\.target='_blank'/);
  assert.match(script, /quickwell:tool:resize/);
  assert.doesNotMatch(script, /frame\.searchParams\.set\('embed'/, 'copy snippets do not iframe the full tool route directly');
});

test('embed shell validates the nested frame and forwards height only', () => {
  const shell = read('js/embed-shell.js');
  assert.match(shell, /event\.origin!==location\.origin/);
  assert.match(shell, /event\.source!==frame\.contentWindow/);
  assert.match(shell, /data\.type!=='quickwell:tool:resize'/);
  assert.match(shell, /window\.parent\.postMessage/);
  assert.match(shell, /qwTrack\(tool,'embed_open'\)/);
  assert.doesNotMatch(shell, /textContent|innerText|\.value/);
});

test('fixed analytics events include embed open and code copy without visitor content', () => {
  const va = read('js/va.js');
  assert.match(va, /'embed_open'/);
  assert.match(va, /'embed_code_copy'/);
  assert.match(va, /data: \{ tool: tool, source: source \}/);
  assert.doesNotMatch(va, /JSON\.stringify\([^)]*(?:value|text|quote|ingredient|broker)/i);
});

test('external-origin fixture verifies origin, frame source and resize payload', () => {
  const fixture = read('test/embed-host-fixture.html');
  assert.match(fixture, /new URL\(src\)/);
  assert.match(fixture, /target\.hostname==='quickwell\.app'/);
  assert.match(fixture, /target\.hostname\.endsWith\('\.vercel\.app'\)/);
  assert.match(fixture, /event\.origin!==target\.origin/);
  assert.match(fixture, /event\.source!==frame\.contentWindow/);
  assert.match(fixture, /quickwell:embed:resize/);
});

test('copy-paste documentation contains all four routes and responsive resize snippets', () => {
  const docs = read('embed-snippets.md');
  for (const tool of tools) {
    assert.ok(docs.includes('/embed/' + tool.slug + '/?ref=embed-' + tool.slug));
    assert.ok(docs.includes('quickwell-embed-' + tool.slug));
  }
  assert.match(docs, /width:100%/);
  assert.match(docs, /quickwell:embed:resize/);
  assert.match(docs, /Powered by Quickwell/);
});

test('embed variants stay out of the canonical sitemap', () => {
  const sitemap = read('scripts/sitemap.mjs');
  for (const tool of tools) assert.equal(sitemap.includes('embed/' + tool.slug), false);
});
