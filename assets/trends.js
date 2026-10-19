/* Shared editorial directions and date-based activity for both columns. */
(() => {
  const $=(s,c=document)=>c.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const domainOrder=['运动科学','运动健康','AI','全球重要事件'];
  let viewVersion=0;
  function activityView(data,box,channel){
    let range=channel==='social'?(matchMedia('(max-width:600px)').matches?7:14):14,domain='全部',selected=null;
    box.innerHTML='<div class="trend-panel"><div class="trend-toolbar"><div class="trend-domains" aria-label="趋势领域">'+['全部',...domainOrder.filter(d=>data.rows.some(r=>r.domain===d))].map(d=>'<button class="trend-filter'+(d==='全部'?' active':'')+'" data-trend-domain="'+d+'">'+d+'</button>').join('')+'</div><div class="range-switch" aria-label="趋势时间范围">'+(channel==='social'?'<button data-days="7">近7天</button><button data-days="14">近14天</button>':'<button data-days="14">近14天</button><button data-days="30">近30天</button>')+'</div></div><div class="trend-summary" id="trendSummary"></div><div class="heat-scroll" tabindex="0" aria-label="近期分类按日期的活动数量，可横向滚动"><div id="heatmap"></div></div><div class="heat-legend"><span>'+(channel==='social'?'每天涉及该话题的来源数':'每天收录的去重条目数')+'</span><i class="heat-level-0"></i><span>0</span><i class="heat-level-1"></i><span>1</span><i class="heat-level-2"></i><span>2–3</span><i class="heat-level-3"></i><span>4+</span></div><div class="trend-detail" id="trendDetail" aria-live="polite"></div><p class="trend-method">'+(channel==='social'?'按公开内容发布日期，同一来源每天同一话题计一次。':'按简报收录日期，同一原始内容去重计一次。')+' 点击图格查看原文。</p></div><div id="trendTooltip" class="heat-tooltip hidden" role="tooltip"></div>';
    function rowsForView(){return data.rows.filter(r=>domain==='全部'||r.domain===domain).map(r=>({...r,points:r.points.slice(-range)})).sort((a,b)=>domainOrder.indexOf(a.domain)-domainOrder.indexOf(b.domain)||b.source_count-a.source_count)}
    function renderDetail(){
      const rows=rowsForView(),s=selected||{topic:rows[0]?.id,day:null};
      const row=rows.find(r=>r.id===s.topic)||rows[0];
      const start=data.end&&new Date(Date.parse(data.end+'T00:00:00Z')-(range-1)*86400000).toISOString().slice(0,10);
      const items=data.items.filter(x=>x.topic_id===row?.id&&x.date>=start&&(!s.day||x.date===s.day)).sort((a,b)=>b.date.localeCompare(a.date));
      const sources=new Set(items.flatMap(x=>x.sources));
      $('#trendDetail').innerHTML='<div class="trend-detail-head"><div><b>'+esc(row?.label||'话题明细')+'</b><span>'+(s.day?esc(s.day):'近'+range+'天')+' · '+items.length+' 条'+(channel==='social'?' · '+sources.size+' 个来源':'')+'</span></div>'+(s.day?'<button class="text-btn" id="clearTrendDay">查看整个时段</button>':'')+'</div>'+(items.length?'<ul class="trend-items">'+items.map(x=>'<li><time>'+esc(x.date.slice(5))+'</time><div><a href="'+esc(x.url)+'" target="_blank" rel="noopener">'+esc(x.title)+' ↗</a><small>'+esc(x.sources.join('、'))+' · '+esc(x.platform)+'</small></div></li>').join('')+'</ul>':'<p class="sub">本轮尚未收集到该日的对应条目。</p>');
      $('#clearTrendDay')?.addEventListener('click',()=>{selected={topic:row.id,day:null};render()});
    }
    function render(){
      const rows=rowsForView(),days=(data.rows[0]?.points||[]).slice(-range).map(p=>p.date);
      const start=days[0],items=data.items.filter(x=>x.date>=start&&(domain==='全部'||x.domain===domain));
      const sources=new Set(items.flatMap(x=>x.sources));
      $('#trendSummary').innerHTML='<div><span class="eyebrow">COLLECTED ACTIVITY</span><h3>分类时间分布</h3><p>'+esc(start?.slice(5))+' — '+esc(data.end?.slice(5))+' · '+esc(data.date_basis)+'</p></div><div class="trend-totals"><b>'+(channel==='social'?sources.size:rows.length)+'<small>'+(channel==='social'?'来源':'主题')+'</small></b><b>'+items.length+'<small>条目</small></b></div>';
      box.querySelectorAll('[data-days]').forEach(b=>{const active=+b.dataset.days===range;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
      box.querySelectorAll('[data-trend-domain]').forEach(b=>{const active=b.dataset.trendDomain===domain;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
      $('#heatmap').style.setProperty('--days',range);
      $('#heatmap').innerHTML='<div class="heat-row heat-head"><span>讨论主题</span>'+days.map(d=>'<span>'+esc(innerWidth<600?d.slice(8)+'日':d.slice(5).replace('-','/'))+'</span>').join('')+'<span>'+(channel==='social'?'来源':'条目')+'</span></div>'+rows.map(r=>{
        const ids=new Set(r.points.flatMap(p=>p.item_ids)),src=new Set(data.items.filter(x=>ids.has(x.id)).flatMap(x=>x.sources));
        return '<div class="heat-row"><button class="heat-topic'+(selected?.topic===r.id?' active':'')+'" data-topic="'+esc(r.id)+'"><small>'+esc(r.domain)+'</small><b>'+esc(r.label)+'</b></button>'+r.points.map(p=>'<button class="heat-cell heat-level-'+(p.value===0?0:p.value===1?1:p.value<4?2:3)+(selected?.topic===r.id&&selected?.day===p.date?' selected':'')+'" data-topic="'+esc(r.id)+'" data-day="'+p.date+'" data-value="'+p.value+'" aria-label="'+esc(r.label)+'，'+p.date+'，'+p.value+(channel==='social'?'个来源':'条收录')+'" aria-pressed="'+String(selected?.topic===r.id&&selected?.day===p.date)+'">'+(p.value||'·')+'</button>').join('')+'<span class="heat-total">'+(channel==='social'?src.size:ids.size)+'</span></div>';
      }).join('');
      renderDetail();
    }
    box.addEventListener('click',e=>{
      const domainButton=e.target.closest('[data-trend-domain]'),days=e.target.closest('[data-days]'),cell=e.target.closest('[data-topic]');
      if(domainButton){domain=domainButton.dataset.trendDomain;selected=null;render()}
      else if(days){range=+days.dataset.days;selected=null;render()}
      else if(cell){selected={topic:cell.dataset.topic,day:cell.dataset.day||null};render()}
    });
    function showTip(e){const cell=e.target.closest('.heat-cell');if(!cell)return;const tip=$('#trendTooltip'),r=cell.getBoundingClientRect();tip.textContent=cell.getAttribute('aria-label');tip.classList.remove('hidden');tip.style.left=Math.max(12,Math.min(innerWidth-252,r.left-70))+'px';tip.style.top=Math.max(10,r.top-50)+'px'}
    function hideTip(){$('#trendTooltip')?.classList.add('hidden')}
    box.addEventListener('pointerover',showTip);box.addEventListener('focusin',showTip);box.addEventListener('pointerout',hideTip);box.addEventListener('focusout',hideTip);box.addEventListener('click',hideTip);
    render();
  }

  function directionView(data,box,root,channel){
    const directions=data.directions||[],days=channel==='social'?14:30;
    let selected=new URL(location.href).searchParams.get('direction');
    if(!directions.some(d=>d.id===selected))selected=directions[0]?.id;
    box.innerHTML='<div class="panel trend-overview"><div class="trend-heading"><div><h2 id="trendTitle">近期趋势</h2><span class="trend-period">近'+days+'天 · '+(channel==='social'?'公开内容':'已收录研究与进展')+'</span></div><a class="skip-daily" href="#daily">直达'+(channel==='social'?'当日热点':'每日资讯')+' ↓</a></div><div class="direction-previews">'+directions.map((d,i)=>'<button class="direction-preview" data-direction="'+esc(d.id)+'" aria-controls="directionDetail"><span class="direction-domain">'+esc(d.domain)+'</span><b>'+esc(d.title)+'</b><span class="direction-change">'+esc(d.change)+'</span><span class="direction-arrow" aria-hidden="true">↗</span></button>').join('')+'</div><details class="trend-analysis" id="trendAnalysis" data-fold="trends"><summary><span><i class="when-closed">展开趋势分析</i><i class="when-open">收起趋势分析</i></span><span class="trend-analysis-meta">'+directions.length+' 个方向 · 时间线与来源</span><span class="fold-chevron">⌄</span></summary><div class="trend-analysis-body"><div id="directionDetail" aria-live="polite"></div><details class="activity-fold" data-fold="activity"><summary><span>分类时间分布</span><span class="sub">'+data.total_items+' 条已收录内容</span><span class="fold-chevron">⌄</span></summary><div id="activityView"></div></details></div></details></div>';
    function renderDirection(){
      const d=directions.find(d=>d.id===selected);
      box.querySelectorAll('[data-direction]').forEach(b=>{const active=b.dataset.direction===selected;b.classList.toggle('active',active);b.setAttribute('aria-expanded',String(active&&$('#trendAnalysis').open));});
      if(!d){$('#directionDetail').innerHTML='<p class="sub">近期内容按分类与日期整理如下。</p>';return;}
      const related=d.related;
      const relatedURL=related?root+'/briefs/'+data.end+'/?'+(related.channel==='social'?'channel=social&':'')+'direction='+encodeURIComponent(related.direction_id)+'#trends':'';
      $('#directionDetail').innerHTML='<div class="direction-detail-heading"><div><span class="eyebrow">'+esc(d.kind==='reading_path'?'近期收录':'编辑综合')+' · '+esc(d.domain)+'</span><h3>'+esc(d.title)+'</h3></div><span class="direction-evidence-count">'+d.evidence.length+' 条线索'+(channel==='social'?' · '+d.source_count+' 个来源':'')+'</span></div><p class="direction-reading">'+esc(d.change)+'</p>'+(d.meaning?'<div class="direction-meaning"><b>阅读重点</b><p>'+esc(d.meaning)+'</p></div>':'')+'<div class="timeline-caption">'+(channel==='social'?'公开内容发布与讨论':'研究与进展的收录脉络')+'</div><ol class="evidence-timeline">'+d.evidence.map(x=>'<li><time>'+esc(x.date.slice(5).replace('-','/'))+'</time><a href="'+esc(x.url)+'" target="_blank" rel="noopener"><b>'+esc(x.label)+'</b><span class="timeline-source">'+esc(x.sources.join('、'))+' ↗</span></a>'+(x.note?'<p>'+esc(x.note)+'</p>':'')+(x.edition_date?'<a class="edition-backlink" href="'+root+'/briefs/'+x.edition_date+'/#daily">查看该期简报 →</a>':'')+'</li>').join('')+'</ol>'+(d.confidence?'<p class="direction-confidence">置信度：'+esc(d.confidence)+' · '+esc(d.confidence_reason)+'</p>':'')+(related?'<a class="related-direction" href="'+esc(relatedURL)+'">'+esc(related.label)+' ↗</a>':'');
    }
    box.querySelectorAll('[data-direction]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.direction;$('#trendAnalysis').open=true;renderDirection();}));
    $('#trendAnalysis').addEventListener('toggle',renderDirection);
    activityView(data,$('#activityView'),channel);
    renderDirection();
  }
  window.BriefTrends={async render(d,root,channel){
    const version=++viewVersion;
    const old=$('#trends'),fresh=old.cloneNode(false);old.replaceWith(fresh);
    try{
      const response=await fetch(root+'/'+d.trends_url,{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(version!==viewVersion||document.body.dataset.channel!==channel)return;
      directionView(data,fresh,root,channel);
    }catch(e){if(version===viewVersion&&document.body.dataset.channel===channel)fresh.innerHTML='<div class="panel empty">近期趋势暂未载入，请刷新后重试。</div>';}
  }};
})();
