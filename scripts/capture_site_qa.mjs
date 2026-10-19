import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';

const output='/tmp/brief-column-qa';
await mkdir(output,{recursive:true});
const cases=[
 ['journal-desktop',1440,1100,'/?qa=1'],
 ['social-desktop',1440,1100,'/?qa=1&channel=social'],
 ['social-mobile',390,1000,'/?qa=1&channel=social'],
 ['social-dark',1440,1100,'/?qa=1&channel=social&dark=1'],
 ['social-archive',1440,1000,'/archive.html?qa=1&channel=social'],
 ['missing-social-date',390,900,'/briefs/2026-10-18/?qa=1&channel=social']
];
const pause=ms=>new Promise(r=>setTimeout(r,ms));

for(const [name,width,height,path] of cases){
 const chrome=spawn('google-chrome',['--headless','--no-sandbox','--disable-gpu','--hide-scrollbars','--disable-dev-shm-usage','--remote-debugging-pipe','about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe']});
 let seq=0,buffer='',stderr='';const pending=new Map();
 chrome.stderr.on('data',b=>stderr+=b);
 chrome.stdio[4].on('data',b=>{
  buffer+=b.toString();let at;
  while((at=buffer.indexOf('\0'))!==-1){
   const raw=buffer.slice(0,at);buffer=buffer.slice(at+1);if(!raw)continue;
   const m=JSON.parse(raw),p=pending.get(m.id);
   if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}
  }
 });
 const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
  const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method))},15000);
  pending.set(id,{resolve,reject,timer});chrome.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');
 });
 try{
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const cmd=(m,p={})=>send(m,p,sessionId);
  await cmd('Page.enable');await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
  await cmd('Page.navigate',{url:'http://127.0.0.1:8765'+path});
  let status;
  for(let i=0;i<300;i++){
   const r=await cmd('Runtime.evaluate',{expression:'JSON.stringify({qa:document.body?.dataset.qa,error:document.body?.dataset.qaError})',returnByValue:true});
   status=JSON.parse(r.result.value||'{}');
   if(status.qa==='fail')throw Error(status.error);
   if(status.qa==='pass')break;
   await pause(100);
  }
  if(status?.qa!=='pass')throw Error('QA did not finish');
  await pause(250);
  const metrics=await cmd('Runtime.evaluate',{expression:'JSON.stringify({scrollY,viewport:{width:innerWidth,height:innerHeight},nav:document.querySelector(".site-nav").getBoundingClientRect().toJSON(),trend:document.querySelector("#trends")?.getBoundingClientRect().toJSON(),heat:document.querySelector(".heat-scroll")?.getBoundingClientRect().toJSON(),heatScroll:document.querySelector(".heat-scroll")?.scrollWidth})',returnByValue:true});
  await writeFile(output+'/'+name+'.json',metrics.result.value);
  const shot=await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
  await writeFile(output+'/'+name+'.png',Buffer.from(shot.data,'base64'));
  // Also retain a full page image without modifying the delivered site layout.
  const layout=await cmd('Page.getLayoutMetrics');
  const full=await cmd('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:true,clip:{x:0,y:0,width,height:Math.ceil(layout.cssContentSize.height),scale:1}});
  await writeFile(output+'/'+name+'-full.png',Buffer.from(full.data,'base64'));
  console.log('PASS:',name,metrics.result.value);
 }finally{
  await writeFile(output+'/'+name+'.log',stderr);chrome.kill('SIGTERM');
 }
}
