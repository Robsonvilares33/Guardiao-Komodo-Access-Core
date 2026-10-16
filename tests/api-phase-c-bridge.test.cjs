'use strict';
// Fase C (Supabase Auth) — atrás do flag KAC_SUPABASE_AUTH. Mock do GoTrue (/auth/v1/user) e do PostgREST.
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');
const handler=require('../api/[...route].js');const SA=require('../lib/supabase-auth.cjs');const originalFetch=global.fetch;
process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
const ORG_A='aaaaaaaa-0000-4000-8000-000000000001',ORG_B='bbbbbbbb-0000-4000-8000-000000000001';
const jwt=(sub,aal='aal1')=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub,aal,role:'authenticated'})).toString('base64url')+'.sig_'+'x'.repeat(20);
const AUTH={ // token -> usuário do GoTrue
  [jwt('11111111-1111-4111-8111-111111111111')]:{id:'11111111-1111-4111-8111-111111111111',email:'adminA@example.com',email_confirmed_at:'2026-01-01'},
  [jwt('11111111-1111-4111-8111-111111111111','aal2')]:{id:'11111111-1111-4111-8111-111111111111',email:'adminA@example.com',email_confirmed_at:'2026-01-01'},
  [jwt('22222222-2222-4222-8222-222222222222')]:{id:'22222222-2222-4222-8222-222222222222',email:'opb@example.com',email_confirmed_at:'2026-01-01'},
  [jwt('33333333-3333-4333-8333-333333333333')]:{id:'33333333-3333-4333-8333-333333333333',email:'unverified@example.com',email_confirmed_at:null},
  [jwt('44444444-4444-4444-8444-444444444444')]:{id:'44444444-4444-4444-8444-444444444444',email:'novo@example.com',email_confirmed_at:'2026-01-01'},
  [jwt('55555555-5555-4555-8555-555555555555')]:{id:'99999999-9999-4999-8999-999999999999',email:'forjado@example.com',email_confirmed_at:'2026-01-01'}};
const T={komodo_web_sessions:[{token_hash:crypto.createHash('sha256').update('C'.repeat(43)).digest('hex'),user_id:'uA',expires_at:'2099-01-01'}],
  komodo_tbl_usuarios:[{id:'uA',email:'adminA@example.com',papel:'admin',auth_user_id:null},{id:'uB',email:'opb@example.com',papel:'operador',auth_user_id:'22222222-2222-4222-8222-222222222222'}],
  kac_memberships:[{organization_id:ORG_A,user_id:'uA',role:'owner',created_at:'1'},{organization_id:ORG_B,user_id:'uB',role:'operator',created_at:'1'}],
  komodo_acessos:[{id:'va',organization_id:ORG_A,modulo:'empresarial',dia:'ter',data:'2026-10-13',hora:'10:00',nome:'Visita A',status:0},{id:'vb',organization_id:ORG_B,modulo:'empresarial',dia:'ter',data:'2026-10-13',hora:'11:00',nome:'Visita B',status:0}],
  kac_invites:[],kac_audit_log:[],kac_visit_history:[]};
let rpcResult={status:'accepted',organization_id:ORG_B,role:'viewer'};const rpcCalls=[];let gotrueCalls=0;
function res(s,b){return{ok:s<300,status:s,text:async()=>b==null?'':JSON.stringify(b)};}
global.fetch=async(url,o={})=>{const u=new URL(url),t=u.pathname.split('/').pop(),m=o.method||'GET';
  if(u.pathname==='/auth/v1/user'){gotrueCalls++;const tok=(o.headers.Authorization||'').slice(7);const usr=AUTH[tok];return usr?res(200,usr):res(401,{msg:'invalid'});}
  if(u.pathname.endsWith('/rpc/kac_accept_invite')){rpcCalls.push(JSON.parse(o.body));return res(200,rpcResult);}
  const rows=T[t];if(!rows)return res(404,{});const body=o.body?JSON.parse(o.body):null;if(m==='POST'){rows.push(...body);return res(201,null);}
  const sel=rows.filter(r=>[...u.searchParams].every(([k,v])=>['select','order','limit','and'].includes(k)||(v==='is.null'?r[k]==null:!v.startsWith('eq.')||String(r[k])===v.slice(3))));
  if(m==='PATCH'){sel.forEach(r=>Object.assign(r,body));return res(200,sel);}if(m==='DELETE'){sel.forEach(r=>rows.splice(rows.indexOf(r),1));return res(204,null);}return res(200,sel);};
test.after(()=>{global.fetch=originalFetch;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;delete process.env.KAC_SUPABASE_AUTH;});
function call(route,{method='GET',body={},bearer,cookie,query={}}={}){const r={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};const headers={};if(bearer)headers.authorization='Bearer '+bearer;if(cookie)headers.cookie='kac_session='+'C'.repeat(43);return Promise.resolve(handler({method,query:{route:route.split('/'),...query},body,headers},r)).then(()=>({status:r.statusCode,body:r.body?JSON.parse(r.body):null}));}
const ON=()=>{process.env.KAC_SUPABASE_AUTH='on';};
const B=jwt('22222222-2222-4222-8222-222222222222'),NEW=jwt('44444444-4444-4444-8444-444444444444'),ADM1=jwt('11111111-1111-4111-8111-111111111111'),ADM2=jwt('11111111-1111-4111-8111-111111111111','aal2'),UNV=jwt('33333333-3333-4333-8333-333333333333');
test('ponte: flag OFF → /auth/supabase/me e /session 404',async()=>{delete process.env.KAC_SUPABASE_AUTH;assert.equal((await call('auth/supabase/me',{bearer:B})).status,404);assert.equal((await call('auth/supabase/session',{method:'POST',bearer:B})).status,404);});
test('me: sem token/ não verificado → 401; conta nova sem vínculo → linked:false (sem dados de org); vinculada → linked+hasOrg',async()=>{ON();
  assert.equal((await call('auth/supabase/me')).status,401);assert.equal((await call('auth/supabase/me',{bearer:UNV})).status,401);
  const n=await call('auth/supabase/me',{bearer:NEW});assert.equal(n.status,200);assert.deepEqual(n.body.data,{linked:false,hasOrg:false,email:'novo@example.com'});
  const b=await call('auth/supabase/me',{bearer:B});assert.equal(b.body.data.linked,true);assert.equal(b.body.data.hasOrg,true);assert.ok(!JSON.stringify(b.body).includes(ORG_B),'não expõe id da org');});
test('session: conta nova sem empresa → 403 no_company, nenhuma sessão criada; e ela continua sem ver visitas (401)',async()=>{ON();const before=T.komodo_web_sessions.length;
  const r=await call('auth/supabase/session',{method:'POST',bearer:NEW});assert.equal(r.status,403);assert.equal(r.body.code,'no_company');assert.equal(T.komodo_web_sessions.length,before);
  assert.equal((await call('visitantes/empresarial',{bearer:NEW})).status,401);});
test('session: vinculada com empresa → cookie HttpOnly igual ao login atual; só hash gravado; cookie dá acesso só à própria org',async()=>{ON();const before=T.komodo_web_sessions.length;
  const r=await new Promise(async ok=>{const rr={statusCode:0,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(v){this.body=v;}};await handler({method:'POST',query:{route:['auth','supabase','session']},body:{},headers:{authorization:'Bearer '+B,'x-forwarded-proto':'https'}},rr);ok(rr);});
  assert.equal(r.statusCode,200);const ck=String(r.headers['set-cookie']);assert.match(ck,/HttpOnly/i);assert.match(ck,/Secure/i);assert.match(ck,/SameSite=Strict/i);
  assert.equal(T.komodo_web_sessions.length,before+1);const tok=/kac_session=([^;]+)/.exec(ck)[1];const row=T.komodo_web_sessions.at(-1);assert.equal(row.user_id,'uB');assert.equal(row.token_hash,crypto.createHash('sha256').update(tok).digest('hex'));assert.ok(!JSON.stringify(row).includes(tok));
  const body=JSON.parse(r.body);assert.equal(body.data.user.id,'uB');assert.ok(!r.body.includes(tok),'token só no cookie');
  T.komodo_web_sessions.at(-1).expires_at='2099-01-01';});
test('session: admin com aal1 → 403 mfa_required; token inválido → 401',async()=>{ON();T.komodo_tbl_usuarios.find(u=>u.id==='uA').auth_user_id='11111111-1111-4111-8111-111111111111';
  const r=await call('auth/supabase/session',{method:'POST',bearer:ADM1});assert.equal(r.status,403);assert.equal(r.body.code,'mfa_required');
  assert.equal((await call('auth/supabase/session',{method:'POST',bearer:ADM2})).status,200);assert.equal((await call('auth/supabase/session',{method:'POST',bearer:jwt('00000000-0000-4000-8000-00000000dead')})).status,401);
  T.komodo_tbl_usuarios.find(u=>u.id==='uA').auth_user_id=null;});
test('front: tela "Conta sem empresa vinculada", botão Abrir o sistema, atalho no login atual, cordova.js existe',()=>{const fs=require('node:fs');const rd=f=>fs.readFileSync(__dirname+'/../'+f,'utf8');
  const a=rd('auth.html');assert.match(a,/id="secNoOrg"/);assert.match(a,/Conta sem empresa vinculada/);assert.match(a,/id="btnOpenApp"/);
  const i=rd('src/ui/auth-init.js');assert.match(i,/c\.me\(\)/);assert.match(i,/show\('secNoOrg'\)/);assert.match(i,/c\.openApp\(\)/);assert.ok(!/localStorage\.setItem/.test(i),'nada persistente além do marcador de sessão já usado pelo app');
  assert.match(rd('login.html'),/id="newLoginLink" hidden/);assert.match(rd('src/ui/login-init.js'),/\/api\/auth\/supabase\/config/);assert.ok(fs.existsSync(__dirname+'/../cordova.js'));
  const c=rd('src/ui/SupabaseAuthClient.js');assert.match(c,/me\(\) \{ return api\('\/auth\/supabase\/me', 'GET'\)/);assert.match(c,/openApp\(\) \{ return api\('\/auth\/supabase\/session', 'POST'/);});
