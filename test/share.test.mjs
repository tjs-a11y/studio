import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

// Standing Order 13: every priority consumer tool should market itself (built-in sharing).
test('Fair Price offers a built-in share action', () => {
  const src = page('fair-price/index.html');
  assert.match(src, /id="shareBtn"/, 'Fair Price has a Share button in its result');
  assert.match(src, /navigator\.share/, 'Fair Price uses the Web Share API');
  assert.match(src, /navigator\.clipboard\.writeText/, 'Fair Price has a clipboard fallback when Web Share is unavailable');
  assert.match(src, /quickwell\.app\/fair-price\//, 'the share carries the tool URL so recipients can open it');
});

// Privacy: the shared text must be built only from the category label and the generic flag
// titles — never from the quote the user pasted (same rule as Shield's share wording).
test('Fair Price share text never includes the pasted quote', () => {
  const src = page('fair-price/index.html');
  const m = src.match(/function shareText\(c, found\) \{[\s\S]*?\n  \}\n  var lastShare/);
  assert.ok(m, 'shareText builder is present and bounded');
  const body = m[0];
  assert.doesNotMatch(body, /lastText/, 'shareText must not read the pasted-quote variable');
  assert.doesNotMatch(body, /\.value/, 'shareText must not read a form field value');
  assert.doesNotMatch(body, /\btext\b\s*\)/, 'shareText must not pass raw pasted text through');
  assert.match(body, /c\.label/, 'shareText uses only the category label');
  assert.match(body, /f\.t\b/, 'shareText uses only the generic flag titles');
});
