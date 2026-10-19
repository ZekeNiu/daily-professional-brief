(() => {
const $=(q,c=document)=>c.querySelector(q), $$=(q,c=document)=>[...c.querySelectorAll(q)];
const root=document.body.dataset.root||'.';
const page=document.body.dataset.page||'brief';
const currentChannel=()=>new URL(location.href).searchParams.get('channel')==='social'?'social':'journal';
let channel=currentChannel(),loadVersion=0;
const channelQuery=()=>channel==='social'?'?channel=social':'';
const datedURL=date=>root+'/briefs/'+date+'/'+channelQuery();
const channelData=()=>root+'/data/'+(channel==='social'?'social/':'');
let cardObserver,sectionObserver;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badgeClass=p=>p==='重点关注'?'high':p==='值得了解'?'mid':'fast';
const setTheme=()=>{try{const saved=localStorage.getItem('brief-theme');if(saved)document.documentElement.dataset.theme=saved}catch{}};
setTheme();
$('#themeToggle')?.addEventListener('click',()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;try{localStorage.setItem('brief-theme',n)}catch{}});
async function getJSON(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}
function sourceLink(item){return item.source?.url||'#'}
function badge(p){return '<span class="badge '+badgeClass(p)+'"><i class="badge-dot"></i>'+esc(p)+'</span>'}
function displayDomain(d){return d==='全球重要事件'?'全球事件':d}
function formatBriefDate(iso){
 const [y,m,d]=iso.split('-').map(Number);
 const dt=new Date(Date.UTC(y,m-1,d));
 const weekdays=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
 return {long:y+'年'+String(m).padStart(2,'0')+'月'+String(d).padStart(2,'0')+'日',weekday:weekdays[dt.getUTCDay()]};
}
async function setupHistoryPicker(currentDate){
 const sel=$('#historySelect'); if(!sel)return;
 try{
   const atChannel=channel,items=await getJSON(channelData()+'archive.json');
   if(channel!==atChannel)return;
   const latest=items[0]?.date;
   sel.innerHTML=items.map(x=>'<option value="'+esc(x.date)+'">'+esc(x.date)+(x.date===latest?' · 最新':'')+'</option>').join('');
   sel.value=currentDate;
   sel.onchange=()=>{if(sel.value)location.href=datedURL(sel.value)};
 }catch(e){sel.innerHTML='<option>'+esc(currentDate)+'</option>';sel.disabled=true}
}
function renderBrief(d){
 document.title=(channel==='social'?'社媒热点':'科学期刊')+'｜'+d.date+' · 每日专业资讯简报';
 document.body.dataset.channel=channel;
 $('#overview h2').textContent=channel==='social'?'当日热点':'今日速览';
 $('#overview .sub').textContent=channel==='social'?'专业作者的观点、工具实践与值得展开的讨论。':'30 秒判断哪些内容值得展开。';
 $('.hero .lead').textContent=channel==='social'?'串联专业作者的一线观察、实践方法与行业讨论，从近期脉络看懂当日热点。':'每日精选运动科学、运动健康与 AI 的重要进展，提炼关键发现、专业判断与实践价值。';
 $('.count span').textContent=channel==='social'?'今日热点':'今日收录';
 $('#dateText').textContent=d.date;
 const fd=formatBriefDate(d.date);
 if($('#heroDate'))$('#heroDate').textContent=fd.long;
 if($('#heroWeekday'))$('#heroWeekday').textContent=fd.weekday;
 $('#signalText').textContent=d.summary.signal;
 $('#countTotal').textContent=d.summary.total;
 $('#countSport').textContent=d.summary.counts['运动科学']||0;
 $('#countHealth').textContent=d.summary.counts['运动健康']||0;
 $('#countAI').textContent=d.summary.counts['AI']||0;
 const prev=$('#prevDate'),next=$('#nextDate');
 if(d.navigation?.prev){prev.href=datedURL(d.navigation.prev);prev.classList.remove('disabled');prev.textContent='← '+d.navigation.prev}else {prev.classList.add('disabled');prev.textContent='← 上一期'}
 if(d.navigation?.next){next.href=datedURL(d.navigation.next);next.classList.remove('disabled');next.textContent=d.navigation.next+' →'}else {next.classList.add('disabled');next.textContent='下一期 →'}
 setupHistoryPicker(d.date);
 const rows=$('#summaryRows'),mobile=$('#mobileRows');
 rows.innerHTML=d.items.map(x=>'<tr data-domain="'+esc(x.domain)+'" data-search="'+esc((x.title+' '+(x.author||'')+' '+(x.platform||'')+' '+x.one_liner+' '+x.practice+' '+x.evidence).toLowerCase())+'"><td>'+badge(x.priority)+'</td><td>'+esc(displayDomain(x.domain))+'</td><td><b>'+esc(x.short_title||x.title)+'</b>'+(x.author?'<small class="summary-author">'+esc(x.author)+' · '+esc(x.platform)+'</small>':'')+'</td><td>'+esc(x.one_liner)+'</td><td>'+esc(x.practice)+'</td><td>'+esc(x.evidence)+'</td></tr>').join('');
 mobile.innerHTML=d.items.map(x=>'<div class="mobile-row" data-domain="'+esc(x.domain)+'" data-search="'+esc((x.title+' '+(x.author||'')+' '+(x.platform||'')+' '+x.one_liner+' '+x.practice+' '+x.evidence).toLowerCase())+'">'+badge(x.priority)+'<div class="mini">'+esc(x.domain)+' · '+esc(x.evidence)+'</div><b>'+esc(x.short_title||x.title)+'</b><div class="mini">'+esc(x.one_liner)+'</div></div>').join('');
 const defs=[
  ['sport','运动科学','01',d.section_notes?.['运动科学']],
  ['health','运动健康','02',d.section_notes?.['运动健康']],
  ['ai','AI','03',d.section_notes?.['AI']],
  ['global','全球重要事件','04',d.section_notes?.['全球重要事件']]
 ];
 let idx=0;
 $('#sections').innerHTML=defs.map(([id,domain,num,note])=>{
   const items=d.items.filter(x=>x.domain===domain);
   const noteText=String(note||'').replace(/^本板块重点[：:]\s*/, '');
   if(!items.length)return '';
   const cards=items.map(x=>{
      idx++;
      const supplement=typeof x.limit==='string'?x.limit.trim():'';
      const search=(x.title+' '+(x.author||'')+' '+(x.platform||'')+' '+x.one_liner+' '+x.practice+' '+x.what+' '+x.why+' '+x.limit+' '+x.evidence).toLowerCase();
      return '<article class="card" data-domain="'+esc(domain)+'" data-search="'+esc(search)+'"><div class="card-head" role="button" tabindex="0" aria-expanded="false" aria-controls="detail-'+idx+'"><div class="card-index">'+String(idx).padStart(2,'0')+'</div><div>'+badge(x.priority)+'<div class="card-title">'+esc(x.title)+'</div>'+(x.author?'<div class="card-meta"><span>'+esc(x.author)+'</span><span>'+esc(x.platform)+'</span><span>发布 '+esc(x.published_date)+'</span></div>':'')+'<div class="card-one">'+esc(x.one_liner)+'</div></div><div class="chev" aria-hidden="true">⌄</div></div><div class="card-detail" id="detail-'+idx+'" inert><div class="card-inner"><div class="card-pad"><div class="info-grid"><div class="info"><h4>发生了什么</h4><p>'+esc(x.what)+'</p></div><div class="info"><h4>为什么值得关注</h4><p>'+esc(x.why)+'</p></div><div class="info"><h4>对实践的意义</h4><p>'+esc(x.practice)+'</p></div>'+(supplement?'<div class="info"><h4>补充信息</h4><p>'+esc(supplement)+'</p></div>':'')+'</div><div class="evidence"><span>'+esc(x.evidence)+'</span><span>置信度：'+(esc(x.confidence)+(x.confidence_reason?' · '+esc(x.confidence_reason):''))+'</span></div><a class="source" href="'+esc(sourceLink(x))+'" target="_blank" rel="noopener"><span>查看原始来源</span><span>↗</span></a>'+(x.references?.length?'<div class="reference-links">'+x.references.map(r=>'<a href="'+esc(r.url)+'" target="_blank" rel="noopener">'+esc(r.label)+' ↗</a>').join('')+'</div>':'')+'</div></div></div></article>';
   }).join('');
   return '<section class="section" id="'+id+'"><div class="section-head"><span class="num">'+num+'</span><div><h2>'+domain+'</h2><p class="sub">'+esc(noteText)+'</p></div></div><div class="cards">'+cards+'</div></section>';
 }).join('');
 $('#judgmentText').innerHTML=Array.isArray(d.professional_judgment)?d.professional_judgment.map(esc).join('<br><br>'):esc(d.professional_judgment);

}
function bindBriefInteractions(){
 const cards=$$('.card');
 const setOpen=(card,open)=>{card.classList.toggle('open',open);card.querySelector('.card-head').setAttribute('aria-expanded',String(open));card.querySelector('.card-detail').inert=!open};
 cards.forEach(card=>{
  const head=card.querySelector('.card-head');
  head.addEventListener('click',()=>setOpen(card,!card.classList.contains('open')));
  head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setOpen(card,!card.classList.contains('open'))}})
 });
 $('#expandAll')?.addEventListener('click',e=>{const open=cards.some(c=>!c.classList.contains('open'));cards.forEach(c=>setOpen(c,open));e.currentTarget.textContent=open?'收起全部':'展开全部'});
 let domain='全部',query='';
 function apply(){
   const visible=x=>(domain==='全部'||x.dataset.domain===domain)&&(!query||x.dataset.search.includes(query));
   $$('#summaryRows tr,.mobile-row,.card').forEach(x=>x.classList.toggle('hidden',!visible(x)));
   $$('#sections>.section').forEach(s=>{const any=$$('.card',s).some(c=>!c.classList.contains('hidden'));s.classList.toggle('hidden',!any)});
   $('#noResults')?.classList.toggle('hidden',cards.some(c=>!c.classList.contains('hidden')));
 }
 $$('.filter-btn').forEach(b=>b.onclick=()=>{$$('.filter-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');domain=b.dataset.domain;apply()});
 $('#search').oninput=e=>{query=e.target.value.trim().toLowerCase();apply()};
 cardObserver?.disconnect();sectionObserver?.disconnect();
 const ob=cardObserver=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('show');ob.unobserve(e.target)}}),{threshold:.06});cards.forEach(c=>ob.observe(c));
 const secs=$$('.section'),links=$$('.rail a');const so=sectionObserver=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id))}),{rootMargin:'-25% 0px -65% 0px'});secs.forEach(s=>so.observe(s));
}
function renderArchive(items){
 const box=$('#archiveGrid');if(!items.length){box.innerHTML='<div class="empty panel">还没有历史简报。</div>';return}
 const latest=items[0]?.date;
 const sel=$('#archiveDateSelect');
 if(sel){
   sel.innerHTML='<option value="">选择日期…</option>'+items.map(x=>'<option value="'+esc(x.date)+'">'+esc(x.date)+(x.date===latest?' · 最新':'')+'</option>').join('');
   sel.onchange=()=>{if(sel.value)location.href=datedURL(sel.value)};
 }
 box.innerHTML=items.map(x=>{
   const highlights=(x.highlights||[]).slice(0,3).map(h=>'<li>'+esc(h)+'</li>').join('');
   return '<a class="archive-card" href="'+esc(datedURL(x.date))+'"><div class="archive-card-top"><div class="date">'+esc(x.date)+'</div>'+(x.date===latest?'<span class="latest-tag">最新</span>':'')+'</div><h3>'+esc(x.summary_title||x.title||'每日专业资讯简报')+'</h3><p>'+esc(x.signal)+'</p>'+(highlights?'<ul class="archive-highlights">'+highlights+'</ul>':'')+'<div class="archive-meta"><span>'+esc(x.total)+' 条</span><span>运动科学 '+esc(x.counts?.['运动科学']||0)+'</span><span>运动健康 '+esc(x.counts?.['运动健康']||0)+'</span><span>AI '+esc(x.counts?.['AI']||0)+'</span></div></a>';
 }).join('');
}
function setChannelUI(){
 channel=currentChannel();document.body.dataset.channel=channel;
 if($('#overview')){ $('#overview h2').textContent=channel==='social'?'当日热点':'今日速览'; $('.hero .lead').textContent=channel==='social'?'串联专业作者的一线观察、实践方法与行业讨论，从近期脉络看懂当日热点。':'每日精选运动科学、运动健康与 AI 的重要进展，提炼关键发现、专业判断与实践价值。'; $('.filter-btn[data-domain="全球重要事件"]')?.classList.toggle('hidden',channel==='social'); }
 $$('.footer a').forEach(a=>a.href=root+'/'+channelQuery());
 $$('.channel-tabs a').forEach(a=>{const active=a.dataset.channel===channel;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');const u=new URL(location.href);u.searchParams.delete('channel');if(a.dataset.channel==='social')u.searchParams.set('channel','social');u.hash='';a.href=u.href});
 $$('.archive-link,.nav-archive').forEach(a=>a.href=root+'/archive.html'+channelQuery());
 $$('.brand,.archive-tools .archive-link').forEach(a=>a.href=root+'/'+channelQuery());
 const rail=$('.railbox');if(rail){const defs=channel==='social'?[['trends','近期趋势'],['overview','当日热点'],['sport','运动科学'],['health','运动健康'],['ai','AI'],['sources','信息来源']]:[['overview','今日速览'],['sport','运动科学'],['health','运动健康'],['ai','AI'],['global','全球事件'],['judgment','专业判断']];rail.innerHTML=defs.map(([id,t])=>'<a href="#'+id+'" data-label="'+t+'"><span class="rail-dot"></span>'+t+'</a>').join('');}
 $('#trends')?.classList.toggle('hidden',channel!=='social');$('#sources')?.classList.toggle('hidden',channel!=='social');
}
async function init(){
 const version=++loadVersion;setChannelUI();window.__briefReady=false;
 $('#appError')?.classList.add('hidden');$('#noResults')?.classList.add('hidden');
 try{
  if(page==='archive'){const items=await getJSON(channelData()+'archive.json');if(version!==loadVersion)return;renderArchive(items);document.title=(channel==='social'?'社媒热点':'科学期刊')+'归档｜每日专业资讯简报';window.__briefReady=true;return;}
  let date=document.body.dataset.date||document.body.dataset.data?.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
  if(document.body.dataset.latest==='true'){const p=await getJSON(channelData()+'latest.json');date=p.latest;}
  const url=channelData()+date+'.json';
  let d;try{d=await getJSON(url)}catch(e){if(channel!=='social')throw e;if(version!==loadVersion)return;const latest=await getJSON(channelData()+'latest.json');$('#sections').innerHTML='';$('#summaryRows').innerHTML='';$('#mobileRows').innerHTML='';$('#dateText').textContent=date;$('#heroDate').textContent=formatBriefDate(date).long;$('#heroWeekday').textContent=formatBriefDate(date).weekday;$('#signalText').textContent='该日社媒热点尚未归档。';['#countTotal','#countSport','#countHealth','#countAI'].forEach(q=>$(q).textContent='—');$('#trends').innerHTML='';$('#sources').innerHTML='';$('#judgment').classList.add('hidden');$('#appError').innerHTML='该日社媒热点尚未归档。<a class="source" href="'+datedURL(latest.latest)+'">查看 '+esc(latest.latest)+' 社媒热点 →</a>';$('#appError').classList.remove('hidden');$('#prevDate').classList.add('disabled');$('#nextDate').classList.add('disabled');await setupHistoryPicker(date);window.__briefReady=true;return;}
  if(version!==loadVersion)return;
  $('#judgment').classList.remove('hidden');$('#search').value='';$$('.filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.domain==='全部'));
  renderBrief(d);
  if(channel==='social')await window.BriefSocial.render(d,root);
  if(version===loadVersion)bindBriefInteractions();
  if(version===loadVersion)window.__briefReady=true;
 }catch(e){if(version!==loadVersion)return;console.error(e);const box=$('#appError');if(box){box.textContent='简报数据载入失败，请刷新后重试。';box.classList.remove('hidden')}window.__briefError=e.message;}
}
$$('.channel-tabs a').forEach(a=>a.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();if(a.dataset.channel===channel)return;history.pushState({},'',a.href);init();}));
addEventListener('popstate',init);
addEventListener('scroll',()=>{const h=document.documentElement.scrollHeight-innerHeight;$('.progress').style.width=(h?scrollY/h*100:0)+'%';$('#toTop')?.classList.toggle('show',scrollY>650)});
$('#toTop')?.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
$('#copyLink')?.addEventListener('click',async e=>{try{await navigator.clipboard.writeText(location.href);e.currentTarget.textContent='已复制';setTimeout(()=>e.currentTarget.textContent='复制链接',1200)}catch{}});
init();
})();
