// Smoke SANDBOX do Mercado Pago (sem dinheiro real): cria preferência de teste e simula webhook assinado localmente.
// Credenciais só do ambiente (MP_TEST_*); nada é impresso além de PASS/FAIL e ids não sensíveis.
import { createRequire } from 'node:module';const require=createRequire(import.meta.url);
const B=require('../lib/billing.cjs');const MP=require('../lib/mercadopago.cjs');
const o=[];const ok=(n,c,x='')=>o.push(`${c===true?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);
const ORG='00000000-0000-4000-8000-0000000000aa';
const p=B.provider('mercadopago');ok('config: credenciais TEST- aceitas',p.live===false);
let c={};try{c=await p.createCheckout({orgId:ORG,planId:'pro',returnUrl:'https://guardiao-komodo-access-core.vercel.app/'});
ok('preferência sandbox criada',/^\d+-[0-9a-f-]+$/.test(c.id),'id '+String(c.id).split('-')[0]+'-…');ok('sandbox_init_point (sandbox.mercadopago)',/^https:\/\/sandbox\.mercadopago\.com\.br\//.test(c.url));ok('valor R$ 99,00 BRL',c.amountCents===9900&&c.currency==='BRL');
const cfg0=MP.config();const g=await fetch('https://api.mercadopago.com/checkout/preferences/'+c.id,{headers:{Authorization:'Bearer '+cfg0.token}});const j=await g.json();
ok('preferência lida de volta; external_reference assinado → org/plano',g.ok&&JSON.stringify(MP.parseRef(cfg0.secret,j.external_reference))===JSON.stringify({orgId:ORG,planId:'pro'}));
ok('item/valor conferem na API',j.items?.[0]?.unit_price===99&&j.items?.[0]?.currency_id==='BRL');
}catch(e){ok('preferência sandbox criada',false,String(e.message));}
const cfg=MP.config();const pm=await fetch('https://api.mercadopago.com/v1/payment_methods',{headers:{Authorization:'Bearer '+cfg.token}});ok('token TEST válido na API (payment_methods)',pm.ok);
const rid='smoke-'+Date.now();const ts=Math.floor(Date.now()/1000);
const r1=await p.handleWebhook({headers:{'x-signature':MP.signForTest({dataId:'1',requestId:rid,ts,secret:cfg.secret}),'x-request-id':rid},query:{'data.id':'1',type:'payment'},body:{type:'payment',live_mode:false,data:{id:'1'}}});
ok('webhook assinado (segredo real) → verificado; pagamento inexistente → 200 ignorado',r1.status===200&&r1.result==='ignored_unknown_payment',r1.result);
const r2=await p.handleWebhook({headers:{'x-signature':'ts='+ts+',v1='+'0'.repeat(64),'x-request-id':rid},query:{'data.id':'1',type:'payment'},body:{type:'payment'}});ok('webhook com assinatura falsa → 401',r2.status===401);
ok('nenhum segredo na saída',![cfg.token,cfg.secret,cfg.pub].some(v=>JSON.stringify([c,r1,r2]).includes(v)));
console.log(o.join('\n'));console.log('fail=',o.filter(x=>x.startsWith('FAIL')).length);
