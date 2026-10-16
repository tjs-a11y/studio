// Rule engine tests: the labelled synthetic corpus (precision / recall), single rules, negations, highlights, HTML.
// Run: node --test tests/engine.test.mjs   (prints the corpus report as test diagnostics)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORPUS, BATCH2, HOLDOUT } from './corpus.mjs';
import { check, segments, LIKELY, SUSPICIOUS, COMBOS } from '../js/check.mjs';
import { RULES, runRules } from '../js/rules.mjs';
import { CHECKS } from '../js/url.mjs';
import { STR } from '../js/i18n.mjs';

export function report(set) {
  const c = { scam: { scam: 0, suspicious: 0, none: 0 }, legit: { scam: 0, suspicious: 0, none: 0 } };
  const misses = [];
  for (const m of set) { const r = check(m.text); c[m.label][r.level]++; if ((m.label === 'scam' && r.level === 'none') || (m.label === 'legit' && r.level !== 'none')) misses.push(`${m.label}/${m.kind} → ${r.level}`); }
  const S = c.scam.scam + c.scam.suspicious + c.scam.none, Lg = c.legit.scam + c.legit.suspicious + c.legit.none;
  const tp = c.scam.scam + c.scam.suspicious, fp = c.legit.scam + c.legit.suspicious;
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  return {
    scams: S, legit: Lg, c, misses,
    recall: pct(tp, S),                         // scams flagged at least Suspicious
    precision: pct(tp, tp + fp),                // of everything flagged, share that was a scam
    recallLikely: pct(c.scam.scam, S),          // scams rated Likely scam
    precisionLikely: pct(c.scam.scam, c.scam.scam + c.legit.scam),
    legitLikely: pct(c.legit.scam, Lg),         // everyday messages wrongly rated Likely scam
    legitFlagged: pct(fp, Lg),                  // everyday messages flagged at least Suspicious
  };
}
const fmt = (n, r) => `${n}: ${r.scams} scams + ${r.legit} everyday | flagged ≥Suspicious: recall ${r.recall}%, precision ${r.precision}% | Likely scam: recall ${r.recallLikely}%, precision ${r.precisionLikely}% | everyday rated Likely ${r.legitLikely}%, flagged at all ${r.legitFlagged}%${r.misses.length ? ' | misses: ' + r.misses.join(', ') : ''}`;

test('corpus size and mix: ≥40 scams and ≥20 everyday messages, English and Spanish', () => {
  const all = [...CORPUS, ...BATCH2, ...HOLDOUT];
  assert.ok(all.filter((m) => m.label === 'scam').length >= 40);
  assert.ok(all.filter((m) => m.label === 'legit').length >= 20);
  for (const l of ['en', 'es']) for (const lab of ['scam', 'legit']) assert.ok(all.some((m) => m.lang === l && m.label === lab), `${l}/${lab}`);
  for (const m of all) assert.ok(!/\b(?!555)\d{3}[-.) ]\d{3}-\d{4}\b/.test(m.text.replace(/\(\d{3}\) 555-\d{4}|\d-\d{3}-555-\d{4}|\d{3}-555-\d{4}/g, '')), `real-looking phone number: ${m.text}`);
});

test('targets: ≥90% of scams flagged at least Suspicious, ≤10% of everyday messages rated Likely scam', (t) => {
  const tune = report([...CORPUS, ...BATCH2]), hold = report(HOLDOUT), all = report([...CORPUS, ...BATCH2, ...HOLDOUT]);
  t.diagnostic(fmt('tuning set', tune)); t.diagnostic(fmt('held-out set', hold)); t.diagnostic(fmt('all', all));
  for (const [name, r] of [['tuning', tune], ['held-out', hold], ['all', all]]) {
    assert.ok(r.recall >= 90, `${name} recall ${r.recall}`);
    assert.ok(r.legitLikely <= 10, `${name} everyday rated Likely ${r.legitLikely}`);
  }
});

test('levels: never "safe"; thresholds as documented', () => {
  assert.equal(SUSPICIOUS, 2); assert.equal(LIKELY, 5);
  for (const l of ['en', 'es']) for (const v of Object.values(STR[l].level)) assert.ok(!/\bsafe\b|\bseguro\b/i.test(v), v);
  assert.match(STR.en.levelSub.none, /doesn’t make it safe/); assert.match(STR.es.levelSub.none, /no significa que sea seguro/);
  assert.equal(check('See you at 6 for dinner?').level, 'none');
});

test('every rule, link check and combination has a name and explanation in both languages', () => {
  const ids = [...RULES.map((r) => r.id), ...CHECKS.map((c) => c.id), ...COMBOS.map((c) => c.id)];
  assert.equal(new Set(ids).size, ids.length, 'unique ids');
  for (const l of ['en', 'es']) for (const id of ids) { const v = STR[l].r[id]; assert.ok(Array.isArray(v) && v.length === 2 && v[0] && v[1], `${l}: ${id}`); }
  for (const id of Object.keys(STR.en.r)) assert.ok(ids.includes(id), `unused text ${id}`);
});

test('single rules fire on their own words (EN + ES)', () => {
  const fires = {
    urgency: ['Act now', 'responda de inmediato'], threat: ['a warrant has been issued', 'orden de arresto'], secrecy: ["don't tell anyone", 'no le digas a nadie'],
    bank: ['unusual sign-in activity', 'actividad sospechosa'], 'gov-ssn': ['your Social Security number has been suspended'], delivery: ['we were unable to deliver your parcel', 'no pudimos entregar su paquete'],
    toll: ['unpaid toll balance', 'peajes pendientes'], tech: ['your computer is infected', 'soporte técnico'], remote: ['install AnyDesk', 'acceso remoto'],
    'family-new': ['this is my new number', 'este es mi nuevo número'], 'family-trouble': ["I've been arrested", 'estoy detenido'], 'pay-giftcard': ['pay with Google Play cards', 'pague con tarjetas de regalo'],
    'pay-crypto': ['send Bitcoin', 'criptomonedas'], 'pay-wire': ['use Western Union', 'transferencia bancaria'], 'pay-p2p': ['on Zelle', 'por Bizum'], 'safe-account': ['move your money to a safe account', 'cuenta segura'],
    'code-ask': ['read me the code', 'díctame el código'], 'pii-ask': ['confirm your card number', 'confirme su número de tarjeta'], prize: ["you've won", 'ha ganado'],
    invest: ['guaranteed returns', 'rendimientos garantizados'], job: ['earn $300 per day', 'gana $500 al día'], romance: ["I'm on an oil rig", 'plataforma petrolera'],
    overpay: ['I overpaid you', 'te envié de más'], 'wrong-number': ['sorry, wrong number'], click: ['click the link', 'haz clic'], 'chat-app': ['message us on Telegram', 'escríbenos por WhatsApp'],
    'call-in': ['call our toll-free number', 'llame a este número'], 'money-ask': ['can you send me $200', 'envíame $500'], fees: ['late fees', 'recargos'],
  };
  for (const [id, phrases] of Object.entries(fires)) for (const p of phrases) assert.ok(runRules(p)[id], `${id} should fire on "${p}"`);
});

test('negations: a code that says "never share" is not a request', () => {
  for (const s of ['Your code is 123456. Never share this code.', 'Do not share this code with anyone', "We'll never ask you to send the code", 'Tu código es 1234. No compartas este código.'])
    assert.ok(!runRules(s)['code-ask'], s);
  assert.ok(runRules('Please send me the code you just got')['code-ask']);
  assert.ok(runRules('No worries, just send me the code')['code-ask'], '"No worries" is not a negation');
});

test('a code sent "by mistake" is a code scam, not an overpayment (EN + ES)', () => {
  // Found 2026-10-15 while filming the TikTok test: the code sample also showed "Overpaid by mistake" (+2) and
  // "Overpayment + send money" (+2), though it mentions no money.
  const codeOnly = [
    'Hi, I accidentally sent my verification code to your number. Can you send it to me? It is a 6-digit code.',
    'Sorry, I accidentally sent you a code, please send it back',
    'I mistakenly sent my 6-digit code to your phone, can you send it back?',
    'Hey, I sent a code to your phone by mistake. Can you text it to me?',
    'Te envié por error un código de verificación. ¿Me lo pasas?',
    'Hola, te envié un código de WhatsApp por error. ¿Me lo pasas?',
  ];
  for (const s of codeOnly) {
    const r = check(s), ids = r.findings.map((f) => f.id);
    assert.ok(ids.includes('code-ask'), `code-ask should fire: ${s}`);
    assert.ok(!ids.includes('overpay') && !ids.includes('combo-overpay'), `no overpayment signs: ${s} → ${ids.join(', ')}`);
    assert.equal(r.level, 'scam', s);
    assert.ok(r.kinds.includes('code'), s);
  }
  // real overpayment scams still fire, in both languages
  for (const s of [
    'I accidentally sent you $300 on Zelle, please send it back',
    'I sent you $500 by mistake on Cash App. Please send back the money as soon as possible, it was for my rent.',
    'I accidentally transferred 200 dollars to you, can you return the money?',
    'I overpaid you',
    'Te envié por error 200 dólares, devuélvemelos por Zelle',
    'te envié de más',
  ]) assert.ok(runRules(s).overpay, `overpay should fire: ${s}`);
  assert.equal(check('Te envié por error 200 dólares, devuélvemelos por Zelle').level, 'scam');
});

test('highlights point at the exact words, and segments rebuild the original text', () => {
  const text = 'URGENT: pay with Apple gift cards and tell no one. https://bit.ly/x1';
  const r = check(text);
  const f = Object.fromEntries(r.findings.map((x) => [x.id, x]));
  assert.equal(f.urgency.spans[0].text, 'URGENT');
  assert.match(f['pay-giftcard'].spans[0].text, /Apple gift cards/);
  assert.equal(f.secrecy.spans[0].text, 'tell no one');
  assert.equal(f['url-shortener'].spans[0].text, 'https://bit.ly/x1');
  const segs = segments(r.text, r.findings);
  assert.equal(segs.map((s) => s.text).join(''), text);
  assert.ok(segs.some((s) => s.ids.includes('pay-giftcard') && /gift cards/.test(s.text)));
  assert.equal(r.level, 'scam');
});

test('pasted HTML: link text vs real address, and the HTML is read as plain text', () => {
  const r = check('<p>Hello,</p><p>Your parcel is waiting. <a href="https://track-fedx.xyz/p">https://www.fedex.com/track</a></p>');
  assert.ok(r.html); assert.ok(!/<p>/.test(r.text));
  const mm = r.findings.find((f) => f.id === 'url-mismatch');
  assert.ok(mm); assert.equal(mm.detail.shown, 'www.fedex.com'); assert.equal(mm.detail.real, 'track-fedx.xyz');
  assert.ok(r.findings.find((f) => f.id === 'url-lookalike'));
  assert.equal(r.text.slice(mm.spans[0].s, mm.spans[0].e), 'https://www.fedex.com/track');
  const ok = check('<p>Your books are due. <a href="https://www.mylibrary.org/account">mylibrary.org/account</a></p>');
  assert.ok(!ok.findings.find((f) => f.id === 'url-mismatch'));
});

test('transparency: every rule, link check and combination is reported as run, hit or not', () => {
  const r = check('Hello');
  assert.equal(r.ran.length, RULES.length + CHECKS.length + COMBOS.length);
  assert.ok(r.ran.every((x) => x.hit === false));
  const s = check('Hi Mom, this is my new number, can you send me $500 on Zelle?');
  for (const id of ['family-new', 'money-ask', 'pay-p2p', 'combo-trust-money']) assert.ok(s.ran.find((x) => x.id === id).hit, id);
  assert.deepEqual(s.kinds, ['family']);
});

test('junk input never throws', () => {
  for (const s of ['', ' ', '\u0000\u0001', '<<<>>>', 'http://', 'https://[::1]/x', 'xn--', 'a'.repeat(20000), '😀'.repeat(500), '<a href=javascript:alert(1)>x</a>', 'http://%%%/', 'www.']) assert.doesNotThrow(() => check(s), JSON.stringify(s.slice(0, 20)));
});
