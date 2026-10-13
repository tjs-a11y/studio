// Footsure: monthly re-check reminder as a calendar file (.ics). No email, no account.
const pad = (n) => String(n).padStart(2, '0');
export const escapeText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
export function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = []; let cur = ''; let curLen = 0; let limit = 75;
  for (const ch of line) {
    const l = new TextEncoder().encode(ch).length;
    if (curLen + l > limit) { out.push(cur); cur = ''; curLen = 0; limit = 74; }
    cur += ch; curLen += l;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/** Same day next month (clamped to the month's last day), at hour:00 local time. */
export function nextMonthly(from, hour = 10) {
  const y = from.getFullYear(), m = from.getMonth() + 1;
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(from.getDate(), last), hour, 0, 0);
}

const local = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const utc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function makeIcs({ start, label = '', url = '', months = 12, now = new Date(), uid } = {}) {
  const who = label ? ` (${label})` : '';
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Quickwell//Footsure//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid || `footsure-${now.getTime()}-${Math.random().toString(36).slice(2, 10)}@quickwell.app`}`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${local(start)}`,
    'DURATION:PT15M',
    `RRULE:FREQ=MONTHLY;COUNT=${months}`,
    `SUMMARY:${escapeText(`Footsure: monthly strength and balance re-check${who}`)}`,
    `DESCRIPTION:${escapeText(`Time for the check: chair stand, balance and Timed Up and Go. Have a helper there and a sturdy chair against a wall.${url ? `\n${url}` : ''}`)}`,
    ...(url ? [`URL:${url}`] : []),
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT30M', `DESCRIPTION:${escapeText('Footsure re-check in 30 minutes')}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
