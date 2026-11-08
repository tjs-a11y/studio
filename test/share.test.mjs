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

test('Dinner offers a built-in share action', () => {
  const src = page('dinner/index.html');
  assert.match(src, /id="shareBtn"/, 'Dinner has a Share button in its result');
  assert.match(src, /navigator\.share/, 'Dinner uses the Web Share API');
  assert.match(src, /navigator\.clipboard\.writeText/, 'Dinner has a clipboard fallback');
  assert.match(src, /quickwell\.app\/dinner\//, 'the share carries the tool URL');
});

// Privacy: the shared text must be built only from the produced dinner ideas (recipe names) and
// their count — never from the ingredients the user tapped (the `picks` object).
test('Dinner share text never includes the tapped ingredients', () => {
  const src = page('dinner/index.html');
  const m = src.match(/function shareText\(nowCount, names, oneCount\) \{[\s\S]*?\n  \}\n  var lastShare/);
  assert.ok(m, 'shareText builder is present and bounded');
  const body = m[0];
  assert.doesNotMatch(body, /\bpicks\b/, 'shareText must not read the tapped-ingredients object');
  assert.doesNotMatch(body, /\.value/, 'shareText must not read a form field value');
  assert.match(body, /names/, 'shareText uses only the produced recipe names');
});

test('Copycat offers a built-in share action', () => {
  const src = page('copycat/index.html');
  assert.match(src, /id="shareBtn"/, 'Copycat has a Share button in its result');
  assert.match(src, /navigator\.share/, 'Copycat uses the Web Share API');
  assert.match(src, /navigator\.clipboard\.writeText/, 'Copycat has a clipboard fallback');
  assert.match(src, /quickwell\.app\/copycat\//, 'the share carries the tool URL');
});

// Privacy: the shared text must be built only from the generated dish name — never from the
// photo the user added (the photo stays on-device and is never uploaded or shared).
test('Copycat share text never includes the uploaded photo', () => {
  const src = page('copycat/index.html');
  const m = src.match(/function shareText\(title\) \{[\s\S]*?\n  \}\n  var lastShare/);
  assert.ok(m, 'shareText builder is present and bounded');
  const body = m[0];
  assert.doesNotMatch(body, /readAsDataURL|FileReader|\.src|ref/, 'shareText must not touch the photo/reference image');
  assert.doesNotMatch(body, /\.value/, 'shareText must not read a form field value');
  assert.match(body, /title/, 'shareText uses only the generated dish title');
});


test('Bill Radar offers a built-in share action with a tagged tool link', () => {
  const src = page('bill-radar/index.html');
  assert.match(src, /id="shareBtn"/, 'Bill Radar has a Share button after the forecast');
  assert.match(src, /navigator\\.share/, 'Bill Radar uses the Web Share API');
  assert.match(src, /navigator\\.clipboard\\.writeText/, 'Bill Radar has a clipboard fallback');
  assert.match(src, /quickwell\\.app\\/bill-radar\\/\\?ref=share-bill-radar/, 'the share link carries a fixed referral label');
});

test('Bill Radar share text never includes bill inputs or forecast output', () => {
  const src = page('bill-radar/index.html');
  const m = src.match(/function shareText\\(\\) \\{[\\s\\S]*?\\n  \\}/);
  assert.ok(m, 'the fixed shareText builder is present');
  assert.doesNotMatch(m[0], /\\.value|kwh|next12|deltaLine|rolloff|tbl|fetch/i,
    'shareText must not read usage, rate, contract date, forecast output or send data');
  assert.match(m[0], /Your entries stay in your browser/, 'privacy limit is stated in the share text');
});
