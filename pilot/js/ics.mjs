// Calendar files (.ics, RFC 5545) for any calendar app. Pure functions, no network.
// event: { uid, date: 'YYYY-MM-DD', time?: 'HH:MM', title, desc?, location?, alarms?: [7, 1] }
// All-day events get reminders at 9:00 seven days and one day before; timed events 7 days and 1 day before the time.
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\r?\n/g, '\\n');
const enc = new TextEncoder();
// Lines longer than 75 bytes are folded (CRLF + space), never inside a UTF-8 character.
export function fold(line) {
  if (enc.encode(line).length <= 75) return line;
  const out = []; let cur = '', bytes = 0, limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) { out.push(cur); cur = ''; bytes = 0; limit = 74; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}
const ymd = (d) => d.replace(/-/g, '');
const nextDay = (d) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };
const stamp = (now) => now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function plusHour(date, time) {
  const [h, m] = time.split(':').map(Number); const x = new Date(Date.UTC(...date.split('-').map((v, i) => (i === 1 ? +v - 1 : +v)), h + 1, m));
  return x.toISOString().slice(0, 16).replace(/[-:]/g, '') + '00';
}
export function trigger(daysBefore, timed) {
  if (timed) return `-P${daysBefore}D`;
  // 9:00 on the day that is N days before an all-day event (which starts at 00:00)
  return daysBefore === 0 ? 'PT9H' : `-P${daysBefore - 1 ? daysBefore - 1 + 'D' : ''}T15H`;
}
export function buildIcs(events, { now = new Date() } = {}) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Quickwell//Pilot 1.0//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    if (!e || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) continue;
    const timed = /^\d{2}:\d{2}$/.test(e.time || '');
    lines.push('BEGIN:VEVENT', `UID:${(e.uid || 'pilot-' + ymd(e.date)).replace(/[^A-Za-z0-9._-]/g, '-')}@quickwell.app`, `DTSTAMP:${stamp(now)}`);
    if (timed) lines.push(`DTSTART:${ymd(e.date)}T${e.time.replace(':', '')}00`, `DTEND:${plusHour(e.date, e.time)}`);
    else lines.push(`DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(nextDay(e.date))}`);
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (e.desc) lines.push(`DESCRIPTION:${esc(e.desc)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    lines.push('TRANSP:TRANSPARENT');
    for (const d of e.alarms || [7, 1]) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, `TRIGGER:${trigger(d, timed)}`, 'END:VALARM');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
