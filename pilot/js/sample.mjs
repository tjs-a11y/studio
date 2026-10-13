// "Try a sample letter": invented letters (every name, number, phone and address is made up).
// Dates are set around today so the sample always shows an upcoming deadline.
import { addDays } from './extract.mjs';
const EN_M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ES_M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const en = (d) => { const [y, m, dd] = d.split('-').map(Number); return `${EN_M[m - 1]} ${dd}, ${y}`; };
const es = (d) => { const [y, m, dd] = d.split('-').map(Number); return `${dd} de ${ES_M[m - 1]} de ${y}`; };

export function sample(lang, today) {
  const issued = addDays(today, -6), due = addDays(today, 14);
  if (lang === 'es') return `Eléctrica del Norte S.A.
Apartado de correos 1200, 28080 Madrid
Atención al cliente: 900 123 456

Fecha de emisión: ${es(issued)}
Número de cliente: 7781-2290-11

Total a pagar: 86,45 €
Fecha límite de pago: ${es(due)}

Estimado cliente:
Le recordamos que el importe de su factura debe pagarse antes del ${es(due)}. Puede pagar en www.electricadelnorte.example.es/pagar.
Si no está de acuerdo con la factura, puede presentar una reclamación dentro de los 30 días siguientes a la fecha de esta factura.
Para cualquier consulta, llámenos al 900 123 456 o escriba a clientes@electricadelnorte.example.es.`;
  return `Lakeside Power & Water
PO Box 4410, Fairview, OH 44120
Customer service: (555) 201-4410

Statement date: ${en(issued)}
Account number: 4410-2297-8831

Previous balance          $131.40
Payment received          -$131.40
Current charges           $142.18

Total amount due: $142.18
Due date: ${en(due)}

A late fee of $15.00 will be added if payment is not received by the due date.
If you have questions about this bill, you must contact us within 30 days of the statement date.
Pay online at lakesidepw.example.com/pay or call 1-800-555-0142.`;
}
