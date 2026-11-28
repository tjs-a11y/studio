import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bill = readFileSync(new URL('../bill-radar/index.html', import.meta.url), 'utf8');

test('Bill Radar empty inputs use field-associated inline validation instead of a blocking alert', () => {
  assert.match(bill, /id="inputError"[^>]*role="alert"[^>]*aria-live="assertive"/);
  assert.equal((bill.match(/aria-describedby="inputError"/g) || []).length, 2);
  assert.match(bill, /function validateRequiredInputs\(show\)/);
  assert.match(bill, /if\(!validateRequiredInputs\(true\)\)/);
  assert.doesNotMatch(bill, /alert\(['"]Enter your monthly kWh/);
  assert.match(bill, /setAttribute\('aria-invalid','true'\)/);
});

test('Bill Radar announces the forecast summary to assistive technology', () => {
  assert.match(bill, /id="next12"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
});
