// Scam pattern notes: static, dated, one edition a week. Each note describes a pattern our rules look for and what
// to do. Notes make no statistical claims. `rules` lists the rule ids that look for the pattern, so every note is
// tied to something the checker really does. Add a new edition at the top each week.
export const EDITIONS = [
  {
    week: '2026-10-12',
    notes: [
      { id: 'toll', rules: ['toll', 'fees', 'url-brand-name', 'url-tld'],
        en: { t: 'Small “unpaid toll” texts', look: 'A text says you owe a few dollars in tolls and must pay today to avoid fees, with a link.', do: 'Don’t tap. Open your toll account in its official app or a website address you type yourself.' },
        es: { t: 'SMS de “peaje sin pagar”', look: 'Un SMS dice que debes unos pocos dólares de peaje y que pagues hoy para evitar recargos, con un enlace.', do: 'No toques. Abre tu cuenta de peaje en su app oficial o en una dirección que escribas tú.' } },
      { id: 'family', rules: ['family-new', 'family-trouble', 'money-ask', 'secrecy'],
        en: { t: '“Hi Mom, this is my new number”', look: 'A relative “on a new number” needs money quickly and can’t talk on the phone.', do: 'Call them back on the number you already have, or ask your family code word.' },
        es: { t: '“Hola mamá, este es mi número nuevo”', look: 'Un familiar “con número nuevo” necesita dinero rápido y no puede hablar por teléfono.', do: 'Llámale al número que ya tienes o pide la palabra clave de la familia.' } },
      { id: 'code', rules: ['code-ask'],
        en: { t: '“I sent you my code by mistake”', look: 'Someone says a code went to your phone by mistake and asks you to send it to them.', do: 'Never send it. That code can let them take over your account.' },
        es: { t: '“Te envié mi código por error”', look: 'Alguien dice que un código llegó a tu teléfono por error y te pide que se lo mandes.', do: 'Nunca lo envíes. Ese código puede darles acceso a tu cuenta.' } },
      { id: 'job', rules: ['job', 'chat-app', 'combo-job'],
        en: { t: 'Paid “tasks” job offers', look: 'An offer to earn money for liking videos or rating products, then a request to top up or pay to unlock earnings.', do: 'Stop at the first request to pay. Real jobs pay you; they don’t charge you.' },
        es: { t: 'Ofertas de “tareas” pagadas', look: 'Una oferta para ganar dinero dando like o calificando productos y después una petición de recargar o pagar para desbloquear ganancias.', do: 'Para en la primera petición de pago. Un empleo real te paga; no te cobra.' } },
    ],
  },
];
