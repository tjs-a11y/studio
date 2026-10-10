// Fails if a live or test Stripe key ever lands in this repo (the leading cause of key takeovers).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
test('no Stripe keys in tracked files', () => {
  const files = execSync('git ls-files -co --exclude-standard', { encoding: 'utf8' }).split('\n').filter((f) => f && !f.startsWith('node_modules/') && !f.startsWith('test/'));
  const re = /\b(sk|rk)_(live|test)_[A-Za-z0-9]{10,}|whsec_[A-Za-z0-9]{20,}/;
  for (const f of files) { let s = ''; try { s = execSync(`cat ${JSON.stringify(f)}`, { encoding: 'utf8' }); } catch { continue; } assert.ok(!re.test(s), `secret-looking string in ${f}`); }
});
