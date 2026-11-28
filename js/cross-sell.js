/* Quickwell worldwide contextual cross-sell; no dependencies. */
(function(){
'use strict';
var pathParts=location.pathname.split('/').filter(Boolean);if(pathParts[0]==='es'||pathParts[0]==='fr')pathParts.shift();var slug=pathParts[0]||'';
var raw=(document.documentElement.lang||navigator.language||'en').toLowerCase();
var lang=raw.indexOf('es')===0?'es':raw.indexOf('fr')===0?'fr':'en';
var ui={
en:{head:'Optional resources',tools:'Related tools and workflows',books:'Books and learning',more:'More from Quickwell',health:'Health and focus buyer guides',offers:'Explore',note:'Optional resources. Your result above remains available; dismiss this section whenever you like.',dismiss:'Dismiss',dismissLabel:'Dismiss optional resources',bookAction:'View on Books2Read'},
es:{head:'Recursos opcionales',tools:'Herramientas y flujos relacionados',books:'Libros y aprendizaje',more:'Más de Quickwell',health:'Guías de salud y concentración',offers:'Explorar',note:'Recursos opcionales. Tu resultado sigue disponible; puedes cerrar esta sección cuando quieras.',dismiss:'Cerrar',dismissLabel:'Cerrar los recursos opcionales',bookAction:'Ver en Books2Read'},
fr:{head:'Ressources facultatives',tools:'Outils et processus associés',books:'Livres et apprentissage',more:'Plus de Quickwell',health:'Guides santé et concentration',offers:'Découvrir',note:'Ressources facultatives. Votre résultat reste disponible ; vous pouvez fermer cette section à tout moment.',dismiss:'Fermer',dismissLabel:'Fermer les ressources facultatives',bookAction:'Voir sur Books2Read'}
}[lang];
var L=function(label,path,desc,action){return {label:label,path:path,desc:desc||'',action:action||''};};
var freight=['rate-con-checker','haul-audit','fuelgauge','audit-kit'];
var trade=['commodities','plot-file-checker','eudr','tradepath','permit-watch','royalty-check','vendor-check','vigless'];
var home=['bill-radar','fair-price','saver','pilot','shield','before-you-sign','proof','keep-the-receipt','lotwise'];
var kitchen=['dinner','kitchen','copycat'];
var resultGated=['bill-radar','fair-price','dinner','rate-con-checker'].indexOf(slug)>=0;
var completionReady=!resultGated;
var dismissed=false;
var everyday=['double-dose','roadside-sos','footsure','spare-key','play'];
var ftools=[
L('Rate Con Checker','/rate-con-checker/','Review broker rate terms before signing.'),
L('Haul Audit','/haul-audit/','Compare agreed amounts with settlements.'),
L('Fuelgauge','/fuelgauge/','Review fuel costs and margins.'),
L('New Authority Audit Kit','/audit-kit/','Organize new-carrier audit records.'),
L('Before You Sign','/before-you-sign/','Review important terms before committing.')
];
var ttools=[
L('WorldSource Commodity Desk','/commodities/','Track commodities, currencies and yields.'),
L('EUDR Plot File Checker','/plot-file-checker/','Review plot-file information for EUDR workflows.'),
L('Tradepath','/tradepath/','Organize international trade checks.'),
L('Before You Sign','/before-you-sign/','Review terms before committing.')
];
var crypto=[
L('Mastering Cryptocurrency Trading','https://books2read.com/u/m26Ngr','Market structure, trading tools and risk management.')
];
var homeTools=[
L('Fair Price','/fair-price/','Compare a quote or proposed price.'),
L('Before You Sign','/before-you-sign/','Review terms before you agree.'),
L('Proof','/proof/','Keep a clear record of important details.'),
L('Bill Radar','/bill-radar/','Review recurring bills and possible savings.'),
L('Saver','/saver/','Find subscriptions and recurring costs to review.'),
L('Pilot','/pilot/','Keep track of important deadlines.')
];
var dailyTools=[
L('Double Dose','/double-dose/','Check timing and interaction information.'),
L('Footsure','/footsure/','Explore balance and fall-risk checklists.'),
L('Spare Key','/spare-key/','Build a family recovery and preparedness plan.'),
L('Quickwell Play','/play/','Try daily memory, focus and logic games.')
];
var cards=[];
function card(title,links,desc){cards.push({title:title,links:links,desc:desc||''});}
function rotate(list,start,n){var a=[];for(var i=0;i<n;i++)a.push(list[(start+i)%list.length]);return a;}
if(freight.indexOf(slug)>=0){
 var related=ftools.filter(x=>x.path!=='/'+slug+'/');
 card(ui.tools,rotate(related,freight.indexOf(slug),4),'Carrier and freight workflows—no driver recruitment or dispatch links.');
 card(ui.more,[L('Quickwell Plus','/plus/','Unlock eligible everyday Quickwell tools.')]);
}else if(trade.indexOf(slug)>=0){
 card(ui.tools,rotate(ttools,trade.indexOf(slug),4),'Commodity, trade, documentation and contract review utilities.');
 card(ui.books,crypto.concat([
 L('Mindset Mastery','https://books2read.com/u/mY9QMW','Discipline and decision-making.')
 ]),'Verified direct book links only.');
}else if(slug==='bill-radar'||slug==='fair-price'){
 var related=homeTools.filter(function(x){return x.path!=='/'+slug+'/';});
 card(ui.tools,related,'Optional tools for reviewing household costs and estimates.');
 card(ui.books,[L('Mastering Cryptocurrency Trading','https://books2read.com/u/m26Ngr','Optional educational reading about crypto markets. Unrelated to your bill or repair estimate; not investment advice.')],'Optional educational reading only—not a response to a utility bill or repair quote.');
 card(ui.more,[L('Quickwell Plus','/plus/','Unlock eligible everyday Quickwell tools.')]);
}else if(home.indexOf(slug)>=0){
 card(ui.tools,rotate(homeTools,home.indexOf(slug),6),'Compare, review and track household and money decisions.');
 card(ui.more,[L('Quickwell Plus','/plus/','Unlock eligible everyday tools.')]);
 card(ui.books,crypto.concat([
 L('Energy Revolution System','/offers/','Read the buyer guide and review seller terms.'),
 L('Water Freedom System','/offers/','Read the buyer guide and review seller terms.'),
 L('Ted Plans DIY','/offers/','Review the DIY buyer guide and project considerations.'),
 L('Shifting Vibrations Manifest','/offers/','Read the buyer guide before visiting the seller.'),
 L('Genius Switch Original','/offers/','Review the focus and planning buyer guide.')
 ]));
}else if(kitchen.indexOf(slug)>=0){
 if(slug==='dinner'){
  card(ui.books,[L('Plant Based Diet Recipes Book','https://books2read.com/u/m0BxMV','Optional plant-based recipe inspiration by Mary Elizabeth. General recipes, not dietary or medical advice.',ui.bookAction)],'Optional cookbook link; general recipe content, not dietary or medical advice.');
 }
 card(ui.more,[L('Quickwell Plus','/plus/','Unlock eligible everyday tools and kitchen features.')]);
}else if(everyday.indexOf(slug)>=0){
 card(ui.tools,rotate(dailyTools,everyday.indexOf(slug),4),'Helpful tools for everyday routines and planning.');
 card(ui.books,[L('Mindset Mastery','https://books2read.com/u/mY9QMW','Practical frameworks for focus and decision-making.')]);
 card(ui.health,[
 L('ProDentim','/offers/','Read the buyer guide and check current seller details.'),
 L('AudiSoothe','/offers/','Read the buyer guide and check current seller details.'),
 L('PhytoMem One','/offers/','Read the buyer guide and check current seller details.'),
 L('Genius Switch Original','/offers/','Review the focus buyer guide and seller terms.')
 ]);
}else{return;}
var labels={
es:{
'Rate Con Checker':'Revisor de confirmación de tarifa','Haul Audit':'Auditoría de liquidaciones','Fuelgauge':'Fuelgauge','New Authority Audit Kit':'Kit de auditoría para nuevas autoridades','Before You Sign':'Antes de Firmar','Mindset Mastery':'Mindset Mastery','Quickwell Plus':'Quickwell Plus','WorldSource Commodity Desk':'Mesa de materias primas WorldSource','EUDR Plot File Checker':'Verificador de parcelas EUDR','EUDR Plot File Checker':'Validador de archivos de parcelas EUDR','Tradepath':'Tradepath','Fair Price':'Precio Justo','Proof':'Prueba documental','Bill Radar':'Radar de facturas','Saver':'Ahorro','Pilot':'Pilot','Gatherloom':'Gatherloom','Mediterranean Diet Recipes Book':'Libro de recetas de dieta mediterránea','Plant Based Diet Recipes Book':'Libro de recetas vegetales','Double Dose':'Doble Dosis','Footsure':'Footsure','Spare Key':'Llave de repuesto','Quickwell Play':'Quickwell Play','ProDentim':'ProDentim','AudiSoothe':'AudiSoothe','PhytoMem One':'PhytoMem One','Genius Switch Original':'Genius Switch Original','Energy Revolution System':'Sistema Energy Revolution','Water Freedom System':'Sistema Water Freedom','Ted Plans DIY':'Planes DIY de Ted'
},
fr:{
'Rate Con Checker':"Vérificateur de confirmation d'affrètement",'Haul Audit':'Audit des décomptes de transport','Fuelgauge':'Fuelgauge','New Authority Audit Kit':"Kit d'audit pour nouvelle autorité",'Before You Sign':'Avant de Signer','Mindset Mastery':'Mindset Mastery','Quickwell Plus':'Quickwell Plus','WorldSource Commodity Desk':'Bureau des matières premières WorldSource','EUDR Plot File Checker':'Vérificateur de parcelles EUDR','Tradepath':'Tradepath','Fair Price':'Prix Juste','Proof':'Preuve','Bill Radar':'Radar de factures','Saver':'Économies','Pilot':'Pilot','Gatherloom':'Gatherloom','Mediterranean Diet Recipes Book':'Livre de recettes méditerranéennes','Plant Based Diet Recipes Book':'Livre de recettes végétales','Double Dose':'Double Dose','Footsure':'Footsure','Spare Key':'Clé de secours','Quickwell Play':'Quickwell Play','ProDentim':'ProDentim','AudiSoothe':'AudiSoothe','PhytoMem One':'PhytoMem One','Genius Switch Original':'Genius Switch Original','Energy Revolution System':'Système Energy Revolution','Water Freedom System':'Système Water Freedom','Ted Plans DIY':'Plans DIY de Ted'
}
};
function localLabel(value){return labels[lang]&&labels[lang][value]||value;}
var descriptions={
es:{
'Carrier and freight workflows—no driver recruitment or dispatch links.':'Flujos de transporte y carga; sin enlaces de contratación de conductores ni despacho.',
'Review broker rate terms before signing.':'Revisa las condiciones de la tarifa del corredor antes de firmar.',
'Compare agreed amounts with settlements.':'Compara los importes acordados con las liquidaciones.',
'Review fuel costs and margins.':'Revisa los costes y márgenes del combustible.',
'Organize new-carrier audit records.':'Organiza los registros de auditoría de nuevos transportistas.',
'Review important terms before committing.':'Revisa las condiciones importantes antes de comprometerte.',
'Commodity, trade, documentation and contract review utilities.':'Herramientas para materias primas, comercio, documentación y revisión de contratos.',
'Track commodities, currencies and yields.':'Sigue las materias primas, las divisas y los rendimientos.',
'Review plot-file information for EUDR workflows.':'Revisa la información de parcelas para los procesos EUDR.',
'Organize international trade checks.':'Organiza verificaciones de comercio internacional.',
'Verified direct book links only.':'Solo enlaces directos verificados a libros.',
'Discipline, emotional control and decision-making.':'Disciplina, control emocional y toma de decisiones.',
'Discipline and decision-making.':'Disciplina y toma de decisiones.',
'Unlock eligible everyday Quickwell tools.':'Desbloquea las herramientas cotidianas de Quickwell que cumplan los requisitos.'
},
fr:{
'Carrier and freight workflows—no driver recruitment or dispatch links.':'Outils pour le transport et le fret ; aucun lien de recrutement de chauffeurs ni d’affrètement.',
'Review broker rate terms before signing.':'Vérifiez les conditions tarifaires du courtier avant de signer.',
'Compare agreed amounts with settlements.':'Comparez les montants convenus aux décomptes reçus.',
'Review fuel costs and margins.':'Examinez les coûts et les marges de carburant.',
'Organize new-carrier audit records.':'Organisez les dossiers d’audit des nouveaux transporteurs.',
'Review important terms before committing.':'Vérifiez les clauses importantes avant de vous engager.',
'Commodity, trade, documentation and contract review utilities.':'Outils pour les matières premières, le commerce, les documents et l’examen des contrats.',
'Track commodities, currencies and yields.':'Suivez les matières premières, les devises et les rendements.',
'Review plot-file information for EUDR workflows.':'Vérifiez les informations des parcelles pour les démarches EUDR.',
'Organize international trade checks.':'Organisez les contrôles du commerce international.',
'Verified direct book links only.':'Liens directs vers des livres vérifiés uniquement.',
'Discipline, emotional control and decision-making.':'Discipline, maîtrise émotionnelle et prise de décision.',
'Discipline and decision-making.':'Discipline et prise de décision.',
'Unlock eligible everyday Quickwell tools.':'Débloquez les outils Quickwell du quotidien éligibles.'
}
};
function localDescription(value){return descriptions[lang]&&descriptions[lang][value]||value;}
function href(path){
 var targetPath=path;
 if(lang!=='en'){if(path==='/haul-audit/')targetPath='/'+lang+'/haul-audit/';else if(path==='/commodities/')targetPath='/'+lang+'/commodities/';else if(path==='/plot-file-checker/'||path==='/eudr/')targetPath='/'+lang+'/eudr/';}
 var u=new URL(targetPath,'https://quickwell.app');
 u.searchParams.set('utm_source','quickwell');
 u.searchParams.set('utm_medium','tool_result');
 u.searchParams.set('utm_campaign',slug);
 u.searchParams.set('utm_content','global');
 return u.href;
}
var targets=['#result','#out','#results','#board','#hero','#card-out','#sos-out','#stoppedResults','#s-result','#premout','#copyOut'];
function target(){
 var found=false;
 for(var i=0;i<targets.length;i++){
  var n=document.querySelector(targets[i]);
  if(n){found=true;var cs=getComputedStyle(n);if(!n.hidden&&cs.display!=='none'&&cs.visibility!=='hidden')return n;}
 }
 if(found)return null;
 return document.querySelector('main')||document.querySelector('[role="main"]')||document.body;
}
function render(){
 if(dismissed||!completionReady)return;
 var root=target();if(!root||root.querySelector(':scope > .qw-cross-sell'))return;
 var section=document.createElement('section');section.className='qw-cross-sell';section.setAttribute('aria-label',ui.head);
 var style=document.createElement('style');
 style.textContent='.qw-cross-sell{box-sizing:border-box;margin:22px 0;padding:52px 16px 16px;border:1px solid var(--line,#d8e2df);border-radius:14px;background:var(--card,#fff);color:var(--ink,#18312e);font:inherit;position:relative}.qw-cross-sell *{box-sizing:border-box}.qw-cross-sell h2{font-size:1.08rem;margin:0 0 6px}.qw-cross-sell .qw-note{margin:0 0 14px;color:var(--muted,#63736f);font-size:.92rem}.qw-cross-sell .qw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px}.qw-cross-sell article{padding:13px;border:1px solid var(--line,#d8e2df);border-radius:10px;background:var(--surface,#f8faf9)}.qw-cross-sell h3{font-size:.98rem;margin:0 0 8px}.qw-cross-sell ul{margin:0;padding:0;list-style:none;display:grid;gap:9px}.qw-cross-sell a{font-weight:700;text-decoration:underline;text-underline-offset:2px;color:var(--link,#087b65)}.qw-cross-sell p{margin:3px 0 0;color:var(--muted,#63736f);font-size:.87rem}.qw-cross-sell-dismiss{position:absolute;top:10px;right:10px;min-height:36px;padding:6px 10px;border:1px solid var(--line,#d8e2df);border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:.85rem;cursor:pointer}.qw-cross-sell-dismiss:focus-visible{outline:2px solid currentColor;outline-offset:2px}';
 section.appendChild(style);
 var dismissButton=document.createElement('button');
 dismissButton.type='button';dismissButton.className='qw-cross-sell-dismiss';dismissButton.textContent=ui.dismiss;dismissButton.setAttribute('aria-label',ui.dismissLabel);
 dismissButton.addEventListener('click',function(){dismissed=true;section.remove();});
 section.appendChild(dismissButton);
 var h=document.createElement('h2');h.textContent=ui.head;section.appendChild(h);
 var note=document.createElement('p');note.className='qw-note';note.textContent=ui.note;section.appendChild(note);
 var grid=document.createElement('div');grid.className='qw-grid';
 cards.forEach(function(c){
  var box=document.createElement('article'),title=document.createElement('h3'),ul=document.createElement('ul');
  title.textContent=c.title;box.appendChild(title);
  if(c.desc){var d=document.createElement('p');d.textContent=localDescription(c.desc);box.appendChild(d);}
  c.links.forEach(function(item){
   var li=document.createElement('li'),a=document.createElement('a');
   a.href=href(item.path);a.textContent=item.action||localLabel(item.label)+' · '+ui.offers;
   if(item.path.indexOf('https://')===0||item.path.indexOf('http://')===0){a.target='_blank';a.rel='noopener noreferrer';}else{a.rel='noopener';}
   a.addEventListener('click',function(){if(window.qwTrack)window.qwTrack(slug,'cross_sell_click');});
   li.appendChild(a);
   if(item.desc){var p=document.createElement('p');p.textContent=localDescription(item.desc);li.appendChild(p);}
   ul.appendChild(li);
  });
  box.appendChild(ul);grid.appendChild(box);
 });
 section.appendChild(grid);root.appendChild(section);
}
function init(){if(resultGated)window.addEventListener('qw:tool-completed',function(){completionReady=true;render();});render();new MutationObserver(render).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();