// Synthetic test letters. Every company, person, number, address, phone (555 numbers), email and web address here
// is invented (example.com/.org/.gov/.es domains). The "IRS-style" notice is made-up text in the style of a tax
// notice, not a copy of a real one. "today" in the tests is 2026-10-13.
export const LETTERS = {
  utility: {
    text: `Lakeside Power & Water
PO Box 4410, Fairview, OH 44120
Customer service: (555) 201-4410

Statement date: October 2, 2026
Account number: 4410-2297-8831
Service address: 18 Birch Lane, Fairview, OH 44121

Billing period: Sep 1, 2026 - Sep 30, 2026
Previous balance          $131.40
Payment received Sep 20   -$131.40
Current charges           $142.18

Total amount due: $142.18
Due date: October 27, 2026

A late fee of $15.00 will be added if payment is not received by the due date.
Pay online at lakesidepw.example.com/pay or call 1-800-555-0142.`,
    want: { kind: 'bill', action: 'pay', deadline: '2026-10-27', dkind: 'due', dconf: 'high', amount: 142.18, currency: 'USD', aconf: 'high', letterDate: '2026-10-02', from: /^Lakeside Power & Water/, ref: '••••-••••-8831', lateFee: 15, phone: true, url: /lakesidepw\.example\.com\/pay/, address: /PO Box 4410, Fairview, OH 44120/ },
  },
  irs: {
    text: `Department of the Treasury
Internal Revenue Service
Kansas City, MO 64999-0010

Notice date: September 28, 2026
Notice number: TX-4471-0926
Tax year: 2024
Your SSN: XXX-XX-4417
To contact us: 1-800-555-0199

Amount due: $1,284.50
Pay by: October 19, 2026

We changed your 2024 tax return. You owe $1,284.50 in tax, penalty and interest.
If you agree, pay the amount due by October 19, 2026 to avoid more interest.
If you don't agree, you must respond within 30 days of the date of this notice. Send your response to the address above with a copy of this notice.`,
    want: { kind: 'tax', action: 'pay', deadline: '2026-10-19', dkind: 'due', amount: 1284.5, aconf: 'high', letterDate: '2026-09-28', from: /Internal Revenue Service|Department of the Treasury/, ref: '••-••••-0926', also: { kind: 'respond', value: '2026-10-28', computed: true } },
  },
  jury: {
    text: `SUPERIOR COURT OF MAPLE COUNTY
Office of the Jury Commissioner
200 Court Plaza, Maple City, CA 95010

JURY SUMMONS
Date of this summons: October 5, 2026
Juror number: 802231

You are summoned to report for jury service on Monday, November 16, 2026 at 8:00 a.m.
Report to: Maple County Courthouse, 200 Court Plaza, Room 110, Maple City, CA 95010.

Complete the juror questionnaire online at jury.maplecounty.example.gov within 10 days of receiving this summons.
If you need to postpone, call the Jury Office at (555) 340-2210, Monday to Friday, 8 a.m. to 4 p.m.
Jurors are paid $15 per day starting on the second day of service.
Failure to appear may result in a fine.`,
    want: { kind: 'jury', action: 'appear', aconfAction: 'high', deadline: '2026-11-16', dkind: 'appear', time: '08:00', amount: null, letterDate: '2026-10-05', from: /SUPERIOR COURT OF MAPLE COUNTY/, ref: '••••31', phone: '(555) 340-2210', address: /200 Court Plaza/, also: { kind: 'respond', value: '2026-10-15', computed: true, fromReceipt: true } },
  },
  insurance: {
    text: `Harborview Mutual Insurance Company
Auto Policy Renewal Notice

Mailing date: October 9, 2026
Policy number: HMA-55120-778
Policy period: December 1, 2026 to December 1, 2027

Dear Policyholder,
Your auto policy will renew on December 1, 2026.
Your new 12-month premium is $1,148.00 (last term: $1,032.00).
To keep your coverage without a gap, please pay $1,148.00 by November 20, 2026.
You can pay at harborviewmutual.example.com or call us at 555-310-8800.
If you do not want to renew, call us before December 1, 2026.`,
    want: { kind: 'insurance', action: 'pay', deadline: '2026-11-20', dkind: 'due', amount: 1148, letterDate: '2026-10-09', from: /^Harborview Mutual Insurance Company/, ref: '•••-••••0-778', phone: '555-310-8800', alsoAction: 'renew', also: { kind: 'renewal', value: '2026-12-01' } },
  },
  lease: {
    text: `Oakridge Property Management LLC
1200 Commerce Drive, Suite 300
Riverton, TX 75001
(555) 448-1200 · leasing@oakridgepm.example.com

October 1, 2026

Dear Resident,
Re: Lease renewal for 4521 Willow Street, Apt 2B

Your current lease ends on December 31, 2026. We'd like you to stay.
Your new monthly rent will be $1,675.00, starting January 1, 2027.
Please sign and return the enclosed renewal agreement no later than November 15, 2026.
If you plan to move out, you must give us written notice at least 60 days before your lease ends.
Questions? Call the leasing office at (555) 448-1200 or email leasing@oakridgepm.example.com.`,
    want: { kind: 'lease', action: 'sign', deadline: '2026-11-15', dkind: 'respond', amount: 1675, aconf: 'medium', letterDate: '2026-10-01', from: /^Oakridge Property Management LLC/, email: 'leasing@oakridgepm.example.com', phone: '(555) 448-1200', address: /1200 Commerce Drive, Suite 300, Riverton, TX 75001/, also: { kind: 'expires', value: '2026-12-31' }, title: /Lease renewal/ },
  },
  school: {
    text: `Brookside Elementary School
Ms. Rivera's 3rd Grade Class

October 8, 2026

Dear Parent/Guardian,
Our class is going on a field trip to the Riverton Science Center on Friday, November 6, 2026.
Please sign the permission slip below and return it to your child's teacher by Friday, October 23, 2026.
The cost is $12.00 per student. Please send cash or a check payable to Brookside PTA with the slip.
If you have questions, email rivera.class@brookside.example.org or call the school office at 555-262-0400.

-----------------------------------------
Permission slip
Student name: ______________  Parent/Guardian signature: ______________`,
    want: { kind: 'school', action: 'sign', deadline: '2026-10-23', dkind: 'respond', amount: 12, letterDate: '2026-10-08', from: /^Brookside Elementary School/, email: 'rivera.class@brookside.example.org', also: { kind: 'appointment', value: '2026-11-06' } },
  },
  appointment: {
    text: `Greenleaf Family Dental
88 Orchard Road, Suite 4, Fairview, OH 44121
Phone: (555) 787-3300

October 12, 2026

Hi Jordan,
This is a reminder of your appointment with Dr. Patel on Tuesday, October 27, 2026 at 2:30 PM.
Please arrive 15 minutes early and bring your insurance card and photo ID.
If you need to reschedule, please call us at least 24 hours before your visit.`,
    want: { kind: 'appointment', action: 'appear', deadline: '2026-10-27', dkind: 'appointment', time: '14:30', amount: null, letterDate: '2026-10-12', from: /^Greenleaf Family Dental/, phone: '(555) 787-3300', address: /88 Orchard Road, Suite 4, Fairview, OH 44121/ },
  },
  parking: {
    text: `CITY OF RIVERTON
Parking Violations Bureau
PO Box 7781, Riverton, TX 75002

NOTICE OF PARKING VIOLATION
Citation number: PV-2026-0098812
Date issued: 10/06/2026
Violation: Expired meter
Location: 300 block of Main St
Vehicle plate: TXK-4471

Fine amount: $45.00
Pay by: 11/05/2026

If the fine is not paid by the due date, a late penalty of $35.00 will be added.
To contest this citation, you must request a hearing within 21 days of the date issued.
Pay online at riverton.example.gov/parking or by mail to the address above.`,
    want: { kind: 'ticket', action: 'pay', deadline: '2026-11-05', dkind: 'due', amount: 45, aconf: 'high', letterDate: '2026-10-06', from: /^CITY OF RIVERTON/, ref: '••-••••-•••8812', lateFee: 35, address: /PO Box 7781, Riverton, TX 75002/, url: /riverton\.example\.gov\/parking/, also: { kind: 'respond', value: '2026-10-27', computed: true } },
  },
  subscription: {
    text: `From: StreamNest <billing@streamnest.example.com>
To: you@example.com
Date: Tue, Oct 13, 2026 at 7:02 AM
Subject: Your StreamNest Premium plan renews soon

Hi there,
Your StreamNest Premium annual plan renews automatically on November 1, 2026.
You'll be charged $119.99 to the card ending in 4242.
Don't want to keep it? Cancel anytime before October 31, 2026 to avoid being charged:
go to streamnest.example.com/account and choose Cancel plan.
Questions? Reply to this email or visit help.streamnest.example.com.`,
    want: { kind: 'subscription', action: 'cancel', alsoAction: 'renew', deadline: '2026-10-31', dkind: 'cancelBy', amount: 119.99, letterDate: '2026-10-13', from: /^StreamNest$/, fromConf: 'high', title: /renews soon/, url: /streamnest\.example\.com\/account/, also: { kind: 'renewal', value: '2026-11-01' } },
  },
  spanish: {
    text: `Eléctrica del Norte S.A.
Apartado de correos 1200, 28080 Madrid
Atención al cliente: 900 123 456

Fecha de emisión: 5 de octubre de 2026
Número de cliente: 7781-2290-11
Periodo de facturación: del 1 de septiembre de 2026 al 30 de septiembre de 2026

Total a pagar: 86,45 €
Fecha límite de pago: 20 de octubre de 2026

Estimado cliente:
Le recordamos que el importe de su factura debe pagarse antes del 20 de octubre de 2026. Puede pagar en www.electricadelnorte.example.es/pagar.
Si no está de acuerdo con la factura, puede presentar una reclamación dentro de los 30 días siguientes a la fecha de esta factura.
Para cualquier consulta, llámenos al 900 123 456 o escriba a clientes@electricadelnorte.example.es.`,
    want: { lang: 'es', kind: 'bill', action: 'pay', deadline: '2026-10-20', dkind: 'due', amount: 86.45, currency: 'EUR', aconf: 'high', letterDate: '2026-10-05', from: /^Eléctrica del Norte S\.A\./, ref: '••••-••90-11', phone: '900 123 456', email: 'clientes@electricadelnorte.example.es', also: { kind: 'respond', value: '2026-11-04', computed: true } },
  },
  card: {
    text: `Summit Card Services
Statement closing date 09/28/2026
Account ending in 7731
New balance $2,418.66
Minimum payment due $35.00
Payment due date 10/25/2026
Late payment warning: If we do not receive your minimum payment by the date listed above, you may have to pay a late fee of up to $41.00.`,
    want: { kind: 'bill', action: 'pay', deadline: '2026-10-25', dkind: 'due', amount: 35, letterDate: '2026-09-28', from: /^Summit Card Services/, ref: '••31', lateFee: 41 },
  },
  medical: {
    text: `FINAL NOTICE
Riverside Medical Group
Patient account: RMG-448812

Our records show a balance of $310.00 for your visit on 07/14/2026.
Please pay the balance within 30 days or call our billing office at 555-901-2200 to set up a payment plan.`,
    want: { kind: 'bill', action: 'pay', deadline: '2026-11-12', dkind: 'due', dconf: 'low', amount: 310, letterDate: null, from: /^Riverside Medical Group/, ref: '•••-••8812', phone: '555-901-2200', computed: true },
  },
  spanishAppt: {
    text: `Clínica San Rafael
Calle Mayor 14, 28013 Madrid

Madrid, 9 de octubre de 2026

Estimada Sra. López:
Le confirmamos su cita con la Dra. Gómez el jueves, 29 de octubre de 2026 a las 10:30.
Si no puede asistir, llámenos al 912 345 678 para cambiar la cita con al menos 24 horas de antelación.`,
    want: { lang: 'es', kind: 'appointment', action: 'appear', deadline: '2026-10-29', dkind: 'appointment', time: '10:30', letterDate: '2026-10-09', from: /^Clínica San Rafael/, phone: '912 345 678', address: /Calle Mayor 14, 28013 Madrid/ },
  },
};
