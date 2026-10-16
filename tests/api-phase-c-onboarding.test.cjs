'use strict';
// Onboarding guiado (Fase C) — rota /auth/supabase/onboarding com GoTrue/PostgREST mockados + validação pura + UI estática.
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const handler=require('../api/[...route].js');const ONB=require('../lib/onboarding.cjs');const originalFetch=global.fetch;
process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
const jwt=(sub)=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub,aal:'aal1',role:'authenticated'})).toString('base64url')+'.sig_'+'x'.repeat(20);
const NEW='44444444-4444-4444-8444-444444444444',UNV='33333333-3333-4333-8333-333333333333';
const AUTH={[jwt(NEW)]:{id:NEW,email:'novo@example.com',email_confirmed_at:'2026-01-01'},[jwt(UNV)]:{id:UNV,email:'x@example.com',email_confirmed_at:null}};
let rpc=[];let rpcResult={status:'created',organization_id:'o',user_id:'u'};
function res(s,b){return{ok:s<300,status:s,text:async()=>b==null?'':JSON.stringify(b)};}
global.fetch=async(url,o={})=>{const u=new URL(url);if(u.pathname==='/auth/v1/user'){const usr=AUTH[(o.headers.Authorization||'').slice(7)];return usr?res(200,usr):res(401,{});}
  if(u.pathname.endsWith('/rpc/kac_onboard_org')){rpc.push({body:JSON.parse(o.body),key:o.headers.apikey});return res(200,rpcResult);}return res(404,{});};
test.after(()=>{global.fetch=originalFetch;delete process.env.KAC_SUPABASE_AUTH;});
let ip=0;function call(body,bearer,fixedIp){const r={statusCode:0,setHeader(){},end(v){this.body=v;}};const headers={'x-real-ip':fixedIp||('10.0.0.'+(++ip))};if(bearer)headers.authorization='Bearer '+bearer;
  return Promise.resolve(handler({method:'POST',query:{route:['auth','supabase','onboarding']},body,headers},r)).then(()=>({status:r.statusCode,body:r.body?JSON.parse(r.body):null}));}
const OK={name:'Condomínio Teste',kind:'condominio',cnpj:'11.222.333/0001-81',timezone:'America/Sao_Paulo'};
test('CNPJ: dígitos verificadores, máscara, repetidos',()=>{assert.ok(ONB.validCnpj('11.222.333/0001-81'));assert.ok(ONB.validCnpj('11222333000181'));assert.ok(!ONB.validCnpj('11222333000182'));assert.ok(!ONB.validCnpj('00000000000000'));assert.ok(!ONB.validCnpj('123'));});
test('validação: fuso inválido, tipo inválido, nome curto; fuso padrão Sao_Paulo',()=>{const v=ONB.validateOnboarding({name:'X',kind:'castelo',timezone:'Mars/Base'});assert.deepEqual(Object.keys(v.errors).sort(),['kind','name','timezone']);assert.equal(ONB.validateOnboarding({name:'Loja',kind:'comercio'}).value.timezone,'America/Sao_Paulo');});
test('flag OFF → 404',async()=>{delete process.env.KAC_SUPABASE_AUTH;assert.equal((await call(OK,jwt(NEW))).status,404);});
test('sem token / e-mail não verificado → 401, RPC não chamada',async()=>{process.env.KAC_SUPABASE_AUTH='on';rpc=[];assert.equal((await call(OK)).status,401);assert.equal((await call(OK,jwt(UNV))).status,401);assert.equal(rpc.length,0);});
test('dados inválidos → 422 com erros por campo, RPC não chamada',async()=>{rpc=[];const r=await call({...OK,cnpj:'11222333000182'},jwt(NEW));assert.equal(r.status,422);assert.ok(r.body.errors.cnpj);assert.equal(rpc.length,0);});
test('criação → 201; RPC recebe identidade do GoTrue (não do corpo), CNPJ só dígitos, id novo aleatório; service role só no servidor',async()=>{rpc=[];rpcResult={status:'created'};
  const r=await call({...OK,p_auth_user_id:'99999999-9999-4999-8999-999999999999',email:'forjado@example.com'},jwt(NEW));assert.equal(r.status,201);assert.equal(r.body.data.mfaRequired,true);
  const b=rpc[0].body;assert.equal(b.p_auth_user_id,NEW);assert.equal(b.p_email,'novo@example.com');assert.equal(b.p_cnpj,'11222333000181');assert.match(b.p_new_user_id,/^user_[0-9a-f]{24}$/);assert.ok(!JSON.stringify(r.body).includes('test-only'));});
test('limite / já membro / e-mail em uso → 409 com código',async()=>{for(const s of ['limit_reached','already_member','email_in_use']){rpcResult={status:s};const r=await call(OK,jwt(NEW));assert.equal(r.status,409);assert.equal(r.body.code,s);}});
test('rate limit: 6ª tentativa em 10 min (mesma conta+IP) → 429',async()=>{rpcResult={status:'limit_reached'};let last;for(let i=0;i<6;i++)last=await call(OK,jwt(NEW),'10.9.9.9');assert.equal(last.status,429);});
const src=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('UI: carregando por padrão, Indisponível oculto; wizard acessível; sem innerHTML; dica do index só no novo login',()=>{const h=src('auth.html');assert.match(h,/<section id="secLoading"/);assert.match(h,/<section id="secOff" hidden>/);
  for(const id of ['obName','obCnpj','obTz'])assert.match(h,new RegExp(`<label for="${id}"`));assert.match(h,/<legend>Tipo<\/legend>/);assert.match(h,/value="America\/Sao_Paulo" selected/);
  const js=src('src/ui/auth-init.js');assert.ok(!/innerHTML/.test(js));assert.match(js,/sessionStorage\.setItem\('kac_newlogin', '1'\)/);assert.match(src('src/services/AuthService.js'),/kac_newlogin/);
  assert.ok(!src('index.html').includes('auth.html'));});
test('cliente: onboard valida antes de chamar a API',async()=>{require('../src/ui/SupabaseAuthClient.js');const c=globalThis.SupabaseAuthClient.create({fetch:async()=>{throw new Error('não deveria chamar');}});await assert.rejects(c.onboard({name:'Ok nome',kind:'condominio',cnpj:'123'}),/CNPJ/);assert.ok(globalThis.SupabaseAuthClient._util.validCnpj('11222333000181'));});
