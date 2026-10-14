'use strict';
// Isolamento entre organizações na API (mock PostgREST com filtros eq.). Org A x Org B + tentativas de IDOR.
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');
const handler=require('../api/[...route].js');const originalFetch=global.fetch;
process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
const ORG_A='aaaaaaaa-0000-4000-8000-000000000001',ORG_B='bbbbbbbb-0000-4000-8000-000000000001';
const tok=c=>c.repeat(43),h=t=>crypto.createHash('sha256').update(t).digest('hex');
const T={
  komodo_web_sessions:[{token_hash:h(tok('A')),user_id:'ua',expires_at:'2099-01-01T00:00:00Z'},{token_hash:h(tok('B')),user_id:'ub',expires_at:'2099-01-01T00:00:00Z'},{token_hash:h(tok('N')),user_id:'un',expires_at:'2099-01-01T00:00:00Z'}],
  komodo_tbl_usuarios:[{id:'ua',email:'a@example.com',papel:'admin'},{id:'ub',email:'b@example.com',papel:'admin'},{id:'un',email:'n@example.com',papel:'admin'}],
  kac_memberships:[{organization_id:ORG_A,user_id:'ua',role:'owner',created_at:'2026-01-01'},{organization_id:ORG_B,user_id:'ub',role:'owner',created_at:'2026-01-01'}],
  komodo_acessos:[{id:'va1',organization_id:ORG_A,modulo:'empresarial',dia:'ter',data:'2026-10-13',hora:'10:00',nome:'Visita Secreta A',unidade:'X',placa:'AAA1A11',status:0}]};
const calls=[];
function res(s,b){return{ok:s<300,status:s,text:async()=>b==null?'':JSON.stringify(b)};}
global.fetch=async(url,o={})=>{const u=new URL(url),t=u.pathname.split('/').pop(),m=o.method||'GET';calls.push({t,m,q:decodeURIComponent(u.search)});const rows=T[t];if(!rows)return res(404,{});
  const body=o.body?JSON.parse(o.body):null;if(m==='POST'){rows.push(...body);return res(201,null);}
  const sel=rows.filter(r=>[...u.searchParams].every(([k,v])=>!v.startsWith('eq.')||['select','order','limit','and'].includes(k)||String(r[k])===v.slice(3)));
  if(m==='PATCH'){sel.forEach(r=>Object.assign(r,body));return res(200,sel);}if(m==='DELETE'){sel.forEach(r=>rows.splice(rows.indexOf(r),1));return res(204,null);}return res(200,sel);};
test.after(()=>{global.fetch=originalFetch;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;});
function call(who,route,method='GET',body={},query={}){const r={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};return Promise.resolve(handler({method,query:{route:route.split('/'),...query},body,headers:{cookie:'kac_session='+tok(who)}},r)).then(()=>({status:r.statusCode,body:r.body?JSON.parse(r.body):null}));}
const visitA=()=>T.komodo_acessos.find(r=>r.id==='va1');

test('A lista a própria visita (controle positivo)',async()=>{const r=await call('A','visitantes/empresarial');assert.equal(r.status,200);assert.deepEqual(r.body.data.map(x=>x.id),['va1']);});
test('B não vê visitas de A na lista geral',async()=>{const r=await call('B','visitantes/empresarial');assert.equal(r.status,200);assert.equal(r.body.data.length,0);});
test('B não vê visitas de A por dia',async()=>{const r=await call('B','visitantes/empresarial/ter',undefined,undefined,{data:'2026-10-13'});assert.equal(r.status,200);assert.equal(r.body.data.length,0);});
test('B não vê visitas de A por período (range)',async()=>{const r=await call('B','visitantes/empresarial','GET',{}, {de:'2026-10-01',ate:'2026-10-31'});assert.equal(r.status,200);assert.equal(r.body.data.length,0);});
test('B não acha visitas de A pela busca',async()=>{const r=await call('B','visitantes/empresarial','GET',{}, {search:'Secreta'});assert.equal(r.status,200);assert.equal(r.body.data.length,0);});
test('toda query de visitas carrega o filtro da org da sessão',async()=>{calls.length=0;await call('B','visitantes/empresarial','GET',{}, {search:'x',de:'2026-10-01',ate:'2026-10-31'});const q=calls.filter(c=>c.t==='komodo_acessos');assert.ok(q.length>0);assert.ok(q.every(c=>c.q.includes('organization_id=eq.'+ORG_B)));});
test('IDOR: B não altera status da visita de A (404, sem mudança)',async()=>{const r=await call('B','visitantes/va1/status','PUT',{status:2});assert.equal(r.status,404);assert.equal(visitA().status,0);});
test('IDOR: B não apaga visita de A (404, continua existindo)',async()=>{const r=await call('B','visitantes/va1','DELETE');assert.equal(r.status,404);assert.ok(visitA());});
test('IDOR: id url-encoded/variações não escapam do filtro',async()=>{for(const id of ['va1%20','va1%2Cid%3Deq.va1','*']){const r=await call('B','visitantes/'+id,'DELETE');assert.equal(r.status,404);}assert.ok(visitA());});
test('POST: organization_id do corpo é ignorado; grava na org da sessão',async()=>{const r=await call('B','visitantes','POST',{modulo:'empresarial',dia:'ter',data:'2026-10-13',hora:'11:00',nome:'Visita de B',organization_id:ORG_A});assert.equal(r.status,201);const row=T.komodo_acessos.find(x=>x.nome==='Visita de B');assert.equal(row.organization_id,ORG_B);
  const a=await call('A','visitantes/empresarial');assert.ok(!a.body.data.some(x=>x.nome==='Visita de B'));});
test('A ainda altera e apaga o que é seu',async()=>{assert.equal((await call('A','visitantes/va1/status','PUT',{status:1})).status,200);assert.equal(visitA().status,1);});
test('usuário sem organização recebe 403 (fail closed)',async()=>{for(const [route,m] of [['visitantes/empresarial','GET'],['visitantes','POST'],['visitantes/va1','DELETE'],['visitantes/va1/status','PUT']]){const r=await call('N',route,m,{status:1,modulo:'empresarial',dia:'ter',hora:'10:00',nome:'Xyz'});assert.equal(r.status,403,route+' '+m);}assert.ok(visitA());});
