/* The social source catalogue shares the brief's theme and navigation. */
(() => {
  const $=(s,c=document)=>c.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const domainOrder=['运动科学','运动健康','AI'];
  let viewVersion=0;
  function sourceView(data){
    const box=$('#sources');
    box.innerHTML='<div class="section-head"><span class="num">05</span><div><h2 id="sourcesTitle">信息来源</h2><p class="sub">'+data.total+' 个来源 · '+data.feeds_connected+' 个公开订阅读通</p></div></div><details class="panel source-catalog" data-fold="sources"><summary><span>作者、机构与平台</span><span><i class="when-closed">查看清单</i><i class="when-open">收起清单</i> <span class="fold-chevron">⌄</span></span></summary><div class="catalog-body"><div class="source-channels"><span>跨平台检索入口</span>'+data.discovery_channels.map(c=>'<span class="meta-pill" title="'+esc(c.focus)+'">'+esc(c.name)+'</span>').join('')+'</div><div class="toolbar"><select id="sourceDomain" aria-label="来源领域"><option>全部领域</option>'+domainOrder.map(d=>'<option>'+d+'</option>').join('')+'</select><input class="search" id="sourceSearch" placeholder="搜索作者、机构、方向…" aria-label="搜索信息来源"></div><div class="catalog-table"><table><thead><tr><th>作者 / 机构</th><th>领域与方向</th><th>渠道</th><th>接入情况</th></tr></thead><tbody id="sourceRows"></tbody></table></div><p class="sub" id="sourceResultCount"></p><p class="trend-method">订阅源记录本轮连接结果，网页与社交入口供选题时检索核查。采集时间：'+esc((data.checked_at||'').replace('T',' ').slice(0,16))+' UTC。</p></div></details>';
    function render(){const q=$('#sourceSearch').value.trim().toLowerCase(),domain=$('#sourceDomain').value;const items=data.sources.filter(s=>(domain==='全部领域'||s.domain===domain)&&(!q||[s.name,s.focus,s.domain,s.platform,s.language].join(' ').toLowerCase().includes(q)));
      $('#sourceRows').innerHTML=items.map(s=>'<tr><td><a href="'+esc(s.homepage)+'" target="_blank" rel="noopener"><b>'+esc(s.name)+' ↗</b></a><small>'+esc(s.kind)+(s.language==='zh'?' · 中文':'')+'</small></td><td>'+esc(s.domain)+'<small>'+esc(s.focus)+'</small></td><td>'+esc(s.platform)+(s.profiles||[]).map(p=>' · <a href="'+esc(p.url)+'" target="_blank" rel="noopener">'+esc(p.platform)+' ↗</a>').join('')+'</td><td><span class="source-state'+(s.status==='feed_ok'?' connected':'')+'">'+(s.status==='feed_ok'?'订阅读通':s.status==='unavailable'?'本轮未连通':'网页检索入口')+'</span></td></tr>').join('');
      $('#sourceResultCount').textContent='显示 '+items.length+' / '+data.total+' 个来源';
    }
    $('#sourceSearch').addEventListener('input',render);$('#sourceDomain').addEventListener('change',render);render();
  }
  window.BriefSocial={async render(d,root){
    const version=++viewVersion,channel=document.body.dataset.channel;
    const old=$('#sources'),fresh=old.cloneNode(false);old.replaceWith(fresh);
    try{
      const response=await fetch(root+'/data/social/sources.json',{cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const data=await response.json();
      if(version!==viewVersion||document.body.dataset.channel!==channel)return;
      sourceView(data);
    }catch(e){if(version===viewVersion&&document.body.dataset.channel===channel)$('#sources').innerHTML='<div class="panel empty">来源清单暂未载入，请刷新后重试。</div>';}
  }};
})();
