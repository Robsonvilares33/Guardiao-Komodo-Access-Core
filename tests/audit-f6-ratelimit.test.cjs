'use strict';
// Achados 10/11: limite compartilhado via RPC kac_rate_hit (migration 011), com fallback em memória; login por e-mail e IP desconhecido por e-mail.
const test=require('node:test');const assert=require('node:assert/strict');
const orig=global.fetch;process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
let mode='db',calls=[],dbHits=new Map();const j=(s,b)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json'}});
global.fetch=async(url,o={})=>{const u=new URL(url);const t=u.pathname.split('/').slice(-2).join('/');const b=o.body?JSON.parse(o.body):null;calls.push({t,b});
 if(t==='rpc/kac_rate_hit'){if(mode==='missing')return j(404,{code:'PGRST202'});if(mode==='down')return j(503,{});const n=(dbHits.get(b.p_bucket)||0)+1;dbHits.set(b.p_bucket,n);return j(200,n<=b.p_max);}
 if(t==='rpc/komodo_consume_login_attempt_atomic')return j(200,true);if(t.endsWith('komodo_tbl_usuarios'))return j(200,[]);return j(200,[]);};
test.after(()=>{global.fetch=orig;});
const api=require('../api/[...route].js');
test('usa a RPC quando existe: bloqueia acima do limite',async()=>{const r=[];for(let i=0;i<4;i++)r.push(await api.rateHit('t:a',60,3));assert.deepEqual(r,[true,true,true,false]);assert.ok(calls.some(c=>c.t==='rpc/kac_rate_hit'));});
test('banco fora: cai na memória sem desligar a RPC',async()=>{mode='down';const r=[];for(let i=0;i<3;i++)r.push(await api.rateHit('t:b',60,2));assert.deepEqual(r,[true,true,false]);assert.equal(api._rl.ok,true);});
test('RPC ausente (011 não aplicada): desliga e segue em memória',async()=>{mode='missing';assert.equal(await api.rateHit('t:c',60,1),true);assert.equal(api._rl.ok,false);calls=[];assert.equal(await api.rateHit('t:c',60,1),false);assert.equal(calls.length,0);api._rl.ok=true;mode='db';});
function login(headers,email){return new Promise(ok=>{const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.statusCode=c;return this;},json(b){ok({status:this.statusCode,body:b});return this;},end(b){ok({status:this.statusCode,body:b?JSON.parse(b):null});},send(b){ok({status:this.statusCode,body:b});}};api({method:'POST',headers,query:{route:['auth','login']},body:JSON.stringify({email,password:'errada-123'})},res);});}
test('login: 11ª tentativa da mesma conta em 15 min → 429 mesmo trocando de IP; bucket sem e-mail em claro',async()=>{dbHits=new Map();calls=[];let last;for(let i=0;i<11;i++)last=await login({'x-real-ip':'10.0.0.'+i},'Vitima@Example.com');assert.equal(last.status,429);
 const bk=calls.filter(c=>c.t==='rpc/kac_rate_hit').map(c=>c.b.p_bucket);assert.ok(bk.every(b=>/^login:[0-9a-f]{40}$/.test(b)));assert.ok(!JSON.stringify(calls).includes('vitima@example.com"'.slice(0,6)+'@'));});
test('IP desconhecido: balde do limite por IP é por e-mail (não um só para todos)',async()=>{calls=[];await login({},'a@x.com');await login({},'b@x.com');const h=calls.filter(c=>c.t==='rpc/komodo_consume_login_attempt_atomic').map(c=>c.b.p_ip_hash);assert.equal(h.length,2);assert.notEqual(h[0],h[1]);});
