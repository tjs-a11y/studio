// Footsure: family share link. The check history is encrypted in the browser with AES-GCM (256-bit,
// random key) and both the key and the ciphertext go after the "#" in the link. Browsers never send the part
// after "#" to a server, so nothing reaches us. Anyone holding the full link can read it.
const VERSION = 'v1';
const subtle = () => {
  const c = globalThis.crypto;
  if (!c || !c.subtle) throw new Error('This browser cannot encrypt here (it needs a secure https page).');
  return c.subtle;
};

export function toB64url(bytes) {
  let s = '';
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function fromB64url(str) {
  if (!/^[A-Za-z0-9_-]*$/.test(str)) throw new Error('Bad link');
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Encrypt any JSON-able value. Returns the fragment token "v1.<key>.<iv>.<ciphertext>". */
export async function encryptPayload(value) {
  const key = await subtle().generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, key, data);
  const raw = await subtle().exportKey('raw', key);
  return [VERSION, toB64url(raw), toB64url(iv), toB64url(new Uint8Array(ct))].join('.');
}

/** Decrypt a token from encryptPayload. Throws if it was altered or is not ours. */
export async function decryptPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) throw new Error('This share link is not complete. Ask for it again.');
  const [, k, iv, ct] = parts;
  const key = await subtle().importKey('raw', fromB64url(k), { name: 'AES-GCM' }, false, ['decrypt']);
  let plain;
  try { plain = await subtle().decrypt({ name: 'AES-GCM', iv: fromB64url(iv) }, key, fromB64url(ct)); }
  catch (e) { throw new Error('This share link was changed or cut off. Ask for it again.'); }
  return JSON.parse(new TextDecoder().decode(plain));
}

/** Keep only what a family member needs to see: no ids, no auto/manual internals. */
export function sharePayload(person, checks) {
  return {
    v: 1,
    label: String(person.label || '').slice(0, 40),
    sex: person.sex,
    checks: checks.map((c) => ({ d: c.date, a: c.age, s: c.stands, u: !!c.armsUsed, b: c.balanceStages, g: c.tugSeconds })),
  };
}
export function unpackShare(p) {
  if (!p || p.v !== 1 || !Array.isArray(p.checks)) throw new Error('This share link is from a newer version.');
  return {
    person: { label: p.label || 'Shared', sex: p.sex },
    checks: p.checks.map((c) => ({ date: c.d, age: c.a, sex: p.sex, stands: c.s, armsUsed: !!c.u, balanceStages: c.b, tugSeconds: c.g })),
  };
}

export function buildShareUrl(pageUrl, token) {
  const u = new URL(pageUrl);
  u.search = ''; u.hash = 's=' + token;
  return u.toString();
}
export function tokenFromHash(hash) {
  const m = /^#?s=([A-Za-z0-9_.-]+)$/.exec(hash || '');
  return m ? m[1] : null;
}
