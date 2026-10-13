// Quickwell Pilot: rule-based reading of letters, bills, emails, notices and forms. No AI model, no network.
// read(text, { today }) -> {
//   lang, kind, letterDate, deadline, deadlines, dates, amount, amounts, lateFee, refs, from, contacts, action, actions,
//   title, sensitive }
// Every field carries a confidence: 'high' (a clear label next to a clean value), 'medium' (computed or inferred),
// 'low' (a guess the user should check). Dates are 'YYYY-MM-DD' strings (calendar dates, no time zone).

// ------------------------------------------------------------------ date math (UTC calendar days)
const pad = (n) => String(n).padStart(2, '0');
export const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
export const toD = (s) => new Date(s + 'T00:00:00Z');
const fromD = (d) => d.toISOString().slice(0, 10);
export const addDays = (s, n) => { const d = toD(s); d.setUTCDate(d.getUTCDate() + n); return fromD(d); };
export const addMonths = (s, n) => {
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, Math.min(d, last));
};
// Business days skip Saturdays and Sundays only (public holidays are not known here).
export const addBusinessDays = (s, n) => { let d = s, k = 0; while (k < n) { d = addDays(d, 1); const wd = toD(d).getUTCDay(); if (wd !== 0 && wd !== 6) k++; } return d; };
export const daysBetween = (a, b) => Math.round((toD(b) - toD(a)) / 864e5);
export const todayLocal = () => { const d = new Date(); return iso(d.getFullYear(), d.getMonth() + 1, d.getDate()); };
const validDate = (y, m, d) => m >= 1 && m <= 12 && d >= 1 && y >= 1990 && y <= 2100 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate();

// ------------------------------------------------------------------ language
const EN_WORDS = /\b(the|and|your|you|of|to|please|this|by|is|for|will|our|with|if)\b/gi;
const ES_WORDS = /\b(de|la|el|que|su|por|para|usted|fecha|los|las|del|con|una|antes|pago|le)\b/gi;
export function detectLang(text) {
  const en = (text.match(EN_WORDS) || []).length, es = (text.match(ES_WORDS) || []).length;
  return es > en * 1.2 ? 'es' : 'en';
}

// ------------------------------------------------------------------ dates
const MON = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sept: 9, sep: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};
const MON_ES = {
  enero: 1, ene: 1, febrero: 2, feb: 2, marzo: 3, mar: 3, abril: 4, abr: 4, mayo: 5, may: 5, junio: 6, jun: 6, julio: 7, jul: 7,
  agosto: 8, ago: 8, septiembre: 9, setiembre: 9, sept: 9, sep: 9, set: 9, octubre: 10, oct: 10, noviembre: 11, nov: 11, diciembre: 12, dic: 12,
};
const alt = (o) => Object.keys(o).sort((a, b) => b.length - a.length).join('|');
const EN_M = alt(MON), ES_M = alt(MON_ES);
const ES_FULL = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre';
const WD = '(?:(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?\\.?,?\\s+)?';
const WD_ES = '(?:(?:lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo),?\\s+)?';
const DATE_RES = [
  // Monday, November 16, 2026 · Nov. 5 · October 13th, 2026 · noviembre 5, 2026
  { re: new RegExp(`\\b${WD}(${EN_M}|${ES_FULL})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![\\d:])\\b(?:,?\\s*(\\d{4})\\b)?`, 'gi'), f: (m) => ({ mon: m[1], d: +m[2], y: m[3] && +m[3] }) },
  // 13 October 2026 · 5th of November, 2026 · 30 Nov
  { re: new RegExp(`\\b${WD}(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${EN_M})\\.?(?:,?\\s+(\\d{4}))?\\b`, 'gi'), f: (m) => ({ mon: m[2], d: +m[1], y: m[3] && +m[3] }) },
  // 13 de octubre de 2026 · lunes, 2 de nov. de 2026 · 1º de diciembre
  { re: new RegExp(`\\b${WD_ES}(\\d{1,2})(?:º|°|ro)?\\s+de\\s+(${ES_M})\\.?(?:\\s+(?:de|del)\\s+(\\d{4}))?\\b`, 'gi'), f: (m) => ({ mon: m[2], d: +m[1], y: m[3] && +m[3], es: true }) },
  // 2026-10-13
  { re: /\b(\d{4})-(\d{2})-(\d{2})\b/g, f: (m) => ({ y: +m[1], m: +m[2], d: +m[3] }) },
  // 10/13/2026 · 13/10/2026 · 10-13-26 · 13.10.2026
  { re: /(?<![\d/.\-])(\d{1,2})([/.\-])(\d{1,2})\2(\d{4}|\d{2})(?![\d/\-]|\.\d)/g, f: (m) => ({ a: +m[1], b: +m[3], y: +m[4] < 100 ? 2000 + +m[4] : +m[4], num: true }) },
];

// All calendar dates in the text, in order: { value, index, end, raw, inferredYear }
export function findDates(text, { lang = 'en', anchor = null } = {}) {
  const out = [];
  for (const { re, f } of DATE_RES) {
    re.lastIndex = 0;
    for (let m; (m = re.exec(text));) {
      const p = f(m); let y = p.y, mo, d = p.d, ambiguous = false;
      if (p.num) {
        // US month-first unless the first number can't be a month, or the letter is in Spanish (day-first)
        if (p.a > 12) { d = p.a; mo = p.b; } else if (p.b > 12) { mo = p.a; d = p.b; } else if (lang === 'es') { d = p.a; mo = p.b; } else { mo = p.a; d = p.b; ambiguous = p.a !== p.b; }
      } else if (p.mon) {
        const key = p.mon.toLowerCase();
        // "may" is also an English verb: only a capitalised May counts as the month
        if (key === 'may' && p.mon !== 'May' && !p.es) continue;
        if (['mar', 'set', 'sep', 'dic', 'ene', 'ago', 'abr'].includes(key) && !p.es && !MON[key] && p.mon[0] !== p.mon[0].toUpperCase()) continue;
        mo = (p.es ? MON_ES[key] : MON[key] || MON_ES[key]);
      } else mo = p.m;
      let inferredYear = false;
      if (!y) {
        const ref = anchor || todayLocal(); const ry = +ref.slice(0, 4);
        y = ry; if (validDate(y, mo, d) && daysBetween(ref, iso(y, mo, d)) < -60) y = ry + 1;
        inferredYear = true;
      }
      if (!validDate(y, mo, d)) continue;
      out.push({ value: iso(y, mo, d), index: m.index, end: m.index + m[0].length, raw: m[0].trim(), inferredYear, ambiguous });
    }
  }
  // drop overlaps, keeping the longer match
  out.sort((a, b) => a.index - b.index || (b.end - b.index) - (a.end - a.index));
  const kept = [];
  for (const d of out) { const last = kept[kept.length - 1]; if (last && d.index < last.end) continue; kept.push(d); }
  return kept;
}

// Times: 9:30 AM · 8:00 a.m. · 2 pm · 14:30 · a las 10:30
export function findTimes(text) {
  const out = []; const re = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)(?![a-z])|\b(\d{1,2}):(\d{2})\s*(?:h(?:rs?)?\b)?/gi;
  for (let m; (m = re.exec(text));) {
    let h, mi;
    if (m[3]) { h = +m[1]; mi = +(m[2] || 0); const pm = /p/i.test(m[3]); if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }
    else { h = +m[4]; mi = +m[5]; }
    if (h > 23 || mi > 59) continue;
    out.push({ value: `${pad(h)}:${pad(mi)}`, index: m.index, end: m.index + m[0].length, raw: m[0].trim() });
  }
  return out;
}

// ------------------------------------------------------------------ labels around dates
// Each kind: what the date means. The closest label before a date (with no other date in between) decides.
const KINDS = [
  ['cancelBy', /\bcancel(?:l?ation)?\s+(?:it\s+|anytime\s+|any time\s+)?(?:by|before|no later than)|to avoid (?:being charged|a charge|the charge|renewal)|cancelar\s+antes\s+del?|para evitar el cobro/gi],
  ['appear', /\breport(?:ing)?\s+(?:for\s+jury\s+service|to\s+(?:the\s+)?court(?:house)?|for\s+service)|\bjury\s+service\b|\bappear(?:ance)?(?:\s+in\s+court)?|\bcourt\s+date|\bhearing\s+(?:is\s+)?(?:scheduled|set)\s+(?:for|on)|\bhearing(?:\s+date)?|\bcomparecer|\bpresentarse|\baudiencia|servicio\s+de\s+jurado/gi],
  ['appointment', /\bappointment(?:\s+(?:date|is|on|for))?|\bscheduled\s+(?:for|on)|\byour\s+visit|\bvisit\s+(?:date|is)|\bconference\s+(?:is\s+)?(?:on)?|\bfield\s+trip|\bcita(?:\s+(?:es|para|el))?|\bconsulta\s+(?:es|el)|\bnueva\s+fecha/gi],
  ['renewal', /\brenew(?:s|al|ed|ing)?(?:\s+(?:date|on|automatically\s+on))?|\bauto-?renew(?:s|al)?|\bwill\s+be\s+(?:charged|billed)(?:\s+on)?|\bnext\s+(?:billing|payment|charge)\s+date|\bse\s+renovar[áa]|\brenovaci[óo]n|\bpr[óo]ximo\s+cobro/gi],
  ['expires', /\bexpir(?:es|ation(?:\s+date)?|e|ing|y)(?:\s+on)?|\bvalid\s+(?:until|through|thru)|\bends?\s+on|\blease\s+end(?:s|ing)?|\bcaduca|\bvigente\s+hasta|\bfinaliza|\btermina/gi],
  ['due', /\b(?:payment\s+)?due(?:\s+date)?|\bpay(?:ment)?\s+(?:by|before|on\s+or\s+before)|\bplease\s+pay|\bmust\s+be\s+(?:paid|received|postmarked)|\bpaid\s+(?:in\s+full\s+)?by|\bfecha\s+(?:de\s+)?(?:vencimiento|l[íi]mite(?:\s+de\s+pago)?|de\s+pago)|\bvence(?:\s+el)?|\bpagar\s+(?:antes\s+del?|a\s+m[áa]s\s+tardar\s+el|hasta\s+el)|\bpague\s+antes\s+del?/gi],
  ['respond', /\brespon(?:d|se)(?:\s+(?:by|due|before))?|\breply(?:\s+by)?|\breturn(?:ed)?\s+(?:it\s+|this\s+|the\s+(?:\w+\s+){0,2})?(?:by|before|no\s+later\s+than)|\bsend\s+(?:it\s+|this\s+|us\s+)?(?:back\s+)?(?:by|before)|\bsubmit(?:ted)?(?:\s+\w+){0,2}\s+(?:by|before)|\bcomplete(?:d)?\s+(?:and\s+return\s+)?(?:\w+\s+){0,3}by|\bsign(?:ed)?\s+(?:and\s+return(?:ed)?\s+)?(?:\w+\s+){0,3}by|\blet\s+us\s+know\s+by|\bnotify\s+us\s+(?:in\s+writing\s+)?by|\bresponder|\bcontestar|\bdevolver(?:lo|la)?|\benviar|\bpresentar|\bfirmar/gi],
  ['deadline', /\bno\s+later\s+than|\bnot\s+later\s+than|\bon\s+or\s+before|\bdeadline(?:\s+is)?|\blast\s+day(?:\s+to\s+\w+)?(?:\s+is)?|\bby\b|\bbefore\b|\buntil\b|\ba\s+m[áa]s\s+tardar(?:\s+el)?|\bantes\s+del?|\bhasta\s+el|\bplazo|\bl[íi]mite/gi],
  // not deadlines: the letter's own date, periods, history
  ['letter', /\b(?:statement|bill(?:ing)?|notice|letter|invoice|issue|print|mail(?:ing)?|email|summons)\s+date|\b(?:statement\s+)?closing\s+date|\bdate\s+(?:of\s+(?:this\s+)?(?:notice|letter|bill|statement|summons)|issued|sent|mailed)|\bdate\s*:|\bdated|\bissued(?:\s+on)?|\bsent\s*:|\bfecha(?:\s+de\s+(?:emisi[óo]n|la\s+carta|env[íi]o|factura))?\s*:|\bemitid[oa](?:\s+el)?/gi],
  ['past', /\bfor\s+(?:your|the)\s+visit\s+on|\bdate\s+of\s+service|\b(?:billing|service|statement|policy)\s+period|\bservice\s+(?:from|dates?)|\bperiod(?:o)?\b|\bfrom\b|\bsince\b|\bthrough\b|\bdate\s+of\s+birth|\bDOB\b|\blast\s+payment|\bpayment\s+received|\breceived(?:\s+on)?|\bpaid\s+on|\bviolation\s+date|\bdate\s+of\s+(?:violation|service|loss|visit\s+last)|\bposted|\bfecha\s+de\s+nacimiento|\bdesde|\bdel\b|\bocurrid[oa]/gi],
];
const DEADLINE_KINDS = ['cancelBy', 'appear', 'appointment', 'renewal', 'expires', 'due', 'respond', 'deadline'];

// The label closest to the end of a window. When two labels overlap ("Due date:" holds both "Due date" and "date:"),
// the one that starts first (the longer phrase) wins.
function closest(win, rules, accept = () => true) {
  const ms = [];
  for (const [kind, re, extra] of rules) {
    re.lastIndex = 0;
    for (let m; (m = re.exec(win));) { const e = m.index + m[0].length; if (accept(kind, m[0], win.length - e)) ms.push({ kind, s: m.index, e, dist: win.length - e, raw: m[0], extra }); if (!m[0]) re.lastIndex++; }
  }
  if (!ms.length) return null;
  const best = ms.reduce((a, b) => (b.e > a.e || (b.e === a.e && b.s < a.s) ? b : a));
  const group = ms.filter((m) => m.s < best.e && m.e > best.s);
  const pick = group.reduce((a, b) => (b.s < a.s ? b : a));
  return { ...pick, dist: best.dist };
}
function labelBefore(text, start, prevEnd) {
  const from = Math.max(prevEnd, start - 80);
  const win = text.slice(from, start);
  // 'deadline' connectors (by/before/until) only count right next to the date
  const best = closest(win, KINDS, (kind, raw, dist) => !(kind === 'deadline' && /^(by|before|until|antes|hasta)/i.test(raw) && dist > 4));
  return best && best.dist <= 60 ? best : null;
}

// The sentence (or table row) around a position, for refining what a deadline is about
function sentenceAt(text, start, end) {
  let a = start, b = end;
  while (a > 0 && start - a < 220) { const c = text[a - 1]; if (c === '\n' && text[a - 2] === '\n') break; if (/[!?]/.test(c) || (c === '.' && /\s/.test(text[a] || '') && !/\b(?:[A-Z][a-z]{1,3}|No|St|a\.m|p\.m|e\.g|i\.e)$/.test(text.slice(Math.max(0, a - 6), a - 1)))) break; a--; }
  while (b < text.length && b - end < 140) { const c = text[b]; if (c === '\n' && text[b + 1] === '\n') break; if (/[!?]/.test(c) || (c === '.' && /\s|$/.test(text[b + 1] || ' ') && !/\b(?:[A-Z][a-z]{1,3}|No|St|a\.m|p\.m)$/.test(text.slice(Math.max(0, b - 5), b)))) { b++; break; } b++; }
  return text.slice(a, b);
}

// ------------------------------------------------------------------ actions
// Each action: weighted phrase patterns. The strongest total wins; ties go to the order below.
export const ACTIONS = ['appear', 'pay', 'sign', 'respond', 'renew', 'cancel', 'call'];
const ACT_RULES = {
  appear: [[/\bjury\s+service|\bsummon(?:ed|s)\b|\breport\s+(?:for|to)\s+(?:jury|court|the\s+court)|\bmust\s+appear|\bappear\s+(?:in|at|before)\s+(?:court|the)|\bcourt\s+date|\b(?:your|the)\s+hearing\s+(?:is|on|date|will)|\bhearing\s+(?:is\s+)?(?:scheduled|set)\s+(?:for|on)|\bcomparecer|\bservicio\s+de\s+jurado|\bcitaci[óo]n\s+judicial|\baudiencia\b/gi, 6],
    [/\byour\s+appointment|\bappointment\s+(?:is|on|for|date|with)|\bscheduled\s+(?:for|on)|\bplease\s+arrive|\bcheck-?in\b|\btu\s+cita|\bsu\s+cita|\bla\s+cita|\bfield\s+trip|\bconference\b/gi, 4]],
  pay: [[/\b(?:total\s+)?amount\s+(?:now\s+)?due|\btotal\s+due|\bbalance\s+due|\bplease\s+pay|\bpay\s+(?:by|online|now|the|this|your|in\s+full|on\s+or\s+before|at)|\bpayment\s+(?:is\s+)?due|\bmake\s+(?:a\s+|your\s+)?payment|\byou\s+owe|\bamount\s+(?:you\s+)?owe|\bremit\b|\bminimum\s+payment|\bfine\s+(?:amount|of|is)|\bpenalty\b|\btotal\s+a\s+pagar|\bimporte\s+(?:a\s+pagar|total)|\bpagar\b|\bpague\b|\bdebe\s+pagar|\bsaldo\s+pendiente/gi, 3]],
  sign: [[/\bplease\s+sign|\bsign\s+(?:and|the|this|here|below|where)|\bsignature\s+(?:required|needed|line)|\bparent(?:\/guardian)?\s+signature|\bsigned\s+(?:copy|form|lease|and)|\bfirm(?:e|ar|ada|ado)\b|\bfirma\s+del/gi, 4]],
  respond: [[/\brespond\b|\bresponse\b|\breply\b|\breturn\s+(?:the|this|it|your|a)\s+(?:\w+\s+){0,2}(?:form|slip|questionnaire|copy|letter|agreement|documents?|lease|renewal)|\bcomplete\s+(?:and\s+return|the\s+(?:\w+\s+)?(?:form|questionnaire))|\bsend\s+us\b|\blet\s+us\s+know|\bnotify\s+us|\bquestionnaire\b|\bprovide\s+(?:us|the|a|proof)|\bsubmit\b|\bcontest\b|\bdispute\b|\brequest\s+a\s+hearing|\bresponder|\bcontestar|\bdevolver|\benv[íi]e(?:nos)?\b|\bpresentar|\bcomun[íi]quenos|\bpermission\s+slip/gi, 2]],
  renew: [[/\brenew(?:s|al|ed|ing)?\b|\bauto-?renew|\bse\s+renovar[áa]|\brenovaci[óo]n|\brenovar\b/gi, 2]],
  cancel: [[/\bcancel\s+(?:by|before|anytime|any\s+time|online|your|it|at)|\bto\s+cancel\b|\bif\s+you\s+(?:do\s+not|don't)\s+(?:want|wish)\s+to\s+(?:renew|continue)|\bcancelar\b|\bdar\s+de\s+baja/gi, 3]],
  call: [[/\bplease\s+call|\bcall\s+(?:us|our|the|\d|\(|1-|toll)|\bgive\s+us\s+a\s+call|\bll[áa]m(?:e|enos|ar)\b|\bcomun[íi]quese\s+por\s+tel[ée]fono/gi, 2]],
};
// Which deadline kinds belong to each action (the card shows the deadline of the main action)
const ACT_KINDS = {
  appear: ['appear', 'appointment'], pay: ['due', 'deadline'], sign: ['respond', 'deadline', 'due'], respond: ['respond', 'deadline'],
  renew: ['renewal', 'due', 'expires', 'deadline'], cancel: ['cancelBy', 'renewal'], call: ['respond', 'deadline', 'due'],
};

// ------------------------------------------------------------------ amounts
const CUR_SYM = { 'US$': 'USD', 'MX$': 'MXN', 'C$': 'CAD', 'CA$': 'CAD', 'A$': 'AUD', 'AU$': 'AUD', '$': 'USD', '€': 'EUR', '£': 'GBP' };
const CUR_WORD = { '€': 'EUR', usd: 'USD', eur: 'EUR', euros: 'EUR', euro: 'EUR', gbp: 'GBP', mxn: 'MXN', pesos: 'MXN', cad: 'CAD' };
const NUM = String.raw`\d{1,3}(?:[,.\s]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?`;
const AMT_RE = new RegExp(String.raw`(US\$|MX\$|CA?\$|AU?\$|\$|€|£|\b(?:USD|EUR|GBP|MXN|CAD)\b)\s?(${NUM})(?![\d])|(?<![\w.,])(${NUM})\s?(€|(?:EUR|USD|GBP|MXN|euros?|pesos)\b)`, 'gi');
function parseNum(s, hint) {
  s = s.replace(/\s/g, '');
  const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
  let dec = null;
  if (lastComma > -1 && lastDot > -1) dec = lastComma > lastDot ? ',' : '.';
  else if (lastComma > -1) dec = s.length - lastComma - 1 <= 2 ? ',' : null;
  else if (lastDot > -1) dec = s.length - lastDot - 1 <= 2 ? '.' : (hint === 'es' && s.length - lastDot - 1 === 3 ? null : '.');
  const thou = dec === ',' ? '.' : ',';
  let t = s.split(thou).join(''); if (dec === ',') t = t.replace(',', '.'); if (dec === null) t = t.replace(/[.,]/g, '');
  const v = Number(t); return isFinite(v) ? v : null;
}
const AMT_LABELS = [
  // [pattern, score, label key]
  [/\b(?:total\s+)?amount\s+(?:now\s+)?due|\btotal\s+(?:amount\s+)?due|\bbalance\s+due|\bnew\s+balance\s+due|\bpay\s+this\s+amount|\bamount\s+(?:you\s+)?owe|\byou\s+owe|\bamount\s+owed|\bplease\s+pay(?:\s+the\s+balance(?:\s+of)?)?|\b(?:a\s+)?balance\s+(?:of|is)|\btotal\s+a\s+pagar|\bimporte\s+(?:a\s+pagar|total(?:\s+a\s+pagar)?)|\bcantidad\s+(?:a\s+pagar|adeudada)|\bsaldo\s+(?:pendiente|a\s+pagar)|\bmonto\s+a\s+pagar|\bdebe\s+pagar/gi, 10, 'due'],
  [/\bfine(?:\s+amount)?|\bpenalty(?:\s+amount)?|\bmulta|\bimporte\s+de\s+la\s+(?:multa|sanci[óo]n)/gi, 8, 'fine'],
  [/\b(?:new|renewal|annual|yearly|total|policy)\s+premium|\bpremium\b|\brenewal\s+(?:price|amount|cost)|\b(?:will|'ll)\s+be\s+(?:charged|billed)|\brenews?\s+(?:at|for)|\bnew\s+(?:monthly\s+)?(?:rent|price)|\bmonthly\s+rent|\brent\s+(?:will\s+be|of|is)|\bprima\b|\bse\s+(?:le\s+)?cobrar[áa]|\bnueva\s+cuota|\bcuota\b/gi, 7, 'charge'],
  [/\bminimum\s+(?:payment\s+)?due|\bpago\s+m[íi]nimo/gi, 6, 'minimum'],
  [/\b(?:the\s+)?(?:cost|fee|price|charge)\s+(?:is|will\s+be|of)|\bcosts\b|\bel\s+(?:costo|coste|precio)\s+es/gi, 5, 'cost'],
  [/\btotal\b|\bamount\b|\bimporte\b|\btotal\s+charges|\bcurrent\s+charges/gi, 3, 'total'],
  [/\blate\s+(?:fee|charge|payment\s+fee|penalty)|\badditional\s+(?:fee|penalty)|\brecargo|\bcargo\s+por\s+(?:mora|retraso)/gi, -5, 'lateFee'],
  [/\bprevious\s+balance|\bpayment(?:s)?\s+received|\blast\s+payment|\bpaid\b|\bcredit|\bdeposit\b|\blast\s+(?:term|year|period|month)|\bprior\b|\bprevious\b|\bwas\b|\bper\s+day|\bper\s+hour|\bcompensation|\bsaldo\s+anterior|\bpago\s+recibido/gi, -8, 'other'],
];
export function findAmounts(text, lang = 'en') {
  const out = [];
  AMT_RE.lastIndex = 0;
  for (let m; (m = AMT_RE.exec(text));) {
    const sym = m[1], word = m[4];
    const value = parseNum(sym ? m[2] : m[3], lang === 'es' || sym === '€' || /eur/i.test(word || '') ? 'es' : 'en');
    if (value == null || value <= 0) continue;
    const currency = sym ? (CUR_SYM[sym.toUpperCase()] || (/^[A-Z]{3}$/i.test(sym) ? sym.toUpperCase() : 'USD')) : CUR_WORD[word.toLowerCase()] || word.toUpperCase();
    const win = text.slice(Math.max(0, m.index - 70), m.index);
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 40);
    const c = closest(win, AMT_LABELS.map(([re, score, key]) => [key, re, score]));
    let best = c && c.dist <= 55 ? { score: c.extra, key: c.kind, dist: c.dist } : null;
    if (/^\s*(?:per\s+day|a\s+day|por\s+d[íi]a|each\s+day|daily)/i.test(after)) best = { score: -8, key: 'other', dist: 0 };
    if (/^\s*(?:late\s+fee|will\s+be\s+added|recargo)/i.test(after) && (!best || best.score > 0)) best = { score: -5, key: 'lateFee', dist: 0 };
    out.push({ value, currency, raw: m[0], index: m.index, label: best ? best.key : null, score: best ? best.score - best.dist / 100 : 0 });
  }
  return out;
}

// ------------------------------------------------------------------ references
const REF_LABEL = /\b(account|acct|reference|ref|notice|case|policy|citation|ticket|invoice|claim|member(?:ship)?|customer|confirmation|juror|participant|badge|order|loan|student|patient|tenant|unit|plate|license|n[úu]mero\s+de\s+(?:cuenta|referencia|expediente|p[óo]liza|cliente|contrato|multa|boleta)|referencia|expediente|p[óo]liza|contrato|cliente|cuenta|boleta|folio|matr[íi]cula)\b\.?\s*(?:no\.?|number|num\.?|#|id|n[º°o]\.?)?\s*[:#]?\s*(?:ending\s+(?:in\s+)?|que\s+termina\s+en\s+)?/gi;
export function findRefs(text) {
  const out = [];
  REF_LABEL.lastIndex = 0;
  for (let m; (m = REF_LABEL.exec(text));) {
    const rest = text.slice(m.index + m[0].length, m.index + m[0].length + 40);
    const v = /^([A-Z0-9][A-Z0-9-]*(?:[ ][A-Z0-9-]+){0,4})/i.exec(rest);
    if (!v) continue;
    // stop at the first word without a digit that follows a group (e.g. "1234 5678 Date")
    let val = v[1].split(' ').reduce((acc, part, i, arr) => (acc.stop ? acc : /\d/.test(part) || (i === 0 && /^[A-Z]{1,4}$/.test(part) && arr[1] && /\d/.test(arr[1])) ? { s: acc.s ? acc.s + ' ' + part : part } : { s: acc.s, stop: true }), { s: '' }).s.replace(/-+$/, '');
    if (!val || !/\d/.test(val) || val.replace(/\D/g, '').length < 3) continue;
    if (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(val) || /^(19|20)\d{2}$/.test(val)) continue; // a date or a year
    if (/^\d{3}-\d{2}-\d{4}$/.test(val)) continue; // never keep anything shaped like a Social Security number
    const label = m[1].toLowerCase().replace(/\s+/g, ' ');
    if (out.some((r) => r.value === val)) continue;
    out.push({ label, value: val, masked: mask(val), index: m.index });
  }
  return out;
}
// Show only the last 4 letters/digits (2 for short values). "1234-5678-9012" -> "••••-••••-9012"
export function mask(v) {
  const s = String(v || ''); const n = (s.match(/[A-Za-z0-9]/g) || []).length; const keep = n <= 6 ? 2 : 4;
  let seen = 0; return s.replace(/[A-Za-z0-9]/g, (c) => (++seen > n - keep ? c : '•'));
}

// ------------------------------------------------------------------ contacts
const PHONE_RES = [
  /(?<![\d-])(?:\+?1[\s.-]?)?\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-](\d{4})(?![\d-])/g,
  /(?<![\d-])1-?8(?:00|33|44|55|66|77|88)-?[A-Z0-9]{3}-?[A-Z0-9]{4}\b/g,
  /\+(?:3[0-9]|4[0-9]|5[0-9])[\s.]?\d{2,3}(?:[\s.]?\d{2,3}){2,3}\b/g,
  /(?<![\d-])[6789]\d{2}[\s.]\d{3}[\s.]\d{3}(?![\d-])/g,
];
export function findContacts(text) {
  const recipient = new Set(); for (const m of text.matchAll(/^\s*(?:To|Cc|Para|CC)\s*:\s*(.+)$/gim)) for (const e of m[1].match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []) recipient.add(e.toLowerCase());
  const emails = [...new Set((text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).map((e) => e.replace(/\.$/, '')))].filter((e) => !recipient.has(e.toLowerCase()));
  const phones = [];
  for (const re of PHONE_RES) {
    re.lastIndex = 0;
    for (let m; (m = re.exec(text));) {
      const before = text.slice(Math.max(0, m.index - 40), m.index);
      if (/(fax)\W*$/i.test(before)) continue;
      if (/(account|acct|ref(?:erence)?|policy|case|notice|invoice|citation|id|cuenta|p[óo]liza|no\.?|#)\W{0,4}$/i.test(before)) continue;
      const v = m[0].trim();
      if (phones.some((p) => p.value.replace(/\D/g, '').endsWith(v.replace(/\D/g, '').slice(-9)))) continue;
      const score = /(call|phone|tel|telephone|questions|contact|llame|tel[ée]fono|ll[áa]menos|text)\W*(?:\w+\W+){0,7}$/i.test(before) ? 2 : 0;
      phones.push({ value: v, index: m.index, score });
    }
  }
  phones.sort((a, b) => b.score - a.score || a.index - b.index);
  const domains = new Set(emails.map((e) => e.split('@')[1].toLowerCase()));
  const urls = [];
  const URL_RE = /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|org|gov|net|edu|us|es|mx|info|io|co|app|test)(?:\/[^\s)<>,;]*)?/gi;
  for (let m; (m = URL_RE.exec(text));) {
    if (text[m.index - 1] === '@') continue;
    const v = m[0].replace(/[.)]+$/, '');
    const host = v.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
    if (domains.has(host) && !/\//.test(v.replace(/^https?:\/\//, ''))) continue;
    if (!urls.includes(v)) urls.push(v);
  }
  return { phones: phones.map((p) => p.value), emails, urls, address: findAddress(text) };
}
const STREET = /\b\d{1,6}[A-Z]?\s+(?:[NSEW]\.?\s+)?[A-Za-z0-9.'\- ]{2,40}?\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl|Parkway|Pkwy|Highway|Hwy|Circle|Cir|Terrace|Ter|Square|Sq|Trail|Plaza)\b\.?(?:,?\s*(?:Suite|Ste|Unit|Apt|Room|Rm|Floor|Fl)\.?\s*#?\s*\w+)?|\b(?:P\.?\s?O\.?\s+Box|Apartado(?:\s+de\s+correos)?)\s+\d+|\b(?:Calle|C\/|Avenida|Avda\.?|Av\.|Plaza|Paseo|Carrera)\s+[^\n,]{2,40},?\s*(?:n[º°o]\.?\s*)?\d+[^\n]{0,20}/g;
const CITY_ANY = /[A-Za-z .'\-]{2,40},\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?|\b\d{5}\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/;
const CITY = /^[\s,]*[A-Za-z .'\-]{2,40},\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?|^[\s,]*\d{5}\s+[A-Za-zÁÉÍÓÚÑáéíóúñ .\-]{2,40}/;
function findAddress(text) {
  const found = [];
  STREET.lastIndex = 0;
  for (let m; (m = STREET.exec(text));) {
    const lineEnd = text.indexOf('\n', m.index + m[0].length);
    const sameLine = text.slice(m.index + m[0].length, lineEnd < 0 ? undefined : lineEnd);
    const next = lineEnd < 0 ? '' : text.slice(lineEnd + 1).split('\n')[0];
    const city = CITY_ANY.test(sameLine) ? sameLine.replace(/^[\s,]+/, '').replace(/[.\s]+$/, '') : CITY.test(next) ? next.trim() : '';
    const value = (m[0].trim() + (city ? ', ' + city.trim() : '')).replace(/\s+/g, ' ');
    const before = text.slice(Math.max(0, m.index - 70), m.index);
    const mine = /(service|your|ship(?:ping)?|bill(?:ing)?\s+to|property|rental|location|suministro|domicilio)\s+(?:address|addr|location)?\W*$|\b(?:for|at|of)\s*$|block\s+of/i.test(before) || /^\d+\s+block/i.test(m[0]);
    const score = (/(mail|send|return|write|pay by mail|deliver|report to|located at|address|courthouse|enviar|direcci[óo]n|presentarse en|ubicad)\W*(?:\w+\W+){0,6}$/i.test(before) ? 3 : 0) + (city ? 1 : 0) + (/box|apartado/i.test(m[0]) ? 1 : 0) - (mine ? 5 : 0);
    found.push({ value, index: m.index, score });
  }
  found.sort((a, b) => b.score - a.score || a.index - b.index);
  return found.length ? found[0].value : null;
}

// ------------------------------------------------------------------ sender
const ORG = /\b(inc|llc|l\.l\.c|ltd|co\.|company|corp(?:oration)?|department|dept|office|court|county|city\s+of|state\s+of|town\s+of|bank|credit\s+union|insurance|mutual|assurance|school|district|academy|elementary|high\s+school|clinic|hospital|medical|dental|dentistry|health|healthcare|services|utilities|utility|energy|power|water|gas|electric|authority|agency|association|management|properties|apartments|realty|residences|university|college|revenue|treasury|internal\s+revenue|parking|transit|motor\s+vehicles|dmv|streaming|telecom|wireless|ayuntamiento|banco|seguros|escuela|colegio|cl[íi]nica|servicio|compa[ñn][íi]a|municipal|gobierno|secretar[íi]a|agencia|hacienda|tribunal|juzgado|inmobiliaria|el[ée]ctrica|aguas)\b|\bS\.\s?[AL]\.(?!\w)/i;
const NOT_NAME = /^(dear|to|re|subject|asunto|estimad|hello|hi|hola|date|fecha|from|de:|page|p[áa]gina|important|importante|notice|aviso|final notice|account|statement|invoice|bill)\b/i;
export function findSender(text, lines) {
  const hdr = /^\s*(?:From|De)\s*:\s*(.+)$/im.exec(text);
  if (hdr) {
    const v = hdr[1].trim(); const name = v.replace(/<[^>]*>/, '').replace(/["']/g, '').trim();
    if (name && !/@/.test(name)) return { value: name.slice(0, 80), conf: 'high' };
    const dom = /@([A-Za-z0-9.-]+)/.exec(v); if (dom) return { value: dom[1].replace(/^(mail|email|billing|noreply|no-reply|info)\./i, ''), conf: 'medium' };
  }
  const top = lines.slice(0, 8).map((l) => l.trim()).filter(Boolean);
  const isOrg = (l) => l && ORG.test(l) && l.length <= 70 && !/\d{5}/.test(l) && !STREET_TEST.test(l) && !/^(re|subject|asunto)\b/i.test(l) && !/:/.test(l);
  for (let i = 0; i < top.length; i++) if (isOrg(top[i])) {
    const v = top[i].replace(/\s{2,}.*/, '');
    return { value: isOrg(top[i + 1]) && !/notice|aviso|renewal|statement/i.test(top[i + 1]) && (v + top[i + 1]).length < 80 ? `${v} · ${top[i + 1]}` : v, conf: 'high' };
  }
  // sign-off: "Sincerely,\nJane Doe\nLakeside Power"
  const so = /(?:sincerely|regards|thank you|thanks|respectfully|atentamente|cordialmente|saludos(?:\s+cordiales)?)\s*,?\s*\n+((?:.*\S.*\n?){1,4})/i.exec(text);
  if (so) {
    const ls = so[1].split('\n').map((s) => s.trim()).filter(Boolean);
    const org = ls.find((l) => ORG.test(l)); if (org) return { value: org.slice(0, 80), conf: 'medium' };
  }
  for (const l of lines.slice(0, 40)) if (ORG.test(l) && l.trim().length <= 60 && !STREET_TEST.test(l) && !/\d{5}/.test(l)) return { value: l.trim(), conf: 'medium' };
  for (const l of top) if (!NOT_NAME.test(l) && !/\d/.test(l) && /^[A-ZÁÉÍÓÚÑ]/.test(l) && l.length >= 3 && l.length <= 50 && l.split(/\s+/).length <= 7) return { value: l, conf: 'low' };
  if (so) { const first = so[1].split('\n').map((s) => s.trim()).find(Boolean); if (first) return { value: first.slice(0, 80), conf: 'low' }; }
  return { value: null, conf: 'low' };
}
const STREET_TEST = /^\s*\d{1,6}\s+\w|P\.?\s?O\.?\s+Box/i;

// ------------------------------------------------------------------ document kind (for the checklist)
const DOC_KINDS = [
  ['jury', /\bjury\b|\bjuror\b|\bjurado\b/i],
  ['tax', /\binternal\s+revenue|\btax\s+(?:return|year|due|balance|notice)|\bIRS\b|\bhacienda\b|\bimpuesto|\bdeclaraci[óo]n\s+de\s+la\s+renta|\bdepartment\s+of\s+revenue/i],
  ['ticket', /\bparking\b|\bcitation\b|\bviolation\b|\binfracci[óo]n\b|\bmulta\b/i],
  ['court', /\bcourt\b|\bjuzgado\b|\btribunal\b/i],
  ['lease', /\blease\b|\btenant\b|\blandlord\b|\barrendamiento|\binquilino|\bcontrato\s+de\s+alquiler/i],
  ['school', /\bschool\b|\bstudent\b|\bparent\/guardian|\bguardian\b|\bfield\s+trip|\bescuela\b|\bcolegio\b|\balumn[oa]/i],
  ['appointment', /\bappointment\b|\btu\s+cita\b|\bsu\s+cita\b|\bla\s+cita\b/i],
  ['insurance', /\binsurance\b|\bcoverage\b|\bpremium\s+(?:is|of|amount|due|notice)|\b(?:new|annual|renewal|12-month|6-month|policy|total)\s+premium|\bpolicy\s+(?:number|period|renew)|\bp[óo]liza\b|\bseguro\b/i],
  ['subscription', /\bsubscription\b|\bmembership\b|\byour\s+plan\b|\b(?:annual|monthly|premium|yearly)\s+plan\b|\bplan\s+renews|\bsuscripci[óo]n\b|\bmembres[íi]a\b/i],
  ['bill', /\bbill\b|\bstatement\b|\binvoice\b|\bamount\s+due\b|\bbalance\b|\bpatient\s+account|\bfinal\s+notice|\bfactura\b|\brecibo\b|\btotal\s+a\s+pagar/i],
];
export const DOC_KIND_LIST = DOC_KINDS.map((k) => k[0]).concat('other');

// ------------------------------------------------------------------ relative deadlines
const WORDNUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14, fifteen: 15, twenty: 20, 'twenty-one': 21, thirty: 30, 'forty-five': 45, sixty: 60, ninety: 90,
  uno: 1, dos: 2, tres: 3, cinco: 5, siete: 7, diez: 10, quince: 15, veinte: 20, treinta: 30, sesenta: 60, noventa: 90 };
const WN = Object.keys(WORDNUM).sort((a, b) => b.length - a.length).join('|');
const REL_RES = [
  // within 30 days of the date of this letter · in 10 business days · no later than thirty (30) days after the date of this notice
  new RegExp(String.raw`\b(within|in|no\s+later\s+than|not\s+later\s+than|not\s+more\s+than|up\s+to)?\s*(?:the\s+next\s+)?\b(\d{1,3}|${WN})(?:\s*\((\d{1,3})\))?\s*(calendar\s+|business\s+|working\s+)?(days?|weeks?|months?)\b(?:\s+(?:of|from|after)\s+(?:the\s+)?(?:date\s+(?:of|on)\s+)?(?:(?:this|the|our|your)\s+)?(letter|notice|bill|statement|invoice|email|message|summons|citation|date\s+(?:above|shown|printed|issued)|issue|receiv\w*|receipt|you\s+receive\s+(?:this|it)\s*\w*|today))?`, 'gi'),
  // dentro de los 30 días (hábiles) siguientes a la fecha de esta carta · en un plazo de 15 días
  new RegExp(String.raw`\b(dentro\s+de|en\s+un\s+plazo\s+(?:m[áa]ximo\s+)?de|en\s+el\s+plazo\s+de|en\s+los\s+pr[óo]ximos|antes\s+de)\s+(?:los\s+)?(\d{1,3}|${WN})(?:\s*\((\d{1,3})\))?\s+(d[íi]as|semanas|meses)(?:\s+(h[áa]biles|naturales|calendario))?(?:\s+(?:siguientes\s+)?(?:a\s+partir\s+de|desde|a|despu[ée]s\s+de)\s+(?:la\s+)?(?:fecha\s+de\s+)?(?:(?:esta|la|este|el|su)\s+)?(carta|notificaci[óo]n|aviso|factura|recepci[óo]n|correo))?`, 'gi'),
];
function findRelative(text) {
  const out = [];
  REL_RES.forEach((re, i) => {
    re.lastIndex = 0;
    for (let m; (m = re.exec(text));) {
      let n, unit, biz, anchorWord, lead;
      if (i === 0) { lead = m[1]; n = m[3] ? +m[3] : (/^\d/.test(m[2]) ? +m[2] : WORDNUM[m[2].toLowerCase()]); biz = /business|working/i.test(m[4] || ''); unit = m[5].toLowerCase().replace(/s$/, ''); anchorWord = m[6]; }
      else { lead = m[1]; n = m[3] ? +m[3] : (/^\d/.test(m[2]) ? +m[2] : WORDNUM[m[2].toLowerCase()]); unit = { d: 'day', s: 'week', m: 'month' }[m[4][0].toLowerCase()] || 'day'; biz = /h[áa]biles/i.test(m[5] || ''); anchorWord = m[6]; }
      if (!n || n > 400) continue;
      if (!lead && !anchorWord) continue; // "30 days" alone is not a deadline
      // "a 30 days grace period", "for 30 days" are not deadlines
      const before = text.slice(Math.max(0, m.index - 30), m.index);
      if (!lead && /\b(for|last|past|previous|every|per)\s*$/i.test(before)) continue;
      out.push({ n, unit, business: biz, fromReceipt: /receiv|receipt|recepci/i.test(anchorWord || ''), anchored: !!anchorWord, index: m.index, end: m.index + m[0].length, raw: m[0].trim() });
    }
  });
  return out;
}
function applyRel(r, from) {
  if (r.unit === 'week') return addDays(from, r.n * 7);
  if (r.unit === 'month') return addMonths(from, r.n);
  return r.business ? addBusinessDays(from, r.n) : addDays(from, r.n);
}

// ------------------------------------------------------------------ main
const CONF_ORDER = { high: 3, medium: 2, low: 1 };
export const confRank = (c) => CONF_ORDER[c] || 0;

export function read(input, opts = {}) {
  const text = String(input || '').replace(/\r\n?/g, '\n').replace(/[   ]/g, ' ').replace(/[‐-―]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  const today = opts.today || todayLocal();
  const lang = opts.lang || detectLang(text);
  const lines = text.split('\n');
  const sensitive = /\b\d{3}-\d{2}-\d{4}\b/.test(text) ? ['ssn'] : [];

  // pass 1: dates with their labels
  let dates = findDates(text, { lang, anchor: today });
  const label = (ds) => ds.map((d, i) => ({ ...d, label: labelBefore(text, d.index, i ? ds[i - 1].end : 0) }));
  dates = label(dates);

  // the letter's own date
  let letterDate = null;
  const labelled = dates.find((d) => d.label && d.label.kind === 'letter');
  if (labelled) letterDate = { value: labelled.value, conf: 'high', raw: labelled.raw };
  else {
    const topEnd = lines.slice(0, 12).join('\n').length;
    const first = dates.find((d) => d.index <= topEnd && (!d.label || ['letter', 'past'].includes(d.label.kind) === false && !DEADLINE_KINDS.includes(d.label.kind)));
    if (first) letterDate = { value: first.value, conf: 'medium', raw: first.raw };
  }
  if (opts.letterDate) letterDate = { value: opts.letterDate, conf: 'high', raw: 'set by you' };
  // re-run with the letter date as the anchor for dates without a year
  if (letterDate && letterDate.value !== today) {
    dates = label(findDates(text, { lang, anchor: letterDate.value }));
  }
  const anchor = letterDate ? letterDate.value : today;
  const times = findTimes(text);

  // deadline candidates
  const cands = [];
  for (const d of dates) {
    if (!d.label || !DEADLINE_KINDS.includes(d.label.kind)) continue;
    const sent = sentenceAt(text, d.index, d.end);
    let kind = d.label.kind;
    if (kind === 'deadline') kind = refineKind(sent) || 'deadline';
    if (kind === 'respond' && /\bsign/i.test(sent) && !/\bpay\b/i.test(sent)) kind = 'respond';
    const t = times.find((x) => (x.index >= d.end && x.index - d.end <= 30) || (x.end <= d.index && d.index - x.end <= 12));
    const conf = d.inferredYear || d.ambiguous ? 'medium' : 'high';
    cands.push({ value: d.value, kind, raw: d.raw, index: d.index, time: t ? t.value : null, conf, sentence: sent.trim().replace(/\s+/g, ' ').slice(0, 200), labelRaw: d.label.raw });
  }
  for (const r of findRelative(text)) {
    if (cands.some((c) => c.index >= r.index - 5 && c.index <= r.end + 5)) continue;
    const sent = sentenceAt(text, r.index, r.end);
    const kind = refineKind(sent) || 'deadline';
    cands.push({ value: applyRel(r, anchor), kind, raw: r.raw, index: r.index, time: null, conf: letterDate ? 'medium' : 'low',
      computed: { n: r.n, unit: r.unit, business: r.business, from: anchor, fromReceipt: r.fromReceipt, noLetterDate: !letterDate },
      sentence: sent.trim().replace(/\s+/g, ' ').slice(0, 200) });
  }
  for (let i = cands.length - 1; i >= 0; i--) if (cands.findIndex((c) => c.value === cands[i].value && c.kind === cands[i].kind) < i) cands.splice(i, 1);
  cands.sort((a, b) => (a.value < b.value ? -1 : a.value > b.value ? 1 : a.index - b.index));

  // actions
  const scores = {};
  for (const a of ACTIONS) {
    let s = 0;
    for (const [re, w] of ACT_RULES[a]) { re.lastIndex = 0; const n = (text.match(re) || []).length; s += Math.min(n, 3) * w; }
    scores[a] = s;
  }
  const amounts = findAmounts(text, lang);
  const goodAmt = amounts.filter((x) => x.score >= 5);
  if (goodAmt.some((x) => ['due', 'fine'].includes(x.label))) scores.pay += 4;
  if (cands.some((c) => c.kind === 'due')) scores.pay += 3;
  if (cands.some((c) => c.kind === 'cancelBy')) scores.cancel += 2;
  if (cands.some((c) => c.kind === 'appear')) scores.appear += 3;
  const actions = ACTIONS.filter((a) => scores[a] > 0).sort((a, b) => scores[b] - scores[a] || ACTIONS.indexOf(a) - ACTIONS.indexOf(b));
  const top = actions[0] || null;
  const action = top ? { value: top, conf: scores[top] >= 6 && (!actions[1] || scores[top] - scores[actions[1]] >= 2) ? 'high' : scores[top] >= 3 ? 'medium' : 'low', also: actions.slice(1, 3) } : { value: null, conf: 'low', also: [] };

  // the main deadline: the one that belongs to the main action, else the earliest upcoming one
  const usable = cands.filter((c) => !letterDate || c.value >= letterDate.value);
  const pool = usable.length ? usable : cands;
  let deadline = null;
  if (top) deadline = pool.find((c) => ACT_KINDS[top].includes(c.kind) && c.value >= today) || pool.find((c) => ACT_KINDS[top].includes(c.kind));
  if (!deadline) deadline = pool.find((c) => c.value >= today) || pool[0] || null;
  if (deadline && deadline.kind === 'deadline' && top) deadline = { ...deadline };

  // amount: best labelled one; an unlabelled amount only for pay/renew letters (low confidence)
  let amount = null;
  const ranked = amounts.filter((x) => x.score > 0).sort((a, b) => b.score - a.score || b.value - a.value);
  if (ranked.length && ranked[0].score >= 4.5) amount = { value: ranked[0].value, currency: ranked[0].currency, conf: ranked[0].score >= 7.5 ? 'high' : 'medium', label: ranked[0].label, raw: ranked[0].raw };
  else if (ranked.length && ['pay', 'renew'].includes(top)) amount = { value: ranked[0].value, currency: ranked[0].currency, conf: 'low', label: ranked[0].label, raw: ranked[0].raw };
  else if (!ranked.length && top === 'pay') { const u = amounts.filter((x) => x.score === 0).sort((a, b) => b.value - a.value)[0]; if (u) amount = { value: u.value, currency: u.currency, conf: 'low', label: null, raw: u.raw }; }
  const lf = amounts.find((x) => x.label === 'lateFee');
  const lateFee = lf ? { value: lf.value, currency: lf.currency } : null;

  const contacts = findContacts(text);
  const digits = (v) => String(v).replace(/\D/g, '');
  const refs = findRefs(text).filter((r) => !contacts.phones.some((p) => digits(p).endsWith(digits(r.value)) && digits(r.value).length >= 7));
  const from = findSender(text, lines);
  let kind = 'other';
  for (const [k, re] of DOC_KINDS) if (re.test(text)) { kind = k; break; }
  const subj = /^\s*(?:Subject|Re|RE|Asunto)\s*:\s*(.+)$/m.exec(text);
  const title = subj ? subj[1].trim().slice(0, 100) : null;

  return {
    lang, kind, today, letterDate, title, sensitive,
    action, actions, scores,
    deadline: deadline ? { ...deadline } : null, deadlines: cands,
    dates: dates.map((d) => ({ value: d.value, raw: d.raw, label: d.label ? d.label.kind : null })),
    amount, amounts: amounts.map(({ value, currency, raw, label }) => ({ value, currency, raw, label })), lateFee,
    refs, ref: refs[0] || null, from, contacts,
  };
}
function refineKind(sent) {
  if (/\bcancel|\bcancelar|dar\s+de\s+baja/i.test(sent)) return 'cancelBy';
  if (/\bpay|\bpayment|\bpaid|\bamount\s+due|\bpagar|\bpago\b|\bpague/i.test(sent)) return 'due';
  if (/\brespon|\breply|\breturn|\bsubmit|\bcontest|\bdispute|\brequest\s+a\s+hearing|\breclamaci|\brecurr|\bsign|\bsend|\bcomplete|\blet\s+us\s+know|\bnotify|\bquestionnaire|\bresponder|\bcontestar|\bdevolver|\benviar|\bfirmar|\bpresentar/i.test(sent)) return 'respond';
  if (/\bappear|\breport\s+(?:for|to)|\bjury|\bcomparecer/i.test(sent)) return 'appear';
  if (/\bappointment|\bcita\b/i.test(sent)) return 'appointment';
  if (/\brenew|\brenovar|\brenovaci/i.test(sent)) return 'renewal';
  if (/\bexpir|\bcaduc|\bvence/i.test(sent)) return 'expires';
  return null;
}

// Days left, from today, for the card ("in 12 days", "today", "3 days ago")
export const daysLeft = (date, today) => daysBetween(today || todayLocal(), date);
