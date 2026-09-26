(() => {
const $=(q,c=document)=>c.querySelector(q), $$=(q,c=document)=>[...c.querySelectorAll(q)];
const root=document.body.dataset.root||'.';
const page=document.body.dataset.page||'brief';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badgeClass=p=>p==='重点关注'?'high':p==='值得了解'?'mid':'fast';
const setTheme=()=>{const saved=localStorage.getItem('brief-theme');if(saved)document.documentElement.dataset.theme=saved};
setTheme();
$('#themeToggle')?.addEventListener('click',()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;localStorage.setItem('brief-theme',n)});
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
   const items=await getJSON(root+'/data/archive.json');
   const latest=items[0]?.date;
   sel.innerHTML=items.map(x=>'<option value="'+esc(x.date)+'">'+esc(x.date)+(x.date===latest?' · 最新':'')+'</option>').join('');
   sel.value=currentDate;
   sel.onchange=()=>{if(sel.value)location.href=root+'/briefs/'+sel.value+'/'};
 }catch(e){sel.innerHTML='<option>'+esc(currentDate)+'</option>';sel.disabled=true}
}
function renderBrief(d){
 document.title='每日专业资讯简报｜'+d.date;
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
 if(d.navigation?.prev){prev.href=root+'/briefs/'+d.navigation.prev+'/';prev.classList.remove('disabled');prev.textContent='← '+d.navigation.prev}else prev.classList.add('disabled');
 if(d.navigation?.next){next.href=root+'/briefs/'+d.navigation.next+'/';next.classList.remove('disabled');next.textContent=d.navigation.next+' →'}else next.classList.add('disabled');
 setupHistoryPicker(d.date);
 const rows=$('#summaryRows'),mobile=$('#mobileRows');
 rows.innerHTML=d.items.map(x=>'<tr data-domain="'+esc(x.domain)+'" data-search="'+esc((x.title+' '+x.one_liner+' '+x.practice+' '+x.evidence).toLowerCase())+'"><td>'+badge(x.priority)+'</td><td>'+esc(displayDomain(x.domain))+'</td><td><b>'+esc(x.short_title||x.title)+'</b></td><td>'+esc(x.one_liner)+'</td><td>'+esc(x.practice)+'</td><td>'+esc(x.evidence)+'</td></tr>').join('');
 mobile.innerHTML=d.items.map(x=>'<div class="mobile-row" data-domain="'+esc(x.domain)+'" data-search="'+esc((x.title+' '+x.one_liner+' '+x.practice+' '+x.evidence).toLowerCase())+'">'+badge(x.priority)+'<div class="mini">'+esc(x.domain)+' · '+esc(x.evidence)+'</div><b>'+esc(x.short_title||x.title)+'</b><div class="mini">'+esc(x.one_liner)+'</div></div>').join('');
 const defs=[
  ['sport','运动科学','01',d.section_notes?.['运动科学']],
  ['health','运动健康','02',d.section_notes?.['运动健康']],
  ['ai','AI','03',d.section_notes?.['AI']],
  ['global','全球重要事件','04',d.section_notes?.['全球重要事件']]
 ];
 let idx=0;
 $('#sections').innerHTML=defs.map(([id,domain,num,note])=>{
   const items=d.items.filter(x=>x.domain===domain);
   if(!items.length)return '';
   const cards=items.map(x=>{
      idx++;
      const search=(x.title+' '+x.one_liner+' '+x.practice+' '+x.what+' '+x.why+' '+x.limit+' '+x.evidence).toLowerCase();
      return '<article class="card" data-domain="'+esc(domain)+'" data-search="'+esc(search)+'"><div class="card-head" role="button" tabindex="0" aria-expanded="false" aria-controls="detail-'+idx+'"><div class="card-index">'+String(idx).padStart(2,'0')+'</div><div>'+badge(x.priority)+'<div class="card-title">'+esc(x.title)+'</div><div class="card-one">'+esc(x.one_liner)+'</div></div><div class="chev" aria-hidden="true">⌄</div></div><div class="card-detail" id="detail-'+idx+'" inert><div class="card-inner"><div class="card-pad"><div class="info-grid"><div class="info"><h4>发生了什么</h4><p>'+esc(x.what)+'</p></div><div class="info"><h4>为什么值得关注</h4><p>'+esc(x.why)+'</p></div><div class="info"><h4>对实践的意义</h4><p>'+esc(x.practice)+'</p></div><div class="info warn"><h4>关键限制 / 不要误读</h4><p>'+esc(x.limit)+'</p></div></div><div class="evidence"><span>'+esc(x.evidence)+'</span><span>置信度：'+esc(x.confidence)+'</span></div><a class="source" href="'+esc(sourceLink(x))+'" target="_blank" rel="noopener"><span>查看原始来源</span><span>↗</span></a></div></div></div></article>';
   }).join('');
   return '<section class="section" id="'+id+'"><div class="section-head"><span class="num">'+num+'</span><div><h2>'+domain+'</h2><p class="sub">'+esc(note||'')+'</p></div></div><div class="section-intro"><b>本板块重点：</b>'+esc(note||'')+'</div><div class="cards">'+cards+'</div></section>';
 }).join('');
 $('#judgmentText').innerHTML=esc(d.professional_judgment);
 bindBriefInteractions();
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
   $$('.section').forEach(s=>{if(['overview','judgment'].includes(s.id))return;const any=$$('.card',s).some(c=>!c.classList.contains('hidden'));s.classList.toggle('hidden',!any)});
 }
 $$('.filter-btn').forEach(b=>b.addEventListener('click',()=>{$$('.filter-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');domain=b.dataset.domain;apply()}));
 $('#search')?.addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();apply()});
 const ob=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('show');ob.unobserve(e.target)}}),{threshold:.06});cards.forEach(c=>ob.observe(c));
 const secs=$$('.section'),links=$$('.rail a');const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id))}),{rootMargin:'-25% 0px -65% 0px'});secs.forEach(s=>so.observe(s));
}
function renderArchive(items){
 const box=$('#archiveGrid');if(!items.length){box.innerHTML='<div class="empty panel">还没有历史简报。</div>';return}
 const latest=items[0]?.date;
 const sel=$('#archiveDateSelect');
 if(sel){
   sel.innerHTML='<option value="">选择日期…</option>'+items.map(x=>'<option value="'+esc(x.date)+'">'+esc(x.date)+(x.date===latest?' · 最新':'')+'</option>').join('');
   sel.onchange=()=>{if(sel.value)location.href=root+'/briefs/'+sel.value+'/'};
 }
 box.innerHTML=items.map(x=>{
   const highlights=(x.highlights||[]).slice(0,3).map(h=>'<li>'+esc(h)+'</li>').join('');
   return '<a class="archive-card" href="'+root+'/briefs/'+esc(x.date)+'/"><div class="archive-card-top"><div class="date">'+esc(x.date)+'</div>'+(x.date===latest?'<span class="latest-tag">最新</span>':'')+'</div><h3>'+esc(x.summary_title||x.title||'每日专业资讯简报')+'</h3><p>'+esc(x.signal)+'</p>'+(highlights?'<ul class="archive-highlights">'+highlights+'</ul>':'')+'<div class="archive-meta"><span>'+esc(x.total)+' 条</span><span>运动科学 '+esc(x.counts?.['运动科学']||0)+'</span><span>运动健康 '+esc(x.counts?.['运动健康']||0)+'</span><span>AI '+esc(x.counts?.['AI']||0)+'</span></div></a>';
 }).join('');
}
async function init(){
 try{
  if(page==='archive'){renderArchive(await getJSON(root+'/data/archive.json'));return}
  let url=document.body.dataset.data;
  if(document.body.dataset.latest==='true'){const p=await getJSON(root+'/data/latest.json');url=root+'/'+p.url}
  renderBrief(await getJSON(url));
 }catch(e){console.error(e);$('#appError')?.classList.remove('hidden')}
}
addEventListener('scroll',()=>{const h=document.documentElement.scrollHeight-innerHeight;$('.progress').style.width=(h?scrollY/h*100:0)+'%';$('#toTop')?.classList.toggle('show',scrollY>650)});
$('#toTop')?.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
$('#copyLink')?.addEventListener('click',async e=>{try{await navigator.clipboard.writeText(location.href);e.currentTarget.textContent='已复制';setTimeout(()=>e.currentTarget.textContent='复制链接',1200)}catch{}});
init();
})();
