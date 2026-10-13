// Quickwell Saver: the "Act" tools. Letters, phone scripts, cancel guides and calendar events, in English and Spanish.
// Pure functions: the page passes in already-formatted amounts and dates (ctx), so the wording is easy to test.
//
// Legal wording rule: a letter states a right only where we opened the source ourselves.
//   - 15 U.S.C. §8403(3) (ROSCA): sellers of online negative-option subscriptions must provide "simple mechanisms for a
//     consumer to stop recurring charges". Opened 2026-10-13 at
//     https://raw.githubusercontent.com/TheJoshuaEvans/united-states-code/HEAD/usc/15/8403.xml (also [O] in memo O-024).
//   - Nothing else is cited. State laws (e.g. California's), the old FTC click-to-cancel rule, card-dispute and bank-error
//     rules are NOT cited: either unverified or no longer in force. Letters otherwise use neutral, polite wording.
import { toICS, payeeKey } from './engine.mjs';

export const ROSCA = {
  cite: '15 U.S.C. §8403(3)',
  url: 'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section8403&num=0&edition=prelim',
  opened: 'https://raw.githubusercontent.com/TheJoshuaEvans/united-states-code/HEAD/usc/15/8403.xml',
};
export const ECFR_425 = 'https://www.ecfr.gov/api/versioner/v1/versions/title-16.json?part=425';

const P = {
  en: { name: '[Your name]', account: '[Your account email or number]', since: '[the year you joined]' },
  es: { name: '[Tu nombre]', account: '[El correo o número de tu cuenta]', since: '[el año en que te uniste]' },
};
const L = (lang) => (lang === 'es' ? 'es' : 'en');
const list = (charges) => charges.map((c) => `- ${c.date}: ${c.amount}`).join('\n');

const ROSCA_LINE = {
  en: "For subscriptions sold online in the U.S., federal law requires the seller to provide simple mechanisms for a consumer to stop recurring charges (Restore Online Shoppers' Confidence Act, 15 U.S.C. §8403(3)).",
  es: "Para las suscripciones vendidas por internet en EE. UU., la ley federal exige que el vendedor ofrezca mecanismos sencillos para que el consumidor detenga los cargos recurrentes (Restore Online Shoppers' Confidence Act, 15 U.S.C. §8403(3)).",
};

// ctx: { merchant, amount, last, next, name, account, rosca, old, new, pct, stepDate, since, charges:[{date,amount}], total,
//        reason, cancelDate, feeType, fee, feeDate, bank }
export function letter(kind, ctx, lang = 'en') {
  const l = L(lang); const p = P[l];
  const name = (ctx.name || '').trim() || p.name; const account = (ctx.account || '').trim() || p.account;
  const m = ctx.merchant;
  const T = TEMPLATES[l][kind]; if (!T) throw new Error('unknown letter ' + kind);
  return T({ ...ctx, name, account, m, since: ctx.since || p.since, rosca: ctx.rosca ? ROSCA_LINE[l] : '' });
}
export function script(kind, ctx, lang = 'en') {
  const l = L(lang); const p = P[l];
  const T = SCRIPTS[l][kind]; if (!T) throw new Error('unknown script ' + kind);
  return T({ ...ctx, m: ctx.merchant, since: ctx.since || p.since });
}
const join = (...parts) => parts.filter((x) => x !== '' && x != null).join('\n\n');

const TEMPLATES = {
  en: {
    cancel: (c) => ({
      subject: `Please cancel my ${c.m} subscription`,
      body: join(`Hello ${c.m} team,`,
        `Please cancel my ${c.m} subscription and stop all future charges, effective today.`,
        `Account: ${c.account}${c.last ? `\nMost recent charge: ${c.amount} on ${c.last}` : ''}`,
        c.rosca,
        'Please confirm in writing (a reply to this email is fine) that my subscription is cancelled, the date it ends, and that no further charges will be made.',
        `Thank you,\n${c.name}`),
    }),
    pushback: (c) => ({
      subject: `Question about my ${c.m} price increase`,
      body: join('Hello,',
        `I've been a ${c.m} customer since ${c.since}. My price went from ${c.old} to ${c.new}${c.stepDate ? ` on ${c.stepDate}` : ''}${c.pct ? ` (${c.pct} more)` : ''}.`,
        `Before I decide whether to keep the service, I'd like to ask:\n1. Can you keep me at my previous price of ${c.old}, or offer a loyalty discount?\n2. Is there a cheaper plan that covers what I use?`,
        `If not, I plan to cancel before my next billing date${c.next ? `, ${c.next}` : ''}.`,
        `Account: ${c.account}`,
        `Thank you,\n${c.name}`),
    }),
    refund: (c) => {
      const why = {
        double: `I was charged twice for the same thing:\n${list(c.charges)}\nPlease refund the duplicate charge of ${c.total}.`,
        afterCancel: `I cancelled on ${c.cancelDate || '[the date you cancelled]'}, but I was charged after that:\n${list(c.charges)}\nPlease refund these charges (${c.total}) and confirm that my subscription is cancelled.`,
        unauthorized: `I don't recognize these charges and didn't authorize them:\n${list(c.charges)}\nPlease refund them (${c.total}), close any subscription on my account, and confirm that no more charges will be made.`,
        trial: `I signed up for a trial and didn't mean to continue to a paid plan. I was charged:\n${list(c.charges)}\nPlease cancel the subscription and refund ${c.total}.`,
      }[c.reason || 'double'];
      return {
        subject: `Refund request: ${c.m}`,
        body: join(`Hello ${c.m} team,`, why, `Account: ${c.account}`,
          'Please reply with the amount you will refund and when it will reach my account.',
          `Thank you,\n${c.name}`),
      };
    },
    fee: (c) => ({
      subject: `Request to reverse a ${c.feeType}`,
      body: join(`Hello${c.bank ? ` ${c.bank}` : ''},`,
        `I'm writing about a ${c.feeType} of ${c.fee}${c.feeDate ? ` charged on ${c.feeDate}` : ''}. I've been a customer since ${c.since}, and I'd like to ask you to reverse it as a one-time courtesy.`,
        'Could you also tell me which settings or account options would help me avoid this fee in the future?',
        `Account: ${c.account}`,
        `Thank you,\n${c.name}`),
    }),
  },
  es: {
    cancel: (c) => ({
      subject: `Por favor cancelen mi suscripción a ${c.m}`,
      body: join(`Hola, equipo de ${c.m}:`,
        `Por favor cancelen mi suscripción a ${c.m} y detengan todos los cargos futuros a partir de hoy.`,
        `Cuenta: ${c.account}${c.last ? `\nÚltimo cargo: ${c.amount} el ${c.last}` : ''}`,
        c.rosca,
        'Les pido que confirmen por escrito (basta con responder este correo) que la suscripción quedó cancelada, la fecha en que termina y que no se harán más cargos.',
        `Gracias,\n${c.name}`),
    }),
    pushback: (c) => ({
      subject: `Consulta sobre el aumento de precio de ${c.m}`,
      body: join('Hola:',
        `Soy cliente de ${c.m} desde ${c.since}. Mi precio subió de ${c.old} a ${c.new}${c.stepDate ? ` el ${c.stepDate}` : ''}${c.pct ? ` (${c.pct} más)` : ''}.`,
        `Antes de decidir si sigo con el servicio, quisiera preguntar:\n1. ¿Pueden mantenerme el precio anterior de ${c.old} u ofrecerme un descuento por fidelidad?\n2. ¿Hay un plan más barato que cubra lo que uso?`,
        `Si no es posible, pienso cancelar antes de mi próxima fecha de cobro${c.next ? `, el ${c.next}` : ''}.`,
        `Cuenta: ${c.account}`,
        `Gracias,\n${c.name}`),
    }),
    refund: (c) => {
      const why = {
        double: `Me cobraron dos veces lo mismo:\n${list(c.charges)}\nLes pido que reembolsen el cargo duplicado de ${c.total}.`,
        afterCancel: `Cancelé el ${c.cancelDate || '[la fecha en que cancelaste]'}, pero después me siguieron cobrando:\n${list(c.charges)}\nLes pido que reembolsen estos cargos (${c.total}) y confirmen que mi suscripción está cancelada.`,
        unauthorized: `No reconozco estos cargos y no los autoricé:\n${list(c.charges)}\nLes pido que los reembolsen (${c.total}), cierren cualquier suscripción en mi cuenta y confirmen que no habrá más cargos.`,
        trial: `Me inscribí en una prueba y no quería pasar a un plan de pago. Me cobraron:\n${list(c.charges)}\nLes pido que cancelen la suscripción y reembolsen ${c.total}.`,
      }[c.reason || 'double'];
      return {
        subject: `Solicitud de reembolso: ${c.m}`,
        body: join(`Hola, equipo de ${c.m}:`, why, `Cuenta: ${c.account}`,
          'Por favor respondan con el monto que van a reembolsar y cuándo llegará a mi cuenta.',
          `Gracias,\n${c.name}`),
      };
    },
    fee: (c) => ({
      subject: `Solicitud para revertir un cargo: ${c.feeType}`,
      body: join(`Hola${c.bank ? `, ${c.bank}` : ''}:`,
        `Les escribo por un cargo de ${c.feeType} de ${c.fee}${c.feeDate ? ` cobrado el ${c.feeDate}` : ''}. Soy cliente desde ${c.since} y quisiera pedirles que lo reviertan como cortesía, por única vez.`,
        '¿Podrían decirme también qué ajustes u opciones de cuenta me ayudarían a evitar este cargo en el futuro?',
        `Cuenta: ${c.account}`,
        `Gracias,\n${c.name}`),
    }),
  },
};

const SCRIPTS = {
  en: {
    pushback: (c) => [
      `"Hi, I'm calling about my ${c.m} account. My price went from ${c.old} to ${c.new}. I've been a customer since ${c.since}. I'd like to keep the service, but at this price I'm planning to cancel. What can you do to bring it back down?"`,
      'Then pause and listen.',
      'If they offer a deal: ask how long it lasts and what it costs after that, and ask them to confirm it by email.',
      'If they say no: ask whether there is a cheaper plan, or say you would like to cancel. Write down the date, the name of the person you spoke to and any confirmation number.',
    ].join('\n\n'),
    fee: (c) => [
      `"Hi, I'm calling about a ${c.feeType} of ${c.fee}${c.feeDate ? ` on ${c.feeDate}` : ''}. I've been a customer since ${c.since}, and I'd like to ask you to reverse it as a one-time courtesy."`,
      'Then pause and listen.',
      'If yes: thank them and ask when the money will show in your account.',
      'Either way, ask: "Is there a setting or a different account type that would stop this fee from happening again?" (For example low-balance alerts, overdraft settings or a no-fee account.)',
      'If no: ask politely whether a supervisor can review it. Write down the date and the name of the person you spoke to.',
    ].join('\n\n'),
  },
  es: {
    pushback: (c) => [
      `"Hola, llamo por mi cuenta de ${c.m}. Mi precio subió de ${c.old} a ${c.new}. Soy cliente desde ${c.since}. Me gustaría seguir con el servicio, pero a este precio pienso cancelar. ¿Qué pueden hacer para bajarlo?"`,
      'Luego haz una pausa y escucha.',
      'Si te ofrecen algo: pregunta cuánto dura y cuánto cuesta después, y pide que te lo confirmen por correo.',
      'Si dicen que no: pregunta si hay un plan más barato, o di que quieres cancelar. Anota la fecha, el nombre de la persona y cualquier número de confirmación.',
    ].join('\n\n'),
    fee: (c) => [
      `"Hola, llamo por un cargo de ${c.feeType} de ${c.fee}${c.feeDate ? ` del ${c.feeDate}` : ''}. Soy cliente desde ${c.since} y quisiera pedirles que lo reviertan como cortesía, por única vez."`,
      'Luego haz una pausa y escucha.',
      'Si dicen que sí: agradece y pregunta cuándo se verá el dinero en tu cuenta.',
      'En cualquier caso, pregunta: "¿Hay algún ajuste o tipo de cuenta que evite este cargo en el futuro?" (por ejemplo, alertas de saldo bajo, ajustes de sobregiro o una cuenta sin comisiones).',
      'Si dicen que no: pregunta con amabilidad si un supervisor puede revisarlo. Anota la fecha y el nombre de la persona.',
    ].join('\n\n'),
  },
};

// How to cancel, by kind of service. Generic steps only: we don't describe any company's internal process.
export const GUIDE_IDS = ['appstore', 'online', 'phone', 'gym', 'insurance', 'utility', 'membership', 'contract'];
const GUIDES = {
  en: {
    appstore: { title: 'Billed through an app store', steps: ['On the phone or tablet you used to sign up, open the app store (not the app itself).', 'Open your account, then find "Subscriptions".', 'Pick the subscription and choose Cancel. Deleting the app does not cancel it.', 'Take a screenshot of the confirmation screen and the end date.', 'Check your next statement. If you still see the charge, use the refund request.'] },
    online: { title: 'A website or app billed to your card', steps: ['Sign in on the company\'s website and look in Account, Billing, Membership or Plan for a Cancel option.', 'If you can\'t find one, send the cancellation email from Quickwell Saver to their support address.', 'Save the confirmation email or a screenshot showing the end date.', 'Check your next statement. If they charge you again, send the refund request.', 'If they keep charging you, contact your card issuer or bank. They may be able to dispute the charge or issue a new card number. Disputes can have time limits, so act soon.'] },
    phone: { title: 'Phone, internet or TV', steps: ['Find your account number and the account holder\'s details on a recent bill.', 'Call the number on your bill, or use the company\'s chat, and ask for cancellations (or "retention" if you want a better price instead).', 'Ask about any early-termination fee and whether you must return equipment. Return it and keep the receipt.', 'Ask for a confirmation number and the final bill date, and write down the name of the person you spoke to.', 'If you\'re keeping your phone number, start the new service before you cancel the old one.'] },
    gym: { title: 'Gym or fitness club', steps: ['Read your membership agreement for how to cancel: notice period, in writing or in person, any fee.', 'Send the cancellation email from Quickwell Saver. If the agreement asks for a letter, send it in a way you can prove, such as certified mail.', 'Ask for written confirmation of your last billing date.', 'Watch your next two statements. If you\'re charged after the end date, send the refund request.'] },
    insurance: { title: 'Insurance', steps: ['Line up your new policy first, so there is no day without cover. Some cover, like car insurance, may be required by law.', 'Call or write to your insurer and ask to cancel on a specific date, the day the new policy starts.', 'Ask whether you\'ll get a refund for unused months and how it is paid.', 'Get the cancellation confirmation in writing.'] },
    utility: { title: 'Power, gas, water or trash', steps: ['If you\'re moving, contact the company with your move-out date and a forwarding address for the final bill.', 'If you\'re staying, ask about cheaper plans, budget billing or assistance programs instead of cancelling.', 'Take a meter photo on your last day.', 'Keep the final bill and confirmation.'] },
    membership: { title: 'Membership, delivery pass or subscription box', steps: ['Sign in to your account and look in Membership, Plan or Subscription settings. Boxes often have a "pause" or "skip" option too.', 'Check the cut-off: many boxes must be cancelled a few days before the next order ships.', 'Save the confirmation and the end date.', 'If you\'re charged again, send the refund request.'] },
    contract: { title: 'Rent, loans or contracts', steps: ['These usually can\'t simply be cancelled. Read your agreement for the notice period and any fees.', 'For loans, ask your lender about lower-rate, refinancing or hardship options before you miss a payment.', 'Put any notice in writing and keep a copy.'] },
  },
  es: {
    appstore: { title: 'Cobrado por una tienda de apps', steps: ['En el teléfono o tableta con que te suscribiste, abre la tienda de apps (no la app).', 'Abre tu cuenta y busca "Suscripciones".', 'Elige la suscripción y toca Cancelar. Borrar la app no la cancela.', 'Haz una captura de pantalla de la confirmación y la fecha de fin.', 'Revisa tu próximo estado de cuenta. Si ves el cargo otra vez, usa la solicitud de reembolso.'] },
    online: { title: 'Un sitio web o app que cobra a tu tarjeta', steps: ['Inicia sesión en el sitio de la empresa y busca en Cuenta, Facturación, Membresía o Plan una opción para cancelar.', 'Si no la encuentras, envía el correo de cancelación de Quickwell Saver a su dirección de soporte.', 'Guarda el correo de confirmación o una captura con la fecha de fin.', 'Revisa tu próximo estado de cuenta. Si te cobran otra vez, envía la solicitud de reembolso.', 'Si siguen cobrando, habla con el emisor de tu tarjeta o tu banco. Es posible que puedan disputar el cargo o darte un nuevo número de tarjeta. Las disputas pueden tener plazos, así que actúa pronto.'] },
    phone: { title: 'Teléfono, internet o TV', steps: ['Busca tu número de cuenta y los datos del titular en una factura reciente.', 'Llama al número de tu factura o usa el chat de la empresa y pide el área de cancelaciones (o de "retención" si prefieres un mejor precio).', 'Pregunta si hay penalización por terminar antes y si debes devolver equipos. Devuélvelos y guarda el comprobante.', 'Pide un número de confirmación y la fecha de la última factura, y anota el nombre de la persona.', 'Si quieres conservar tu número, activa el servicio nuevo antes de cancelar el anterior.'] },
    gym: { title: 'Gimnasio o club deportivo', steps: ['Lee tu contrato para ver cómo cancelar: aviso previo, por escrito o en persona, y cualquier cargo.', 'Envía el correo de cancelación de Quickwell Saver. Si el contrato pide una carta, envíala de forma que puedas probarlo, por ejemplo por correo certificado.', 'Pide confirmación por escrito de tu último cobro.', 'Revisa tus dos próximos estados de cuenta. Si te cobran después de la fecha de fin, envía la solicitud de reembolso.'] },
    insurance: { title: 'Seguros', steps: ['Contrata primero la nueva póliza para no quedarte ni un día sin cobertura. Algunos seguros, como el del auto, pueden ser obligatorios.', 'Llama o escribe a tu aseguradora y pide cancelar en una fecha concreta: el día que empieza la nueva póliza.', 'Pregunta si te devolverán los meses no usados y cómo.', 'Pide la confirmación de cancelación por escrito.'] },
    utility: { title: 'Luz, gas, agua o basura', steps: ['Si te mudas, avisa a la empresa la fecha de salida y una dirección para la última factura.', 'Si te quedas, pregunta por planes más baratos, pagos fijos o programas de ayuda en vez de cancelar.', 'Toma una foto del medidor el último día.', 'Guarda la última factura y la confirmación.'] },
    membership: { title: 'Membresía, pase de envíos o caja de suscripción', steps: ['Inicia sesión y busca en los ajustes de Membresía, Plan o Suscripción. Las cajas suelen tener también "pausar" u "omitir".', 'Revisa la fecha límite: muchas cajas se deben cancelar unos días antes de que salga el próximo pedido.', 'Guarda la confirmación y la fecha de fin.', 'Si te cobran otra vez, envía la solicitud de reembolso.'] },
    contract: { title: 'Alquiler, préstamos o contratos', steps: ['Normalmente no se pueden cancelar sin más. Lee tu contrato para ver el aviso previo y los cargos.', 'Si es un préstamo, pregunta a tu prestamista por tasas más bajas, refinanciamiento u opciones por dificultades antes de atrasarte.', 'Da cualquier aviso por escrito y guarda una copia.'] },
  },
};
export function guide(id, lang = 'en') { const g = GUIDES[L(lang)]; return g[id] || g.online; }

// Calendar events: a "cancel by" reminder two days before each next charge (our suggestion, not a company rule).
// Monthly items repeat for 12 months with a 1-day alert; yearly items get 30- and 7-day alerts.
// items: [{ series, amount (formatted), next (formatted) }]
const CAL = {
  en: { title: (m) => `Cancel ${m} by today if you don't want it`, desc: (m, a, n) => `${m} charges ${a} on ${n}. Keep it? Do nothing. Don't want it? Cancel today. (Quickwell Saver reminder: 2 days before the charge.)` },
  es: { title: (m) => `Cancela ${m} hoy si no lo quieres`, desc: (m, a, n) => `${m} cobra ${a} el ${n}. ¿Lo quieres? No hagas nada. ¿No? Cancela hoy. (Recordatorio de Quickwell Saver: 2 días antes del cobro.)` },
};
export function calendarEvents(items, lang = 'en') {
  const c = CAL[L(lang)];
  return items.filter((x) => x.series.cancelBy).map((x) => {
    const s = x.series;
    const e = { date: s.cancelBy, title: c.title(s.name), desc: c.desc(s.name, x.amount, x.next), uid: payeeKey(s.name) || s.name };
    if (s.cadence === 'annual' || s.cadence === 'quarterly') e.alarms = [30, 7];
    else { e.alarms = [1]; if (s.cadence === 'monthly') e.rrule = 'FREQ=MONTHLY;COUNT=12'; }
    return e;
  });
}
export function calendarFile(items, lang = 'en', stamp) {
  const ics = toICS(calendarEvents(items, lang), stamp);
  // add repeat rules (toICS is shared with the engine tests; it ignores rrule, so splice them in here)
  const evs = calendarEvents(items, lang);
  let i = 0;
  return ics.replace(/DTEND;VALUE=DATE:\d{8}\r\n/g, (m) => { const e = evs[i++]; return e && e.rrule ? `${m}RRULE:${e.rrule}\r\n` : m; });
}
