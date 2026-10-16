'use strict';
const test=require('node:test');const assert=require('node:assert');const MP=require('../lib/mercadopago.cjs');const B=require('../lib/billing.cjs');
const SECRET='s'.repeat(40);const S={MP_SANDBOX_SELLER_ACCESS_TOKEN:'APP_USR-111-seller',MP_SANDBOX_SELLER_PUBLIC_KEY:'APP_USR-pub-seller',MP_WEBHOOK_SECRET:SECRET};
const ORG='11111111-2222-4333-8444-555555555555';
function ff(me,calls){return async(url,opt={})=>{calls.push(url);const p=url.replace('https://api.mercadopago.com','');if(p==='/users/me'){if(me==='err')throw new Error('net');return{ok:me.st<300,status:me.st,json:async()=>me.j};}if(p==='/checkout/preferences')return{ok:true,status:201,json:async()=>({id:'pref',sandbox_init_point:'https://sandbox.mercadopago.com.br/x'})};return{ok:false,status:404,json:async()=>({})};};}
const co=p=>p.createCheckout({orgId:ORG,planId:'pro',returnUrl:'https://a.example/'});
test('seller: preferido sobre MP_TEST_*; APP_USR exige par APP_USR; não lê variáveis de produção',()=>{
  MP._clearTestUserCache();const c=MP.config({...S,MP_TEST_ACCESS_TOKEN:'TEST-x',MP_TEST_PUBLIC_KEY:'TEST-y'});assert.equal(c.token,S.MP_SANDBOX_SELLER_ACCESS_TOKEN);assert.equal(c.needsTestUserCheck,true);
  assert.throws(()=>MP.config({...S,MP_SANDBOX_SELLER_PUBLIC_KEY:'TEST-y'}),/PRODUCTION_CREDENTIALS_REFUSED/);
  assert.throws(()=>MP.config({MP_SANDBOX_SELLER_ACCESS_TOKEN:S.MP_SANDBOX_SELLER_ACCESS_TOKEN,MP_WEBHOOK_SECRET:SECRET,MP_TEST_PUBLIC_KEY:'TEST-y'}),/PROVIDER_NOT_CONFIGURED/);
  assert.throws(()=>MP.config({MP_TEST_ACCESS_TOKEN:'APP_USR-1',MP_TEST_PUBLIC_KEY:'APP_USR-2',MP_WEBHOOK_SECRET:SECRET}),/PRODUCTION_CREDENTIALS_REFUSED/,'APP_USR só pelo caminho seller');
  assert.throws(()=>MP.config({MP_ACCESS_TOKEN:'APP_USR-1',MP_PUBLIC_KEY:'APP_USR-2',MP_WEBHOOK_SECRET:SECRET}),/PROVIDER_NOT_CONFIGURED/);
  assert.equal(MP.config({...S,MP_SANDBOX_SELLER_ACCESS_TOKEN:'TEST-a',MP_SANDBOX_SELLER_PUBLIC_KEY:'TEST-b'}).needsTestUserCheck,false);
  assert.ok(!/MP_ACCESS_TOKEN|MP_PUBLIC_KEY['"\s]/.test(require('fs').readFileSync(__dirname+'/../lib/mercadopago.cjs','utf8').replace(/MP_(SANDBOX_SELLER|TEST)_(ACCESS_TOKEN|PUBLIC_KEY)/g,'')));
});
test('seller test_user: aceito, /users/me consultado uma vez (cache)',async()=>{MP._clearTestUserCache();const calls=[];const p=B.provider('mercadopago',S,{fetchFn:ff({st:200,j:{id:1,tags:['normal','test_user']}},calls)});
  assert.equal((await co(p)).url,'https://sandbox.mercadopago.com.br/x');await co(p);assert.equal(calls.filter(u=>u.endsWith('/users/me')).length,1);});
test('seller não-teste / erro 401 / falha de rede: recusado antes de qualquer chamada de pagamento; negativo em cache',async()=>{
  for(const me of [{st:200,j:{id:2,tags:['normal']}},{st:200,j:{id:3}},{st:401,j:{}},'err']){MP._clearTestUserCache();const calls=[];const p=B.provider('mercadopago',S,{fetchFn:ff(me,calls)});
    await assert.rejects(co(p),/NON_TEST_ACCOUNT_REFUSED/);await assert.rejects(co(p),/NON_TEST_ACCOUNT_REFUSED/);
    assert.deepEqual(calls.map(u=>u.replace('https://api.mercadopago.com','')),['/users/me'],'nenhuma preferência criada; 2ª tentativa veio do cache');}});
test('seller 5xx: erro transitório, sem cache negativo',async()=>{MP._clearTestUserCache();const calls=[];await assert.rejects(co(B.provider('mercadopago',S,{fetchFn:ff({st:503,j:{}},calls)})),/MP_API_503/);
  await co(B.provider('mercadopago',S,{fetchFn:ff({st:200,j:{tags:['test_user']}},calls)}));});
test('TEST- não consulta /users/me',async()=>{MP._clearTestUserCache();const calls=[];await co(B.provider('mercadopago',{MP_TEST_ACCESS_TOKEN:'TEST-1',MP_TEST_PUBLIC_KEY:'TEST-2',MP_WEBHOOK_SECRET:SECRET},{fetchFn:ff('err',calls)}));assert.ok(!calls.some(u=>u.endsWith('/users/me')));});
test('webhook seller não-teste: não processa pagamento',async()=>{MP._clearTestUserCache();const calls=[];const p=B.provider('mercadopago',S,{fetchFn:ff({st:200,j:{tags:[]}},calls)});const ts=Math.floor(Date.now()/1000);
  await assert.rejects(p.handleWebhook({headers:{'x-signature':MP.signForTest({dataId:'42',requestId:'r',ts,secret:SECRET}),'x-request-id':'r'},query:{'data.id':'42'},body:{type:'payment',data:{id:'42'}}}),/NON_TEST_ACCOUNT_REFUSED/);assert.ok(!calls.some(u=>u.includes('/v1/payments')));});
