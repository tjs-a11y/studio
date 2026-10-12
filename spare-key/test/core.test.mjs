// Unit tests for the Spare Key engine (the <script id="sk-core"> block in ../index.html).
// Run: node --test spare-key/test/core.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const core = html.match(/<script id="sk-core">([\s\S]*?)<\/script>/)[1];
const ctx = vm.createContext({ crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob });
vm.runInContext(core, ctx);
const SK = ctx.SK;
const J = (x) => JSON.parse(JSON.stringify(x)); // values from the vm realm
const acc = (name, cat, signin, backups, legacy, pid = '') => ({ id: name.toLowerCase().replace(/\W/g, ''), pid, name, cat, signin, backups, legacy });
const person = (accounts, extra = {}) => ({ ...J(SK.newPerson({ country: 'US' })), accounts, ...extra });

// ------------------------------------------------------------------ Lockout Score
test('assess: phone-bound sign-in with no backup locks you out; SMS alone is "until new SIM"; a password alone is not a lockout', () => {
  assert.equal(SK.assess(acc('A', 'email', 'app', [], 'no')).lost, 'locked');
  assert.equal(SK.assess(acc('A', 'email', 'passkey', ['none'], 'no')).lost, 'locked');
  assert.equal(SK.assess(acc('A', 'bank', 'phoneapp', [], 'no')).lost, 'locked');
  assert.equal(SK.assess(acc('A', 'email', 'sms', [], 'no')).lost, 'slow');
  assert.equal(SK.assess(acc('A', 'email', 'pw', [], 'no')).lost, 'ok');
  assert.equal(SK.assess(acc('A', 'email', 'unsure', [], 'no')).lost, 'unsure');
  assert.equal(SK.assess(acc('A', 'email', '', [], '')).lost, 'unsure', 'unanswered counts as not sure');
  for (const b of ['email', 'phone2', 'codes', 'contact']) assert.equal(SK.assess(acc('A', 'email', 'app', [b], 'no')).lost, 'ok', b);
  assert.equal(SK.assess(acc('A', 'email', 'app', ['bogus'], 'no')).lost, 'locked', 'unknown backups are ignored');
});

test('assess: family reach needs a legacy setting or a trusted contact', () => {
  assert.equal(SK.assess(acc('A', 'social', 'pw', [], 'set')).reach, true);
  assert.equal(SK.assess(acc('A', 'social', 'pw', ['contact'], 'no')).reach, true);
  assert.equal(SK.assess(acc('A', 'social', 'pw', ['email'], 'no')).reach, false);
  assert.equal(SK.assess(acc('A', 'social', 'pw', [], 'na')).reach, false);
});

test('score: "if you lost your phone today, 4 of 9 would lock you out; your family could reach 2 of 9"', () => {
  const p = person([
    acc('Gmail', 'email', 'app', [], 'no'), acc('Bank', 'bank', 'phoneapp', [], 'no'), acc('WhatsApp', 'msg', 'sms', [], 'na'), acc('Wallet', 'money', 'unsure', [], 'unsure'),
    acc('Outlook', 'email', 'sms', ['email'], 'set'), acc('Facebook', 'social', 'pw', [], 'set'), acc('Card', 'bank', 'pw', [], 'no'), acc('Bitwarden', 'pm', 'app', ['codes'], 'no'), acc('Carrier', 'phone', 'pw', [], 'na'),
  ]);
  assert.deepEqual(J(SK.score(p)), { n: 9, ready: 5, atRisk: 4, locked: 2, slow: 1, unsure: 1, reach: 2, weak: 3 });
  assert.deepEqual(J(SK.score(person([]))), { n: 0, ready: 0, atRisk: 0, locked: 0, slow: 0, unsure: 0, reach: 0, weak: 0 });
});

// ------------------------------------------------------------------ fix list
test('fixes: email first, then lockouts, then the phone number, then family items; nothing for a fully ready account', () => {
  const p = person([
    acc('Bank', 'bank', 'phoneapp', [], 'no'), acc('Gmail', 'email', 'app', [], 'no'), acc('WhatsApp', 'msg', 'sms', [], 'na'),
    acc('Facebook', 'social', 'pw', ['email'], 'set'), acc('Outlook', 'email', 'app', ['codes', 'contact'], 'set'),
  ]);
  const f = J(SK.fixes(p));
  const kinds = f.map((x) => `${x.kind}${x.acc ? ':' + x.acc : ''}`);
  assert.equal(kinds[0], 'email-first');
  assert.equal(kinds[1], 'lost-locked:gmail', 'email lockout before the bank');
  assert.equal(kinds[2], 'lost-app:bank');
  assert.equal(kinds[3], 'carrier-pin', 'phone number lock right after the hard lockouts');
  assert.ok(kinds.indexOf('lost-slow:whatsapp') > kinds.indexOf('carrier-pin'));
  assert.ok(kinds.includes('legacy:gmail') && kinds.includes('legacy:bank'));
  assert.ok(kinds.includes('legacy-letter:whatsapp'), '"not offered" points to the family letter');
  assert.ok(kinds.includes('add-2sv:facebook'));
  assert.ok(kinds.includes('codes-place'), 'printed codes but no place written down');
  assert.ok(!kinds.some((k) => k.endsWith(':outlook')), 'ready account with legacy set has no fixes');
  const pris = f.map((x) => x.pri); assert.deepEqual(pris, [...pris].sort((a, b) => a - b), 'sorted by priority');
});

test('fixes: carrier PIN set and codes place written remove those items; self-custody wallet gets its own warning', () => {
  const p = person([acc('Gmail', 'email', 'sms', ['codes'], 'set'), acc('Wallet', 'crypto', 'pw', [], 'no', 'selfwallet')], { carrierPin: 'yes', codesPlace: 'blue folder, desk' });
  const kinds = J(SK.fixes(p)).map((x) => x.kind);
  assert.ok(!kinds.includes('carrier-pin')); assert.ok(!kinds.includes('codes-place'));
  assert.ok(kinds.includes('crypto-wallet')); assert.ok(!kinds.includes('legacy'), 'no "legacy setting" advice for a self-held wallet');
  assert.deepEqual(J(SK.fixes(person([acc('Gmail', 'email', 'app', ['email'], 'set')], { carrierPin: 'yes' }))), []);
});

test('recovery order on the sheet: email, phone number, password manager, banks, money, messaging...', () => {
  const p = person([acc('WhatsApp', 'msg', 'sms', [], 'na'), acc('Bank', 'bank', 'pw', [], 'no'), acc('Carrier', 'phone', 'pw', [], 'no'), acc('Gmail', 'email', 'pw', [], 'no'), acc('1Password', 'pm', 'pw', [], 'no')]);
  assert.deepEqual(J(SK.recoveryOrder(p)).map((a) => a.name), ['Gmail', 'Carrier', '1Password', 'Bank', 'WhatsApp']);
});

// ------------------------------------------------------------------ reminders (.ics)
test('ics: yearly review, CRLF lines, escaping, folding at 75 octets, valid all-day dates', () => {
  const ev = J(SK.reminders({ docs: [] }, '2026-10-12', false, {}));
  assert.equal(ev.length, 1); assert.equal(ev[0].date, '2027-10-12'); assert.equal(ev[0].yearly, true);
  const ics = SK.toICS([...ev, { uid: 'x1', date: '2027-02-28', title: 'Comma, semi; back\\slash', desc: 'line1\nline2 ' + 'é'.repeat(60) }], '20261012T120000Z');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Quickwell//Spare Key//EN\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'every line ends with CRLF');
  assert.match(ics, /DTSTART;VALUE=DATE:20271012\r\nDTEND;VALUE=DATE:20271013\r\n/);
  assert.match(ics, /RRULE:FREQ=YEARLY/);
  assert.match(ics, /DTEND;VALUE=DATE:20270301/, 'end date rolls over the month');
  assert.match(ics, /SUMMARY:Comma\\, semi\\; back\\\\slash/);
  assert.match(ics, /DESCRIPTION:line1\\nline2/);
  for (const l of ics.split('\r\n')) assert.ok(Buffer.byteLength(l, 'utf8') <= 75, `line over 75 octets: ${l}`);
  const unfolded = ics.replace(/\r\n /g, ''); assert.ok(unfolded.includes('é'.repeat(60)), 'folding never splits a character');
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 1);
});

test('ics: document expiry reminders only with the Family Pack, 90 days before and on the day, skipping past dates', () => {
  const plan = { docs: [{ label: 'Passport', who: 'Ana', expires: '2027-06-30' }, { label: 'Old ID', who: '', expires: '2026-01-01' }, { label: 'Licence', who: '', expires: '2026-11-01' }] };
  assert.equal(SK.reminders(plan, '2026-10-12', false).length, 1);
  const ev = J(SK.reminders(plan, '2026-10-12', true, { renewSoon: 'Renew soon', expiresToday: 'Expires today' }));
  const titles = ev.map((e) => `${e.date} ${e.title}`);
  assert.ok(titles.includes('2027-04-01 Renew soon: Passport (Ana)'));
  assert.ok(titles.includes('2027-06-30 Expires today: Passport (Ana)'));
  assert.ok(titles.includes('2026-11-01 Expires today: Licence'), 'expiry still ahead');
  assert.ok(!titles.some((x) => x.includes('Licence') && x.includes('Renew')), '90-days-before date already passed');
  assert.ok(!titles.some((x) => x.includes('Old ID')));
  assert.ok(SK.toICS(ev, '20261012T000000Z').includes('SUMMARY:Renew soon: Passport (Ana)'));
});

// ------------------------------------------------------------------ encryption
const samplePlan = () => {
  const plan = J(SK.newPlan()); plan.created = '2026-10-12';
  const p = J(SK.newPerson({ name: 'Ana', country: 'UK' }));
  p.accounts = [J(SK.newAccount('google', 'Google Account', 'email'))]; p.accounts[0].signin = 'app'; p.accounts[0].backups = ['codes']; p.accounts[0].legacy = 'set';
  p.codesPlace = 'grey box, hall closet';
  plan.people = [p]; plan.letter.contacts = [{ name: 'Leo', relation: 'brother', reach: '+44 7700 900123' }];
  return plan;
};

test('encryption: AES-GCM round trip with a PBKDF2 key at 600,000 iterations; envelope has no plaintext', async () => {
  const plan = samplePlan();
  const text = await SK.encrypt(plan, 'river-candle-otter-maple');
  const env = JSON.parse(text);
  assert.deepEqual(Object.keys(env).sort(), ['app', 'cipher', 'ct', 'iter', 'iv', 'kdf', 'salt', 'v']);
  assert.equal(env.iter, 600000); assert.equal(env.kdf, 'PBKDF2-SHA-256'); assert.equal(env.cipher, 'AES-GCM-256');
  assert.equal(Buffer.from(env.salt, 'base64').length, 16); assert.equal(Buffer.from(env.iv, 'base64').length, 12);
  for (const s of ['Ana', 'grey box', 'Google', 'Leo']) assert.ok(!text.includes(s), `plaintext leaked: ${s}`);
  const back = J(await SK.decrypt(text, 'river-candle-otter-maple'));
  assert.deepEqual(back, J(SK.sanitizePlan(plan)));
  assert.equal(back.people[0].accounts[0].legacy, 'set'); assert.equal(back.letter.contacts[0].reach, '+44 7700 900123');
  const again = JSON.parse(await SK.encrypt(plan, 'river-candle-otter-maple'));
  assert.notEqual(again.salt, env.salt); assert.notEqual(again.iv, env.iv);
});

test('encryption: wrong passphrase, tampering and junk files fail with clear errors', async () => {
  const text = await SK.encrypt(samplePlan(), 'right passphrase here', { iterations: 100000 });
  await assert.rejects(SK.decrypt(text, 'wrong passphrase here'), /wrong-pass/);
  const env = JSON.parse(text);
  const flipped = { ...env, ct: Buffer.from(Buffer.from(env.ct, 'base64').map((b, i) => (i === 3 ? b ^ 1 : b))).toString('base64') };
  await assert.rejects(SK.decrypt(JSON.stringify(flipped), 'right passphrase here'), /wrong-pass/);
  await assert.rejects(SK.decrypt(JSON.stringify({ ...env, iter: 200000 }), 'right passphrase here'), /wrong-pass/, 'header is bound to the ciphertext');
  await assert.rejects(SK.decrypt(JSON.stringify({ ...env, iter: 10 }), 'right passphrase here'), /not-a-file/, 'refuses weak iteration counts');
  await assert.rejects(SK.decrypt('not json', 'x'), /not-a-file/);
  await assert.rejects(SK.decrypt(JSON.stringify({ app: 'other' }), 'x'), /not-a-file/);
  assert.ok((await SK.decrypt(text, 'right passphrase here')).people.length === 1);
});

test('encryption: re-save with the in-memory key (no passphrase kept) opens with the passphrase', async () => {
  const r = await SK.encrypt(samplePlan(), 'kept key test phrase', { iterations: 100000, keep: true });
  const text2 = await SK.encryptWithKey({ ...samplePlan(), notes: 'x' }, r.key, r.salt, r.iter);
  assert.equal(JSON.parse(text2).salt, JSON.parse(r.text).salt);
  assert.equal((await SK.decrypt(text2, 'kept key test phrase')).people[0].name, 'Ana');
  assert.equal(r.key.extractable, false, 'derived key cannot be exported');
});

test('passphrases: generated ones are 6 words from the list; weak typed ones are refused', () => {
  const p = SK.makePassphrase(6).split('-');
  assert.equal(p.length, 6); for (const w of p) assert.ok(SK.WORDS.includes(w));
  assert.equal(new Set(SK.WORDS).size, SK.WORDS.length);
  assert.equal(SK.passOk('short'), false); assert.equal(SK.passOk('aaaaaaaaaaaaaa'), false); assert.equal(SK.passOk('three words here'), true);
});

// ------------------------------------------------------------------ no secrets
test('no secrets: the plan model has no field for passwords, PINs, codes or recovery phrases', () => {
  const plan = J(SK.newPlan()); plan.people = [J(SK.newPerson({}))]; plan.people[0].accounts = [J(SK.newAccount('google'))];
  const keys = []; const walk = (o) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { keys.push(k); walk(v); } }; walk(plan);
  for (const k of keys) assert.ok(!/pass|pin$|^pin|code|seed|phrase|secret|otp|token|cvv/i.test(k) || k === 'carrierPin' || k === 'codesPlace', `suspicious field: ${k}`);
});

test('no secrets: imported files are cut down to known fields, and secret-looking text is dropped', () => {
  const evil = samplePlan();
  evil.password = 'hunter2'; evil.people[0].pin = '1234'; evil.people[0].accounts[0].backupCodes = ['1111-2222'];
  evil.people[0].codesPlace = '8812 4471 9932 1180'; evil.letter.notes = 'seed: abandon ability able about above absent absorb abstract absurd abuse access accident';
  evil.letter.where.will = 'Lawyer office, 12 High St'; evil.people[0].accounts[0].signin = 'telepathy';
  const out = J(SK.sanitizePlan(evil)); const s = JSON.stringify(out);
  for (const bad of ['hunter2', '"pin"', 'backupCodes', '8812', 'abandon', 'telepathy', '"password"']) assert.ok(!s.includes(bad), bad);
  assert.equal(out.letter.where.will, 'Lawyer office, 12 High St');
  assert.equal(out.people[0].accounts[0].signin, '');
  assert.throws(() => SK.sanitizePlan({ people: [] }), /not-a-plan/);
});

test('no secrets: the guard flags codes, PINs, labelled passwords and recovery phrases, not places', () => {
  for (const s of ['123456', '0000 1111', 'ab12-cd34', 'password: hunter2', 'PIN is 4821', 'Kx9mQ2pL8vR4tY7wZ', 'abandon ability able about above absent absorb abstract absurd abuse access accident']) assert.ok(SK.looksSecret(s), s);
  for (const s of ['', 'Fireproof box in the hall closet', 'Top drawer, blue folder', 'Mom has a copy at 12 Oak Street', 'my sister Ana', 'Caja gris, armario del dormitorio']) assert.equal(SK.looksSecret(s), '', s);
});

test('no secrets: the page has no free-text field that asks for a password, PIN, code or phrase', () => {
  const body = html.split('<body>')[1].split('<script')[0];
  const fields = [...body.matchAll(/<(input|textarea)\b[^>]*>/g)].map((m) => m[0]);
  for (const f of fields) {
    if (/type="(checkbox|radio|file|date)"/.test(f)) continue;
    if (/type="password"/.test(f)) { assert.match(f, /data-passphrase="true"/, `only the file passphrase may be a password field: ${f}`); continue; }
    assert.ok(!/(pass ?word|passcode|\bpin\b|seed|phrase|backup code|recovery code|one-time|otp)/i.test(f.replace(/data-passphrase="true"/, '')), `field asks for a secret: ${f}`);
  }
  // labels of text fields
  for (const m of body.matchAll(/<label class="f"[^>]*>([\s\S]*?)<\/label>/g)) {
    const label = m[1].replace(/<[^>]+>/g, ' ');
    if (/data-passphrase/.test(m[1])) continue;
    assert.ok(!/(enter|type|your) (pass ?word|pin|code|seed|recovery phrase)/i.test(label), label);
  }
});

test('library: plain names, no logos, https links only, and no unverified steps shipped', () => {
  for (const p of SK.LIBRARY) {
    assert.ok(!p.url || p.url.startsWith('https://'), p.id);
    assert.ok(Array.isArray(p.steps));
    if (p.steps.length) assert.match(String(p.checked), /^\d{4}-\d{2}-\d{2}$/, `${p.id}: steps without a check date`);
    else assert.equal(p.checked, null);
  }
  assert.ok(SK.LIBRARY.length >= 60);
  assert.ok(!/<img\b|logo\.(png|svg|jpe?g)|url\(https?:/i.test(html), 'no logos or remote images');
  assert.equal(SK.guessCountry('en-GB'), 'UK'); assert.equal(SK.guessCountry('es-MX'), 'OTHER'); assert.equal(SK.guessCountry('de-DE'), 'EU'); assert.equal(SK.guessCountry('en'), 'US');
});
