/* Quickwell worldwide contextual cross-sell; no dependencies. */
(function(){
'use strict';
var pathParts=location.pathname.split('/').filter(Boolean);if(pathParts[0]==='es'||pathParts[0]==='fr')pathParts.shift();var slug=pathParts[0]||'';
var raw=(document.documentElement.lang||navigator.language||'en').toLowerCase();
var lang=raw.indexOf('es')===0?'es':raw.indexOf('fr')===0?'fr':'en';
var ui={
en:{head:'Recommended next steps',tools:'Related tools and workflows',books:'Books and learning',more:'More from Quickwell',health:'Health and focus buyer guides',offers:'Explore',note:'Built for a global audience: use miles or kilometres and local currencies where supported.'},
es:{head:'Siguiente paso recomendado',tools:'Herramientas y flujos relacionados',books:'Libros y aprendizaje',more:'Más de Quickwell',health:'Guías de salud y concentración',offers:'Explorar',note:'Para una audiencia global: usa millas o kilómetros y monedas locales cuando estén disponibles.'},
fr:{head:'Prochaine étape recommandée',tools:'Outils et processus associés',books:'Livres et apprentissage',more:'Plus de Quickwell',health:'Guides santé et concentration',offers:'Découvrir',note:'Pour un public international : utilisez les miles ou les kilomètres et les devises locales lorsqu’elles sont prises en charge.'}
}[lang];
var L=function(label,path,desc){return {label:label,path:path,desc:desc||''};};
var freight=['rate-con-checker','haul-audit','fuelgauge','audit-kit'];
var trade=['commodities','plot-file-checker','eudr','tradepath','permit-watch','royalty-check','vendor-check','vigless'];
var home=['bill-radar','fair-price','saver','pilot','shield','before-you-sign','proof','keep-the-receipt','lotwise'];
var kitchen=['dinner','kitchen','copycat'];
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
L('EUDR Plot File Checker','/eudr/','Review plot-file information for EUDR workflows.'),
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
 card(ui.books,[L('Mindset Mastery','https://books2read.com/u/mY9QMW','Discipline, emotional control and decision-making.')]);
 card(ui.more,[L('Quickwell Plus','/plus/','Unlock eligible everyday Quickwell tools.')]);
}else if(trade.indexOf(slug)>=0){
 card(ui.tools,rotate(ttools,trade.indexOf(slug),4),'Commodity, trade, documentation and contract review utilities.');
 card(ui.books,crypto.concat([
 L('Mindset Mastery','https://books2read.com/u/mY9QMW','Discipline and decision-making.')
 ]),'Verified direct book links only.');
}else if(home.indexOf(slug)>=0){
 card(ui.tools,rotate(homeTools,home.indexOf(slug),6),'Compare, review and track household and money decisions.');
 card(ui.more,[
 L('Quickwell Plus','/plus/','Unlock eligible everyday tools.'),
 L('Gatherloom','https://gatherloom.app/','Coordinate group gifts, events and shared budgets.')
 ]);
 card(ui.books,crypto.concat([
 L('Energy Revolution System','/offers/','Read the buyer guide and review seller terms.'),
 L('Water Freedom System','/offers/','Read the buyer guide and review seller terms.'),
 L('Ted Plans DIY','/offers/','Review the DIY buyer guide and project considerations.'),
 L('Shifting Vibrations Manifest','/offers/','Read the buyer guide before visiting the seller.'),
 L('Genius Switch Original','/offers/','Review the focus and planning buyer guide.')
 ]));
}else if(kitchen.indexOf(slug)>=0){
 card(ui.books,[
 L('Mediterranean Diet Recipes Book','https://books2read.com/u/4jo1Xo','Everyday Mediterranean meal ideas.'),
 L('Plant Based Diet Recipes Book','https://books2read.com/u/m0BxMV','Practical plant-based weeknight recipes.')
 ]);
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
function href(path){
 var u=new URL(path,'https://quickwell.app');
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
 var root=target();if(!root||root.querySelector(':scope > .qw-cross-sell'))return;
 var section=document.createElement('section');section.className='qw-cross-sell';section.setAttribute('aria-label',ui.head);
 var style=document.createElement('style');
 style.textContent='.qw-cross-sell{box-sizing:border-box;margin:22px 0;padding:16px;border:1px solid var(--line,#d8e2df);border-radius:14px;background:var(--card,#fff);color:var(--ink,#18312e);font:inherit}.qw-cross-sell *{box-sizing:border-box}.qw-cross-sell h2{font-size:1.08rem;margin:0 0 6px}.qw-cross-sell .qw-note{margin:0 0 14px;color:var(--muted,#63736f);font-size:.92rem}.qw-cross-sell .qw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px}.qw-cross-sell article{padding:13px;border:1px solid var(--line,#d8e2df);border-radius:10px;background:var(--surface,#f8faf9)}.qw-cross-sell h3{font-size:.98rem;margin:0 0 8px}.qw-cross-sell ul{margin:0;padding:0;list-style:none;display:grid;gap:9px}.qw-cross-sell a{font-weight:700;text-decoration:underline;text-underline-offset:2px;color:var(--link,#087b65)}.qw-cross-sell p{margin:3px 0 0;color:var(--muted,#63736f);font-size:.87rem}';
 section.appendChild(style);
 var h=document.createElement('h2');h.textContent=ui.head;section.appendChild(h);
 var note=document.createElement('p');note.className='qw-note';note.textContent=ui.note;section.appendChild(note);
 var grid=document.createElement('div');grid.className='qw-grid';
 cards.forEach(function(c){
  var box=document.createElement('article'),title=document.createElement('h3'),ul=document.createElement('ul');
  title.textContent=c.title;box.appendChild(title);
  if(c.desc){var d=document.createElement('p');d.textContent=c.desc;box.appendChild(d);}
  c.links.forEach(function(item){
   var li=document.createElement('li'),a=document.createElement('a');
   a.href=href(item.path);a.textContent=localLabel(item.label)+' · '+ui.offers;a.rel='noopener';li.appendChild(a);
   if(item.desc){var p=document.createElement('p');p.textContent=item.desc;li.appendChild(p);}
   ul.appendChild(li);
  });
  box.appendChild(ul);grid.appendChild(box);
 });
 section.appendChild(grid);root.appendChild(section);
}
function init(){render();new MutationObserver(render).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();