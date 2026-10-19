/* A topic timeline is the single entry into recent evidence and discussion. */
(() => {
 const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>[...c.querySelectorAll(s)];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const day=s=>Math.round(Date.parse(s+'T00:00:00Z')/86400000);
 const iso=n=>new Date(n*86400000).toISOString().slice(0,10);
 const dateLabel=s=>s.slice(5).replace('-','/');
 let viewVersion=0,resizeObserver;
 function timeline(data,box,root,channel){
  const directions=(data.directions||[]).filter(d=>d.evidence?.length);
  const records=directions.flatMap(d=>d.evidence);
  const first=records.length?Math.min(...records.map(x=>day(x.date))):day(data.end);
  const last=Math.max(first,day(data.end)),span=Math.max(last-first,1);
  const ticks=[...new Set(Array.from({length:4},(_,i)=>Math.round(first+(last-first)*i/3)))];
  const days=channel==='social'?14:30;
  let selection=null,lastTrigger=null;
  box.innerHTML='<details class="panel trend-map" id="trendMap" data-fold="trend-map" open><summary class="fold-heading map-heading"><h2 id="trendTitle">近期趋势</h2><span class="map-period">近'+days+'天 · 代表内容</span><span class="fold-label"><i class="when-closed">展开</i><i class="when-open">收起</i><span class="fold-chevron">⌄</span></span></summary><div class="map-body"><div class="topic-map" role="group" aria-label="具体议题与代表内容出现的时间"><div class="map-axis"><span>议题</span><div class="map-dates">'+ticks.map(n=>'<time datetime="'+iso(n)+'" style="left:'+((n-first)/span*100)+'%">'+dateLabel(iso(n))+'</time>').join('')+'</div></div>'+directions.map(d=>'<div class="topic-row" data-topic-row="'+esc(d.id)+'"><button class="topic-label" data-direction="'+esc(d.id)+'" aria-controls="trendInspector" aria-expanded="false"><small>'+esc(d.domain)+'</small><strong>'+esc(d.chart_label||d.title)+'</strong></button><div class="topic-plot"><div class="topic-track">'+ticks.map(n=>'<span class="topic-gridline" aria-hidden="true" style="left:'+((n-first)/span*100)+'%"></span>').join('')+'<div class="topic-points"></div></div></div></div>').join('')+'</div><div class="map-caption"><span>点选议题或圆点查看内容</span><span>数字＝内容条数 · '+(channel==='social'?'发布日期':'收录日期')+'</span></div><div class="trend-inspector hidden" id="trendInspector" aria-live="polite"></div></div></details><div id="mapTooltip" class="map-tooltip hidden" role="tooltip"></div>';
  const map=$('#trendMap',box),inspector=$('#trendInspector',box),tooltip=$('#mapTooltip',box);
  function updateSelection(){
   $$('.topic-row',box).forEach(row=>row.classList.toggle('selected',row.dataset.topicRow===selection?.direction));
   $$('[data-direction]',box).forEach(b=>{const active=b.dataset.direction===selection?.direction;b.setAttribute('aria-expanded',String(active));b.classList.toggle('active',active)});
   $$('.topic-point',box).forEach(b=>{const ids=b.dataset.items.split(','),active=selection?.kind==='event'&&b.dataset.topic===selection.direction&&ids.some(id=>selection.items.includes(id));b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(Boolean(active)))});
  }
  function showInspector(){
   const d=directions.find(d=>d.id===selection?.direction);
   inspector.classList.toggle('hidden',!d);
   updateSelection();
   if(!d){inspector.innerHTML='';return;}
   const isEvent=selection.kind==='event',evidence=isEvent?d.evidence.filter(x=>selection.items.includes(x.id)):d.evidence;
   const related=d.related,relatedURL=related?root+'/briefs/'+data.end+'/?'+(related.channel==='social'?'channel=social&':'')+'direction='+encodeURIComponent(related.direction_id)+'#trends':'';
   const dates=evidence.map(x=>x.date).sort(),period=dates[0]===dates.at(-1)?dateLabel(dates[0]):dateLabel(dates[0])+'—'+dateLabel(dates.at(-1));
   const pointText=isEvent?evidence.map(x=>x.note||x.one_liner||x.label||x.title).join(' '):d.change;
   inspector.innerHTML='<div class="inspector-heading"><div><small>'+esc(d.domain)+(isEvent?' · '+esc(period):'')+'</small><h3>'+esc(isEvent&&evidence.length===1?evidence[0].label:d.title)+'</h3></div><button class="inspector-close" aria-label="关闭趋势详情">关闭 ×</button></div>'+(pointText?'<p class="inspector-takeaway">'+esc(pointText)+'</p>':'')+'<ul class="map-sources">'+evidence.map(x=>'<li><time datetime="'+esc(x.date)+'">'+dateLabel(x.date)+'</time><a href="'+esc(x.url)+'" target="_blank" rel="noopener"><span>'+esc(x.label||x.short_title||x.title)+'</span><small>'+esc(x.sources.join('、'))+' ↗</small></a></li>').join('')+'</ul>'+(!isEvent&&d.confidence?'<p class="map-confidence">置信度 '+esc(d.confidence)+' · '+esc(d.confidence_reason)+'</p>':'')+(!isEvent&&related?'<a class="related-direction" href="'+esc(relatedURL)+'">'+esc(related.label)+' ↗</a>':'');
   $('.inspector-close',inspector).onclick=()=>{selection=null;showInspector();lastTrigger?.focus({preventScroll:true})};
  }
  function drawPoints(){
   for(const d of directions){
    const row=$$('.topic-row',box).find(r=>r.dataset.topicRow===d.id),track=$('.topic-track',row);
    const width=track.getBoundingClientRect().width;
    if(!width)continue;
    // Merge nearby dates on narrow screens, keeping every underlying record.
    const groups=[];
    for(const item of [...d.evidence].sort((a,b)=>a.date.localeCompare(b.date))){
     const previous=groups.at(-1),position=(day(item.date)-first)/span*width;
     if(previous&&position-previous.x<32){previous.items.push(item);previous.x=previous.items.reduce((n,x)=>n+(day(x.date)-first)/span*width,0)/previous.items.length;}
     else groups.push({x:position,items:[item]});
    }
    $('.topic-points',row).innerHTML=groups.map(g=>{
     const dates=g.items.map(x=>x.date).sort(),date=dates[0]===dates.at(-1)?dateLabel(dates[0]):dateLabel(dates[0])+'—'+dateLabel(dates.at(-1));
     const title=date+' · '+g.items.length+'条 · '+g.items.map(x=>x.label||x.short_title||x.title).join('；');
     return '<button class="topic-point" data-topic="'+esc(d.id)+'" data-items="'+esc(g.items.map(x=>x.id).join(','))+'" data-start="'+dates[0]+'" data-end="'+dates.at(-1)+'" data-count="'+g.items.length+'" data-tip="'+esc(title)+'" aria-label="'+esc(d.chart_label||d.title)+'，'+esc(title)+'" aria-controls="trendInspector" aria-pressed="false" style="left:'+g.x/width*100+'%"><span>'+g.items.length+'</span></button>';
    }).join('');
   }
   updateSelection();
  }
  function choose(trigger){
   lastTrigger=trigger;
   selection=trigger.matches('.topic-point')?{direction:trigger.dataset.topic,kind:'event',items:trigger.dataset.items.split(',')}:{direction:trigger.dataset.direction,kind:'topic'};
   showInspector();tooltip.classList.add('hidden');
  }
  box.addEventListener('click',e=>{const b=e.target.closest('.topic-label,.topic-point');if(b)choose(b)});
  function tip(e){const point=e.target.closest('.topic-point');if(!point)return;tooltip.textContent=point.dataset.tip;tooltip.classList.remove('hidden');const r=point.getBoundingClientRect();tooltip.style.left=Math.max(10,Math.min(innerWidth-290,r.left-90))+'px';tooltip.style.top=Math.max(12,r.top-tooltip.offsetHeight-6)+'px';}
  const hideTip=()=>tooltip.classList.add('hidden');
  box.addEventListener('pointerover',tip);box.addEventListener('focusin',tip);box.addEventListener('pointerout',hideTip);box.addEventListener('focusout',hideTip);
  box.addEventListener('keydown',e=>{if(e.key==='Escape'){hideTip();if(selection){selection=null;showInspector();lastTrigger?.focus({preventScroll:true})}}});
  map.addEventListener('toggle',()=>{if(map.open)drawPoints();else hideTip()});
  resizeObserver=new ResizeObserver(()=>{hideTip();drawPoints()});resizeObserver.observe($('.topic-map',box));
  drawPoints();
  const requested=new URL(location.href).searchParams.get('direction');
  const linked=$$('.topic-label',box).find(b=>b.dataset.direction===requested);
  if(linked)choose(linked);
 }
 window.BriefTrends={async render(d,root,channel){
  const version=++viewVersion;resizeObserver?.disconnect();
  const old=$('#trends'),fresh=old.cloneNode(false);old.replaceWith(fresh);
  try{
   const response=await fetch(root+'/'+d.trends_url,{cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   if(version!==viewVersion||document.body.dataset.channel!==channel)return;
   timeline(data,fresh,root,channel);
  }catch(e){if(version===viewVersion&&document.body.dataset.channel===channel)fresh.innerHTML='<div class="panel empty">近期趋势暂未载入，请刷新后重试。</div>';}
 }};
})();
