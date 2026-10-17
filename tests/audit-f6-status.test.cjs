'use strict';
// Achado 13: /auth/status não revela o estado do banco quando o bootstrap está desligado (sem KAC_BOOTSTRAP_SECRET).
const test=require('node:test');const assert=require('node:assert/strict');
const orig=global.fetch;process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
let calls=0;global.fetch=async()=>{calls++;return new Response('[]',{status:200,headers:{'content-type':'application/json'}});};
test.after(()=>{global.fetch=orig;delete process.env.KAC_BOOTSTRAP_SECRET;});const api=require('../api/[...route].js');
const get=()=>new Promise(ok=>{const res={statusCode:200,setHeader(){},status(c){this.statusCode=c;return this;},json(b){ok({status:this.statusCode,body:b});return this;},end(b){ok({status:this.statusCode,body:b?JSON.parse(b):null});},send(b){ok({status:this.statusCode,body:b});}};api({method:'GET',headers:{},query:{route:['auth','status']}},res);});
test('sem segredo de bootstrap: hasAdmin:true sem consultar',async()=>{delete process.env.KAC_BOOTSTRAP_SECRET;calls=0;const r=await get();assert.equal(r.body.data.hasAdmin,true);assert.equal(calls,0);});
test('com segredo (primeiro acesso habilitado): consulta e diz a verdade',async()=>{process.env.KAC_BOOTSTRAP_SECRET='x'.repeat(40);calls=0;const r=await get();assert.equal(r.body.data.hasAdmin,false);assert.equal(calls,1);});
