import { spawn } from 'node:child_process';
export async function launch(){
  const ch=spawn('google-chrome',['--headless=new','--remote-debugging-port=9333','--no-sandbox','--user-data-dir=/tmp/kac-chrome','--no-first-run','about:blank'],{stdio:'ignore'});
  let tgt; for(let i=0;i<50;i++){ try{ const r=await fetch('http://127.0.0.1:9333/json'); tgt=(await r.json()).find(t=>t.type==='page'); if(tgt)break;}catch{} await new Promise(r=>setTimeout(r,200)); }
  const ws=new WebSocket(tgt.webSocketDebuggerUrl); await new Promise(r=>ws.onopen=r);
  let id=0; const pend=new Map(); const events=[];
  ws.onmessage=m=>{const d=JSON.parse(m.data); if(d.id&&pend.has(d.id)){pend.get(d.id)(d);pend.delete(d.id);} else events.push(d);};
  const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setTimezoneOverride',{timezoneId:'America/Sao_Paulo'});
  await send('Page.setLifecycleEventsEnabled',{enabled:true});
  const ev=async(expr)=>{const r=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true}); return r.result?.exceptionDetails? {error:r.result.exceptionDetails.exception?.description?.split('\n')[0]} : r.result?.result?.value;};
  const nav=async(url)=>{await send('Page.navigate',{url}); await new Promise(r=>setTimeout(r,4000));};
  const errors=()=>events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>(e.params.exceptionDetails.exception?.description||e.params.exceptionDetails.text).split('\n')[0]+' @'+(e.params.exceptionDetails.url||'').split('/').pop()+':'+e.params.exceptionDetails.lineNumber);
  const dialogs=()=>events.filter(e=>e.method==='Page.javascriptDialogOpening').map(e=>e.params.message);
  const autoDialogs=()=>{ws.addEventListener('message',m=>{const d=JSON.parse(m.data); if(d.method==='Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog',{accept:true});});};
  autoDialogs();
  const close=()=>{ws.close(); ch.kill();};
  return {send,ev,nav,errors,dialogs,events,close};
}
