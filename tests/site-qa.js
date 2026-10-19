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
  check(all('[data-trend-domain]').map(b=>b.textContent).join('|')==='运动表现|运动健康|AI','three field entries');
  check($('#trendMap').open,'heatmap visible by default');
  check($('#trendInspector').classList.contains('hidden'),'no prose before selection');
  check(all('[data-heat-row]').length>=2,'each field contains multiple topics');
  check($('[data-fold="daily"]').open,'daily items initially open');
  check(!$('[data-fold="quicklist"]').open,'quick list compact');
  check($('#dailyTitle').getBoundingClientRect().bottom<innerHeight,'daily heading on first screen');
  check($('#sections .card-title').getBoundingClientRect().top<(innerWidth<600?Math.min(innerHeight-20,820):innerHeight-20),'daily story on first screen');
  check(innerWidth>=600||$('#sections .card-title').getBoundingClientRect().bottom<innerHeight,'mobile title visible');
  check($('#sections .card-title').textContent===(brief.items[0].short_title||brief.items[0].title),'article scan title');
  const fold=$('[data-fold="overview"]');fold.querySelector('summary').click();check(!fold.open,'summary folds');fold.querySelector('summary').click();
  const daily=$('[data-fold="daily"]');daily.querySelector('summary').click();check(!daily.open,'daily folds');daily.querySelector('summary').click();
  const trend=await get('/'+brief.trends_url),presets=channel==='social'?[7,14]:[7,14,30];
  check(all('#trendRange option').map(o=>o.value).join()===presets.map(String).concat('custom').join(),'available date presets');
  const range=n=>{$('#trendRange').value=String(n);$('#trendRange').dispatchEvent(new Event('change'))};
  const expectedItems=(domain,topic,date)=>trend.items.filter(x=>x.domain===domain&&x.topic_id===topic&&$('#heatmap').dataset.start<=x.date&&x.date<=$('#heatmap').dataset.end&&(!date||x.date===date));
  function verify(){
   const m=$('#heatmap'),domain=m.dataset.domain;
   const records=trend.items.filter(x=>x.domain===domain&&m.dataset.start<=x.date&&x.date<=m.dataset.end);
   check(Number(m.dataset.itemCount)===records.length,'field/window total records');
   check(Number(m.dataset.sourceCount)===new Set(records.flatMap(x=>x.sources)).size,'field/window total sources');
   for(const row of all('[data-heat-row]')){
    const topic=row.dataset.heatRow,items=expectedItems(domain,topic),sources=new Set(items.flatMap(x=>x.sources));
    check(Number(row.querySelector('.heat-total').dataset.total)===(channel==='social'?sources.size:items.length),'window topic total');
    for(const cell of [...row.querySelectorAll('.heat-cell')]){
     const xs=expectedItems(domain,topic,cell.dataset.day),actual=channel==='social'?new Set(xs.flatMap(x=>x.sources)).size:xs.length;
     check(Number(cell.dataset.value)===actual,'exact heat cell count');
    }
   }
  }
  for(const domain of ['运动科学','运动健康','AI']){
   $('[data-trend-domain="'+domain+'"]').click();
   for(const n of presets){
    range(n);if(!$('#moreHeatTopics').classList.contains('hidden')&&!$('#moreHeatTopics').textContent.includes('收起'))$('#moreHeatTopics').click();
    check($('#heatmap').dataset.domain===domain,'independent field view');
    check(all('[data-heat-row]').length===trend.rows.filter(r=>r.domain===domain).length,'all topics in field');
    check(all('.heat-head>span').length===n+2,'selected number of dates');verify();
   }
  }
  const topic=$('.heat-topic');topic.click();check(!$('#trendInspector').classList.contains('hidden'),'topic opens inspector');
  let xs=expectedItems($('#heatmap').dataset.domain,topic.dataset.topic);
  check(all('.heat-content-list li').length===xs.length,'topic content matches date range');
  range(7);xs=expectedItems($('#heatmap').dataset.domain,topic.dataset.topic);check(Number($('#trendInspector').dataset.count)===xs.length,'existing detail follows changed range');
  const cell=all('.heat-cell').find(c=>+c.dataset.value>0);check(cell,'nonempty chart cell');cell.focus();check(!$('#heatTooltip').classList.contains('hidden'),'focus tooltip');cell.click();
  xs=expectedItems($('#heatmap').dataset.domain,cell.dataset.topic,cell.dataset.day);
  check(all('.heat-content-list li').length===xs.length,'day click shows exact records');
  check(all('.heat-content-list a').map(a=>a.href).sort().join()===xs.map(x=>x.url).sort().join(),'day source links match records');
  cell.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));check($('#trendInspector').classList.contains('hidden'),'escape closes details');
  const zero=all('.heat-cell').find(c=>+c.dataset.value===0);if(zero){zero.click();check(Number($('#trendInspector').dataset.count)===0,'empty date has no invented content');$('.inspector-close').click();}
  range('custom');check(!$('#trendDateForm').classList.contains('hidden'),'custom dates open');
  const customEnd=new Date(Date.parse(trend.end+'T00:00:00Z')-86400000).toISOString().slice(0,10),customStart=new Date(Date.parse(customEnd+'T00:00:00Z')-2*86400000).toISOString().slice(0,10);
  $('#trendStart').value=customStart;$('#trendEnd').value=customEnd;$('#trendDateForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  check($('#heatmap').dataset.start===customStart&&$('#heatmap').dataset.end===customEnd,'custom window applied');check(all('.heat-head>span').length===5,'three-day custom window');verify();check(document.documentElement.scrollWidth<=innerWidth,'custom form does not overflow');for(const input of all('#trendDateForm input')){const r=input.getBoundingClientRect();check(r.left>=0&&r.right<=innerWidth,'custom input fits viewport')};
  $('#trendStart').value=trend.end;$('#trendEnd').value=customStart;$('#trendDateForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  check($('#trendDateError').textContent.length>0,'reversed dates rejected');check($('#heatmap').dataset.start===customStart,'invalid range does not change chart');
  $('#trendStart').value=new Date(Date.parse(trend.start+'T00:00:00Z')-86400000).toISOString().slice(0,10);$('#trendEnd').value=trend.end;$('#trendDateForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  check($('#heatmap').dataset.start===customStart,'dates before available snapshot rejected');
  range(innerWidth<720?7:14);$('[data-trend-domain="运动科学"]').click();
  check($('#trendInspector').classList.contains('hidden'),'field change clears previous detail');
  check($('.heat-scroll').getBoundingClientRect().right<=innerWidth,'heat container fits viewport');
  if(innerWidth>=380&&innerWidth<720)check($('.heat-scroll').scrollWidth<=$('.heat-scroll').clientWidth+1,'seven-day mobile chart fits');
  $('#trendMap>summary').click();check(!$('#trendMap').open,'whole heatmap folds');$('#trendMap>summary').click();
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
   await change('journal');check($('#appError').classList.contains('hidden'),'journal recovers');check(all('.heat-topic').length>0,'historical journal heatmap');
  }else if(params.has('direction')||params.has('topic')){
   check($('#trendMap').open,'shared heatmap open');check(!$('#trendInspector').classList.contains('hidden'),'shared topic details open');
   if(params.has('topic')){check($('#heatmap').dataset.start===params.get('from'),'shared date start');check($('#heatmap').dataset.end===params.get('to'),'shared date end');check($('#trendInspector').dataset.topic===params.get('topic'),'shared topic');}
   check(!$('.channel-tabs [data-channel="journal"]').href.includes('topic='),'tab clears topic state');
   await change('journal');check(!new URL(location.href).searchParams.has('direction'),'legacy parameter cleared');check($('#trendInspector').classList.contains('hidden'),'new column begins without stale detail');
   await change('social');check($('#trendInspector').classList.contains('hidden'),'returning column clears selection');scrollTo(0,0);
  }else{
   const jp=await get('/data/latest.json'),sp=await get('/data/social/latest.json'),j=await get('/'+jp.url),s=await get('/'+sp.url);
   const initial=params.get('channel')==='social'?'social':'journal';
   await exercise(initial==='social'?s:j,initial);
   $('[data-fold="overview"]').open=false;$('[data-trend-domain="AI"]').click();await pause(80);
   await change(initial==='social'?'journal':'social');
   check($('[data-fold="overview"]').open,'fold state isolated');
   await exercise(initial==='social'?j:s,initial==='social'?'journal':'social');
   await change(initial);check(!$('[data-fold="overview"]').open,'fold preference restored');check($('#heatmap').dataset.domain==='AI','field selection remembered per column');$('[data-trend-domain="运动科学"]').click();reset();await pause(80);
   await change(initial==='social'?'journal':'social');await change(initial);
   $('.filter-btn[data-domain="AI"]').click();check(cards().length===(initial==='social'?s:j).items.filter(i=>i.domain==='AI').length,'filter after switches');reset();
   check($('.archive-link').href.includes('channel=social')===(initial==='social'),'history channel');
   if(params.get('dark')==='1')$('#themeToggle').click();
   if(params.get('view')==='trend'){$('[data-trend-domain="运动健康"]').click();$('.heat-topic').click();scrollTo(0,$('#trends').getBoundingClientRect().top+scrollY-84)}else scrollTo(0,0);
  }
  check(document.documentElement.scrollWidth<=innerWidth,'horizontal overflow');
  for(const e of all('.channel-tabs a')){const r=e.getBoundingClientRect();check(r.left>=0&&r.right<=innerWidth,'navigation fits')}
  await pause(150);document.body.dataset.qa='pass';
 }catch(e){document.body.dataset.qa='fail';document.body.dataset.qaError=e.message;console.error(e)}
})();
