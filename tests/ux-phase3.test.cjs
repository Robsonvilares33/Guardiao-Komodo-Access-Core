'use strict';
// UX fase 3 — item 9 (tela de administração, cliente) e item 10 (PWA: manifest, SW só shell, aviso offline, atualização segura).
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const src=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function loadSW(){const L={};const store=new Map();let skipped=false;
  const caches={open:async()=>({put:async(k,r)=>{store.set(typeof k==='string'?k:new URL(k.url).pathname,r);},match:async k=>store.get(k)}),match:async k=>store.get(k),keys:async()=>['kac-shell-old','outro-app'],delete:async k=>{store.set('deleted:'+k,1);return true;}};
  const self={location:{origin:'https://app.test'},addEventListener:(t,f)=>{L[t]=f;},skipWaiting:()=>{skipped=true;},clients:{claim:async()=>{}}};
  const ctx={self,caches,URL,Promise,Response:{error:()=>'RESPONSE_ERROR'},fetch:async()=>{throw new Error('offline');},console};vm.createContext(ctx);vm.runInContext(src('sw.js'),ctx);
  return {L,store,ctx,skipped:()=>skipped};}
function ev(url,o={}){let resp=null;return {request:{url:'https://app.test'+url,method:o.method||'GET',mode:o.mode||'cors'},respondWith(p){resp=p;},get resp(){return resp;}};}
test('SW: /api, POST, outros domínios e query em estático NUNCA passam pelo cache',()=>{const {L}=loadSW();
  for(const [u,o] of [['/api/visitantes',{}],['/api/auth/supabase/me',{}],['/index.html',{method:'POST'}],['/src/ui/init.js?x=1',{}]]){const e=ev(u,o);L.fetch(e);assert.equal(e.resp,null,u);}
  const x={request:{url:'https://hcq.supabase.co/auth/v1/user',method:'GET'},respondWith(){throw new Error('não deveria');}};L.fetch(x);});
test('SW: não guarda respostas no-store, privadas, com cookie, redirecionadas ou com erro',async()=>{const {L,store,ctx}=loadSW();
  const mk=(st,h={},extra={})=>({status:st,type:'basic',redirected:false,headers:{get:k=>h[k]||null},clone(){return this;},...extra});
  for(const r of [mk(200,{'Cache-Control':'no-store'}),mk(200,{'Cache-Control':'private, max-age=0'}),mk(200,{'Set-Cookie':'a=b'}),mk(500),mk(200,{},{redirected:true}),mk(200,{},{type:'opaque'})]){
    store.clear();ctx.fetch=async()=>r;const e=ev('/src/ui/init.js');L.fetch(e);await e.resp;await new Promise(s=>setTimeout(s,5));assert.equal(store.size,0);}
  ctx.fetch=async()=>mk(200);const e=ev('/src/ui/init.js');L.fetch(e);await e.resp;await new Promise(s=>setTimeout(s,5));assert.ok(store.has('/src/ui/init.js'));});
test('SW: página offline cai no shell guardado; atualização só com SKIP_WAITING; limpa só caches antigos do próprio app',async()=>{const {L,store,skipped}=loadSW();store.set('/residencial.html','SHELL');
  const e=ev('/residencial.html',{mode:'navigate'});L.fetch(e);assert.equal(await e.resp,'SHELL');
  assert.equal(skipped(),false);L.message({data:{type:'outra'}});assert.equal(skipped(),false);L.message({data:{type:'SKIP_WAITING'}});assert.equal(skipped(),true);
  let w;L.activate({waitUntil:p=>{w=p;}});await w;assert.ok(store.has('deleted:kac-shell-old'));assert.ok(!store.has('deleted:outro-app'));
  assert.ok(!/skipWaiting\(\)\s*;?\s*\}\s*\)\s*;?\s*\n\s*self\.addEventListener\('activate'/.test(src('sw.js')));assert.ok(!/addEventListener\('install'[^]*skipWaiting/.test(src('sw.js').split("addEventListener('activate'")[0]));});
test('SW: lista do shell não contém API nem dados',()=>{const s=src('sw.js');const shell=s.match(/var SHELL = \[([^\]]+)\]/)[1];assert.ok(!/api/i.test(shell));});
test('manifest: instalável (nome, start_url, standalone, ícones 192/512 + maskable existentes)',()=>{const m=JSON.parse(src('manifest.webmanifest'));assert.equal(m.display,'standalone');assert.equal(m.start_url,'/index.html');assert.ok(m.name&&m.short_name);
  const sizes=m.icons.map(i=>i.sizes);assert.ok(sizes.includes('192x192')&&sizes.includes('512x512'));assert.ok(m.icons.some(i=>i.purpose==='maskable'));for(const i of m.icons)assert.ok(fs.existsSync(path.join(__dirname,'..',i.src)),i.src);});
test('páginas: manifest, theme-color, PwaShell; vercel: sw.js no-cache, manifest-src',()=>{for(const p of ['index.html','residencial.html','login.html','auth.html']){const h=src(p);assert.match(h,/<link rel="manifest" href="\/manifest.webmanifest" crossorigin="use-credentials">/);assert.match(h,/name="theme-color"/);assert.match(h,/src\/ui\/PwaShell\.js/);}
  const v=JSON.parse(src('vercel.json'));assert.ok(v.headers.some(h=>h.source==='/sw.js'&&h.headers.some(x=>x.value==='no-cache')));assert.match(JSON.stringify(v),/manifest-src 'self'/);});
function fakeDoc(){const els={};const mk=(tag)=>({tag,children:[],attrs:{},hidden:false,className:'',textContent:'',listeners:{},appendChild(c){this.children.push(c);return c;},setAttribute(k,v){this.attrs[k]=v;},addEventListener(t,f){this.listeners[t]=f;},querySelector(s){return s==='button'?this.children.find(c=>c.tag==='button')||null:null;}});
  const doc={readyState:'complete',body:mk('body'),createElement:mk,getElementById:id=>els[id]||null,addEventListener(){}};doc.body.appendChild=function(c){els[c.id]=c;this.children.push(c);return c;};return {doc,els};}
test('PwaShell: aviso offline acessível; atualização só recarrega após clique em Atualizar',async()=>{const {doc,els}=fakeDoc();const L={};let reloaded=0,posted=null,regL={},swL={};
  const waiting={postMessage(m){posted=m;}};const reg={waiting,addEventListener(t,f){regL[t]=f;}};
  const win={fetch:async()=>({ok:true}),document:doc,navigator:{onLine:false,serviceWorker:{controller:{},register:async()=>reg,addEventListener(t,f){swL[t]=f;}}},location:{protocol:'https:',reload(){reloaded++;}},addEventListener(t,f){L[t]=f;}};
  const ctx={window:win,globalThis:win,Promise,console};vm.createContext(ctx);vm.runInContext(src('src/ui/PwaShell.js'),ctx);await new Promise(s=>setTimeout(s,5));
  assert.equal(els.pwaOffline.hidden,false);assert.equal(els.pwaOffline.attrs.role,'status');assert.match(els.pwaOffline.children[0].textContent,/não são salvos no aparelho/);
  win.navigator.onLine=true;L.online();await new Promise(s=>setTimeout(s,5));assert.equal(els.pwaOffline.hidden,true);
  assert.equal(els.pwaUpdate.hidden,false);swL.controllerchange();assert.equal(reloaded,0,'não recarrega sozinho');
  els.pwaUpdate.children.find(c=>c.tag==='button'&&c.textContent==='Atualizar').listeners.click();assert.deepEqual(JSON.parse(JSON.stringify(posted)),{type:'SKIP_WAITING'});swL.controllerchange();assert.equal(reloaded,1);});
test('admin UI: abas acessíveis, sem innerHTML, rótulos, convite consolidado; cliente só aceita rotas /admin/*',async()=>{const h=src('auth.html');assert.match(h,/<section id="secAdmin"/);assert.equal((h.match(/role="tab"/g)||[]).length,4);for(const t of ['equipe','empresa','seguranca','auditoria'])assert.match(h,new RegExp(`id="pan-${t}" aria-labelledby="tab-${t}"`));
  for(const id of ['orgNameIn','orgCnpj','orgTz','orgKind'])assert.match(h,new RegExp(`<label for="${id}"`));const i=h.indexOf('id="secAdmin"');assert.ok(h.indexOf('id="formInvite"')>i,'convite dentro da administração');
  const js=src('src/ui/AdminConsole.js');assert.ok(!/innerHTML/.test(js));assert.match(js,/ArrowRight/);
  require('../src/ui/SupabaseAuthClient.js');const c=globalThis.SupabaseAuthClient.create({fetch:async()=>{throw new Error('não deveria');}});await assert.rejects(c.admin('/convites'),/Rota inválida/);await assert.rejects(c.admin('/admin/../x'),/Rota inválida/);
  require('../src/ui/AdminConsole.js');const cm=globalThis.AdminConsole.canManage;assert.ok(!cm('admin','owner'));assert.ok(!cm('admin','operator','admin'));assert.ok(cm('owner','admin','viewer'));});

test('SW (correção E2E): rede primeiro também para JS/CSS — com rede nunca serve versão velha do cache',async()=>{const {L,store,ctx}=loadSW();store.set('/src/ui/auth-init.js','VELHO');
  const fresh={status:200,type:'basic',redirected:false,headers:{get:()=>null},clone(){return this;},body:'NOVO'};ctx.fetch=async()=>fresh;const e=ev('/src/ui/auth-init.js');L.fetch(e);assert.equal((await e.resp).body,'NOVO');
  ctx.fetch=async()=>{throw new Error('off');};const e2=ev('/src/ui/nao-guardado.js');L.fetch(e2);assert.equal(await e2.resp,'RESPONSE_ERROR','sem cache e sem rede → Response.error, sem exceção');
  assert.match(src('sw.js'),/credentials: 'same-origin'/);assert.ok(!/credentials: 'omit'/.test(src('sw.js')));});
test('login offline: não trava em "Verificando sistema"; avisa e dispara o aviso PWA; ApiService com timeout',()=>{const js=src('src/ui/login-init.js');assert.match(js,/SEM CONEXÃO/);assert.match(js,/navigator\.onLine === false/);assert.match(js,/kac:offline/);assert.match(js,/try \{ hasAdmin = await/);
  assert.match(src('src/services/ApiService.js'),/AbortController/);assert.match(src('src/ui/PwaShell.js'),/\/api\/health/);for(const f of ['main.css','login.css','auth.css'])assert.match(src('src/ui/styles/'+f),/\.pwa-bar\{[^}]*z-index:2147483000/);});
test('login retoma sessão de cookie numa aba nova (novo login → Abrir o sistema → index direto)',()=>{const js=src('src/ui/login-init.js');assert.match(js,/apiService\.get\('\/auth\/sessao'\)/);});
test('MFA: QR com falha de carga some e orienta a usar a chave (sem ícone quebrado)',()=>{assert.match(src('src/ui/auth-init.js'),/img\.onerror = function \(\) \{ img\.removeAttribute\('src'\); img\.hidden = true;/);});
