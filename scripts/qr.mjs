// Minimal QR Code encoder, no dependencies. Byte mode, versions 1-10, error correction L/M/Q/H, automatic mask.
// Written for Quickwell from the public QR Code specification (ISO/IEC 18004); used at build time to draw the
// QR codes on printables as inline SVG, so the printed page needs no script or outside service.
//   import { encode, toSVG } from './qr.mjs'
//   const m = encode('https://example.com', 'M')   // m.size, m.get(x, y) -> true for a dark module
//   toSVG(m, { label: 'QR code: example.com' })
//   node scripts/qr.mjs <text> [L|M|Q|H]           prints the SVG
//   node scripts/qr.mjs --flyer                     rewrites the QR code inside footsure/flyer/index.html

// Tables for versions 1-10 (index 0 unused), in the order L, M, Q, H.
const ECC_PER_BLOCK = {
  L: [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
  M: [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
  Q: [0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
  H: [0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28],
};
const BLOCKS = {
  L: [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  M: [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
  Q: [0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
  H: [0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8],
};
const FORMAT_ECC = { L: 1, M: 0, Q: 3, H: 2 };
const MAX_VERSION = 10;

const bit = (x, i) => ((x >>> i) & 1) !== 0;

function rawDataModules(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) { const n = Math.floor(ver / 7) + 2; r -= (25 * n - 10) * n - 55; if (ver >= 7) r -= 36; }
  return r;
}
const dataCodewords = (ver, ecl) => Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ecl][ver] * BLOCKS[ecl][ver];

// GF(256) with the QR polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11D).
function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
  return z & 0xff;
}
function rsDivisor(degree) {
  const r = new Array(degree).fill(0); r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
    root = gfMul(root, 0x02);
  }
  return r;
}
function rsRemainder(data, divisor) {
  const r = divisor.map(() => 0);
  for (const b of data) {
    const f = b ^ r.shift(); r.push(0);
    divisor.forEach((c, i) => { r[i] ^= gfMul(c, f); });
  }
  return r;
}

function alignmentPositions(ver) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2; const size = ver * 4 + 17;
  const step = Math.floor((ver * 8 + n * 3 + 5) / (n * 4 - 4)) * 2;
  const out = [6];
  for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
  return out;
}

const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

// Penalty score (lower is better) for choosing a mask: runs, 2x2 blocks, finder-like patterns, dark balance.
function penalty(m, size) {
  let p = 0; let dark = 0;
  const line = (get) => {
    let s = 0;
    for (let a = 0; a < size; a++) {
      let run = 1;
      for (let b = 1; b < size; b++) {
        if (get(a, b) === get(a, b - 1)) run++;
        else { if (run >= 5) s += run - 2; run = 1; }
      }
      if (run >= 5) s += run - 2;
      for (let b = 0; b + 10 < size; b++) {
        let w = 0; for (let k = 0; k < 11; k++) w = (w << 1) | (get(a, b + k) ? 1 : 0);
        if (w === 0x5d0 || w === 0x05d) s += 40;
      }
    }
    return s;
  };
  p += line((y, x) => m[y][x]);
  p += line((x, y) => m[y][x]);
  for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
    const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
  }
  for (const row of m) for (const c of row) if (c) dark++;
  const total = size * size;
  p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return p;
}

// Encode text (UTF-8, byte mode) at the smallest version that fits. mask: 0-7 to force one, or omit for automatic.
export function encode(text, ecl = 'M', { mask, minVersion = 1 } = {}) {
  if (!(ecl in FORMAT_ECC)) throw new Error(`unknown error correction level ${ecl}`);
  const bytes = [...new TextEncoder().encode(text)];
  let ver = minVersion;
  const bitsNeeded = (v) => 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
  while (ver <= MAX_VERSION && bitsNeeded(ver) > dataCodewords(ver, ecl) * 8) ver++;
  if (ver > MAX_VERSION) throw new Error('text too long for this encoder (versions 1-10)');
  const capacity = dataCodewords(ver, ecl);

  // Data bits: mode 0100 (byte), character count, the bytes, terminator, padding.
  const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  put(0, Math.min(4, capacity * 8 - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity * 8; pad ^= 0xec ^ 0x11) put(pad, 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

  // Split into blocks, add Reed-Solomon error correction, interleave.
  const nBlocks = BLOCKS[ecl][ver]; const eccLen = ECC_PER_BLOCK[ecl][ver];
  const rawCodewords = Math.floor(rawDataModules(ver) / 8);
  const nShort = nBlocks - (rawCodewords % nBlocks); const shortLen = Math.floor(rawCodewords / nBlocks);
  const div = rsDivisor(eccLen); const blocks = [];
  for (let i = 0, k = 0; i < nBlocks; i++) {
    const d = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1)); k += d.length;
    const ecc = rsRemainder(d, div);
    if (i < nShort) d.push(0); // placeholder, skipped below
    blocks.push(d.concat(ecc));
  }
  const codewords = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= nShort) codewords.push(b[i]); });

  // Function patterns.
  const size = ver * 4 + 17;
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy; const d = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const al = alignmentPositions(ver); const last = al.length - 1;
  for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const drawFormat = (m) => {
    const d = (FORMAT_ECC[ecl] << 3) | m; let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, bit(b, i));
    set(8, 7, bit(b, 6)); set(8, 8, bit(b, 7)); set(7, 8, bit(b, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(b, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(b, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(b, i));
    set(8, size - 8, true);
  };
  drawFormat(0); // reserve the format areas
  if (ver >= 7) {
    let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (ver << 12) | r;
    for (let i = 0; i < 18; i++) { const a = size - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, bit(b, i)); set(c, a, bit(b, i)); }
  }

  // Place the codewords in the zigzag order, skipping function modules.
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
      const x = right - j; const up = ((right + 1) & 2) === 0; const y = up ? size - 1 - v : v;
      if (!fn[y][x] && i < codewords.length * 8) { mod[y][x] = bit(codewords[i >>> 3], 7 - (i & 7)); i++; }
    }
  }

  const apply = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x]; };
  let chosen = mask;
  if (chosen === undefined) {
    let best = Infinity;
    for (let m = 0; m < 8; m++) { apply(m); drawFormat(m); const p = penalty(mod, size); if (p < best) { best = p; chosen = m; } apply(m); }
  }
  apply(chosen); drawFormat(chosen);
  return { version: ver, ecl, mask: chosen, size, modules: mod, get: (x, y) => mod[y][x] };
}

// SVG with a 4-module quiet zone. One <path> of 1x1 squares; crisp at any print size.
export function toSVG(qr, { label = 'QR code', quiet = 4, className = 'qr' } = {}) {
  const n = qr.size + quiet * 2; let d = '';
  for (let y = 0; y < qr.size; y++) {
    let x = 0;
    while (x < qr.size) {
      if (!qr.get(x, y)) { x++; continue; }
      let w = 1; while (x + w < qr.size && qr.get(x + w, y)) w++;
      d += `M${x + quiet} ${y + quiet}h${w}v1h-${w}z`; x += w;
    }
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<svg class="${className}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" role="img" aria-label="${esc(label)}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path fill="#000" d="${d}"/></svg>`;
}

export const FLYER_URL = 'https://quickwell.app/footsure/?ref=flyer';
export const flyerSVG = () => toSVG(encode(FLYER_URL, 'M'), { label: 'QR code: quickwell.app/footsure' });

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const arg = process.argv[2];
  if (arg === '--flyer') {
    const { readFileSync, writeFileSync } = await import('node:fs');
    const f = new URL('../footsure/flyer/index.html', import.meta.url);
    const html = readFileSync(f, 'utf8');
    const out = html.replace(/<!-- qr -->[\s\S]*?<!-- \/qr -->/, `<!-- qr -->${flyerSVG()}<!-- /qr -->`);
    if (out === html && !html.includes(flyerSVG())) throw new Error('no <!-- qr --> marker in the flyer');
    writeFileSync(f, out); console.log('flyer QR code written');
  } else if (arg) {
    console.log(toSVG(encode(arg, process.argv[3] || 'M')));
  } else {
    console.log('usage: node scripts/qr.mjs <text> [L|M|Q|H]  |  node scripts/qr.mjs --flyer');
  }
}
