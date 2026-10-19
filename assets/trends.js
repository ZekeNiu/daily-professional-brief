/* Each field has its own dated topic heatmap and one linked content inspector. */
(() => {
 const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>[...c.querySelectorAll(s)];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const domains=['运动科学','运动健康','AI'],fields=['sport','health','ai'];
 const label=d=>d==='运动科学'?'运动表现':d;
 const dateLabel=d=>d.slice(5).replace('-','/');
 const shift=(s,n)=>new Date(Date.parse(s+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 const daysBetween=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000)+1;
 const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&Number.isFinite(Date.parse(s+'T00:00:00Z'));
 const canonical=s=>{try{const u=new URL(s);u.hash='';u.pathname=u.pathname.replace(/\/$/,'');return u.href}catch{return s}};
 let viewVersion=0;
 function explorer(data,edition,box,root,channel){
  const social=channel==='social',unit=social?'来源':'条目',key='brief-trend-view:'+channel+':'+data.end;
  const presets=[7,14,30].filter(n=>n<=daysBetween(data.start,data.end));
  const fallback=innerWidth<720?7:14;
  let domain=domains[0],mode=String(fallback),start=shift(data.end,1-fallback),end=data.end,selection=null,showAll=false;
  const within=(a,b)=>validDate(a)&&validDate(b)&&data.start<=a&&a<=b&&b<=data.end;
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved){if(domains.includes(saved.domain))domain=saved.domain;if(within(saved.start,saved.end)){start=saved.start;end=saved.end;mode=presets.includes(Number(saved.mode))?saved.mode:'custom'}}}catch{}
  const params=new URL(location.href).searchParams;
  if(fields.includes(params.get('field')))domain=domains[fields.indexOf(params.get('field'))];
  if(within(params.get('from'),params.get('to'))){start=params.get('from');end=params.get('to');mode=end===data.end&&presets.includes(daysBetween(start,end))?String(daysBetween(start,end)):'custom'}
  let requestedTopic=params.get('topic');
  const direction=(data.directions||[]).find(d=>d.id===params.get('direction'));
  if(direction&&domains.includes(direction.domain)){domain=direction.domain;const ids=new Set(direction.evidence.map(x=>x.id));requestedTopic=data.items.find(x=>ids.has(x.id))?.topic_id;}
  const requested=data.rows.find(r=>r.id===requestedTopic);
  if(requested&&domains.includes(requested.domain)){domain=requested.domain;selection={topic:requested.id,day:within(params.get('day'),params.get('day'))&&start<=params.get('day')&&params.get('day')<=end?params.get('day'):null};showAll=true;}
  const annotations=new Map();
  for(const d of data.directions||[])for(const x of d.evidence)annotations.set(canonical(x.url),{title:x.label,note:x.note});
  for(const x of edition.items||[])annotations.set(canonical(x.source?.url),{title:x.short_title||x.title,note:x.one_liner});
  box.innerHTML='<details class="panel trend-explorer" id="trendMap" data-fold="trend-map" open><summary class="fold-heading"><h2 id="trendTitle">近期趋势</h2><span id="trendPeriod" class="heat-period"></span><span class="fold-label"><i class="when-closed">展开</i><i class="when-open">收起</i><span class="fold-chevron">⌄</span></span></summary><div class="heat-body"><div class="field-controls"><div class="field-tabs" aria-label="趋势领域">'+domains.map((d,i)=>'<button data-trend-domain="'+esc(d)+'" data-field="'+fields[i]+'">'+label(d)+'</button>').join('')+'</div><label class="heat-range"><span class="sr-only">日期范围</span><select id="trendRange" aria-label="趋势日期范围">'+presets.map(n=>'<option value="'+n+'">近'+n+'天</option>').join('')+'<option value="custom">自定义</option></select></label></div><form id="trendDateForm" class="heat-date-form hidden"><label>从 <input id="trendStart" type="date" required min="'+data.start+'" max="'+data.end+'"></label><label>至 <input id="trendEnd" type="date" required min="'+data.start+'" max="'+data.end+'"></label><button type="submit">应用</button><span id="trendDateError" role="alert"></span></form><div class="heat-scroll" tabindex="0" aria-label="按主题与日期查看热度，较长区间可横向滚动"><div id="heatmap"></div></div><div class="heat-footer"><div class="compact-heat-legend"><span>每日'+unit+'数</span><i class="heat-level-0"></i><span>0</span><i class="heat-level-1"></i><span>1</span><i class="heat-level-2"></i><span>2–3</span><i class="heat-level-3"></i><span>4+</span></div><button id="moreHeatTopics" class="text-btn hidden"></button></div><div id="trendInspector" class="trend-inspector hidden" aria-live="polite"></div></div></details><div id="heatTooltip" class="map-tooltip hidden" role="tooltip"></div>';
  const matrix=$('#heatmap',box),inspector=$('#trendInspector',box),range=$('#trendRange',box),form=$('#trendDateForm',box),tip=$('#heatTooltip',box);
  const records=()=>data.items.filter(x=>x.domain===domain&&start<=x.date&&x.date<=end);
  function save(){try{localStorage.setItem(key,JSON.stringify({domain,mode,start,end}))}catch{}}
  function updateURL(){
   const u=new URL(location.href);u.searchParams.delete('direction');u.searchParams.set('field',fields[domains.indexOf(domain)]);u.searchParams.set('from',start);u.searchParams.set('to',end);
   if(selection){u.searchParams.set('topic',selection.topic);if(selection.day)u.searchParams.set('day',selection.day);else u.searchParams.delete('day')}
   else{u.searchParams.delete('topic');u.searchParams.delete('day')}
   history.replaceState({},'',u.href);
  }
  function rowsForView(){
   const all=records();
   return data.rows.filter(r=>r.domain===domain).map((r,index)=>{
    const items=all.filter(x=>x.topic_id===r.id),sources=new Set(items.flatMap(x=>x.sources));
    return {...r,index,items,total:social?sources.size:items.length,points:r.points.filter(p=>start<=p.date&&p.date<=end)};
   }).sort((a,b)=>b.total-a.total||b.items.length-a.items.length||a.index-b.index);
  }
  function renderInspector(){
   const row=data.rows.find(r=>r.id===selection?.topic&&r.domain===domain);
   inspector.classList.toggle('hidden',!row);
   if(!row){selection=null;inspector.innerHTML='';return;}
   const items=records().filter(x=>x.topic_id===row.id&&(!selection.day||x.date===selection.day)).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
   const sources=new Set(items.flatMap(x=>x.sources));
   inspector.dataset.count=items.length;inspector.dataset.sourceCount=sources.size;inspector.dataset.topic=row.id;inspector.dataset.day=selection.day||'';
   inspector.innerHTML='<div class="inspector-heading"><div><small>'+label(domain)+' · '+(selection.day?dateLabel(selection.day):dateLabel(start)+'—'+dateLabel(end))+' · '+items.length+'条'+(social?' / '+sources.size+'个来源':'')+'</small><h3>'+esc(row.label)+'</h3></div><button class="inspector-close" aria-label="关闭趋势详情">关闭 ×</button></div>'+(items.length?'<ul class="heat-content-list">'+items.map(x=>{const note=annotations.get(canonical(x.url));return '<li><time datetime="'+x.date+'">'+dateLabel(x.date)+'</time><a href="'+esc(x.url)+'" target="_blank" rel="noopener"><span>'+esc(note?.title||x.short_title||x.title)+'</span><small>'+esc(x.sources.join('、'))+' ↗</small></a></li>'}).join('')+'</ul>':'<p class="heat-empty">这个日期范围内尚未收录匹配内容。</p>');
   $('.inspector-close',inspector).onclick=()=>{selection=null;renderInspector();syncSelection();updateURL()};
  }
  function syncSelection(){
   $$('.heat-topic',matrix).forEach(b=>{const active=b.dataset.topic===selection?.topic;b.classList.toggle('active',active);b.setAttribute('aria-expanded',String(active))});
   $$('.heat-cell',matrix).forEach(b=>{const active=b.dataset.topic===selection?.topic&&b.dataset.day===selection?.day;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});
  }
  function render(){
   save();tip.classList.add('hidden');
   $('#trendPeriod',box).textContent=dateLabel(start)+'—'+dateLabel(end);
   range.value=mode;
   $$('[data-trend-domain]',box).forEach(b=>{const active=b.dataset.trendDomain===domain;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
   const rows=rowsForView();if(selection&&selection.day&&(selection.day<start||selection.day>end))selection.day=null;
   if(selection&&rows.findIndex(r=>r.id===selection.topic)>=3)showAll=true;
   const shown=showAll?rows:rows.slice(0,3),days=Array.from({length:daysBetween(start,end)},(_,i)=>shift(start,i));
   matrix.style.setProperty('--days',days.length);
   Object.assign(matrix.dataset,{domain,start,end,itemCount:String(records().length),sourceCount:String(new Set(records().flatMap(x=>x.sources)).size)});
   matrix.innerHTML=shown.length?'<div class="heat-row heat-head"><span>主题</span>'+days.map(d=>'<span><span class="heat-date-wide">'+dateLabel(d)+'</span><span class="heat-date-narrow">'+d.slice(8)+'日</span></span>').join('')+'<span title="所选区间'+(social?'不同来源总数':'去重收录条目总数')+'">全期</span></div>'+shown.map(r=>'<div class="heat-row" data-heat-row="'+r.id+'"><button class="heat-topic'+(selection?.topic===r.id?' active':'')+'" data-topic="'+r.id+'" aria-controls="trendInspector" aria-expanded="'+String(selection?.topic===r.id)+'"><b>'+esc(r.label.replace('运动科学','运动表现'))+'</b></button>'+r.points.map(p=>'<button class="heat-cell heat-level-'+(p.value===0?0:p.value===1?1:p.value<4?2:3)+(selection?.topic===r.id&&selection.day===p.date?' selected':'')+'" data-topic="'+r.id+'" data-day="'+p.date+'" data-value="'+p.value+'" aria-label="'+esc(r.label)+'，'+p.date+'，'+p.value+(social?'个来源':'条收录')+'" aria-controls="trendInspector" aria-pressed="'+String(selection?.topic===r.id&&selection.day===p.date)+'">'+(p.value||'·')+'</button>').join('')+'<span class="heat-total" data-total="'+r.total+'">'+r.total+'</span></div>').join(''):'<p class="heat-empty">这个领域尚未有可展示的收录记录。</p>';
   const more=$('#moreHeatTopics',box);more.classList.toggle('hidden',rows.length<=3);more.textContent=showAll?'收起更多主题':'其余'+(rows.length-3)+'个主题 ＋';
   renderInspector();
  }
  $$('[data-trend-domain]',box).forEach(b=>b.onclick=()=>{domain=b.dataset.trendDomain;selection=null;showAll=false;render();updateURL()});
  range.onchange=()=>{
   if(range.value==='custom'){form.classList.remove('hidden');$('#trendStart',box).value=start;$('#trendEnd',box).value=end;$('#trendDateError',box).textContent='';return;}
   mode=range.value;end=data.end;start=shift(end,1-Number(mode));form.classList.add('hidden');render();updateURL();
  };
  form.onsubmit=e=>{e.preventDefault();const a=$('#trendStart',box).value,b=$('#trendEnd',box).value;
   if(!within(a,b)){$('#trendDateError',box).textContent=a>b?'开始日期不能晚于结束日期。':'请选择已有数据范围内的日期。';return;}
   start=a;end=b;mode='custom';$('#trendDateError',box).textContent='';render();updateURL();
  };
  $('#moreHeatTopics',box).onclick=()=>{showAll=!showAll;if(!showAll&&selection&&rowsForView().findIndex(r=>r.id===selection.topic)>=3)selection=null;render()};
  matrix.onclick=e=>{const target=e.target.closest('[data-topic]');if(!target)return;selection={topic:target.dataset.topic,day:target.dataset.day||null};renderInspector();syncSelection();tip.classList.add('hidden');updateURL()};
  function showTip(e){const cell=e.target.closest('.heat-cell');if(!cell)return;tip.textContent=cell.getAttribute('aria-label');tip.classList.remove('hidden');const r=cell.getBoundingClientRect();tip.style.left=Math.max(10,Math.min(innerWidth-290,r.left-90))+'px';tip.style.top=Math.max(10,r.top-tip.offsetHeight-6)+'px'}
  const hideTip=()=>tip.classList.add('hidden');
  box.addEventListener('pointerover',showTip);box.addEventListener('pointerout',hideTip);box.addEventListener('focusin',showTip);box.addEventListener('focusout',hideTip);
  box.addEventListener('keydown',e=>{if(e.key==='Escape'){hideTip();if(selection){selection=null;renderInspector();syncSelection();updateURL()}}});
  if(mode==='custom'){form.classList.remove('hidden');$('#trendStart',box).value=start;$('#trendEnd',box).value=end;}
  render();
 }
 window.BriefTrends={async render(d,root,channel){
  const version=++viewVersion,old=$('#trends'),fresh=old.cloneNode(false);old.replaceWith(fresh);
  try{const r=await fetch(root+'/'+d.trends_url,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();if(version!==viewVersion||document.body.dataset.channel!==channel)return;explorer(data,d,fresh,root,channel)}
  catch(e){if(version===viewVersion&&document.body.dataset.channel===channel)fresh.innerHTML='<div class="panel empty">近期趋势暂未载入，请刷新后重试。</div>';}
 }};
})();
