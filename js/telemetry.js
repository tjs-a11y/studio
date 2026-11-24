(function(){'use strict';
var allowed=new Set(["bill-radar","fair-price","dinner","rate-con-checker","saver","shield","pilot","kitchen","copycat","fuelgauge","haul-audit","audit-kit","commodities","before-you-sign","plot-file-checker"]),last=Object.create(null),pending=null;
var cfg={
'bill-radar':{p:['run'],s:['sampleBtn'],r:['#out']},'fair-price':{p:['go'],s:['sampleBtn'],r:['#out']},'dinner':{p:['go'],s:['sampleBtn'],r:['#out']},
'rate-con-checker':{p:['check'],s:['sample'],r:['#result']},'saver':{p:['pasteBtn'],s:['sampleBtn'],r:['#results'],f:['#fileInput']},
'shield':{p:['checkBtn'],s:['sampleBtn'],r:['#results']},'pilot':{p:['readBtn'],s:['sampleBtn'],r:['#results'],f:['#fileInput']},
'kitchen':{p:['tonight'],r:['#out']},'copycat':{p:['go'],r:['#out']},'fuelgauge':{s:['sample'],r:['#hero'],f:['#file'],forms:['#row-form']},
'haul-audit':{p:['run'],s:['sample'],r:['#out']},'audit-kit':{p:['score','build'],s:['sampleBtn'],r:['#result']},'commodities':{p:[],r:['#holdings'],forms:['#addForm']},'before-you-sign':{p:['go'],s:['sample'],r:['#out']},'plot-file-checker':{p:['validateBtn'],s:['sampleMessy','sampleClean'],r:['#result']}
};
var pathParts=location.pathname.split('/').filter(Boolean);if(pathParts[0]==='es'||pathParts[0]==='fr')pathParts.shift();var slug=pathParts.join('/');
if(!allowed.has(slug))return;
window.trackToolCompletion=function(toolSlug,isSample){
 if(!allowed.has(toolSlug))return;
 var sample=isSample===true,key=toolSlug+':'+sample,now=Date.now();
 if(last[key]&&now-last[key]<1000)return;last[key]=now;
 var body=JSON.stringify({tool_slug:toolSlug,is_sample:sample,timestamp:new Date(now).toISOString()});
 try{var blob=new Blob([body],{type:'application/json'});if(navigator.sendBeacon&&navigator.sendBeacon('/api/event',blob))return;}catch(e){}
 try{fetch('/api/event',{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true,credentials:'same-origin'}).catch(function(){});}catch(e){}
};
var c=cfg[slug];if(!c)return;
function start(sample){pending={sample:!!sample,at:Date.now()};setTimeout(function(){if(pending&&Date.now()-pending.at>30000)pending=null;},30100);}
function nodes(){return c.r.map(function(s){return document.querySelector(s);}).filter(Boolean);}
function visible(el){return !!el&&!el.hidden&&!el.classList.contains('hidden')&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.textContent.trim().length>8;}
function relevant(muts,els){return muts.some(function(m){return els.some(function(el){return m.target===el||el.contains(m.target)||m.target.contains(el);});});}
function changed(muts){if(!pending)return;var els=nodes();if(!els.length||!relevant(muts,els)||!els.some(visible))return;var sample=pending.sample;pending=null;window.trackToolCompletion(slug,sample);}
function init(){
 (c.p||[]).forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('click',function(){start(false);},true);});
 (c.s||[]).forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('click',function(){start(true);},true);});
 (c.f||[]).forEach(function(sel){var el=document.querySelector(sel);if(el)el.addEventListener('change',function(){if(el.files&&el.files.length)start(false);},true);});
 (c.forms||[]).forEach(function(sel){var el=document.querySelector(sel);if(el)el.addEventListener('submit',function(){start(false);},true);});
 new MutationObserver(changed).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();