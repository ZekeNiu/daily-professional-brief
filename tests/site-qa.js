(async()=>{
 const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
 const check=(v,s)=>{if(!v)throw Error(s)};
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async f=>{for(let i=0;i<240;i++){if(f())return;await pause(50)}throw Error('view not ready: '+(window.__briefError||''))};
 const get=async p=>(await fetch(p)).json();
 const cards=()=>all('#sections .card:not(.hidden)');
 const change=async c=>{$('.channel-tabs [data-channel="'+c+'"]').click();await wait(()=>document.body.dataset.channel===c&&window.__briefReady)};
 const follows=(a,b)=>Boolean($(a).compareDocumentPosition($(b))&Node.DOCUMENT_POSITION_FOLLOWING);
 function reset(){
  $('#search').value='';$('#search').dispatchEvent(new Event('input'));
  $('.filter-btn[data-domain="全部"]').click();
  all('details[data-fold]').forEach(d=>d.open=['overview','daily','domain-sport','domain-health','domain-ai','domain-global','trend-map'].includes(d.dataset.fold));
 }
 async function exercise(brief,channel){
  check(cards().length===brief.items.length,channel+' item count');
  check($('#overview h2').textContent==='本期摘要','edition summary heading');
  check($('#dailyTitle').textContent===(channel==='social'?'当日热点':'每日资讯'),'daily heading');
  check(follows('#trends','#overview')&&follows('#overview','#daily'),'trend → summary → daily order');
  check(all('.topic-label').length===brief.trend_directions.length,'specific topics on chart');
  check($('#trendMap').open,'chart visible by default');
  check($('#trendInspector').classList.contains('hidden'),'initial chart has no dense prose');
  check($('[data-fold="daily"]').open,'daily items initially open');
  check(!$('[data-fold="quicklist"]').open,'quick list compact');
  check($('#dailyTitle').getBoundingClientRect().bottom<innerHeight,'daily heading on first screen');
  check($('#sections .card-title').getBoundingClientRect().top<(innerWidth<600?Math.min(innerHeight-20,820):innerHeight-20),'daily story on first screen');
  check(innerWidth>=600||$('#sections .card-title').getBoundingClientRect().bottom<innerHeight,'mobile title visible');
  check($('#sections .card-title').textContent===(brief.items[0].short_title||brief.items[0].title),'Chinese article title');
  const fold=$('[data-fold="overview"]');fold.querySelector('summary').click();check(!fold.open,'summary folds');fold.querySelector('summary').click();
  const daily=$('[data-fold="daily"]');daily.querySelector('summary').click();check(!daily.open,'daily folds');daily.querySelector('summary').click();
  await wait(()=>all('.topic-point').length>0);
  const trend=await get('/'+brief.trends_url);
  for(const d of trend.directions){
   const points=all('.topic-point').filter(p=>p.dataset.topic===d.id);
   check(points.reduce((n,p)=>n+Number(p.dataset.count),0)===d.evidence.length,'every source counted on timeline');
   check(points.flatMap(p=>p.dataset.items.split(',')).sort().join()===d.evidence.map(x=>x.id).sort().join(),'timeline source identities');
   for(const p of points){check(p.getBoundingClientRect().width>=24,'usable marker target');check(p.getAttribute('aria-label').includes(p.dataset.count+'条'),'accessible count');}
  }
  const mapRect=$('.topic-map').getBoundingClientRect();
  check(mapRect.right<=innerWidth,'chart fits screen');
  $('.topic-label').click();check(!$('#trendInspector').classList.contains('hidden'),'topic opens one inspector');
  check(all('.map-sources li').length===brief.trend_directions[0].references.length,'topic sources');
  check($('.related-direction')?.href.includes('direction='),'cross-column path');
  all('.topic-label').at(-1).click();check($('#trendInspector h3').textContent===brief.trend_directions.at(-1).title,'topic changes same inspector');
  check(all('#trendInspector').length===1,'one inspector only');
  const point=$('.topic-point');point.focus();check(!$('#mapTooltip').classList.contains('hidden'),'keyboard focus tooltip');point.click();
  check(all('.map-sources li').length===Number(point.dataset.count),'point drilldown has exact source count');
  check(all('.map-sources a').every(a=>a.href.startsWith('https://')),'point source URLs');
  point.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));check($('#trendInspector').classList.contains('hidden'),'escape returns to chart');
  $('.topic-label').click();$('.inspector-close').click();check($('#trendInspector').classList.contains('hidden'),'close returns to chart');
  $('#trendMap>summary').click();check(!$('#trendMap').open,'whole chart folds');$('#trendMap>summary').click();await pause(80);
  $('.filter-btn[data-domain="运动健康"]').click();check(cards().length===brief.items.filter(i=>i.domain==='运动健康').length,'daily filter');check(!$('#trends').classList.contains('hidden'),'filter preserves trend');
  if(channel==='social'){$('#search').value='Asker';$('#search').dispatchEvent(new Event('input'));check(cards().length===1,'author search');}
  $('#search').value='__unmatched__';$('#search').dispatchEvent(new Event('input'));check(!$('#noResults').classList.contains('hidden'),'no results');reset();
  const head=$('#sections .card-head');head.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));check(head.getAttribute('aria-expanded')==='true','keyboard card');check(!head.closest('.card').querySelector('.card-detail').inert,'detail accessible');head.click();
  const domain=$('#sport details');domain.querySelector('summary').click();check(!domain.open,'domain folds');domain.querySelector('summary').click();
  if(channel==='social'){
   const sources=await get('/data/social/sources.json');$('.source-catalog').open=true;check(all('#sourceRows tr').length===sources.total,'source count');
   $('#sourceSearch').value='量子位';$('#sourceSearch').dispatchEvent(new Event('input'));check(all('#sourceRows tr').length===1,'source search');$('#sourceSearch').value='';$('#sourceSearch').dispatchEvent(new Event('input'));
   $('#sourceDomain').value='运动健康';$('#sourceDomain').dispatchEvent(new Event('change'));check(all('#sourceRows tr').length===sources.sources.filter(s=>s.domain==='运动健康').length,'source domain');$('#sourceDomain').value='全部领域';$('#sourceDomain').dispatchEvent(new Event('change'));
  }
  reset();await pause(80);
 }
 try{
  document.documentElement.style.scrollBehavior='auto';
  await wait(()=>window.__briefReady);
  const path=location.pathname,params=new URL(location.href).searchParams;
  if(path.includes('archive.html')){
   const s=await get('/data/social/archive.json');check(all('.archive-card').length===s.length,'social archive');check($('.archive-card').href.includes('channel=social'),'archive column');await change('journal');const j=await get('/data/archive.json');check(all('.archive-card').length===j.length,'journal archive');await change('social');
  }else if(path.includes('/2026-10-18/')){
   check($('#heroDate').textContent.includes('18'),'missing date correct');check(!$('#appError').classList.contains('hidden'),'missing explained');check($('#appError a').href.includes('2026-10-19/?channel=social'),'fallback link');check(all('#sections .card').length===0,'no wrong-date cards');
   await change('journal');check($('#appError').classList.contains('hidden'),'journal recovers');check(all('.topic-label').length>0,'historical journal trends');
  }else if(params.has('direction')){
   check($('#trendMap').open,'linked chart open');
   check(!$('#trendInspector').classList.contains('hidden'),'linked topic opens inspector');
   check($('.topic-label.active').dataset.direction===params.get('direction'),'linked topic selected');
   check(!$('.channel-tabs [data-channel="journal"]').href.includes('direction='),'tab clears topic parameter');
   await change('journal');check(!new URL(location.href).searchParams.has('direction'),'parameter cleared');
   check($('#trendInspector').classList.contains('hidden'),'new column starts with chart only');
   await change('social');check($('#trendInspector').classList.contains('hidden'),'column navigation clears stale selection');
   scrollTo(0,0);
  }else{
   const jp=await get('/data/latest.json'),sp=await get('/data/social/latest.json'),j=await get('/'+jp.url),s=await get('/'+sp.url);
   const initial=params.get('channel')==='social'?'social':'journal';
   await exercise(initial==='social'?s:j,initial);
   $('[data-fold="overview"]').open=false;await pause(80);
   await change(initial==='social'?'journal':'social');
   check($('[data-fold="overview"]').open,'fold state isolated');
   await exercise(initial==='social'?j:s,initial==='social'?'journal':'social');
   await change(initial);check(!$('[data-fold="overview"]').open,'fold preference restored');reset();await pause(80);
   await change(initial==='social'?'journal':'social');await change(initial);
   $('.filter-btn[data-domain="AI"]').click();check(cards().length===(initial==='social'?s:j).items.filter(i=>i.domain==='AI').length,'filter after switches');reset();
   check($('.archive-link').href.includes('channel=social')===(initial==='social'),'history channel');
   if(params.get('dark')==='1')$('#themeToggle').click();
   if(params.get('view')==='trend'){$('.topic-label').click();scrollTo(0,$('#trends').getBoundingClientRect().top+scrollY-84)}else scrollTo(0,0);
  }
  check(document.documentElement.scrollWidth<=innerWidth,'horizontal overflow');
  for(const e of all('.channel-tabs a')){const r=e.getBoundingClientRect();check(r.left>=0&&r.right<=innerWidth,'navigation fits')}
  await pause(150);document.body.dataset.qa='pass';
 }catch(e){document.body.dataset.qa='fail';document.body.dataset.qaError=e.message;console.error(e)}
})();
