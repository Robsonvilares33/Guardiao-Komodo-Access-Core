'use strict';
// Testes de agenda (seção 7.3). Os marcados com { todo } dependem de migrations ainda não aprovadas.
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');
const KD=require('../src/core/KomodoDate.js');const handler=require('../api/[...route].js');
const originalFetch=global.fetch;process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
const token='D'.repeat(43),hash=crypto.createHash('sha256').update(token).digest('hex');const rows=[];
function res(s,b){return{ok:s<300,status:s,text:async()=>b==null?'':JSON.stringify(b)};}
function match(r,q){const a=q.get('and')||'';const m=/or\(data\.eq\.([\d-]+),and\(data\.is\.null,dia\.eq\.(\w+)\)\)/.exec(a);if(m&&!(r.data===m[1]||(r.data==null&&r.dia===m[2])))return false;
  const g=/data\.gte\.([\d-]+)/.exec(a);if(g&&!(r.data&&r.data>=g[1]))return false;const l=/data\.lte\.([\d-]+)/.exec(a);if(l&&!(r.data&&r.data<=l[1]))return false;return true;}
global.fetch=async(url,o={})=>{const u=new URL(url),t=u.pathname.split('/').pop(),m=o.method||'GET';
  if(t==='komodo_web_sessions')return res(200,[{user_id:'u1',expires_at:new Date(Date.now()+3600e3).toISOString()}]);
  if(t==='komodo_tbl_usuarios')return res(200,[{id:'u1',email:'a@example.com',papel:'admin'}]);
  if(m==='POST'){rows.push(...JSON.parse(o.body));return res(201,null);}
  return res(200,rows.filter(r=>r.modulo===u.searchParams.get('modulo').slice(3)&&match(r,u.searchParams)).sort((a,b)=>(a.data||'').localeCompare(b.data||'')));};
test.after(()=>{global.fetch=originalFetch;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;});
function call(route,method='GET',body={},query={}){const r={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};return Promise.resolve(handler({method,query:{route:route.split('/'),...query},body,headers:{cookie:'kac_session='+token}},r)).then(()=>({status:r.statusCode,body:r.body?JSON.parse(r.body):null}));}
const add=(id,data,dia)=>call('visitantes','POST',{id,modulo:'empresarial',dia:dia||KD.weekdayKeyOfISO(data),hora:'10:00',nome:'Agenda '+id,data});
test.before(async()=>{await add('hoje','2026-10-13');await add('fut','2026-10-16');await add('pass','2026-10-06');await add('prox_ter','2026-10-20');rows.push({id:'legado',modulo:'empresarial',dia:'ter',hora:'08:00',nome:'Legado',data:null});});

test('7.3-01 registro de hoje aparece no dia de hoje',async()=>{const r=await call('visitantes/empresarial/ter','GET',{}, {data:'2026-10-13'});assert.ok(r.body.data.some(x=>x.id==='hoje'));});
test('7.3-02 agendamento futuro aparece em Próximos e não em Hoje',async()=>{const h=await call('visitantes/empresarial/ter','GET',{}, {data:'2026-10-13'});assert.ok(!h.body.data.some(x=>x.id==='fut'));const f=await call('visitantes/empresarial','GET',{}, {de:'2026-10-14'});assert.deepEqual(f.body.data.map(x=>x.id),['fut','prox_ter']);});
test('7.3-03 passado aparece no Histórico e não em Próximos',async()=>{const h=await call('visitantes/empresarial','GET',{}, {ate:'2026-10-12'});assert.deepEqual(h.body.data.map(x=>x.id),['pass']);});
test('7.3-04 terça 13/10 não aparece na terça 20/10',async()=>{const r=await call('visitantes/empresarial/ter','GET',{}, {data:'2026-10-20'});assert.ok(!r.body.data.some(x=>x.id==='hoje'));assert.ok(r.body.data.some(x=>x.id==='prox_ter'));});
test('7.3-05 linha legada (data nula) aparece pelo dia da semana e fica fora de intervalos',async()=>{const d=await call('visitantes/empresarial/ter','GET',{}, {data:'2026-10-20'});assert.ok(d.body.data.some(x=>x.id==='legado'));const r=await call('visitantes/empresarial','GET',{}, {de:'2026-01-01',ate:'2026-12-31'});assert.ok(!r.body.data.some(x=>x.id==='legado'));});
test('7.3-06 "hoje" usa America/Sao_Paulo (23:30 BRT = 02:30 UTC do dia seguinte)',()=>{assert.equal(KD.todayISO(new Date('2026-10-14T02:30:00Z')),'2026-10-13');});
test('7.3-07 navegação de semana atravessa virada de mês corretamente',()=>{assert.equal(KD.addDaysISO('2026-10-27',7),'2026-11-03');KD.setReference('2026-11-03');const w=KD.weekDates();assert.equal(KD.toISO(w.seg),'2026-11-02');assert.equal(KD.toISO(w.dom),'2026-11-08');KD.setReference(null);});
test('7.3-08 período inválido (de > até, data inexistente) é rejeitado',async()=>{assert.equal((await call('visitantes/empresarial','GET',{}, {de:'2026-10-20',ate:'2026-10-01'})).status,400);assert.equal((await call('visitantes/empresarial','GET',{}, {de:'2026-02-30'})).status,400);});
test('7.3-09 reagendamento preserva histórico (visit_history)',{todo:'requer migration 005/006 (visits + visit_history) — não aprovada'},()=>{assert.fail('pendente de esquema');});
test('7.3-10 isolamento entre organizações e concorrência de agenda',{todo:'requer organization_id + RLS (migration 005) — validado só em PGlite descartável'},()=>{assert.fail('pendente de esquema');});
