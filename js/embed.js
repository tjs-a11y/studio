(function(){'use strict';
var origin='https://quickwell.app';
var selectors={'bill-radar':'#out','fair-price':'#out','dinner':'#out','rate-con-checker':'#result'};
var labels={'bill-radar':'Bill Radar — estimate an electricity bill rate change','fair-price':'Fair Price — review a repair or contractor estimate','dinner':'What’s for Dinner — find meals from ingredients at home','rate-con-checker':'Rate Con Checker — review a broker rate confirmation'};
var heights={'bill-radar':1080,'fair-price':1040,'dinner':980,'rate-con-checker':1240};
var pathParts=location.pathname.split('/').filter(Boolean);
if(pathParts[0]==='es'||pathParts[0]==='fr')pathParts.shift();
var slug=pathParts.join('/');
var params=new URLSearchParams(location.search);
function currentToolUrl(){
 var url=new URL('/'+slug+'/',origin);
 params.forEach(function(value,key){if(key!=='embed')url.searchParams.set(key,value);});
 return url.href;
}
function openFullTool(){
 var existing=document.querySelector('.qw-embed-open-full');
 if(existing){existing.focus();return;}
 var link=document.createElement('a');
 link.className='qw-embed-open-full';
 link.href=currentToolUrl();
 link.target='_blank';
 link.rel='noopener noreferrer';
 link.textContent='Open the full Quickwell tool to continue';
 link.style.cssText='display:inline-block;margin:12px 0;padding:9px 12px;border:1px solid currentColor;border-radius:8px;font-weight:700';
 document.body.appendChild(link);
 link.click();
}
function protectEmbeddedNavigation(){
 document.addEventListener('click',function(event){
  var link=event.target&&event.target.closest?event.target.closest('a[href]'):null;
  if(!link)return;
  var url;
  try{url=new URL(link.href,location.href);}catch(e){return;}
  var currentPath=(location.pathname||'/').replace(/\/+$/,'')||'/';
  var targetPath=(url.pathname||'/').replace(/\/+$/,'')||'/';
  if(url.origin===location.origin&&targetPath===currentPath)return;
  link.target='_blank';
  link.rel='noopener noreferrer';
 },true);
 if(window.Studio){
  if(typeof window.Studio.upgrade==='function')window.Studio.upgrade=function(){openFullTool();return Promise.resolve(null);};
  if(typeof window.Studio.manage==='function')window.Studio.manage=function(){openFullTool();return Promise.resolve(null);};
 }
}
function reportHeight(){
 if(params.get('embed')!=='1'||window.parent===window)return;
 var height=Math.ceil(Math.max(document.documentElement.scrollHeight,document.body?document.body.scrollHeight:0));
 try{window.parent.postMessage({type:'quickwell:tool:resize',tool:slug,height:height},location.origin);}catch(e){}
}
function watchHeight(){
 reportHeight();
 window.addEventListener('load',reportHeight);
 window.addEventListener('resize',reportHeight);
 if('ResizeObserver' in window){
  var ro=new ResizeObserver(reportHeight);
  ro.observe(document.documentElement);
  if(document.body)ro.observe(document.body);
 }
 if(document.body)new MutationObserver(reportHeight).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});
 if(document.fonts&&document.fonts.ready)document.fonts.ready.then(reportHeight).catch(function(){});\n window.addEventListener('message',function(event){\n  if(event.origin!==location.origin||event.source!==window.parent)return;\n  var data=event.data;\n  if(!data||data.type!=='quickwell:embed:measure'||data.tool!==slug)return;\n  reportHeight();\n });
}
function chrome(){
 if(params.get('embed')!=='1')return false;
 document.documentElement.classList.add('qw-embed-mode');
 var style=document.createElement('style');
 style.textContent='header,nav,footer,.site-header,.site-nav,.site-footer{display:none!important}body{margin:0!important}main{padding-top:12px!important}.wrap{margin-top:0!important}.qw-embed-open-full{display:inline-block!important}';
 document.head.appendChild(style);
 protectEmbeddedNavigation();
 watchHeight();
 return true;
}
function visible(el){return !!el&&!el.hidden&&!el.classList.contains('hidden')&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.textContent.trim().length>8;}
function snippet(){
 var ref='embed-'+slug;
 var url=new URL('/embed/'+slug+'/',origin);
 url.searchParams.set('ref',ref);
 url.searchParams.set('utm_source','embed');
 url.searchParams.set('utm_medium','referral');
 url.searchParams.set('utm_campaign','quickwell_embeds');
 url.searchParams.set('utm_content',slug);
 var id='quickwell-embed-'+slug+'-'+Date.now();
 var height=heights[slug]||980;
 var src=url.href.replace(/&/g,'&amp;');
 var link=new URL('/'+slug+'/',origin);
 link.searchParams.set('ref',ref);
 return '<div style="width:100%;max-width:100%"><iframe id="'+id+'" src="'+src+'" title="Quickwell '+(labels[slug]||slug)+'" width="100%" height="'+height+'" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="clipboard-write" style="display:block;width:100%;height:'+height+'px;max-width:100%;border:0"></iframe></div>\n'+
 '<script>(function(){var frame=document.getElementById("'+id+'");if(!frame)return;window.addEventListener("message",function(event){if(event.origin!=="https://quickwell.app"||event.source!==frame.contentWindow)return;var data=event.data;if(!data||data.type!=="quickwell:embed:resize"||data.tool!=="'+slug+'")return;var height=Number(data.height);if(Number.isFinite(height))frame.style.height=Math.max(520,Math.min(3000,Math.ceil(height)))+"px";});})();<\/script>\n'+
 '<p><a href="'+link.href+'" rel="noopener noreferrer">Powered by Quickwell — '+(labels[slug]||slug)+'</a></p>';
}
function add(el){
 if(!visible(el)||document.querySelector('.qw-embed-copy'))return;
 var box=document.createElement('div');
 box.className='qw-embed-copy';
 box.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:14px 0;padding:10px 0';
 var button=document.createElement('button');
 button.type='button';
 button.textContent='Copy Embed Code';
 button.setAttribute('aria-label','Copy the Quickwell '+slug+' embed code');
 var status=document.createElement('span');
 status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 function copied(){
  status.textContent='Embed code copied.';
  if(window.qwTrack)window.qwTrack(slug,'embed_code_copy');
 }
 function fallback(value){
  var area=document.createElement('textarea');
  area.value=value;
  area.style.cssText='position:fixed;opacity:0';
  document.body.appendChild(area);
  area.select();
  var ok=false;
  try{ok=document.execCommand('copy');}catch(e){}
  area.remove();
  return ok;
 }
 button.addEventListener('click',function(){
  var code=snippet();
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(code).then(copied).catch(function(){status.textContent=fallback(code)?'Embed code copied.':'Copy failed; try again.';});
  else status.textContent=fallback(code)?'Embed code copied.':'Copy failed; try again.';
 });
 box.append(button,status);
 el.insertAdjacentElement('afterend',box);
}
function init(){
 if(chrome())return;
 var selector=selectors[slug];
 if(!selector)return;
 var el=document.querySelector(selector);
 if(!el)return;
 add(el);
 new MutationObserver(function(){add(el);}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();