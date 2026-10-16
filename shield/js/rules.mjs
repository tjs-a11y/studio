// Quickwell Shield message rules. Plain, readable patterns in English and Spanish, run on the device.
// Each rule: id, group, weight (points it adds when found), patterns. A rule counts once however often it matches;
// every place it matched is highlighted. `not` = words just before a match that cancel it ("never share this code").
// `need` = the message must also contain this, or the rule doesn't count (overpay needs money, not just "sent by mistake").
// The "What we checked" panel lists every rule here with its result, so nothing is hidden.

const L = '[\\p{L}\\p{N}]';
// Word-bounded, case-insensitive, Unicode-aware pattern.
const W = (s) => new RegExp(`(?<!${L})(?:${s})(?!${L})`, 'giu');
// Same, but case-sensitive (for short capitalised names like SAT or SSA that are ordinary words otherwise).
const C = (s) => new RegExp(`(?<!${L})(?:${s})(?!${L})`, 'gu');
const NEG = /(?:never|don'?t|do not|won'?t|will never|nunca|jam[aá]s|no (?:lo |la |le )?(?:compartas|comparta|des|d[eé]|env[ií]es|env[ií]e|digas|diga|reenv[ií]es|proporciones))\W+(?:\w+\W+){0,3}$/iu;

// Right after "sent by mistake": the thing sent was a code, not money ("accidentally sent my verification code").
const CODE_NEXT = "(?!\\W+(?:[\\p{L}\\p{N}-]+\\W+){0,3}?(?:code|codes|c[oó]digos?|passcode|pin|otp|token))";
// Money words: an overpayment story always mentions money somewhere.
const MONEY_CUE = W("[$€£]\\s?\\d|\\d[\\d,.]*\\s?(?:usd|dollars?|bucks|d[oó]lares|pesos|euros?)|money|cash|funds|payments?|paid|pay|deposit(?:ed)?|transfer(?:red)?|refund(?:ed)?|(?:a|the|my|your) check|cheques?|zelle|venmo|cash ?app|paypal|wire|difference|rent|overpa(?:id|yment)|over-payment|dinero|plata|efectivo|pagos?|pag[oó]|dep[oó]sit(?:o|[eé])|transfer[ií]|transferencia|reembols(?:o|[eé])|diferencia|bizum|renta|alquiler|de m[aá]s");

export const GROUPS = ['pressure', 'secrecy', 'impersonation', 'payment', 'codes', 'offer', 'pattern', 'link'];

export const RULES = [
  // ---- pressure
  { id: 'urgency', group: 'pressure', w: 1, re: [
    W("urgent(?:ly)?|immediately|right away|act now|asap|as soon as possible|within (?:the next )?\\d{1,2} ?(?:hours?|hrs?|minutes?|mins?)|in the next \\d{1,2} ?(?:hours?|minutes?)|today only|final (?:notice|warning|reminder|attempt)|last (?:chance|warning|notice|reminder)|expires? (?:today|tonight|soon|in \\d+)|time is running out|before it'?s too late|within the (?:hour|day)|limited time|respond now|reply now|don'?t delay"),
    W("urgente|inmediatamente|de inmediato|cuanto antes|lo antes posible|en las pr[oó]ximas \\d{1,2} ?horas|(?:en|dentro de) (?:las )?\\d{1,2} ?(?:horas|minutos)|[uú]ltimo aviso|[uú]ltima (?:oportunidad|advertencia|notificaci[oó]n)|hoy mismo|solo hoy|vence hoy|expira hoy|antes de que sea tarde|tiempo limitado|responda ya|act[uú]e ya"),
  ] },
  { id: 'threat', group: 'pressure', w: 2, re: [
    W("(?:will be|to be|is being) (?:shut off|disconnected|cut off|turned off)|disconnection|shut-?off notice|(?:will be|has been|have been|is being|was) (?:suspended|locked|blocked|closed|disabled|terminated|frozen|deactivated|cancell?ed|seized)|arrest(?:ed)?|warrant|legal action|lawsuit|sued|police|deport(?:ed|ation)?|criminal (?:charges?|case|record)|court (?:date|case|order)|jail|prison|federal (?:agent|charges)"),
    W("(?:ser[aá]|ha sido|fue|est[aá]) (?:cortad[oa]|desconectad[oa]|suspendid[oa]|bloquead[oa]|cancelad[oa]|desactivad[oa]|congelad[oa]|cerrad[oa]|embargad[oa])|arresto|orden de (?:arresto|aprehensi[oó]n|captura)|acci[oó]n legal|demanda(?:do)?|polic[ií]a|deportaci[oó]n|antecedentes penales|c[aá]rcel|denuncia penal"),
  ], not: /(?:if you|si usted|si tú|si tu)\W+(\w+\W+){0,3}$/iu },
  { id: 'fees', group: 'pressure', w: 1, re: [
    W("late fees?|penalt(?:y|ies)|fines?|additional (?:fees|charges)|surcharge"),
    W("recargos?|penalizaci[oó]n|multas?|cargos? adicionales"),
  ] },
  // ---- secrecy
  { id: 'secrecy', group: 'secrecy', w: 3, re: [
    W("(?:don'?t|do not) tell (?:anyone|anybody|your|mom|dad|the bank|bank staff|family)|keep (?:this|it) (?:between us|(?:a )?secret|confidential|quiet|to yourself)|(?:don'?t|do not) (?:hang up|call anyone|contact (?:anyone|your bank|the bank|anybody))|do not discuss this|tell no one|our (?:little )?secret|(?:don'?t|do not) let (?:anyone|them) know|if (?:the bank|they|anyone) asks?,? (?:say|tell)"),
    W("no (?:le|les|se lo|se la) (?:digas|cuentes|diga|comente|comentes)|no le digas a nadie|que quede entre nosotros|(?:mantenlo|mant[eé]n(?:galo|lo)?|guarda(?:lo)?) en secreto|no cuelgue|no cuelgues|es confidencial|no avises a nadie|si (?:el banco|te) pregunta,? (?:di|dile)"),
  ] },
  // ---- impersonation
  { id: 'bank', group: 'impersonation', w: 2, re: [
    W("(?:unusual|suspicious|unauthori[sz]ed|unrecogni[sz]ed) (?:activity|sign-?in|log-?in|transactions?|charges?|purchases?|access|payment)|your (?:\\w+ )?account (?:has been|was|is|will be) (?:locked|limited|restricted|suspended|on hold|compromised|frozen)|verify your (?:account|identity|information|details|card)|confirm your (?:account|identity|details|information|card)|fraud (?:department|team|prevention team)|security (?:department|team)|update your (?:payment|billing|account|card) (?:info|information|details|method)|update (?:your )?(?:payment|billing)(?: (?:info|information|details|method))?:"),
    W("actividad (?:sospechosa|inusual)|(?:cargo|movimiento|compra|acceso|transacci[oó]n) no (?:autorizad[oa]|reconocid[oa])|(?:su|tu) cuenta (?:ha sido|fue|ser[aá]|est[aá]) (?:bloqueada|suspendida|limitada|restringida|congelada)|verifi(?:que|ca|car) (?:su|tu) (?:cuenta|identidad|informaci[oó]n|datos|tarjeta)|confirm(?:e|a|ar) (?:su|tu) (?:cuenta|identidad|informaci[oó]n|datos|tarjeta)|departamento de (?:fraudes?|seguridad)|actualic?(?:e|a|ar) (?:sus|su|tus|tu) datos"),
  ] },
  { id: 'gov', group: 'impersonation', w: 1, re: [
    W("internal revenue service|social security administration|medicare|dmv|tax refund|stimulus (?:check|payment)|customs (?:fee|duty|clearance|office)|immigration|uscis|treasury department|government grant|federal grant"),
    C("IRS|SSA|SAT|IMSS|DGT|AEAT"),
    W("hacienda|seguro social|devoluci[oó]n de impuestos|aduana|migraci[oó]n|agencia tributaria|tesorer[ií]a|(?:subsidio|bono|apoyo) del gobierno"),
  ] },
  { id: 'gov-ssn', group: 'impersonation', w: 3, re: [
    W("social security number (?:has been|was|is|will be) (?:suspended|blocked|frozen|compromised|cancell?ed)|suspend your social security|(?:n[uú]mero de )?seguro social (?:ha sido |fue |ser[aá] )?(?:suspendido|bloqueado|cancelado)"),
  ] },
  { id: 'delivery', group: 'impersonation', w: 2, re: [
    W("(?:package|parcel|shipment|delivery|order|item) (?:is |was |has been )?(?:on hold|held|pending|undeliverable|could(?: not|n'?t) be delivered|failed|unsuccessful|returned to (?:sender|the warehouse)|suspended)|(?:could not|couldn'?t|unable to|were unable to|failed to) deliver|re-?delivery|re-?schedule (?:your )?delivery|delivery (?:fee|charge|attempt failed)|(?:update|confirm|verify) (?:your )?(?:delivery |shipping )?address|incomplete (?:delivery |shipping )?address|address (?:is )?(?:incomplete|invalid|unclear)|customs fee|small (?:shipping |delivery )?fee|(?:tried|attempted) to deliver|(?:book|choose|select|schedule|pick) a (?:new )?delivery (?:slot|date|time|window)|(?:handling|redelivery|re-delivery|processing|storage) (?:charge|fee)|to release (?:your|the) (?:package|parcel|shipment|item)"),
    W("(?:paquete|env[ií]o|pedido) (?:est[aá] |fue |ha sido )?(?:retenido|pendiente|en espera|devuelto|suspendido)|no (?:pudo ser|fue|ha sido) entregado|no (?:pudimos|se pudo|hemos podido) entregar|reprogramar (?:la |su |tu )?entrega|(?:actualice|actualiza|confirme|confirma|verifique|verifica) (?:su|tu) direcci[oó]n|direcci[oó]n (?:incompleta|incorrecta|inv[aá]lida)|tarifa de (?:env[ií]o|entrega|aduana|reenv[ií]o)|pago de aduana|falta de pago|para liberar (?:su|tu|el) (?:paquete|env[ií]o|pedido)|peque[nñ]a tarifa"),
  ] },
  { id: 'toll', group: 'impersonation', w: 3, re: [
    W("(?:unpaid|outstanding|overdue|pending) (?:toll|tolls|toll balance|toll charges?|road usage)|toll (?:balance|violation|evasion|due|invoice)|(?:pay|settle) (?:your )?toll"),
    W("peajes? (?:pendientes?|vencidos?|sin pagar|impagos?)|saldo (?:pendiente )?de peajes?|(?:pague|paga) (?:su|tu|el) peaje"),
  ] },
  { id: 'tech', group: 'impersonation', w: 2, re: [
    W("(?:whatsapp|facebook|instagram|telegram|google|netflix) (?:support|security) team|virus(?:es)? (?:detected|found|alert)|malware|(?:computer|device|pc|phone|iphone|mac|laptop) (?:is|has been|may be|was) (?:infected|hacked|compromised|locked)|(?:microsoft|apple|windows|norton|mcafee|geek squad|amazon|paypal) (?:support|security|technician|tech|help ?desk|refund|billing) (?:team|department|center|line)?|tech(?:nical)? support|(?:subscription|order|membership|plan|license) (?:has been |was |will be )?(?:auto[- ]?)?renewed|(?:refund|billing) department"),
    W("virus detectado|(?:computadora|equipo|tel[eé]fono|dispositivo|celular|pc) (?:est[aá]|ha sido|fue) (?:infectad[oa]|hackead[oa]|bloquead[oa]|comprometid[oa])|soporte t[eé]cnico|servicio t[eé]cnico de (?:microsoft|apple|windows)|(?:suscripci[oó]n|membres[ií]a|licencia) (?:fue|ha sido|ser[aá]) renovada|departamento de reembolsos|(?:soporte|equipo de soporte|servicio al cliente|seguridad) de (?:whatsapp|facebook|instagram|apple|microsoft|google|amazon|paypal|netflix|telegram)"),
  ] },
  { id: 'call-in', group: 'impersonation', w: 2, re: [
    W("call (?:our|this|us at this) (?:toll[- ]free )?(?:number|support|help ?line|hotline)|call (?:our|the) (?:refund|billing|support|fraud|cancell?ation) (?:department|team|line|center)|call us (?:now|immediately|right away|at|on) |call (?:now|immediately) (?:at|on)? ?\\(?\\+?\\d|(?:do not|don'?t) (?:turn off|restart|shut down|close) your (?:computer|device|pc|browser)|press 1 to speak"),
    W("(?:llame|llama|marque|marca) (?:ahora |de inmediato )?(?:a (?:este|nuestro) (?:n[uú]mero|soporte)|al (?:n[uú]mero )?\\(?\\+?\\d)|no (?:apague|reinicie|cierre) (?:su|tu) (?:computadora|equipo|navegador)|marque 1 para"),
  ] },
  { id: 'remote', group: 'impersonation', w: 4, re: [
    W("anydesk|teamviewer|ultraviewer|quick ?assist|logmein|rustdesk|remote (?:access|desktop|control|session|support app)|(?:download|install) (?:this|the|an?) app so (?:i|we) can|share your screen"),
    W("acceso remoto|control remoto|(?:descargue|descarga|instale|instala) (?:esta|la) (?:app|aplicaci[oó]n) para que (?:pueda|podamos)|comparte tu pantalla|comparta su pantalla"),
  ] },
  { id: 'family-new', group: 'impersonation', w: 3, re: [
    W("(?:this is|it'?s|its) (?:my |me,? )?(?:new|other) (?:number|phone)|my new number|new (?:phone|number),? (?:who ?dis|save it|delete the old)|(?:i )?(?:lost|broke|dropped|smashed) my phone|(?:my )?(?:phone|cell) (?:is |got )?(?:broken|lost|stolen|dead)|(?:temporary|temp|backup) (?:number|phone)|(?:my )?phone (?:broke|died|is broken|got broken|fell)|using a friend'?s phone|text me (?:on|at) this number"),
    W("(?:este es|es) mi (?:nuevo )?n[uú]mero(?: nuevo)?|mi n[uú]mero nuevo|(?:perd[ií]|se me cay[oó]|se me rompi[oó]|me robaron) (?:el|mi) (?:tel[eé]fono|celular|m[oó]vil)|(?:te escribo|uso) (?:desde )?el (?:tel[eé]fono|celular) de un amigo|guarda este n[uú]mero"),
  ] },
  { id: 'family-trouble', group: 'impersonation', w: 3, re: [
    W("i'?m in (?:trouble|jail|the hospital|a bad situation)|(?:i )?(?:been|got|was) arrested|bail (?:money)?|(?:had|been in|got in(?:to)?) (?:a|an) (?:car )?accident|it'?s me,? your (?:grandson|granddaughter|son|daughter|nephew|niece)|(?:grandma|grandpa|mom|dad),? (?:it'?s|its) me|need (?:a )?lawyer"),
    W("estoy (?:en problemas|en la c[aá]rcel|detenid[oa]|en el hospital|en un apuro)|me (?:detuvieron|arrestaron)|fianza|tuve un accidente|soy (?:yo,? )?tu (?:niet[oa]|hij[oa]|sobrin[oa])|(?:abuela|abuelo|mam[aá]|pap[aá]),? soy yo|necesito un abogado"),
  ] },
  { id: 'family-greet', group: 'impersonation', w: 1, re: [
    W("(?:hi|hey|hello) (?:mom|mum|mama|mommy|dad|daddy|papa|grandma|grandpa|nana|granny|auntie|uncle)"),
    W("(?:hola|oye) (?:mam[aá]|mami|pap[aá]|papi|abuel[ao]|abuelit[ao]|t[ií][ao])"),
  ] },
  { id: 'generic-greet', group: 'impersonation', w: 1, re: [
    W("dear (?:customer|user|client|member|valued customer|account ?holder|sir(?:/madam)?|madam|beneficiary|friend|winner)|valued (?:customer|member)"),
    W("estimad[oa] (?:cliente|usuari[oa]|beneficiari[oa]|miembro|ganador)|querid[oa] cliente"),
  ] },
  // ---- payment
  { id: 'pay-giftcard', group: 'payment', w: 3, re: [
    W("(?:pay|paid|paying|payment|buy|purchase|send|get|using|use|with|in|by|load) (?:\\w+ ){0,4}(?:gift ?cards?|(?:apple|itunes|google play|steam|amazon|ebay|target|walmart|razer gold|vanilla|sephora) cards?)|(?:scratch|scrape) (?:off )?the (?:back|code|silver)|(?:code|numbers?|pin) on the back of the (?:gift )?cards?|gift ?cards? (?:numbers?|codes?)"),
    W("(?:pague|paga|pagar|pago|compre|compra|comprar|env[ií]e|env[ií]a|con|en) (?:\\w+ ){0,4}tarjetas? (?:de regalo|(?:de )?(?:google play|itunes|apple|steam|amazon|razer))|raspa (?:la|el) (?:parte|c[oó]digo)|c[oó]digos? de (?:la |las )?tarjetas? de regalo"),
  ] },
  { id: 'pay-crypto', group: 'payment', w: 3, re: [
    W("bitcoin|btc|crypto(?:currency|currencies)?|usdt|tether|ethereum|bitcoin (?:atm|machine|kiosk)|crypto (?:atm|kiosk|wallet)|wallet address|qr code to (?:pay|deposit)"),
    W("criptomonedas?|cripto|cajero (?:de )?bitcoin|billetera (?:digital|cripto)|direcci[oó]n de (?:la )?billetera"),
  ] },
  { id: 'pay-wire', group: 'payment', w: 2, re: [
    W("wire (?:transfer|the money|it|the funds|the payment)|western union|moneygram|remitly|send (?:the )?money (?:via|by|through)|money order|cashier'?s check|courier (?:will )?(?:pick up|collect) (?:the )?(?:cash|money)"),
    W("transferencia (?:bancaria|internacional|inmediata)|giro (?:postal|bancario)|western union|moneygram|env[ií]o de dinero|un mensajero (?:pasar[aá]|recoger[aá])"),
  ] },
  { id: 'pay-p2p', group: 'payment', w: 1, re: [
    W("zelle|venmo|cash ?app|paypal friends|instant (?:transfer|payment)|bizum|mercado ?pago|nequi|daviplata|spei|yape|plin"),
  ] },
  { id: 'money-ask', group: 'payment', w: 2, re: [
    W("(?:send|wire|transfer|lend|loan|pay) me (?:\\$\\d[\\d,.]*|money|some|the money|\\d[\\d,.]*)|(?:can|could) you (?:send|lend|transfer|wire) (?:me )?(?:\\$\\d[\\d,.]*|money|some money|the money|\\d[\\d,.]*|it now)|i need (?:some )?(?:money|cash|\\$\\d[\\d,.]*)|need you to (?:pay|send|transfer|wire|buy)|pay (?:a|the) (?:small )?(?:fee|deposit|release fee|processing fee|clearance fee|activation fee)|(?:fee|deposit) (?:is |must be )?(?:paid|required) (?:first|before|to release)|help me (?:pay|with (?:the )?(?:bill|fee|rent))|send \\$\\d[\\d,.]*|(?:to|before you can) receive (?:it|the (?:payment|money|funds|prize)),? you (?:must|need to|have to)"),
    W("(?:env[ií]a|env[ií]ame|m[aá]ndame|transfi[eé]reme|pr[eé]stame|deposítame|depos[ií]tame) (?:\\$\\d[\\d,.]*|dinero|el dinero|\\d[\\d,.]*|un)|necesito (?:dinero|que me (?:env[ií]es|mandes|deposites|prestes|transfieras))|(?:puedes|podr[ií]as) (?:enviarme|mandarme|prestarme|depositarme|transferirme)|pag(?:ar|ue|a) (?:una|la) (?:peque[nñ]a )?(?:tarifa|comisi[oó]n|cuota|dep[oó]sito)"),
  ] },
  { id: 'safe-account', group: 'payment', w: 4, re: [
    W("safe account|secure account|(?:move|transfer|withdraw) (?:all )?(?:your )?(?:money|funds|savings|cash) (?:to|into) (?:a )?(?:new|safe|secure|protected|government)|protect your (?:money|funds|savings) by (?:moving|transferring|withdrawing)"),
    W("cuenta segura|cuenta protegida|(?:mueva|mueve|transfiera|transfiere|retire|retira) (?:todo )?(?:su|tu) dinero|proteger (?:su|tu) dinero (?:transfiriendo|moviendo)"),
  ] },
  // ---- codes and passwords
  { id: 'code-ask', group: 'codes', w: 5, re: [
    W("(?:send|share|give|tell|read|forward|text|reply with|provide|confirm|enter|repeat) (?:me |us |it to me |back )?(?:the |your |that |this )?(?:\\d-digit |six-digit |4-digit |verification |security |one-time |confirmation |login |access |sms |text )?(?:code|passcode|pin|otp|password|passcodes?)|(?:code|c[oó]digo)\\W+(?:\\w+\\W+){0,6}(?:by mistake|by accident|to your phone by mistake|por error|por equivocaci[oó]n)|(?:accidentally|mistakenly) (?:sent|texted|forwarded) (?:you )?(?:my |a |the |your )?(?:[\\w-]+ )?code|(?:sent|texted) (?:my |a |the )?(?:\\w+ )?code to (?:your|the wrong) (?:number|phone)|what'?s the code|read (?:it|the numbers) (?:back )?to me"),
    W("(?:env[ií]a|env[ií]ame|env[ií]eme|m[aá]ndeme|d[ií]game|comp[aá]rtame|reenv[ií]eme|dame|dime|comp[aá]rteme|m[aá]ndame|reenv[ií]a|reenv[ií]ame|proporcione|proporciona|confirme|confirma|d[ií]ctame|dicte|p[aá]same|p[aá]seme) (?:el|tu|su|ese|este)? ?(?:c[oó]digo|clave|contrase[nñ]a|nip|pin|token)|(?:te |le )?(?:envi[eé]|mand[eé]|reenvi[eé]) (?:por error|por equivocaci[oó]n|sin querer) (?:un |el |mi |tu |su )?c[oó]digo"),
  ], not: NEG },
  { id: 'pii-ask', group: 'codes', w: 3, re: [
    W("(?:confirm|provide|enter|send|verify|update|give|reply with|tell us|need) (?:\\w+ ){0,4}(?:social security number|ssn|card number|cvv|cvc|security code on the back|bank (?:login|password|details)|online banking (?:password|login|details)|mother'?s maiden name|full card details|account number and pin|routing number|medicare (?:number|card number|id)|date of birth|birth ?date|bank account number)"),
    W("(?:confirme|proporcione|ingrese|env[ií]e|env[ií]a|verifique|actualice|dame|necesitamos) (?:\\w+ ){0,4}(?:n[uú]mero de seguro social|curp|n[uú]mero de (?:la |su |tu )?tarjeta|cvv|c[oó]digo de seguridad|datos bancarios|clave bancaria|usuario y contrase[nñ]a)"),
  ], not: NEG },
  // ---- offers that are too good
  { id: 'prize', group: 'offer', w: 2, re: [
    W("you(?:'ve| have)? (?:won|been selected|been chosen)|you are (?:a|our) (?:lucky )?winner|claim (?:your )?(?:prize|reward|gift|winnings|cash|bonus|refund|tax refund|compensation)|lottery|sweepstakes?|jackpot|free (?:iphone|gift|money|vacation|cruise)|cash prize|inheritance|unclaimed (?:funds|money|package|reward)|you(?:'ve| have)? qualif(?:y|ied) for (?:a )?(?:free|\\$)|you(?:'re| are) eligible for (?:a )?(?:refund|grant|reward|compensation)"),
    W("(?:has|ha|haz|usted ha) ganado|(?:fue|ha sido|has sido|usted fue) seleccionad[oa]|(?:es|eres) (?:el|la|nuestr[oa]) (?:afortunad[oa] )?ganador(?:a)?|reclam(?:a|e|ar) (?:tu|su) (?:premio|regalo|recompensa|bono|reembolso|devoluci[oó]n)|loter[ií]a|sorteo|premio en efectivo|herencia|fondos no reclamados|(?:es|eres) elegible para (?:un )?(?:reembolso|subsidio|premio)"),
  ] },
  { id: 'invest', group: 'offer', w: 3, re: [
    W("guaranteed (?:returns?|profits?|income|earnings)|(?:double|triple) your (?:money|investment|crypto)|risk[- ]free (?:investment|returns?|profits?|trading)|\\d+(?:\\.\\d+)?% (?:daily|weekly|monthly|a day|a week|per day) (?:returns?|profits?|gains?|interest)?|(?:daily|weekly) (?:returns?|profits?) of|trading (?:platform|signals|mentor|group|app|bot)|investment (?:opportunity|platform|group|mentor|club)|crypto (?:investment|trading|mining) (?:platform|opportunity)?|passive income|withdraw(?:al)? (?:fee|tax)|(?:pay|unlock) (?:the )?(?:tax|fee) to withdraw"),
    W("(?:rendimientos?|ganancias|intereses) garantizad[oa]s|duplica(?:r)? (?:tu|su) (?:dinero|inversi[oó]n)|sin riesgo|(?:plataforma|grupo|mentor) de (?:inversi[oó]n|trading)|ingresos pasivos|\\d+% (?:diario|semanal|mensual|al d[ií]a)|comisi[oó]n (?:para|de) retiro"),
  ] },
  // ---- known patterns
  { id: 'job', group: 'pattern', w: 3, re: [
    W("work (?:from|at) home (?:job|opportunity|position|and earn)|remote (?:job|position|work) (?:offer|opportunity)|part[- ]time (?:job|position|work|opportunity)|earn (?:up to )?\\$?\\d[\\d,]*\\+? (?:dollars )?(?:per|a|each|every) (?:day|hour|week)|\\$\\d[\\d,]*(?:\\+)? ?(?:/|per |a )(?:day|hour|hr)|no experience (?:needed|required|necessary)|(?:like|rate|review|boost) (?:videos|products|posts|apps|hotels)|(?:daily|commission) (?:pay|tasks?|payment)|(?:buy|purchase) (?:the )?(?:equipment|supplies|starter kit)|deposit (?:the|this) check|(?:recruiter|hr manager|hiring manager)\\W+(?:\\w+\\W+){0,8}(?:whatsapp|telegram|signal)|(?:interview|onboarding) (?:on|via) (?:telegram|whatsapp|signal)"),
    W("trabajo (?:desde casa|remoto|de medio tiempo|f[aá]cil)|gana(?:r)? (?:hasta )?\\$?\\d[\\d,.]* (?:al|por) (?:d[ií]a|hora|semana)|sin experiencia|(?:dar like|calificar productos|calificar hoteles|rese[nñ]as pagadas)|comisi[oó]n diaria|(?:compra|comprar) (?:el|tu) (?:equipo|kit)|(?:reclutador|recursos humanos)\\W+(?:\\w+\\W+){0,8}(?:whatsapp|telegram)"),
  ] },
  { id: 'chat-app', group: 'pattern', w: 1, re: [
    W("(?:contact|message|text|write|add|reach|chat with) (?:us |me |our \\w+(?: \\w+)? )?(?:on|via|through|at) (?:whatsapp|telegram|signal)|(?:whatsapp|telegram) (?:me|us) (?:at|on)"),
    W("(?:escr[ií]be(?:nos|me)?|contacta|cont[aá]ctanos|m[aá]ndanos un mensaje|agr[eé]ga(?:nos|me)) (?:a nuestro \\w+ )?(?:por|v[ií]a|en) (?:whatsapp|telegram|signal)"),
  ] },
  { id: 'romance', group: 'pattern', w: 2, re: [
    W("(?:my )?(?:dear|darling|love|sweetheart|honey|babe|baby)[,.!]?\\s(?:[^.!?]{0,80})(?:money|\\$\\d[\\d,.]*|fee|ticket|visa|customs|gift ?card|wire|bitcoin)|deployed (?:overseas|in)|(?:on an )?oil rig|offshore (?:platform|rig)|peacekeeping mission|(?:un|united nations) (?:mission|doctor)|can'?t (?:video ?call|facetime|turn on (?:my )?camera)|(?:plane |flight )?tickets? to (?:come )?(?:see|visit|meet) you"),
    W("(?:mi )?(?:amor|cari[nñ]o|querid[oa]|cielo|mi vida)[,.!]?\\s(?:[^.!?]{0,80})(?:dinero|\\$\\d[\\d,.]*|tarifa|boleto|visa|aduana|tarjeta de regalo|transferencia)|plataforma petrolera|misi[oó]n de paz|no puedo hacer videollamada|boletos? (?:de avi[oó]n )?para (?:ir a )?verte"),
  ] },
  { id: 'overpay', group: 'pattern', w: 2, re: [
    W(`overpaid|over-?payment|refund (?:the|that) (?:difference|extra|balance)|send (?:back )?the (?:difference|extra|rest)|accidentally (?:sent|deposited|transferred|refunded)${CODE_NEXT}|sent (?:you )?(?:too much|extra|by mistake|by accident)${CODE_NEXT}|refunded (?:you )?too much|sent you (?:\\$?\\d[\\d,.]* )?(?:by mistake|by accident|accidentally)${CODE_NEXT}|(?:send|return|give) (?:me )?(?:back )?(?:the|my) money(?: back)?|send it back`),
    W(`(?:te |le )?(?:envi[eé]|deposit[eé]|transfer[ií]|reembols[eé]) (?:de m[aá]s|por error|por equivocaci[oó]n)${CODE_NEXT}|devu[eé]lve(?:me|lo)(?: la diferencia)?|reembolsa(?:r|e)? la diferencia|pag[oó] de m[aá]s`),
  ], need: MONEY_CUE },
  { id: 'wrong-number', group: 'pattern', w: 1, re: [
    W("wrong number|sorry,? (?:i think )?i (?:have|got) the wrong|is this (?:still )?the number (?:of|for)|n[uú]mero equivocado|perd[oó]n,? me equivoqu[eé] de n[uú]mero"),
  ] },
  // ---- link pressure (the links themselves are checked separately)
  { id: 'click', group: 'link', w: 1, re: [
    W("(?:click|tap|press|follow|open|visit) (?:on )?(?:the |this |below |our )?(?:link|url|here|below|button)|log ?in (?:here|now|below|at|via)|sign in (?:here|now|below)"),
    W("(?:haz|haga|da|d[eé]|hacer) (?:clic|click)|(?:ingrese|ingresa|entra|entre|acceda|accede) (?:al|en el|a este|a trav[eé]s del) (?:enlace|link|sitio)|(?:pulse|pulsa|toque|toca) (?:aqu[ií]|el enlace)|inicie sesi[oó]n aqu[ií]"),
  ] },
];

// Run every rule. Returns { [id]: { rule, spans: [{ s, e, text }] } } for the rules that matched.
export function runRules(text) {
  const s = String(text || '');
  const found = {};
  for (const r of RULES) {
    if (r.need) { r.need.lastIndex = 0; if (!r.need.test(s)) continue; }
    const spans = [];
    for (const re of r.re) {
      re.lastIndex = 0;
      for (const m of s.matchAll(re)) {
        if (!m[0]) continue;
        if (r.not && r.not.test(s.slice(Math.max(0, m.index - 40), m.index))) continue;
        spans.push({ s: m.index, e: m.index + m[0].length, text: m[0] });
      }
    }
    if (spans.length) found[r.id] = { rule: r, spans: dedupe(spans).map((sp) => ({ s: sp.s, e: sp.e, text: s.slice(sp.s, sp.e) })) };
  }
  return found;
}
function dedupe(spans) {
  spans.sort((a, b) => a.s - b.s || b.e - a.e);
  const out = [];
  for (const sp of spans) { const last = out[out.length - 1]; if (last && sp.s < last.e) { if (sp.e > last.e) last.e = sp.e; continue; } out.push({ ...sp }); }
  return out;
}
