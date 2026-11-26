(function(){'use strict';
var body=document.body;
var tool=body&&body.getAttribute('data-qw-embed-tool');
var names={
 'bill-radar':'Bill Radar',
 'fair-price':'Fair Price',
 'dinner':'What’s for Dinner',
 'rate-con-checker':'Rate Con Checker'
};
if(!names[tool])return;
var frame=document.getElementById('qw-embedded-tool');
if(!frame)return;
var params=new URLSearchParams(location.search);
var ref=params.get('ref');
if(!ref||!/^[a-z0-9][a-z0-9-]{0,39}$/i.test(ref))ref='embed-'+tool;
ref=ref.toLowerCase();
var toolUrl=new URL('/'+tool+'/',location.origin);
toolUrl.searchParams.set('embed','1');
toolUrl.searchParams.set('ref',ref);
toolUrl.searchParams.set('utm_source','embed');
toolUrl.searchParams.set('utm_medium','referral');
toolUrl.searchParams.set('utm_campaign','quickwell_embeds');
toolUrl.searchParams.set('utm_content',tool);
frame.title='Quickwell '+names[tool]+' tool';
if(frame.src!==toolUrl.href)frame.src=toolUrl.href;
document.addEventListener('click',function(event){
 var link=event.target&&event.target.closest?event.target.closest('a[href]'):null;
 if(!link)return;
 var url;
 try{url=new URL(link.href,location.href);}catch(e){return;}
 var currentPath=('/embed/'+tool+'/').replace(/\\/+$/,'')||'/';
 var targetPath=(url.pathname||'/').replace(/\\/+$/,'')||'/';
 if(url.origin===location.origin&&targetPath===currentPath)return;
 link.target='_blank';
 link.rel='noopener noreferrer';
},true);
var back=document.getElementById('qw-embed-linkback');
if(back){
 var backUrl=new URL('/'+tool+'/',location.origin);
 backUrl.searchParams.set('ref',ref);
 backUrl.searchParams.set('utm_source','embed');
 backUrl.searchParams.set('utm_medium','referral');
 backUrl.searchParams.set('utm_campaign','quickwell_embeds');
 backUrl.searchParams.set('utm_content',tool);
 back.href=backUrl.href;
}
function boundedHeight(value){var n=Number(value);if(!Number.isFinite(n))return null;return Math.max(520,Math.min(3000,Math.ceil(n)));}
function reportToParent(){
 if(window.parent===window)return;
 var height=Math.ceil(Math.max(document.documentElement.scrollHeight,document.body?document.body.scrollHeight:0));
 try{window.parent.postMessage({type:'quickwell:embed:resize',tool:tool,height:height},'*');}catch(e){}
}
window.addEventListener('message',function(event){
 if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
 var data=event.data;
 if(!data||data.type!=='quickwell:tool:resize'||data.tool!==tool)return;
 var height=boundedHeight(data.height);
 if(height===null)return;
 frame.style.height=height+'px';
 requestAnimationFrame(reportToParent);
});
frame.addEventListener('load',function(){requestAnimationFrame(reportToParent);});
window.addEventListener('resize',reportToParent);
if('ResizeObserver' in window)new ResizeObserver(reportToParent).observe(document.body);
if(window.qwTrack)window.qwTrack(tool,'embed_open');
requestAnimationFrame(reportToParent);
})();