/* Social views use the main brief's theme, cards and date navigation. */
(() => {
  const $=(s,c=document)=>c.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let viewVersion=0;
  const domainOrder=['运动科学','运动健康','AI'];
  async function json(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
  function trendView(data){
    const box=$('#trends');
    let range=matchMedia('(max-width:600px)').matches?7:14,domain='全部',selected=null;
    box.innerHTML='<div class="section-head"><span class="num">00</span><div><h2 id="trendTitle">近期趋势</h2><p class="sub">按公开内容的发布日期，观察不同话题在近期的延续。</p></div></div><div class="panel trend-panel"><div class="trend-toolbar"><div class="trend-domains" aria-label="趋势领域">'+['全部',...domainOrder].map(d=>'<button class="trend-filter'+(d==='全部'?' active':'')+'" data-trend-domain="'+d+'">'+d+'</button>').join('')+'</div><div class="range-switch" aria-label="趋势时间范围"><button data-days="7">近7天</button><button data-days="14">近14天</button></div></div><div class="trend-summary" id="trendSummary"></div><div class="heat-scroll" tabindex="0" aria-label="近期话题按日期的来源数，可横向滚动"><div id="heatmap"></div></div><div class="heat-legend"><span>每天涉及该话题的来源数</span><i class="heat-level-0"></i><span>0</span><i class="heat-level-1"></i><span>1</span><i class="heat-level-2"></i><span>2–3</span><i class="heat-level-3"></i><span>4+</span></div><div class="trend-detail" id="trendDetail" aria-live="polite"></div><p class="trend-method">同一来源每天在同一话题计一次；点击图格查看对应内容。</p></div><div id="trendTooltip" class="heat-tooltip hidden" role="tooltip"></div>';
    function rowsForView(){return data.rows.filter(r=>domain==='全部'||r.domain===domain).map(r=>({...r,points:r.points.slice(-range)})).sort((a,b)=>domainOrder.indexOf(a.domain)-domainOrder.indexOf(b.domain)||b.source_count-a.source_count)}
    function renderDetail(){
      const rows=rowsForView(),s=selected||{topic:rows[0]?.id,day:null};
      const row=rows.find(r=>r.id===s.topic)||rows[0];
      const start=data.end&&new Date(Date.parse(data.end+'T00:00:00Z')-(range-1)*86400000).toISOString().slice(0,10);
      const items=data.items.filter(x=>x.topic_id===row?.id&&x.date>=start&&(!s.day||x.date===s.day)).sort((a,b)=>b.date.localeCompare(a.date));
      const sources=new Set(items.flatMap(x=>x.sources));
      $('#trendDetail').innerHTML='<div class="trend-detail-head"><div><b>'+esc(row?.label||'话题明细')+'</b><span>'+(s.day?esc(s.day):'近'+range+'天')+' · '+items.length+' 条 · '+sources.size+' 个来源</span></div>'+(s.day?'<button class="text-btn" id="clearTrendDay">查看整个时段</button>':'')+'</div>'+(items.length?'<ul class="trend-items">'+items.map(x=>'<li><time>'+esc(x.date.slice(5))+'</time><div><a href="'+esc(x.url)+'" target="_blank" rel="noopener">'+esc(x.title)+' ↗</a><small>'+esc(x.sources.join('、'))+' · '+esc(x.platform)+'</small></div></li>').join('')+'</ul>':'<p class="sub">本轮尚未收集到该日的对应条目。</p>');
      $('#clearTrendDay')?.addEventListener('click',()=>{selected={topic:row.id,day:null};render()});
    }
    function render(){
      const rows=rowsForView(),days=(data.rows[0]?.points||[]).slice(-range).map(p=>p.date);
      const start=days[0],items=data.items.filter(x=>x.date>=start&&(domain==='全部'||x.domain===domain));
      const sources=new Set(items.flatMap(x=>x.sources));
      $('#trendSummary').innerHTML='<div><span class="eyebrow">TOPIC ACTIVITY</span><h3>近期话题脉络</h3><p>'+esc(start?.slice(5))+' — '+esc(data.end?.slice(5))+' · 已收集公开讨论</p></div><div class="trend-totals"><b>'+sources.size+'<small>来源</small></b><b>'+items.length+'<small>条目</small></b></div>';
      box.querySelectorAll('[data-days]').forEach(b=>{const active=+b.dataset.days===range;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
      box.querySelectorAll('[data-trend-domain]').forEach(b=>{const active=b.dataset.trendDomain===domain;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
      $('#heatmap').style.setProperty('--days',range);
      $('#heatmap').innerHTML='<div class="heat-row heat-head"><span>讨论主题</span>'+days.map(d=>'<span>'+esc(d.slice(5).replace('-','/'))+'</span>').join('')+'<span>来源</span></div>'+rows.map(r=>{
        const ids=new Set(r.points.flatMap(p=>p.item_ids)),src=new Set(data.items.filter(x=>ids.has(x.id)).flatMap(x=>x.sources));
        return '<div class="heat-row"><button class="heat-topic'+(selected?.topic===r.id?' active':'')+'" data-topic="'+esc(r.id)+'"><small>'+esc(r.domain)+'</small><b>'+esc(r.label)+'</b></button>'+r.points.map(p=>'<button class="heat-cell heat-level-'+(p.value===0?0:p.value===1?1:p.value<4?2:3)+(selected?.topic===r.id&&selected?.day===p.date?' selected':'')+'" data-topic="'+esc(r.id)+'" data-day="'+p.date+'" data-value="'+p.value+'" aria-label="'+esc(r.label)+'，'+p.date+'，'+p.value+'个来源" aria-pressed="'+String(selected?.topic===r.id&&selected?.day===p.date)+'">'+(p.value||'·')+'</button>').join('')+'<span class="heat-total">'+src.size+'</span></div>';
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
  function sourceView(data){
    const box=$('#sources');
    box.innerHTML='<div class="section-head"><span class="num">05</span><div><h2 id="sourcesTitle">信息来源</h2><p class="sub">'+data.total+' 个来源 · '+data.feeds_connected+' 个公开订阅读通</p></div></div><details class="panel source-catalog"><summary><span>作者、机构与平台</span><span>查看清单 ＋</span></summary><div class="catalog-body"><div class="source-channels"><span>跨平台检索入口</span>'+data.discovery_channels.map(c=>'<span class="meta-pill" title="'+esc(c.focus)+'">'+esc(c.name)+'</span>').join('')+'</div><div class="toolbar"><select id="sourceDomain" aria-label="来源领域"><option>全部领域</option>'+domainOrder.map(d=>'<option>'+d+'</option>').join('')+'</select><input class="search" id="sourceSearch" placeholder="搜索作者、机构、方向…" aria-label="搜索信息来源"></div><div class="catalog-table"><table><thead><tr><th>作者 / 机构</th><th>领域与方向</th><th>渠道</th><th>接入情况</th></tr></thead><tbody id="sourceRows"></tbody></table></div><p class="sub" id="sourceResultCount"></p><p class="trend-method">订阅源记录本轮连接结果，网页与社交入口供选题时检索核查。采集时间：'+esc((data.checked_at||'').replace('T',' ').slice(0,16))+' UTC。</p></div></details>';
    function render(){const q=$('#sourceSearch').value.trim().toLowerCase(),domain=$('#sourceDomain').value;const items=data.sources.filter(s=>(domain==='全部领域'||s.domain===domain)&&(!q||[s.name,s.focus,s.domain,s.platform,s.language].join(' ').toLowerCase().includes(q)));
      $('#sourceRows').innerHTML=items.map(s=>'<tr><td><a href="'+esc(s.homepage)+'" target="_blank" rel="noopener"><b>'+esc(s.name)+' ↗</b></a><small>'+esc(s.kind)+(s.language==='zh'?' · 中文':'')+'</small></td><td>'+esc(s.domain)+'<small>'+esc(s.focus)+'</small></td><td>'+esc(s.platform)+(s.profiles||[]).map(p=>' · <a href="'+esc(p.url)+'" target="_blank" rel="noopener">'+esc(p.platform)+' ↗</a>').join('')+'</td><td><span class="source-state'+(s.status==='feed_ok'?' connected':'')+'">'+(s.status==='feed_ok'?'订阅读通':s.status==='unavailable'?'本轮未连通':'网页检索入口')+'</span></td></tr>').join('');
      $('#sourceResultCount').textContent='显示 '+items.length+' / '+data.total+' 个来源';
    }
    $('#sourceSearch').addEventListener('input',render);$('#sourceDomain').addEventListener('change',render);render();
  }
  window.BriefSocial={async render(d,root){
    const version=++viewVersion;
    // Replace nodes to release view-specific event listeners on channel switches.
    for(const id of ['trends','sources']){const old=$('#'+id),fresh=old.cloneNode(false);old.replaceWith(fresh)}
    const results=await Promise.allSettled([json(root+'/'+d.trends_url),json(root+'/data/social/sources.json')]);
    if(version!==viewVersion||document.body.dataset.channel!=='social')return;
    if(results[0].status==='fulfilled')trendView(results[0].value);else $('#trends').innerHTML='<div class="panel empty">近期趋势暂未载入，请刷新后重试。</div>';
    if(results[1].status==='fulfilled')sourceView(results[1].value);else $('#sources').innerHTML='<div class="panel empty">来源清单暂未载入，请刷新后重试。</div>';
  }};
})();
