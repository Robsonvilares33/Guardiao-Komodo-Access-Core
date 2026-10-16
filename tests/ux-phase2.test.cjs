'use strict';
// UX fase 2: (5) Chegou/Saiu com "from" + desfazer auditado, (backlog) nome da empresa da própria sessão, (6)(7) HTML/CSS.
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');const fs=require('node:fs');const path=require('node:path');
const handler=require('../api/[...route].js');const originalFetch=global.fetch;
process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
const ORG_A='aaaaaaaa-0000-4000-8000-000000000001',ORG_B='bbbbbbbb-0000-4000-8000-000000000001';const tok=c=>c.repeat(43),h=t=>crypto.createHash('sha256').update(t).digest('hex');
const T={komodo_web_sessions:[{token_hash:h(tok('A')),user_id:'ua',expires_at:'2099-01-01T00:00:00Z'},{token_hash:h(tok('B')),user_id:'ub',expires_at:'2099-01-01T00:00:00Z'},{token_hash:h(tok('N')),user_id:'un',expires_at:'2099-01-01T00:00:00Z'}],
  komodo_tbl_usuarios:[{id:'ua',email:'a@example.com',papel:'operador'},{id:'ub',email:'b@example.com',papel:'operador'},{id:'un',email:'n@example.com',papel:'operador'}],
  kac_memberships:[{organization_id:ORG_A,user_id:'ua',role:'operator',created_at:'1'},{organization_id:ORG_B,user_id:'ub',role:'operator',created_at:'1'}],
  kac_organizations:[{id:ORG_A,name:'TESTE AUDITORIA Empresa A',cnpj:'11222333000181'},{id:ORG_B,name:'TESTE AUDITORIA Empresa B'}],kac_audit_log:[],kac_visit_history:[],
  komodo_acessos:[{id:'va1',organization_id:ORG_A,modulo:'empresarial',dia:'ter',data:'2026-10-13',hora:'10:00',nome:'TESTE AUDITORIA A',status:0},{id:'vb1',organization_id:ORG_B,modulo:'empresarial',dia:'ter',data:'2026-10-13',hora:'11:00',nome:'TESTE AUDITORIA B',status:0}]};
function res(s,b){return{ok:s<300,status:s,text:async()=>b==null?'':JSON.stringify(b)};}
global.fetch=async(url,o={})=>{const u=new URL(url),t=u.pathname.split('/').pop(),m=o.method||'GET';const rows=T[t];if(!rows)return res(404,{});const body=o.body?JSON.parse(o.body):null;if(m==='POST'){rows.push(...body);return res(201,null);}
  const sel=rows.filter(r=>[...u.searchParams].every(([k,v])=>!v.startsWith('eq.')||['select','order','limit','and'].includes(k)||String(r[k])===v.slice(3)));if(m==='PATCH'){sel.forEach(r=>Object.assign(r,body));return res(200,sel);}return res(200,sel);};
test.after(()=>{global.fetch=originalFetch;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;});
function call(who,route,method='GET',body={}){const r={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};const headers=who?{cookie:'kac_session='+tok(who)}:{};return Promise.resolve(handler({method,query:{route:route.split('/')},body,headers},r)).then(()=>({status:r.statusCode,body:r.body?JSON.parse(r.body):null}));}
const va=()=>T.komodo_acessos.find(r=>r.id==='va1');const lastAudit=()=>T.kac_audit_log.at(-1);
test('5 Chegou (0→1) com from: grava, audita {status,from}',async()=>{const r=await call('A','visitantes/va1/status','PUT',{status:1,from:0});assert.equal(r.status,200);assert.equal(va().status,1);assert.deepEqual(lastAudit().meta,{status:1,from:0});assert.equal(lastAudit().organization_id,ORG_A);});
test('5 from desatualizado → 409 status_changed, nada sobrescrito',async()=>{const r=await call('A','visitantes/va1/status','PUT',{status:2,from:0});assert.equal(r.status,409);assert.equal(r.body.code,'status_changed');assert.equal(va().status,1);});
test('5 desfazer (1→0, undo) também auditado com undo:true',async()=>{const r=await call('A','visitantes/va1/status','PUT',{status:0,from:1,undo:true});assert.equal(r.status,200);assert.equal(va().status,0);assert.deepEqual(lastAudit().meta,{status:0,from:1,undo:true});});
test('5 compatível: sem from continua funcionando; from inválido → 422; outra org → 404 (sem vazar)',async()=>{assert.equal((await call('A','visitantes/va1/status','PUT',{status:1})).status,200);assert.equal((await call('A','visitantes/va1/status','PUT',{status:2,from:9})).status,422);
  const r=await call('A','visitantes/vb1/status','PUT',{status:1,from:0});assert.equal(r.status,404);assert.equal(T.komodo_acessos.find(x=>x.id==='vb1').status,0);});
test('cabeçalho: /organizacao devolve só o nome da PRÓPRIA org; sem sessão 401; sem org 403; só GET',async()=>{const a=await call('A','organizacao');assert.equal(a.status,200);assert.deepEqual(a.body.data,{name:'TESTE AUDITORIA Empresa A'});assert.ok(!JSON.stringify(a.body).includes('cnpj')&&!JSON.stringify(a.body).includes('11222333'));
  assert.deepEqual((await call('B','organizacao')).body.data,{name:'TESTE AUDITORIA Empresa B'});assert.equal((await call(null,'organizacao')).status,401);assert.equal((await call('N','organizacao')).status,403);assert.equal((await call('A','organizacao','POST')).status,405);});
// VisitStatus no front
const VS=require('../src/ui/VisitStatus.js');
test('5 VisitStatus: rótulos e próxima ação; Saiu é final',()=>{assert.equal(VS.next(0),1);assert.equal(VS.next(1),2);assert.equal(VS.next(2),null);assert.deepEqual(VS.LABEL,['Agendado','Na portaria','Saiu']);assert.equal(VS.UNDO_MS,5000);});
test('5 VisitStatus.advance: envia from; toast com Desfazer; desfazer envia undo; 409 não altera',async()=>{const calls=[];let undo=null;const toasts=[];const orig=VS.toast;VS.toast=(t,u)=>{toasts.push(t);undo=u;return{hide(){}}};
  // advance usa o toast do próprio módulo: substitui via closure exportada
  global.window=undefined;const repo={updateStatus:async(id,s,o)=>{calls.push([id,s,o]);}};let reloads=0;const reload=async()=>{reloads++;};
  // Reexecuta o módulo com document falso para capturar o toast real
  const vm=require('node:vm');const elems=[];const fakeDoc={getElementById:()=>null,createElement:t=>{const e={tagName:t,children:[],attrs:{},setAttribute(k,v){this.attrs[k]=v;},appendChild(c){this.children.push(c);},addEventListener(ev,fn){this.onclick=fn;},set textContent(v){this._t=v;if(v==='')this.children=[];},get textContent(){return this._t;}};elems.push(e);return e;},body:{appendChild(){}}};
  const ctx={document:fakeDoc,setTimeout:(fn,ms)=>({fn,ms}),clearTimeout(){},module:{exports:{}}};ctx.globalThis=ctx;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/ui/VisitStatus.js'),'utf8'),ctx);const V=ctx.module.exports;
  const reg={id:'v1',nome:'Fulano',status:0};assert.equal(await V.advance(reg,repo,reload),1);assert.equal(JSON.stringify(calls[0]),JSON.stringify(['v1',1,{from:0}]));assert.equal(reg.status,1);
  const undoBtn=elems.find(e=>e._t==='Desfazer');assert.ok(undoBtn,'botão Desfazer');await undoBtn.onclick();assert.equal(JSON.stringify(calls[1]),JSON.stringify(['v1',0,{from:1,undo:true}]));assert.equal(reg.status,0);
  const bad={updateStatus:async()=>{const e=new Error('x');e.status=409;throw e;}};const r2={id:'v2',status:1};assert.equal(await V.advance(r2,bad,reload),null);assert.equal(r2.status,1);assert.ok(reloads>=3);
  assert.equal(await V.advance({id:'v3',status:2},repo,reload),null);VS.toast=orig;});
const src=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('6/7/cabeçalho: HTML e CSS',()=>{for(const p of ['index.html','residencial.html']){const s=src(p);
  assert.match(s,/<nav class="bottom-nav" aria-label="Navegação principal">/);for(const a of ['agenda','search','new','dashboard','pdf','config','logout'])assert.match(s,new RegExp(`data-nav="${a}"`),p+a);
  assert.match(s,/<span id="orgName" class="org-name" hidden><\/span>/);assert.ok((s.match(/<details class="opt-section"><summary>[^<]+\(opcional\)<\/summary>/g)||[]).length>=4,p);
  const nm=s.indexOf('data-field="nome"'),firstOpt=s.indexOf('class="opt-section"');assert.ok(nm>0&&nm<firstOpt,p+': nome antes das seções opcionais');}
  const css=src('src/ui/styles/main.css');assert.match(css,/\.bottom-nav \{ display: none; \}/);assert.match(css,/@media \(max-width: 768px\) \{\r?\n  \.bottom-nav \{ display: flex;/);assert.match(css,/\.btn-status-next \{ min-height: 44px;/);
  const js=src('src/ui/MobileShell.js')+src('src/ui/VisitStatus.js');assert.ok(!/innerHTML|insertAdjacentHTML|eval\(/.test(js));assert.match(src('src/ui/MobileShell.js'),/el\.textContent = n/);});
test('MobileShell: só busca o nome no modo servidor com sessão; falha silenciosa',async()=>{const vm=require('node:vm');const el={hidden:true,textContent:'',title:''};let gets=0;
  const mk=(remote,auth,resp)=>({document:{readyState:'complete',getElementById:id=>id==='orgName'?el:null,querySelector:()=>null,querySelectorAll:()=>[]},authService:{isRemoteMode:()=>remote,isAuthenticated:()=>auth},apiService:{get:async()=>{gets++;if(resp instanceof Error)throw resp;return resp;}},MutationObserver:function(){this.observe=()=>{};},module:{exports:{}}});
  let c=mk(false,true,{name:'X'});c.globalThis=c;vm.runInNewContext(src('src/ui/MobileShell.js'),c);await c.module.exports.orgName();assert.equal(gets,0);
  c=mk(true,true,{name:'TESTE AUDITORIA Empresa A'});c.globalThis=c;vm.runInNewContext(src('src/ui/MobileShell.js'),c);await c.module.exports.orgName();assert.equal(el.textContent,'TESTE AUDITORIA Empresa A');assert.equal(el.hidden,false);
  const el2={hidden:true,textContent:''};c=mk(true,true,new Error('500'));c.document.getElementById=()=>el2;c.globalThis=c;vm.runInNewContext(src('src/ui/MobileShell.js'),c);await c.module.exports.orgName();assert.equal(el2.hidden,true);});
