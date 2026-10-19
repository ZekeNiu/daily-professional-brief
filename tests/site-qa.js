(async()=>{
 const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
 const check=(v,s)=>{if(!v)throw Error(s)};
 const wait=async f=>{for(let i=0;i<240;i++){if(f())return;await new Promise(r=>setTimeout(r,50))}throw Error('view did not become ready: '+(window.__briefError||''))};
 const get=async p=>(await fetch(p)).json();
 const visible=()=>all('#sections .card:not(.hidden)');
 const change=async c=>{$('.channel-tabs [data-channel="'+c+'"]').click();await wait(()=>document.body.dataset.channel===c&&window.__briefReady)};
 try{
  document.documentElement.style.scrollBehavior='auto';
  await wait(()=>window.__briefReady);
  const path=location.pathname;
  if(path.includes('archive.html')){
   const s=await get('/data/social/archive.json');check(all('.archive-card').length===s.length,'social archive count');check($('.archive-card').href.includes('channel=social'),'archive preserves channel');
   await change('journal');const j=await get('/data/archive.json');check(all('.archive-card').length===j.length,'journal archive count');
   await change('social');
  }else if(path.includes('/2026-10-18/')){
   check($('#heroDate').textContent.includes('18'),'missing social date not replaced');
   check(!$('#appError').classList.contains('hidden'),'missing edition explained');
   check($('#appError a').href.includes('2026-10-19/?channel=social'),'latest social fallback link');
   check(all('#sections .card').length===0,'missing edition shows no other day cards');
   await change('journal');check($('#appError').classList.contains('hidden'),'journal recovers from missing social');
  }else{
   const jp=await get('/data/latest.json'),sp=await get('/data/social/latest.json');
   const journal=await get('/'+jp.url),social=await get('/'+sp.url),sources=await get('/data/social/sources.json');
   const startsSocial=new URL(location.href).searchParams.get('channel')==='social';
   if(!startsSocial){check(visible().length===journal.items.length,'journal initial cards');await change('social')}
   check($('#overview h2').textContent==='当日热点','social daily heading');
   check(!$('#trends').classList.contains('hidden'),'trends visible');
   check(Boolean($('#trends').compareDocumentPosition($('#overview'))&Node.DOCUMENT_POSITION_FOLLOWING),'trends above daily content');
   check(visible().length===social.items.length,'social item count');
   const checkRange=n=>{document.querySelector('[data-days="'+n+'"]').click();check(all('.heat-head>span').length===n+2,'range '+n)};
   checkRange(7);checkRange(14);
   $('[data-trend-domain="运动健康"]').click();check(all('.heat-topic small').every(e=>e.textContent==='运动健康'),'trend domain filter');
   const cell=all('.heat-cell').find(c=>+c.dataset.value>0);check(cell,'nonempty trend cell');const selectedDate=cell.dataset.day;cell.click();check($('#trendDetail').textContent.includes(selectedDate),'trend date drilldown');check(all('#trendDetail a').length>0,'trend sources exposed');
   $('#clearTrendDay').click();$('[data-trend-domain="全部"]').click();
   $('.filter-btn[data-domain="运动健康"]').click();check(visible().length===social.items.filter(i=>i.domain==='运动健康').length,'daily domain filter');check(!$('#trends').classList.contains('hidden'),'daily filtering retains trends');check(!$('#sources').classList.contains('hidden'),'daily filtering retains sources');
   $('#search').value='Asker';$('#search').dispatchEvent(new Event('input'));check(visible().length===1,'author search');
   $('#search').value='__unmatched__';$('#search').dispatchEvent(new Event('input'));check(!$('#noResults').classList.contains('hidden'),'no results state');
   $('#search').value='';$('#search').dispatchEvent(new Event('input'));$('.filter-btn[data-domain="全部"]').click();
   const head=$('#sections .card-head');head.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));check(head.getAttribute('aria-expanded')==='true','keyboard opens card');check(!head.closest('.card').querySelector('.card-detail').inert,'expanded detail accessible');head.click();
   $('.source-catalog').open=true;check(all('#sourceRows tr').length===sources.total,'source catalogue count');
   $('#sourceSearch').value='量子位';$('#sourceSearch').dispatchEvent(new Event('input'));check(all('#sourceRows tr').length===1,'source search');$('#sourceSearch').value='';$('#sourceSearch').dispatchEvent(new Event('input'));
   $('#sourceDomain').value='运动健康';$('#sourceDomain').dispatchEvent(new Event('change'));check(all('#sourceRows tr').length===sources.sources.filter(s=>s.domain==='运动健康').length,'source domain filter');$('#sourceDomain').value='全部领域';$('#sourceDomain').dispatchEvent(new Event('change'));$('.source-catalog').open=false;
   await change('journal');check(visible().length===journal.items.length,'journal restored');check($('#trends').classList.contains('hidden'),'journal has no social chart');check($('#heroDate').textContent.includes(journal.date.slice(-2)),'journal date restored');
   await change('social');await change('journal');await change('social');
   $('.filter-btn[data-domain="AI"]').click();check(visible().length===social.items.filter(i=>i.domain==='AI').length,'filter after repeated channel switches');$('.filter-btn[data-domain="全部"]').click();
   check($('.archive-link').href.includes('channel=social'),'history link preserves column');
   if(!startsSocial){await change('journal');scrollTo(0,0)}else{
    if(innerWidth<600)$('[data-days="7"]').click();
    if(new URL(location.href).searchParams.get('dark')==='1')$('#themeToggle').click();
    scrollTo(0,$('#trends').getBoundingClientRect().top+scrollY-84);
   }
  }
  check(document.documentElement.scrollWidth<=innerWidth,'page horizontal overflow');
  for(const e of all('.channel-tabs a')){const r=e.getBoundingClientRect();check(r.left>=0&&r.right<=innerWidth,'channel navigation within viewport')}
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  document.body.dataset.qa='pass';
 }catch(e){document.body.dataset.qa='fail';document.body.dataset.qaError=e.message;console.error(e)}
})();
