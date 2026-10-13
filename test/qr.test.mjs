// The build-time QR encoder (scripts/qr.mjs) against a known vector, plus the printed flyer's code.
// The vector was produced by an independent encoder (the "qrcode" npm package, v1.5.4, byte mode, level M) and
// checked by decoding it with jsQR 1.4.0; both were used once, outside the repo, so the site keeps no dependency.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encode, toSVG, flyerSVG, FLYER_URL } from '../scripts/qr.mjs';

const root = new URL('..', import.meta.url).pathname;
const VECTOR = {
  text: 'https://quickwell.app/footsure/?ref=flyer', ecl: 'M', version: 3, mask: 7,
  rows: ['11111110000100110011001111111', '10000010001001110010101000001', '10111010011110000111101011101', '10111010010100101010001011101', '10111010000100110110101011101', '10000010110111010111101000001', '11111110101010101010101111111', '00000000001010000110000000000', '10010110100011101000110100000', '00111001011010101000111001001', '00111111111111101101101101110', '10001100010111011011101000110', '11010011000111001100011001011', '11001100001000000111100000000', '01010011000010101100111011111', '11000000001001100101001111010', '11001110010010001101110000010', '00010100111111001010011101001', '10111111011111100110111110011', '00001101001100000111101000011', '10100010110100010001111110100', '00000000101100000111100010111', '11111110001110001000101010010', '10000010110100101011100011100', '10111010001010011100111110000', '10111010100000001110001011110', '10111010010111000011100011101', '10000010010101111101101000010', '11111110100111000100100010010'],
};

test('QR encoder matches an independent encoder module for module (version 3-M, mask 7)', () => {
  const q = encode(VECTOR.text, VECTOR.ecl);
  assert.equal(q.version, VECTOR.version);
  assert.equal(q.mask, VECTOR.mask, 'automatic mask choice');
  assert.deepEqual(q.modules.map((r) => r.map((b) => (b ? 1 : 0)).join('')), VECTOR.rows);
});

test('QR encoder picks the smallest version and refuses text that is too long', () => {
  assert.equal(encode('hello', 'L').version, 1);
  assert.equal(encode('x'.repeat(100), 'M').version, 6);
  assert.throws(() => encode('x'.repeat(400), 'H'));
});

test('the flyer prints the QR code for the Footsure link with ?ref=flyer', () => {
  assert.equal(FLYER_URL, VECTOR.text);
  const html = readFileSync(root + 'footsure/flyer/index.html', 'utf8');
  assert.ok(html.includes(flyerSVG()), 'flyer QR is stale: run node scripts/qr.mjs --flyer');
  assert.match(toSVG(encode('a')), /^<svg [^>]*viewBox="0 0 29 29"/); // 21 modules + 2 x 4 quiet zone
});
