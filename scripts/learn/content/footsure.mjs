// "Fall-risk tests explained" (English and Spanish), next to Footsure. Standalone articles, not a section.
// Every fact comes from the three CDC STEADI assessment forms (2017) that Footsure's cutoffs were verified against:
// 30-Second Chair Stand, The 4-Stage Balance Test, and Timed Up & Go (TUG). The PDFs were read line by line on
// 2026-10-13 (pdftotext); the cutoff rows are read from footsure/cutoffs.json, which was checked against the same forms.
// The CDC's own pages could not be opened from our network, so the sources link to the web address printed on each
// form (www.cdc.gov/steadi) rather than to a PDF address we could not confirm.
import { readFileSync } from 'node:fs';

const CUT = JSON.parse(readFileSync(new URL('../../../footsure/cutoffs.json', import.meta.url), 'utf8'));
const STEADI = 'https://www.cdc.gov/steadi/';
const CHECKED = { iso: '2026-10-13', en: 'October 13, 2026', es: '13 de octubre de 2026' };
const TOOL = '/footsure/?ref=learn-fall-risk';
const rows = CUT.chairStand.rows;
const table = (h) => `<div class="tbl"><table><caption class="note" style="caption-side:bottom;text-align:left;padding-top:6px">${h.caption}</caption>
<thead><tr><th scope="col">${h.age}</th><th scope="col">${h.men}</th><th scope="col">${h.women}</th></tr></thead>
<tbody>${rows.map((r) => `<tr><th scope="row">${r.ageMin}–${r.ageMax}</th><td>&lt; ${r.male}</td><td>&lt; ${r.female}</td></tr>`).join('')}</tbody></table></div>`;

const SRC_EN = [
  { label: 'CDC STEADI assessment form "30-Second Chair Stand" (2017); web address printed on the form', url: STEADI },
  { label: 'CDC STEADI assessment form "The 4-Stage Balance Test" (2017, 2 pages); web address printed on the form', url: STEADI },
  { label: 'CDC STEADI assessment form "Timed Up & Go (TUG)" (2017); web address printed on the form', url: STEADI },
];
const SRC_ES = [
  { label: 'Formulario de evaluación STEADI de los CDC «30-Second Chair Stand» (2017, en inglés); dirección web impresa en el formulario', url: STEADI },
  { label: 'Formulario de evaluación STEADI de los CDC «The 4-Stage Balance Test» (2017, 2 páginas, en inglés); dirección web impresa en el formulario', url: STEADI },
  { label: 'Formulario de evaluación STEADI de los CDC «Timed Up & Go (TUG)» (2017, en inglés); dirección web impresa en el formulario', url: STEADI },
];

const EN = {
  path: '/learn/fall-risk-tests/', lang: 'en', alt: '/es/learn/fall-risk-tests/', altLang: 'es',
  title: 'Fall-Risk Tests Explained: CDC Chair, Balance and TUG',
  h1: 'Fall-risk tests explained: the CDC\'s chair stand, balance and Timed Up and Go',
  crumbName: 'Fall-risk tests explained', short: 'The CDC\'s three strength and balance screening tests, step by step, with the cutoffs.',
  description: 'How the CDC STEADI 30-second chair stand, 4-stage balance test and Timed Up and Go work, the cutoffs on the 2017 forms, and how to do them safely.',
  crumbs: [{ name: 'Quickwell', path: '/' }, { name: 'Learn', path: '/learn/' }],
  lede: 'Clinicians use three short tests to screen older adults for fall risk. They come from the CDC\'s STEADI program. This page explains each test and the cutoff the CDC form uses, in plain English.',
  body: `
<h2>Where these tests come from</h2>
<p>STEADI stands for "Stopping Elderly Accidents, Deaths &amp; Injuries". It is a program of the CDC (the U.S. Centers for Disease Control and Prevention) that gives clinicians tools to screen, assess and help older patients who may fall. Among those tools are one-page assessment forms, dated 2017, for three tests:</p>
<ul>
<li>the <b>30-Second Chair Stand</b>, for leg strength and endurance;</li>
<li><b>The 4-Stage Balance Test</b>, for standing (static) balance;</li>
<li>the <b>Timed Up &amp; Go</b> (TUG), for mobility.</li>
</ul>
<p>Each test needs only a stopwatch, and the chair stand and TUG need a chair. Each form ends with a plain rule for what counts as a result that points to a risk of falling. The test steps, scoring rules and cutoffs below are taken from those three forms.</p>

<h2>Safety first: a helper stands close</h2>
<p>All three forms tell the person running the test to stay right next to the person being tested. The chair stand form says to stand next to the patient for safety. The balance form says to stand next to the patient, hold their arm while they get into each position, and stay ready to help if they lose their balance. The TUG form says to always stay by the patient for safety.</p>
<p>At home, Footsure's safety checklist turns that into a few rules: a second adult stands close by the whole time; use a sturdy chair pushed against a wall so it can't slide; clear the floor of rugs, cords and pets; and stop at once if the person feels dizzy, has pain or becomes unsteady. If a doctor or therapist has said to avoid tests like these, follow that advice.</p>

<h2>Test 1: the 30-second chair stand</h2>
<p><b>Purpose on the form:</b> to test leg strength and endurance. <b>Equipment:</b> a chair with a straight back and no arm rests (seat 17 inches high) and a stopwatch.</p>
<ol>
<li>Sit in the middle of the chair, feet flat on the floor, back straight.</li>
<li>Cross the hands to the opposite shoulders, at the wrists, and keep the arms against the chest.</li>
<li>On "Go", stand all the way up, then sit back down. Repeat for 30 seconds.</li>
</ol>
<p><b>Scoring:</b> count the number of times the person comes to a full standing position in 30 seconds. If they are more than halfway up when the 30 seconds end, it counts as a stand. If they must use their arms to stand, the form says to stop the test and record 0.</p>
<p>The form lists "below average" scores by age and sex. A below average score, it says, indicates a risk for falls:</p>
${table({ caption: 'Below average scores for the 30-second chair stand, from the CDC STEADI form (2017). For example, a woman aged 70 to 74 who stands fewer than 10 times scores below average.', age: 'Age', men: 'Men', women: 'Women' })}
<p>The form has no rows below age 60 or above 94, so it gives no cutoff for those ages.</p>

<h2>Test 2: the 4-stage balance test</h2>
<p><b>Purpose on the form:</b> to assess static balance. <b>Equipment:</b> a stopwatch. The person tries four standing positions, each harder than the last, and holds each one for 10 seconds:</p>
<ol>
<li>Feet side by side.</li>
<li>The instep of one foot touching the big toe of the other foot.</li>
<li>Tandem stand: one foot in front of the other, heel touching toe.</li>
<li>Stand on one foot.</li>
</ol>
<p>The tester shows each position first, helps the person into it, then lets go and starts timing. The person may hold their arms out or move their body to keep their balance, but must not move their feet. If they hold a position for 10 seconds without moving their feet or needing support, they go on to the next one; if not, the test stops. The form says not to use a cane or walker, and to keep the eyes open.</p>
<p><b>The rule on the form:</b> an older adult who cannot hold the tandem stand (position 3) for at least 10 seconds is at increased risk of falling. For those patients, the form suggests clinicians consider physical therapy for gait and balance exercises, or an evidence-based program such as Tai Chi.</p>

<h2>Test 3: Timed Up and Go (TUG)</h2>
<p><b>Purpose on the form:</b> to assess mobility. <b>Equipment:</b> a stopwatch. The person wears their regular shoes and may use their usual walking aid. They start sitting back in a standard armchair, with a line on the floor 3 meters (10 feet) away.</p>
<ol>
<li>On "Go", the tester starts timing.</li>
<li>The person stands up, walks to the line at a normal pace, turns, walks back to the chair at a normal pace and sits down.</li>
<li>The tester stops timing when the person sits back down, and records the time in seconds.</li>
</ol>
<p><b>The rule on the form:</b> an older adult who takes 12 seconds or more to complete the TUG is at risk for falling. The form also asks the tester to watch how the person moves, for example a slow, tentative pace, loss of balance, short strides, little or no arm swing, steadying themselves on walls, shuffling, turning the whole body at once, or not using a walking aid properly, because such changes may call for further evaluation by a clinician.</p>

<h2>All three cutoffs at a glance</h2>
<div class="tbl"><table>
<thead><tr><th scope="col">Test</th><th scope="col">What is measured</th><th scope="col">Result the CDC form flags</th></tr></thead>
<tbody>
<tr><td>30-second chair stand</td><td>Full stands in 30 seconds, arms crossed</td><td>Below the number for the person's age and sex in the table above (0 if the arms are used)</td></tr>
<tr><td>4-stage balance test</td><td>How many of the four positions are held for 10 seconds</td><td>Cannot hold the tandem stand (position 3) for 10 seconds</td></tr>
<tr><td>Timed Up and Go</td><td>Seconds to stand, walk 3 m (10 ft), turn, walk back and sit</td><td>12 seconds or more</td></tr>
</tbody></table></div>

<h2>What a result means, and what it doesn't</h2>
<p>These are screening tests. A result outside the CDC cutoff is a reason to talk to a doctor or physical therapist, not a verdict. A result inside the cutoffs doesn't mean a person can't fall. A home check is not a medical diagnosis, and it doesn't replace an assessment by a clinician, who will look at much more than three tests.</p>
<p>The most useful thing a home check can do is start a conversation, and show change over time. Write down the numbers and the date, and bring them to the next appointment.</p>`,
  cta: { title: 'Run the three tests at home with Footsure', text: 'Footsure walks you and a helper through all three tests on a phone, counts by hand or with the camera (beta), and compares each result with the CDC cutoffs above. Free check; results stay on the phone.', href: TOOL, label: 'Open Footsure' },
  related: [{ href: '/footsure/flyer/', title: 'Printable flyer', text: 'A one-page flyer for senior centers and clinics, with a QR code.' }],
  sources: SRC_EN, checked: CHECKED, ogImage: '/footsure/og.png',
  disclaimer: 'General information, not medical advice and not a medical diagnosis. Talk to a doctor or physical therapist about falls, balance or strength. Quickwell is not affiliated with or endorsed by the CDC.',
};

const ES = {
  path: '/es/learn/fall-risk-tests/', lang: 'es', alt: '/learn/fall-risk-tests/', altLang: 'en',
  title: 'Pruebas de riesgo de caídas del CDC, explicadas',
  h1: 'Pruebas de riesgo de caídas: levantarse de la silla, equilibrio y Timed Up and Go',
  crumbName: 'Pruebas de riesgo de caídas', short: 'Las tres pruebas de fuerza y equilibrio de los CDC, paso a paso, con sus valores de corte.',
  description: 'Cómo funcionan las tres pruebas STEADI de los CDC (silla de 30 segundos, equilibrio en 4 posiciones y Timed Up and Go) y sus valores de corte.',
  crumbs: [{ name: 'Quickwell', path: '/' }, { name: 'Learn', path: '/learn/' }],
  lede: 'Los profesionales de la salud usan tres pruebas cortas para detectar el riesgo de caídas en personas mayores. Vienen del programa STEADI de los CDC. Esta página explica cada prueba y el valor de corte que usa el formulario de los CDC, en palabras sencillas.',
  body: `
<h2>De dónde vienen estas pruebas</h2>
<p>STEADI significa, en inglés, "Stopping Elderly Accidents, Deaths &amp; Injuries" (detener los accidentes, las muertes y las lesiones de las personas mayores). Es un programa de los CDC (los Centros para el Control y la Prevención de Enfermedades de EE. UU.) que da a los profesionales de la salud herramientas para evaluar y ayudar a pacientes mayores que pueden caerse. Entre ellas hay formularios de evaluación de una página, fechados en 2017 y en inglés, para tres pruebas:</p>
<ul>
<li>la <b>prueba de levantarse de la silla en 30 segundos</b> (30-Second Chair Stand), para la fuerza y la resistencia de las piernas;</li>
<li>la <b>prueba de equilibrio en 4 posiciones</b> (4-Stage Balance Test), para el equilibrio de pie;</li>
<li>la prueba <b>Timed Up and Go</b> (TUG, "levántate y anda" cronometrada), para la movilidad.</li>
</ul>
<p>Cada prueba necesita solo un cronómetro, y la de la silla y la TUG necesitan una silla. Cada formulario termina con una regla clara sobre qué resultado indica riesgo de caídas. Los pasos, las reglas de puntuación y los valores de corte que siguen vienen de esos tres formularios.</p>

<h2>Primero, la seguridad: un ayudante siempre al lado</h2>
<p>Los tres formularios piden que la persona que hace la prueba se quede justo al lado de quien la realiza. El de la silla dice que hay que estar junto al paciente por seguridad. El de equilibrio dice que hay que estar a su lado, sujetarle del brazo mientras se coloca en cada posición y estar listo para ayudar si pierde el equilibrio. El de la TUG dice que hay que quedarse siempre junto al paciente por seguridad.</p>
<p>En casa, la lista de seguridad de Footsure lo convierte en unas reglas: otro adulto se queda cerca todo el tiempo; use una silla firme apoyada contra la pared para que no se deslice; despeje el suelo de alfombras, cables y mascotas; y pare enseguida si la persona se marea, siente dolor o pierde estabilidad. Si un médico o terapeuta ha dicho que evite pruebas como estas, siga ese consejo.</p>

<h2>Prueba 1: levantarse de la silla en 30 segundos</h2>
<p><b>Objetivo según el formulario:</b> medir la fuerza y la resistencia de las piernas. <b>Material:</b> una silla de respaldo recto sin reposabrazos (asiento de 17 pulgadas, unos 43 cm, de alto) y un cronómetro.</p>
<ol>
<li>Sentarse en el centro de la silla, con los pies planos en el suelo y la espalda recta.</li>
<li>Cruzar las manos sobre los hombros opuestos, a la altura de las muñecas, con los brazos pegados al pecho.</li>
<li>Al oír "ya", ponerse de pie del todo y volver a sentarse. Repetir durante 30 segundos.</li>
</ol>
<p><b>Puntuación:</b> se cuenta cuántas veces la persona llega a estar completamente de pie en 30 segundos. Si al acabar los 30 segundos está a más de medio camino de ponerse de pie, cuenta como una vez. Si necesita los brazos para levantarse, el formulario dice que se pare la prueba y se anote 0.</p>
<p>El formulario da las puntuaciones "por debajo del promedio" según la edad y el sexo. Una puntuación por debajo del promedio, dice, indica riesgo de caídas:</p>
${table({ caption: 'Puntuaciones por debajo del promedio en la prueba de la silla, del formulario STEADI de los CDC (2017). Por ejemplo, una mujer de 70 a 74 años que se levanta menos de 10 veces está por debajo del promedio.', age: 'Edad', men: 'Hombres', women: 'Mujeres' })}
<p>El formulario no tiene filas para menores de 60 ni mayores de 94 años, así que no da un valor de corte para esas edades.</p>

<h2>Prueba 2: equilibrio en 4 posiciones</h2>
<p><b>Objetivo según el formulario:</b> evaluar el equilibrio estático. <b>Material:</b> un cronómetro. La persona intenta cuatro posiciones de pie, cada una más difícil que la anterior, y mantiene cada una 10 segundos:</p>
<ol>
<li>Pies juntos, uno al lado del otro.</li>
<li>El empeine de un pie tocando el dedo gordo del otro.</li>
<li>Posición en tándem: un pie delante del otro, el talón tocando la punta.</li>
<li>Sobre un solo pie.</li>
</ol>
<p>Quien hace la prueba muestra primero cada posición, ayuda a la persona a colocarse, luego la suelta y empieza a contar el tiempo. La persona puede extender los brazos o mover el cuerpo para mantener el equilibrio, pero no puede mover los pies. Si mantiene una posición 10 segundos sin mover los pies ni apoyarse, pasa a la siguiente; si no, la prueba termina. El formulario dice que no se use bastón ni andador y que se mantengan los ojos abiertos.</p>
<p><b>La regla del formulario:</b> una persona mayor que no puede mantener la posición en tándem (la posición 3) al menos 10 segundos tiene un riesgo mayor de caerse. Para esos pacientes, el formulario sugiere a los profesionales considerar fisioterapia con ejercicios de marcha y equilibrio, o un programa con base científica como el Tai Chi.</p>

<h2>Prueba 3: Timed Up and Go (TUG)</h2>
<p><b>Objetivo según el formulario:</b> evaluar la movilidad. <b>Material:</b> un cronómetro. La persona lleva su calzado habitual y puede usar su ayuda para caminar de siempre. Empieza sentada en un sillón estándar con reposabrazos, con una línea en el suelo a 3 metros (10 pies).</p>
<ol>
<li>Al decir "ya", quien hace la prueba empieza a cronometrar.</li>
<li>La persona se levanta, camina hasta la línea a paso normal, se da la vuelta, vuelve a la silla a paso normal y se sienta.</li>
<li>Se para el cronómetro cuando la persona vuelve a estar sentada y se anota el tiempo en segundos.</li>
</ol>
<p><b>La regla del formulario:</b> una persona mayor que tarda 12 segundos o más en completar la TUG tiene riesgo de caerse. El formulario también pide observar cómo se mueve la persona, por ejemplo un paso lento e inseguro, pérdida de equilibrio, pasos cortos, poco o ningún balanceo de brazos, apoyarse en las paredes, arrastrar los pies, girar todo el cuerpo de una vez o no usar bien la ayuda para caminar, porque esos cambios pueden requerir más evaluación por parte de un profesional.</p>

<h2>Los tres valores de corte de un vistazo</h2>
<div class="tbl"><table>
<thead><tr><th scope="col">Prueba</th><th scope="col">Qué se mide</th><th scope="col">Resultado que señala el formulario</th></tr></thead>
<tbody>
<tr><td>Levantarse de la silla en 30 segundos</td><td>Veces que se pone de pie del todo en 30 segundos, con los brazos cruzados</td><td>Menos que el número para su edad y sexo en la tabla de arriba (0 si usa los brazos)</td></tr>
<tr><td>Equilibrio en 4 posiciones</td><td>Cuántas de las cuatro posiciones mantiene 10 segundos</td><td>No mantiene la posición en tándem (la 3) durante 10 segundos</td></tr>
<tr><td>Timed Up and Go</td><td>Segundos para levantarse, caminar 3 m (10 pies), girar, volver y sentarse</td><td>12 segundos o más</td></tr>
</tbody></table></div>

<h2>Qué significa un resultado, y qué no</h2>
<p>Son pruebas de detección. Un resultado fuera del valor de corte de los CDC es un motivo para hablar con un médico o fisioterapeuta, no un veredicto. Un resultado dentro de los valores no significa que la persona no pueda caerse. Una prueba en casa no es un diagnóstico médico y no sustituye la evaluación de un profesional, que tendrá en cuenta mucho más que tres pruebas.</p>
<p>Lo más útil de una prueba en casa es abrir la conversación y ver cambios con el tiempo. Anote los números y la fecha, y llévelos a la próxima consulta.</p>`,
  cta: { title: 'Haga las tres pruebas en casa con Footsure', text: 'Footsure les guía a usted y a un ayudante por las tres pruebas en el teléfono, cuenta a mano o con la cámara (beta) y compara cada resultado con los valores de corte de los CDC. La prueba es gratuita y los resultados se quedan en el teléfono. Por ahora, Footsure está solo en inglés.', href: TOOL, label: 'Abrir Footsure (en inglés)' },
  related: [{ href: '/footsure/flyer/', title: 'Folleto para imprimir (en inglés)', text: 'Un folleto de una página para centros de mayores y clínicas, con código QR.' }],
  sources: SRC_ES, checked: CHECKED, ogImage: '/footsure/og.png',
  disclaimer: 'Información general, no es consejo médico ni un diagnóstico médico. Hable con un médico o fisioterapeuta sobre caídas, equilibrio o fuerza. Quickwell no está afiliado a los CDC ni cuenta con su respaldo.',
};

export const ARTICLES = [EN, ES];
export const HUB = { title: 'Fall-risk tests explained', path: EN.path, text: 'The CDC\'s chair stand, balance and Timed Up and Go tests, with the cutoffs. English and Spanish.' };
