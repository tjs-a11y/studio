// Footsure: check history in IndexedDB, on this device only. Falls back to memory (this visit only)
// when IndexedDB is blocked, e.g. some private windows.
const DB = 'footsure', VER = 1;
let dbp = null, memory = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('people')) db.createObjectStore('people', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('checks')) db.createObjectStore('checks', { keyPath: 'id' }).createIndex('personId', 'personId');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch (e) { resolve(null); }
  });
  return dbp;
}
function mem() { return memory || (memory = { people: new Map(), checks: new Map() }); }
const tx = (db, store, mode, fn) => new Promise((resolve, reject) => {
  const t = db.transaction(store, mode); const s = t.objectStore(store); const r = fn(s);
  t.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
  t.onerror = () => reject(t.error);
});

export const newId = () => (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));

export async function persistent() { return !!(await open()); }

export async function putPerson(p) {
  const db = await open();
  if (!db) { mem().people.set(p.id, p); return p; }
  await tx(db, 'people', 'readwrite', (s) => s.put(p)); return p;
}
export async function listPeople() {
  const db = await open();
  const all = db ? await tx(db, 'people', 'readonly', (s) => s.getAll()) : [...mem().people.values()];
  return all.sort((a, b) => (a.created || '').localeCompare(b.created || ''));
}
export async function addCheck(c) {
  const db = await open();
  if (!db) { mem().checks.set(c.id, c); return c; }
  await tx(db, 'checks', 'readwrite', (s) => s.put(c)); return c;
}
export async function listChecks(personId) {
  const db = await open();
  const all = db ? await tx(db, 'checks', 'readonly', (s) => s.index('personId').getAll(personId)) : [...mem().checks.values()].filter((c) => c.personId === personId);
  return all.sort((a, b) => a.date.localeCompare(b.date));
}
export async function deleteEverything() {
  const db = await open();
  if (!db) { memory = null; return; }
  await tx(db, 'checks', 'readwrite', (s) => s.clear());
  await tx(db, 'people', 'readwrite', (s) => s.clear());
}
