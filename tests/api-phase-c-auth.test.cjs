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
const OFF=()=>{delete process.env.KAC_SUPABASE_AUTH;},ON=()=>{process.env.KAC_SUPABASE_AUTH='on';};

test('flag padrão = desligado',()=>{OFF();assert.equal(SA.enabled(),false);assert.equal(SA.enabled({KAC_SUPABASE_AUTH:'true'}),false);});
test('flag OFF: rotas da Fase C → 404 e GoTrue nunca é chamado',async()=>{OFF();gotrueCalls=0;for(const [r,m] of [['auth/supabase/config','GET'],['auth/supabase/link','POST'],['convites','POST'],['convites/aceitar','POST']])assert.equal((await call(r,{method:m,bearer:jwt('22222222-2222-4222-8222-222222222222')})).status,404,r);assert.equal(gotrueCalls,0);});
test('flag OFF: Bearer válido é ignorado (401) — nada muda para usuários',async()=>{OFF();assert.equal((await call('visitantes/empresarial',{bearer:jwt('22222222-2222-4222-8222-222222222222')})).status,401);assert.equal(gotrueCalls,0);});
test('flag OFF: login por cookie continua igual',async()=>{OFF();const r=await call('visitantes/empresarial',{cookie:true});assert.equal(r.status,200);assert.deepEqual(r.body.data.map(x=>x.id),['va']);});
test('flag ON: operador via Supabase vê só a própria org (isolamento)',async()=>{ON();const r=await call('visitantes/empresarial',{bearer:jwt('22222222-2222-4222-8222-222222222222')});assert.equal(r.status,200);assert.deepEqual(r.body.data.map(x=>x.id),['vb']);});
test('flag ON: IDOR via Supabase — B não apaga/altera visita de A',async()=>{ON();const b=jwt('22222222-2222-4222-8222-222222222222');assert.equal((await call('visitantes/va/status',{method:'PUT',body:{status:2},bearer:b})).status,404);assert.equal(T.komodo_acessos.find(x=>x.id==='va').status,0);});
test('flag ON: e-mail não verificado → 401',async()=>{ON();assert.equal((await call('visitantes/empresarial',{bearer:jwt('33333333-3333-4333-8333-333333333333')})).status,401);});
test('flag ON: token rejeitado pelo GoTrue → 401; sub ≠ usuário do GoTrue → 401',async()=>{ON();assert.equal((await call('visitantes/empresarial',{bearer:jwt('00000000-0000-4000-8000-00000000dead')})).status,401);assert.equal((await call('visitantes/empresarial',{bearer:jwt('55555555-5555-4555-8555-555555555555')})).status,401);});
test('flag ON: identidade sem usuário local vinculado → 401',async()=>{ON();assert.equal((await call('visitantes/empresarial',{bearer:jwt('44444444-4444-4444-8444-444444444444')})).status,401);});
test('vincular conta: exige cookie atual + Supabase com MESMO e-mail; admin mantém senha',async()=>{ON();
  assert.equal((await call('auth/supabase/link',{method:'POST',bearer:jwt('11111111-1111-4111-8111-111111111111')})).status,401,'sem cookie');
  assert.equal((await call('auth/supabase/link',{method:'POST',cookie:true,bearer:jwt('22222222-2222-4222-8222-222222222222')})).status,403,'e-mail diferente');
  const r=await call('auth/supabase/link',{method:'POST',cookie:true,bearer:jwt('11111111-1111-4111-8111-111111111111')});assert.equal(r.status,200);assert.equal(T.komodo_tbl_usuarios[0].auth_user_id,'11111111-1111-4111-8111-111111111111');
  assert.equal((await call('auth/supabase/link',{method:'POST',cookie:true,bearer:jwt('11111111-1111-4111-8111-111111111111')})).status,409,'não revincula');
  assert.equal((await call('visitantes/empresarial',{cookie:true})).status,200,'login por cookie continua (sem lockout)');});
test('MFA: admin via Supabase com aal1 → 403 mfa_required; com aal2 → 200',async()=>{ON();const r1=await call('visitantes/empresarial',{bearer:jwt('11111111-1111-4111-8111-111111111111')});assert.equal(r1.status,403);assert.equal(r1.body.code,'mfa_required');
  const r2=await call('visitantes/empresarial',{bearer:jwt('11111111-1111-4111-8111-111111111111','aal2')});assert.equal(r2.status,200);assert.deepEqual(r2.body.data.map(x=>x.id),['va']);});
test('MFA: admin aal1 não cria convite',async()=>{ON();assert.equal((await call('convites',{method:'POST',body:{email:'x@example.com',role:'viewer'},bearer:jwt('11111111-1111-4111-8111-111111111111')})).status,403);});
test('convite: owner (aal2) cria; token devolvido 1x e só o hash é gravado; org da sessão',async()=>{ON();const r=await call('convites',{method:'POST',body:{email:'Novo@Example.com',role:'viewer',organization_id:ORG_B},bearer:jwt('11111111-1111-4111-8111-111111111111','aal2')});assert.equal(r.status,201);
  const inv=T.kac_invites.at(-1);assert.equal(inv.organization_id,ORG_A);assert.equal(inv.email,'novo@example.com');assert.equal(inv.token_hash,SA.hashToken(r.body.data.token));assert.ok(!JSON.stringify(T.kac_invites).includes(r.body.data.token));});
test('convite: operador não pode convidar; owner pode admin; admin não pode admin; papel inválido',async()=>{ON();assert.equal((await call('convites',{method:'POST',body:{email:'x@example.com',role:'viewer'},bearer:jwt('22222222-2222-4222-8222-222222222222')})).status,403);
  assert.equal(SA.canInvite('owner','admin'),true);assert.equal(SA.canInvite('admin','admin'),false);assert.equal(SA.canInvite('admin','operator'),true);assert.equal(SA.canInvite('owner','owner'),false);assert.equal(SA.canInvite('viewer','viewer'),false);});
test('aceitar convite: exige Supabase verificado; envia hash (não o token) e o e-mail do GoTrue (não do corpo)',async()=>{ON();const tok='T'.repeat(43);rpcCalls.length=0;
  assert.equal((await call('convites/aceitar',{method:'POST',body:{token:tok}})).status,401);assert.equal((await call('convites/aceitar',{method:'POST',body:{token:tok},bearer:jwt('33333333-3333-4333-8333-333333333333')})).status,401);
  rpcResult={status:'accepted',organization_id:ORG_B,role:'viewer'};const r=await call('convites/aceitar',{method:'POST',body:{token:tok,email:'atacante@example.com'},bearer:jwt('44444444-4444-4444-8444-444444444444')});
  assert.equal(r.status,200);assert.equal(rpcCalls[0].p_token_hash,SA.hashToken(tok));assert.equal(rpcCalls[0].p_email,'novo@example.com');assert.equal(rpcCalls[0].p_auth_user_id,'44444444-4444-4444-8444-444444444444');assert.ok(!JSON.stringify(rpcCalls).includes(tok));});
test('aceitar convite: mapeia mismatch 403, expirado/usado 410, inválido 404, token malformado 404 sem RPC',async()=>{ON();const b=jwt('44444444-4444-4444-8444-444444444444');for(const [st,code] of [['email_mismatch',403],['expired',410],['used',410],['invalid',404]]){rpcResult={status:st};assert.equal((await call('convites/aceitar',{method:'POST',body:{token:'T'.repeat(43)},bearer:b})).status,code,st);}
  const n=rpcCalls.length;assert.equal((await call('convites/aceitar',{method:'POST',body:{token:'curto'},bearer:b})).status,404);assert.equal(rpcCalls.length,n);});
test('config pública não expõe service key',async()=>{ON();const r=await call('auth/supabase/config');assert.equal(r.status,200);assert.ok(!JSON.stringify(r.body).includes('test-only-not-a-real-key'));OFF();});
