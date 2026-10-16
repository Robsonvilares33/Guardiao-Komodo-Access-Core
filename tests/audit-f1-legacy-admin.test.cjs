'use strict';
// Achado 1: senha antiga não abre sessão para admin vinculado quando KAC_SUPABASE_AUTH=on; com a flag OFF nada muda.
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');
const handler=require('../api/[...route].js');const orig=global.fetch;
process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
const salt='aa'.repeat(16);const hash=crypto.pbkdf2Sync('Senha-forte-123',salt,150000,32,'sha256').toString('hex');
const T={komodo_tbl_usuarios:[{id:'u_adm',email:'adm@x.com',salt,hash,papel:'admin',auth_user_id:'11111111-1111-4111-8111-111111111111'},{id:'u_own',email:'own@x.com',salt,hash,papel:'operador',auth_user_id:'22222222-2222-4222-8222-222222222222'},{id:'u_op',email:'op@x.com',salt,hash,papel:'operador',auth_user_id:'33333333-3333-4333-8333-333333333333'},{id:'u_new',email:'new@x.com',salt,hash,papel:'admin',auth_user_id:null}],
 kac_memberships:[{user_id:'u_own',role:'owner',organization_id:'a0000000-0000-4000-8000-000000000001'},{user_id:'u_op',role:'operator',organization_id:'a0000000-0000-4000-8000-000000000001'}],komodo_web_sessions:[]};
const R=(s,b)=>({ok:s<300,status:s,text:async()=>b==null?'':JSON.stringify(b)});
global.fetch=async(url,o={})=>{const u=new URL(url);if(u.pathname.includes('/rpc/'))return R(200,true);const rows=T[u.pathname.split('/').pop()];if(!rows)return R(404,{});if((o.method||'GET')==='POST'){rows.push(...JSON.parse(o.body));return R(201,null);}
 const q=[...u.searchParams].filter(([k])=>!['select','order','limit'].includes(k));return R(200,rows.filter(r=>q.every(([k,v])=>String(r[k])===decodeURIComponent(v.replace(/^eq\./,'')))));};
const login=(email)=>{const res={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};return Promise.resolve(handler({method:'POST',query:{route:['auth','login']},body:{email,password:'Senha-forte-123'},headers:{'x-real-ip':'192.0.2.9'}},res)).then(()=>({s:res.statusCode,b:JSON.parse(res.body||'{}')}));};
test('flag OFF: comportamento atual (admin entra com senha)',async()=>{delete process.env.KAC_SUPABASE_AUTH;assert.equal((await login('adm@x.com')).s,200);});
test('flag ON: admin global vinculado → 403 use_new_login',async()=>{process.env.KAC_SUPABASE_AUTH='on';const r=await login('adm@x.com');assert.equal(r.s,403);assert.equal(r.b.code,'use_new_login');});
test('flag ON: owner da empresa vinculado → 403',async()=>{process.env.KAC_SUPABASE_AUTH='on';assert.equal((await login('own@x.com')).s,403);});
test('flag ON: operador continua entrando com senha',async()=>{process.env.KAC_SUPABASE_AUTH='on';assert.equal((await login('op@x.com')).s,200);});
test('flag ON: admin ainda sem vínculo entra (só para vincular; transição)',async()=>{process.env.KAC_SUPABASE_AUTH='on';assert.equal((await login('new@x.com')).s,200);});
test.after(()=>{global.fetch=orig;delete process.env.KAC_SUPABASE_AUTH;});
