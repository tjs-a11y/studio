// Drafted replies: plain, polite, neutral letters the user edits and sends themselves.
// No legal claims, no threats, no promises. Missing details become [brackets] for the user to fill.
// f: { from, ref, letterDate, deadline, amount, name, newDate, paidDate, method, confirmation, question, apptDate }
// (dates already formatted for the reader's language; amount already formatted)
export const KINDS = ['extension', 'paid', 'clarify', 'cancel', 'reschedule'];
// Which drafts fit which action (first one is suggested)
export const FOR_ACTION = {
  pay: ['extension', 'paid', 'clarify'], respond: ['extension', 'clarify'], sign: ['clarify', 'extension'],
  appear: ['reschedule', 'clarify'], renew: ['cancel', 'clarify'], cancel: ['cancel', 'clarify'], call: ['clarify'], null: ['clarify', 'extension'],
};
const b = (v, ph) => (v && String(v).trim() ? String(v).trim() : `[${ph}]`);

const EN = {
  greet: (f) => (f.from ? `Hello ${f.from} team,` : 'Hello,'),
  about: (f) => `I'm writing about your ${f.letterDate ? `letter dated ${f.letterDate}` : 'recent letter'}${f.ref ? ` (reference ${f.ref})` : ''}.`,
  sign: (f) => `Thank you,\n${b(f.name, 'Your name')}\n${b(f.contact, 'Your phone or email')}`,
  extension: { subject: (f) => `Request for more time${f.ref ? ' – ' + f.ref : ''}`, body: (f) => `${f.deadline ? `It asks me to act by ${f.deadline}. ` : ''}I need a little more time. Could you please extend the deadline to ${b(f.newDate, 'new date')}?\n\n${f.amount ? `If it helps, I can ${b(f.offer, `pay part of the ${f.amount} now`)}. ` : ''}Please confirm in writing whether this is possible, and let me know if you need anything else from me.` },
  paid: { subject: (f) => `Payment made${f.ref ? ' – ' + f.ref : ''}`, body: (f) => `I want to let you know that I paid ${b(f.amount, 'amount')} on ${b(f.paidDate, 'date')} by ${b(f.method, 'payment method')}. The confirmation number is ${b(f.confirmation, 'confirmation number')}.\n\nPlease update my account and confirm that nothing more is due. Thank you.` },
  clarify: { subject: (f) => `Question about your letter${f.ref ? ' – ' + f.ref : ''}`, body: (f) => `I don't fully understand ${f.amount ? `the amount of ${f.amount}` : 'what this letter asks'}. ${b(f.question, 'Describe what is unclear or what you disagree with')}.\n\nCould you please explain it and send me any documents that support it? Please also tell me whether the ${f.deadline ? `${f.deadline} deadline` : 'deadline'} still applies while we sort this out.` },
  cancel: { subject: (f) => `Please cancel${f.ref ? ' – ' + f.ref : ''}`, body: (f) => `Please cancel ${b(f.what, 'my subscription / plan / service')}${f.deadline ? `, effective before ${f.deadline}` : ''}, and do not charge or renew it.\n\nPlease send me a written confirmation of the cancellation and the date it takes effect.` },
  reschedule: { subject: (f) => `Request to reschedule${f.ref ? ' – ' + f.ref : ''}`, body: (f) => `${f.deadline ? `I'm scheduled for ${f.deadline}. ` : ''}I'm not able to attend on that date because ${b(f.reason, 'reason')}. Could you please move it to ${b(f.newDate, 'a date that works for you')}, or offer me other dates?\n\nPlease confirm the new date in writing. Thank you for your help.` },
};
const ES = {
  greet: (f) => (f.from ? `Hola, equipo de ${f.from}:` : 'Hola:'),
  about: (f) => `Les escribo por su ${f.letterDate ? `carta del ${f.letterDate}` : 'carta reciente'}${f.ref ? ` (referencia ${f.ref})` : ''}.`,
  sign: (f) => `Gracias,\n${b(f.name, 'Tu nombre')}\n${b(f.contact, 'Tu teléfono o correo')}`,
  extension: { subject: (f) => `Solicitud de más plazo${f.ref ? ' – ' + f.ref : ''}`, body: (f) => `${f.deadline ? `Me piden actuar antes del ${f.deadline}. ` : ''}Necesito un poco más de tiempo. ¿Podrían ampliar el plazo hasta el ${b(f.newDate, 'nueva fecha')}?\n\n${f.amount ? `Si sirve, puedo ${b(f.offer, `pagar ahora una parte de ${f.amount}`)}. ` : ''}Les ruego que me confirmen por escrito si es posible y si necesitan algo más de mi parte.` },
  paid: { subject: (f) => `Pago realizado${f.ref ? ' – ' + f.ref : ''}`, body: (f) => `Les informo de que pagué ${b(f.amount, 'importe')} el ${b(f.paidDate, 'fecha')} mediante ${b(f.method, 'forma de pago')}. El número de confirmación es ${b(f.confirmation, 'número de confirmación')}.\n\nLes ruego que actualicen mi cuenta y me confirmen que no queda nada pendiente. Gracias.` },
  clarify: { subject: (f) => `Pregunta sobre su carta${f.ref ? ' – ' + f.ref : ''}`, body: (f) => `No entiendo del todo ${f.amount ? `el importe de ${f.amount}` : 'lo que me piden en esta carta'}. ${b(f.question, 'Describe qué no está claro o con qué no estás de acuerdo')}.\n\n¿Podrían explicármelo y enviarme los documentos que lo respalden? Díganme también si el plazo ${f.deadline ? `del ${f.deadline} ` : ''}sigue vigente mientras lo aclaramos.` },
  cancel: { subject: (f) => `Solicitud de cancelación${f.ref ? ' – ' + f.ref : ''}`, body: (f) => `Les pido que cancelen ${b(f.what, 'mi suscripción / plan / servicio')}${f.deadline ? `, con efecto antes del ${f.deadline}` : ''}, y que no lo cobren ni lo renueven.\n\nPor favor, envíenme una confirmación por escrito de la cancelación y de la fecha en que se aplica.` },
  reschedule: { subject: (f) => `Solicitud de cambio de fecha${f.ref ? ' – ' + f.ref : ''}`, body: (f) => `${f.deadline ? `Tengo cita el ${f.deadline}. ` : ''}No puedo asistir ese día porque ${b(f.reason, 'motivo')}. ¿Podrían cambiarla al ${b(f.newDate, 'una fecha que les venga bien')} u ofrecerme otras fechas?\n\nLes ruego que me confirmen la nueva fecha por escrito. Gracias por su ayuda.` },
};
export function draft(kind, f = {}, lang = 'en') {
  const L = lang === 'es' ? ES : EN;
  const T = L[kind] || L.clarify;
  const body = [L.greet(f), '', L.about(f), '', T.body(f), '', L.sign(f)].join('\n');
  return { subject: T.subject(f), body };
}
// mailto: link (opens the user's own email app; nothing is sent by this page)
export function mailto(to, subject, body) {
  return `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
