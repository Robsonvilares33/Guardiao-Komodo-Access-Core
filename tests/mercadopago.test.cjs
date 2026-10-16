'use strict';
// Mercado Pago sandbox: tudo com fetch simulado (sem rede, sem chaves reais).
const test=require('node:test');const assert=require('node:assert/strict');
delete process.env.MP_SANDBOX_SELLER_ACCESS_TOKEN;delete process.env.MP_SANDBOX_SELLER_PUBLIC_KEY; // isola do ambiente da máquina
const MP=require('../lib/mercadopago.cjs');const B=require('../lib/billing.cjs');
const SECRET='s'.repeat(64);const ORG='00000000-0000-4000-8000-000000000001';
const ENV={MP_TEST_ACCESS_TOKEN:'TEST-123-abc',MP_TEST_PUBLIC_KEY:'TEST-pub-xyz',MP_WEBHOOK_SECRET:SECRET};
const now=()=>Math.floor(Date.now()/1000);
function fakeFetch(routes,calls=[]){return async(url,opt={})=>{calls.push({url,opt});const k=(opt.method||'GET')+' '+url.replace('https://api.mercadopago.com','');const h=routes[k];if(!h)return{ok:false,status:404,json:async()=>({})};const [st,j]=h(opt);return{ok:st<300,status:st,json:async()=>j};};}
const sig=(dataId,requestId,ts=now())=>MP.signForTest({dataId,requestId,ts,secret:SECRET});

test('config: exige credenciais TEST- e recusa produção (APP_USR-)',()=>{
  assert.throws(()=>MP.config({}),/PROVIDER_NOT_CONFIGURED/);
  assert.throws(()=>MP.config({...ENV,MP_TEST_ACCESS_TOKEN:'APP_USR-1'}),/PRODUCTION_CREDENTIALS_REFUSED/);
  assert.throws(()=>MP.config({...ENV,MP_TEST_PUBLIC_KEY:'APP_USR-1'}),/PRODUCTION_CREDENTIALS_REFUSED/);
  assert.throws(()=>MP.config({...ENV,MP_WEBHOOK_SECRET:'curto'}),/WEBHOOK_SECRET_TOO_SHORT/);
  assert.equal(MP.config(ENV).token,'TEST-123-abc');
  assert.throws(()=>B.provider('mercadopago',{MP_ACCESS_TOKEN:'APP_USR-x',MP_WEBHOOK_SECRET:SECRET}),/PROVIDER_NOT_CONFIGURED/); // nunca lê a variável de produção
});
test('manifest segue a doc do MP (id minúsculo se alfanumérico; partes ausentes omitidas)',()=>{
  assert.equal(MP.manifest({dataId:'ABC123',requestId:'r-1',ts:'10'}),'id:abc123;request-id:r-1;ts:10;');
  assert.equal(MP.manifest({dataId:'',requestId:'',ts:'10'}),'ts:10;');
});
test('assinatura: válida passa; adulterada, sem v1, outro request-id, outro data.id falham',()=>{
  const h=sig('999','req-1');
  assert.equal(MP.verifySignature({xSignature:h,xRequestId:'req-1',dataId:'999',secret:SECRET}),true);
  assert.throws(()=>MP.verifySignature({xSignature:h.replace(/.$/,c=>c==='0'?'1':'0'),xRequestId:'req-1',dataId:'999',secret:SECRET}),/BAD_SIGNATURE/);
  assert.throws(()=>MP.verifySignature({xSignature:'ts=1',xRequestId:'req-1',dataId:'999',secret:SECRET}),/BAD_SIGNATURE/);
  assert.throws(()=>MP.verifySignature({xSignature:h,xRequestId:'req-2',dataId:'999',secret:SECRET}),/BAD_SIGNATURE/);
  assert.throws(()=>MP.verifySignature({xSignature:h,xRequestId:'req-1',dataId:'998',secret:SECRET}),/BAD_SIGNATURE/);
  assert.throws(()=>MP.verifySignature({xSignature:undefined,xRequestId:'req-1',dataId:'999',secret:SECRET}),/BAD_SIGNATURE/);
});
test('replay: fora da janela de 5 min (passado ou futuro) é recusado; ts em ms aceito',()=>{
  const old=now()-301;assert.throws(()=>MP.verifySignature({xSignature:sig('1','r',old),xRequestId:'r',dataId:'1',secret:SECRET}),/STALE_SIGNATURE/);
  const fut=now()+400;assert.throws(()=>MP.verifySignature({xSignature:sig('1','r',fut),xRequestId:'r',dataId:'1',secret:SECRET}),/STALE_SIGNATURE/);
  const ms=Date.now();assert.equal(MP.verifySignature({xSignature:sig('1','r',ms),xRequestId:'r',dataId:'1',secret:SECRET}),true);
});
test('external_reference assinado: org/plano recuperados; adulterado é rejeitado',()=>{
  const r=MP.makeRef(SECRET,ORG,'pro');assert.deepEqual(MP.parseRef(SECRET,r),{orgId:ORG,planId:'pro'});
  assert.equal(MP.parseRef(SECRET,r.replace(ORG,'00000000-0000-4000-8000-000000000002')),null);
  assert.equal(MP.parseRef('o'.repeat(64),r),null);assert.equal(MP.parseRef(SECRET,'qualquer'),null);
  assert.throws(()=>MP.makeRef(SECRET,'nao-uuid','pro'),/INVALID_ORG/);
});
test('checkout: cria preferência sandbox (sandbox_init_point), valor do plano, ref assinada, sem vazar token',async()=>{
  const calls=[];const f=fakeFetch({'POST /checkout/preferences':opt=>{const b=JSON.parse(opt.body);return[201,{id:'pref-1',init_point:'https://prod',sandbox_init_point:'https://sandbox.mercadopago.com.br/x',external_reference:b.external_reference}];}},calls);
  const p=B.provider('mercadopago',ENV,{fetchFn:f});const c=await p.createCheckout({orgId:ORG,planId:'pro',returnUrl:'https://app.example/'});
  assert.equal(c.url,'https://sandbox.mercadopago.com.br/x');assert.equal(c.amountCents,9900);assert.equal(c.sandbox,true);
  const b=JSON.parse(calls[0].opt.body);assert.equal(b.items[0].unit_price,99);assert.equal(b.items[0].currency_id,'BRL');assert.deepEqual(MP.parseRef(SECRET,b.external_reference),{orgId:ORG,planId:'pro'});
  assert.ok(calls[0].opt.headers['X-Idempotency-Key']);assert.ok(!JSON.stringify(c).includes('TEST-123'));
  await assert.rejects(p.createCheckout({orgId:ORG,planId:'free',returnUrl:'https://a/'}),/INVALID_PLAN/);
  await assert.rejects(p.createCheckout({orgId:ORG,planId:'pro',returnUrl:'http://a/'}),/INVALID_RETURN_URL/);
});
function hook({status='approved',live=false,ref=MP.makeRef(SECRET,ORG,'pro'),bodyLive=false,type='payment',id='777'}={}){
  const calls=[];const f=fakeFetch({['GET /v1/payments/'+id]:()=>[200,{id:Number(id),status,live_mode:live,external_reference:ref,transaction_amount:99}]},calls);
  const store=MP.memoryStore();const p=B.provider('mercadopago',ENV,{fetchFn:f,store});
  const args=(rid='rq-'+Math.random())=>({headers:{'x-signature':sig(id,rid),'x-request-id':rid},query:{'data.id':id,type},body:{type,live_mode:bodyLive,data:{id}}});
  return {p,calls,store,args};
}
test('webhook: pagamento aprovado → checkout.completed com org do external_reference (não do corpo)',async()=>{
  const {p,calls,args}=hook();const r=await p.handleWebhook(args());
  assert.equal(r.status,200);assert.equal(r.result,'accepted');assert.deepEqual([r.event.type,r.event.orgId,r.event.planId],['checkout.completed',ORG,'pro']);
  assert.equal(calls.length,1);assert.match(calls[0].url,/\/v1\/payments\/777$/);
});
test('webhook: idempotente — mesma notificação reenviada (novo request-id) não duplica',async()=>{
  const {p,store,args}=hook();assert.equal((await p.handleWebhook(args())).result,'accepted');assert.equal((await p.handleWebhook(args())).result,'duplicate');assert.equal(store.size(),1);
});
test('webhook: assinatura inválida → 401 e nenhuma chamada à API',async()=>{
  const {p,calls,args}=hook();const a=args();a.headers['x-signature']='ts=1,v1='+'0'.repeat(64);const r=await p.handleWebhook(a);assert.equal(r.status,401);assert.equal(calls.length,0);
});
test('webhook: live_mode (corpo ou pagamento), ref forjada, tipo/estado desconhecido → 200 ignorado, sem evento',async()=>{
  assert.equal((await hook({bodyLive:true}).p.handleWebhook(hook({bodyLive:true}).args())).result,'ignored_live_mode');
  let h=hook({live:true});assert.equal((await h.p.handleWebhook(h.args())).result,'ignored_live_mode');
  h=hook({ref:'kac1.'+ORG+'.pro.0000000000000000.'+'0'.repeat(32)});assert.equal((await h.p.handleWebhook(h.args())).result,'ignored_unknown_reference');
  h=hook({type:'subscription_preapproval'});assert.equal((await h.p.handleWebhook(h.args())).result,'ignored_type');
  h=hook({status:'in_process'});assert.equal((await h.p.handleWebhook(h.args())).result,'ignored_status');
  h=hook({status:'rejected'});assert.equal((await h.p.handleWebhook(h.args())).event.type,'invoice.payment_failed');
});
// Rota HTTP (handler da API) com flag ligada e fetch global simulado.
function res(){const r={statusCode:0,headers:{},body:'',setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(b){this.body=b||'';}};return r;}
test('rota /billing/webhook/mercadopago: 404 com flag desligada; 405 em GET; 401 sem detalhes; 200 aceito; nada de segredo na resposta',async()=>{
  const saved={...process.env};const gf=globalThis.fetch;const H=require('../api/[...route].js');
  try{
    delete process.env.KAC_BILLING;let r=res();await H({method:'POST',query:{route:'billing/webhook/mercadopago'},headers:{},body:{}},r);assert.equal(r.statusCode,404);
    Object.assign(process.env,ENV,{KAC_BILLING:'on'});
    r=res();await H({method:'GET',query:{route:'billing/webhook/mercadopago'},headers:{},body:{}},r);assert.equal(r.statusCode,405);
    r=res();await H({method:'POST',query:{route:'billing/webhook/mercadopago','data.id':'5'},headers:{'x-signature':'ts=1,v1=00','x-request-id':'a'},body:{type:'payment',data:{id:'5'}}},r);assert.equal(r.statusCode,401);assert.equal(r.body,'{"received":false}');
    process.env.SUPABASE_URL='https://fakeproj.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='fake-service-key';const sb=[];
    globalThis.fetch=async(url,opt={})=>{if(url.startsWith('https://fakeproj.supabase.co/rest/v1/')){sb.push({url,opt});const dup=url.includes('kac_payment_events')&&sb.filter(x=>x.url.includes('kac_payment_events')).length>1;return{ok:!dup,status:dup?409:201,text:async()=>dup?'{"code":"23505"}':''};}
      if(url.endsWith('/v1/payments/42'))return{ok:true,status:200,json:async()=>({id:42,status:'approved',live_mode:false,external_reference:MP.makeRef(SECRET,ORG,'pro'),transaction_amount:99})};return{ok:false,status:404,json:async()=>({})};};
    r=res();await H({method:'POST',url:'/api/billing/webhook/mercadopago?data.id=42&type=payment',query:{route:'billing/webhook/mercadopago'},headers:{'x-signature':sig('42','rq'),'x-request-id':'rq'},body:{type:'payment',data:{id:'42'}}},r);
    assert.equal(r.statusCode,200);assert.equal(r.body,'{"received":true}');for(const v of Object.values(ENV))assert.ok(!r.body.includes(v));
    const ev=JSON.parse(sb[0].opt.body)[0];assert.match(sb[0].url,/kac_payment_events$/);assert.deepEqual([ev.provider,ev.provider_event_id,ev.organization_id,ev.type],['mercadopago','mp:payment:42:approved',ORG,'checkout.completed']);
    assert.match(sb[1].url,/kac_subscriptions\?on_conflict=organization_id$/);assert.match(sb[1].opt.headers.Prefer,/merge-duplicates/);assert.deepEqual((({plan_id,status,provider})=>({plan_id,status,provider}))(JSON.parse(sb[1].opt.body)[0]),{plan_id:'pro',status:'active',provider:'mercadopago'});
    // reenvio (novo request-id): 409 no banco → duplicado, assinatura não é tocada de novo
    r=res();await H({method:'POST',url:'/api/billing/webhook/mercadopago?data.id=42&type=payment',query:{route:'billing/webhook/mercadopago'},headers:{'x-signature':sig('42','rq2'),'x-request-id':'rq2'},body:{type:'payment',data:{id:'42'}}},r);
    assert.equal(r.statusCode,200);assert.equal(sb.length,3,'só o insert duplicado; sem novo upsert');
  }finally{for(const k of Object.keys(process.env))if(!(k in saved))delete process.env[k];Object.assign(process.env,saved);globalThis.fetch=gf;}
});
test('webhook: pagamento inexistente na API → 200 ignorado (MP não reenvia em loop)',async()=>{const {p,args}=hook({id:'888'});const a=args();a.headers['x-signature']=sig('999',a.headers['x-request-id']);a.query['data.id']='999';a.body.data.id='999';assert.equal((await p.handleWebhook(a)).result,'ignored_unknown_payment');});
test('dbStore: insere evento sem dados do pagador; 409/23505 → duplicado; falha de banco propaga (MP reenvia)',async()=>{
  const calls=[];let mode='ok';const db=async(t,o)=>{calls.push([t,o]);if(t==='kac_payment_events'&&mode==='dup'){const e=new Error('DATABASE_ERROR');e.status=409;e.code='23505';throw e;}if(mode==='down'){const e=new Error('DATABASE_ERROR');e.status=503;throw e;}return null;};
  const st=MP.dbStore(db);const v={provider:'mercadopago',orgId:ORG,type:'invoice.payment_failed',planId:'pro',paymentId:'9',status:'rejected',amountCents:9900};
  assert.deepEqual(await st.record('mp:payment:9:rejected',v),{duplicate:false});assert.deepEqual(Object.keys(calls[0][1].body[0].payload).sort(),['amountCents','paymentId','planId','status']);assert.equal(calls[1][1].body[0].status,'past_due');assert.equal(calls[1][1].body[0].plan_id,undefined);
  mode='dup';assert.deepEqual(await st.record('x',v),{duplicate:true});mode='down';await assert.rejects(st.record('y',v),/DATABASE_ERROR/);
});
