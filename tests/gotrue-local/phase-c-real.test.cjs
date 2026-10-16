'use strict';
// Validação da Fase C contra um GoTrue (Supabase Auth) REAL rodando localmente + Mailpit (SMTP falso). Nunca usa produção.
// Uso: GOTRUE_LOCAL_URL=http://127.0.0.1:9999 MAILPIT_URL=http://127.0.0.1:8025 node --test tests/gotrue-local/
// Sem GOTRUE_LOCAL_URL os testes são pulados (CI). Usuários fictícios em example.com. PostgREST simulado em memória.
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');
const G=process.env.GOTRUE_LOCAL_URL,MP=process.env.MAILPIT_URL||'http://127.0.0.1:8025';const skip=!G&&'GOTRUE_LOCAL_URL não definido';
const realFetch=global.fetch;
const ORG_A='aaaaaaaa-0000-4000-8000-0000000000a1',ORG_B='bbbbbbbb-0000-4000-8000-0000000000b1';
const run=crypto.randomBytes(4).toString('hex');const EA=`teste.auditoria.a.${run}@example.com`,EB=`teste.auditoria.b.${run}@example.com`;
const PW='Teste-Auditoria-'+crypto.randomBytes(6).toString('hex'),PW2=PW+'-novo';
const T={komodo_web_sessions:[],komodo_tbl_usuarios:[],kac_memberships:[{organization_id:ORG_A,user_id:'uA',role:'operator',created_at:'1'},{organization_id:ORG_B,user_id:'uB',role:'operator',created_at:'1'}],
  komodo_acessos:[{id:'va',organization_id:ORG_A,modulo:'empresarial',dia:'ter',data:'2026-10-13',hora:'10:00',nome:'TESTE AUDITORIA A',status:0},{id:'vb',organization_id:ORG_B,modulo:'empresarial',dia:'ter',data:'2026-10-13',hora:'11:00',nome:'TESTE AUDITORIA B',status:0}],
  kac_invites:[],kac_audit_log:[],kac_visit_history:[]};
function res(s,b){return{ok:s<300,status:s,text:async()=>b==null?'':JSON.stringify(b)};}
let handler,gotrueViaApp=0;
const gt=(p,o={})=>realFetch(G+p,{...o,headers:{'Content-Type':'application/json',...(o.headers||{})}});
const json=async r=>{const t=await r.text();try{return JSON.parse(t);}catch{return t;}};
async function mailFor(email,kind){for(let i=0;i<30;i++){const l=await (await realFetch(`${MP}/api/v1/search?query=${encodeURIComponent('to:'+email)}`)).json();
  for(const m of l.messages||[]){const d=await (await realFetch(`${MP}/api/v1/message/${m.ID}`)).json();const link=(String(d.Text||'')+String(d.HTML||'')).match(/https?:\/\/[^\s"'<>]*verify\?token=[^\s"'<>]*/);if(link&&link[0].replace(/&amp;/g,'&').includes('type='+kind))return {link:link[0].replace(/&amp;/g,'&'),id:m.ID};}
  await new Promise(r=>setTimeout(r,200));}return null;}
async function follow(link){const u=new URL(link);const r=await realFetch(G+u.pathname.replace(/^\/auth\/v1/,'')+u.search,{redirect:'manual'});const loc=r.headers.get('location')||'';return Object.fromEntries(new URLSearchParams(loc.split('#')[1]||''));}
function call(route,{method='GET',body={},bearer}={}){const r={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};const headers={};if(bearer)headers.authorization='Bearer '+bearer;return Promise.resolve(handler({method,query:{route:route.split('/')},body,headers},r)).then(()=>({status:r.statusCode,body:r.body?JSON.parse(r.body):null}));}
const S={};
test.before(()=>{if(skip)return;process.env.SUPABASE_URL='https://local-test.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='local-only-not-a-real-key';process.env.KAC_SUPABASE_AUTH='on';
  global.fetch=async(url,o={})=>{const u=new URL(url);if(u.hostname==='local-test.supabase.co'&&u.pathname.startsWith('/auth/v1/')){gotrueViaApp++;return realFetch(G+u.pathname.slice(8)+u.search,o);}
    if(u.hostname!=='local-test.supabase.co')return realFetch(url,o);const t=u.pathname.split('/').pop(),m=o.method||'GET';const rows=T[t];if(!rows)return res(404,{});const body=o.body?JSON.parse(o.body):null;if(m==='POST'){rows.push(...body);return res(201,null);}
    const sel=rows.filter(r=>[...u.searchParams].every(([k,v])=>['select','order','limit','and'].includes(k)||(v==='is.null'?r[k]==null:!v.startsWith('eq.')||String(r[k])===v.slice(3))));
    if(m==='PATCH'){sel.forEach(r=>Object.assign(r,body));return res(200,sel);}if(m==='DELETE'){sel.forEach(r=>rows.splice(rows.indexOf(r),1));return res(204,null);}return res(200,sel);};
  handler=require('../../api/[...route].js');});
test.after(()=>{global.fetch=realFetch;delete process.env.KAC_SUPABASE_AUTH;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;});

test('1 signup: conta criada sem confirmação; e-mail de confirmação chega no Mailpit; login antes de confirmar é recusado',{skip},async()=>{
  for(const e of [EA,EB]){const r=await gt('/signup',{method:'POST',body:JSON.stringify({email:e,password:PW})});assert.equal(r.status,200);const j=await json(r);assert.ok(!j.access_token,'sem sessão antes de confirmar');}
  const r=await gt('/token?grant_type=password',{method:'POST',body:JSON.stringify({email:EA,password:PW})});assert.equal(r.status,400);assert.equal((await json(r)).error_code,'email_not_confirmed');
  for(const e of [EA,EB]){const m=await mailFor(e,'signup');assert.ok(m,'e-mail de confirmação para '+e);const f=await follow(m.link);assert.ok(f.access_token,'link de confirmação gera sessão');}});
test('2 senha fraca e e-mail duplicado',{skip},async()=>{
  assert.equal((await gt('/signup',{method:'POST',body:JSON.stringify({email:`teste.auditoria.c.${run}@example.com`,password:'123'})})).status,422);
  const d=await json(await gt('/signup',{method:'POST',body:JSON.stringify({email:EA,password:PW})}));assert.ok(!d.access_token,'duplicado não abre sessão');});
test('3 login: senha certa → JWT válido (sub, email, aal1, exp ~1h); senha errada → invalid_credentials',{skip},async()=>{
  for(const [k,e] of [['A',EA],['B',EB]]){const j=await json(await gt('/token?grant_type=password',{method:'POST',body:JSON.stringify({email:e,password:PW})}));assert.ok(j.access_token&&j.refresh_token);S[k]=j;}
  const p=JSON.parse(Buffer.from(S.A.access_token.split('.')[1],'base64url'));assert.equal(p.sub,S.A.user.id);assert.equal(p.email,EA);assert.equal(p.aal,'aal1');assert.equal(p.role,'authenticated');assert.ok(p.exp-p.iat<=3600&&p.exp>Date.now()/1000);
  const w=await gt('/token?grant_type=password',{method:'POST',body:JSON.stringify({email:EA,password:'errada-'+PW})});assert.equal(w.status,400);assert.equal((await json(w)).error_code,'invalid_credentials');});
test('4 JWT adulterado (payload trocado) → GoTrue recusa',{skip},async()=>{
  const [h,,s]=S.A.access_token.split('.');const p=JSON.parse(Buffer.from(S.A.access_token.split('.')[1],'base64url'));p.sub=S.B.user.id;
  const forged=[h,Buffer.from(JSON.stringify(p)).toString('base64url'),s].join('.');assert.equal((await gt('/user',{headers:{Authorization:'Bearer '+forged}})).status,403);});
test('5 app (flag ON local): sem vínculo → 401; vinculado → só a própria org; IDOR bloqueado',{skip},async()=>{
  assert.equal((await call('visitantes/empresarial',{bearer:S.A.access_token})).status,401,'identidade sem usuário local');
  T.komodo_tbl_usuarios.push({id:'uA',email:EA,papel:'operador',auth_user_id:S.A.user.id},{id:'uB',email:EB,papel:'operador',auth_user_id:S.B.user.id});
  const a=await call('visitantes/empresarial',{bearer:S.A.access_token});assert.equal(a.status,200);assert.deepEqual(a.body.data.map(x=>x.id),['va']);
  const b=await call('visitantes/empresarial',{bearer:S.B.access_token});assert.deepEqual(b.body.data.map(x=>x.id),['vb']);
  assert.equal((await call('visitantes/va/status',{method:'PUT',body:{status:2},bearer:S.B.access_token})).status,404);assert.equal(T.komodo_acessos.find(x=>x.id==='va').status,0);
  assert.ok(gotrueViaApp>=3,'o app validou os tokens no GoTrue real');});
test('6 refresh token gira; logout revoga refresh',{skip},async()=>{
  const r=await json(await gt('/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:S.B.refresh_token})}));assert.ok(r.access_token&&r.refresh_token!==S.B.refresh_token);
  assert.equal((await gt('/logout',{method:'POST',headers:{Authorization:'Bearer '+r.access_token}})).status,204);
  assert.equal((await gt('/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:r.refresh_token})})).status,400,'refresh revogado após logout');});
test('7 recuperação de senha: e-mail no Mailpit → link → nova senha; senha antiga deixa de valer; link é de uso único',{skip},async()=>{
  assert.equal((await gt('/recover',{method:'POST',body:JSON.stringify({email:EA})})).status,200);
  assert.equal((await gt('/recover',{method:'POST',body:JSON.stringify({email:`inexistente.${run}@example.com`})})).status,200,'não revela se o e-mail existe');
  const m=await mailFor(EA,'recovery');assert.ok(m,'e-mail de recuperação');const f=await follow(m.link);assert.ok(f.access_token);assert.equal(f.type,'recovery');
  assert.equal((await gt('/user',{method:'PUT',headers:{Authorization:'Bearer '+f.access_token},body:JSON.stringify({password:PW2})})).status,200);
  assert.equal((await gt('/token?grant_type=password',{method:'POST',body:JSON.stringify({email:EA,password:PW})})).status,400);
  assert.equal((await gt('/token?grant_type=password',{method:'POST',body:JSON.stringify({email:EA,password:PW2})})).status,200);
  assert.ok(!(await follow(m.link)).access_token,'link reutilizado não abre sessão');});
test('8 e-mails não vazam segredos (sem senha no corpo)',{skip},async()=>{const l=await (await realFetch(`${MP}/api/v1/search?query=${encodeURIComponent('to:'+EA)}`)).json();assert.ok(l.messages.length>=2);
  for(const m of l.messages){const d=await (await realFetch(`${MP}/api/v1/message/${m.ID}`)).json();assert.ok(!String(d.Text+d.HTML).includes(PW)&&!String(d.Text+d.HTML).includes(PW2));}});
