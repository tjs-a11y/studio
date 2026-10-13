import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeIcs, nextMonthly, fold, escapeText } from '../js/ics.mjs';

test('next monthly date clamps to the end of short months', () => {
  const d = nextMonthly(new Date(2026, 0, 31, 8));
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2026, 1, 28, 10]);
  const dec = nextMonthly(new Date(2026, 11, 15));
  assert.deepEqual([dec.getFullYear(), dec.getMonth(), dec.getDate()], [2027, 0, 15]);
});

test('ics: monthly repeating event with alarm, CRLF lines, folded at 75 octets', () => {
  const ics = makeIcs({ start: new Date(2026, 10, 13, 10), label: 'Mom, Dad; and me', url: 'https://quickwell.app/footsure/', now: new Date(Date.UTC(2026, 9, 13)), uid: 'x@y' });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.match(ics, /\r\nDTSTART:20261113T100000\r\n/);
  assert.match(ics, /\r\nRRULE:FREQ=MONTHLY;COUNT=12\r\n/);
  assert.match(ics, /BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT30M/);
  assert.match(ics, /DTSTAMP:20261013T000000Z/);
  assert.ok(ics.replace(/\r\n /g, '').includes('Mom\\, Dad\\; and me'), 'escaped label (after unfolding)');
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.ok(!/[^\r]\n/.test(ics), 'only CRLF line ends');
});

test('fold and escape helpers', () => {
  const long = 'DESCRIPTION:' + 'é'.repeat(80);
  const f = fold(long);
  assert.equal(f.split('\r\n ').join(''), long);
  assert.equal(escapeText('a\\b,c;d\ne'), 'a\\\\b\\,c\\;d\\ne');
});
