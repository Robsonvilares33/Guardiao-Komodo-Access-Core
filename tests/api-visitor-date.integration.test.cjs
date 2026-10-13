'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');
const handler=require('../api/[...route].js');
const originalFetch=global.fetch;
process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
const token='C'.repeat(43);const hash=crypto.createHash('sha256').update(token).digest('hex');
const visitors=[];const urls=[];
// Mini avaliador do filtro PostgREST usado pela API: and=(or(data.eq.X,and(data.is.null,dia.eq.Y)))
function dayFilter(row,q){const m=/or\(data\.eq\.(\d{4}-\d{2}-\d{2}),and\(data\.is\.null,dia\.eq\.(\w+)\)\)/.exec(q.get('and')||'');if(!m)return true;return row.data===m[1]||(row.data==null&&row.dia===m[2]);}
function res(status,body){return{ok:status<300,status,text:async()=>body==null?'':JSON.stringify(body)};}
global.fetch=async(url,opts={})=>{const u=new URL(url);urls.push(decodeURIComponent(u.search));const t=u.pathname.split('/').pop();const method=opts.method||'GET';
  if(t==='komodo_web_sessions')return res(200,[{user_id:'u1',expires_at:new Date(Date.now()+3600e3).toISOString(),token_hash:hash}]);
  if(t==='komodo_tbl_usuarios')return res(200,[{id:'u1',email:'op@example.com',papel:'operador'}]);
  if(t==='komodo_acessos'){if(method==='POST'){visitors.push(...JSON.parse(opts.body));return res(201,null);}
    return res(200,visitors.filter(r=>r.modulo===(u.searchParams.get('modulo')||'').slice(3)&&dayFilter(r,u.searchParams)));}
  return res(404,{});};
function invoke(route,method='GET',body={},query={}){const r={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};return Promise.resolve(handler({method,query:{route:route.split('/'),...query},body,headers:{cookie:'kac_session='+token,'x-forwarded-proto':'https'}},r)).then(()=>({status:r.statusCode,body:r.body?JSON.parse(r.body):null}));}
test.after(()=>{global.fetch=originalFetch;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;});
const base={modulo:'empresarial',dia:'ter',hora:'09:00',nome:'Teste Data'};
test('POST grava data explícita quando confere com o dia da semana',async()=>{const r=await invoke('visitantes','POST',{...base,id:'a1',data:'2026-10-13'});assert.equal(r.status,201);assert.equal(visitors.at(-1).data,'2026-10-13');});
test('POST rejeita data que não corresponde ao dia',async()=>{const r=await invoke('visitantes','POST',{...base,id:'a2',data:'2026-10-14'});assert.equal(r.status,422);});
test('POST sem data usa a data do dia na semana atual (São Paulo)',async()=>{const r=await invoke('visitantes','POST',{...base,id:'a3'});assert.equal(r.status,201);assert.match(visitors.at(-1).data,/^\d{4}-\d{2}-\d{2}$/);assert.equal(new Date(visitors.at(-1).data+'T12:00:00Z').getUTCDay(),2);});
test('registro de terça 13/10 NÃO aparece na terça seguinte (20/10)',async()=>{visitors.length=0;await invoke('visitantes','POST',{...base,id:'b1',data:'2026-10-13'});
  const same=await invoke('visitantes/empresarial/ter','GET',{}, {data:'2026-10-13'});assert.deepEqual(same.body.data.map(x=>x.id),['b1']);
  const next=await invoke('visitantes/empresarial/ter','GET',{}, {data:'2026-10-20'});assert.equal(next.body.data.length,0);});
test('linha antiga sem data continua aparecendo pelo dia da semana',async()=>{visitors.push({id:'old',modulo:'empresarial',dia:'ter',hora:'08:00',nome:'Legado',data:null});
  const r=await invoke('visitantes/empresarial/ter','GET',{}, {data:'2026-10-20'});assert.deepEqual(r.body.data.map(x=>x.id),['old']);});
test('GET com data que não bate com o dia retorna 400',async()=>{const r=await invoke('visitantes/empresarial/ter','GET',{}, {data:'2026-10-14'});assert.equal(r.status,400);});
test('data inválida (31/02) é rejeitada',async()=>{const r=await invoke('visitantes','POST',{...base,id:'a4',data:'2026-02-31'});assert.equal(r.status,422);});
