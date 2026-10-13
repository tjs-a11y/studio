// Writes fixtures/<name>.txt from tests/letters.mjs (synthetic letters; every name, number and address is invented),
// for trying the page by hand (paste, or upload as a text file).   node scripts/make-fixtures.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LETTERS } from '../tests/letters.mjs';
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
mkdirSync(out, { recursive: true });
for (const [k, L] of Object.entries(LETTERS)) writeFileSync(join(out, `${k}.txt`), L.text + '\n');
console.log(`${Object.keys(LETTERS).length} fixtures written`);
