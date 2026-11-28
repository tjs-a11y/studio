import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../js/pro.js', import.meta.url), 'utf8');

function browserAt(url) {
  const session = new Map();
  const local = new Map();
  const storage = (values) => ({
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  });
  const location = { href: url };
  const window = { addEventListener() {} };
  runInNewContext(source, {
    window,
    document: {},
    location,
    sessionStorage: storage(session),
    localStorage: storage(local),
    URL,
    Date,
    Promise,
  });
  return { window, location, session };
}

test('first valid referral survives later internal ref links in the same tab', async () => {
  const env = browserAt('https://quickwell.app/fair-price/?ref=github-readme-fair-price');
  await env.window.Studio.init({ tool: 'fair-price' });
  env.location.href = 'https://quickwell.app/plus/?ref=fair-price';
  await env.window.Studio.init({ tool: 'plus' });
  assert.equal(env.session.get('studio-ref'), 'github-readme-fair-price');
});

test('invalid labels are ignored and valid labels are normalized', async () => {
  const env = browserAt('https://quickwell.app/fair-price/?ref=Bad%20Label');
  await env.window.Studio.init({ tool: 'fair-price' });
  assert.equal(env.session.has('studio-ref'), false);
  env.location.href = 'https://quickwell.app/fair-price/?ref=Campaign_1';
  await env.window.Studio.init({ tool: 'fair-price' });
  assert.equal(env.session.get('studio-ref'), 'campaign_1');
});
