'use strict';
// Convites de visita (014): token forte só em hash, código por empresa, rotas do anfitrião escopadas à org, página pública com origem obrigatória e limite.
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');const fs=require('node:fs');const path=require('node:path');
const handler=require('../api/[...route].js');const V=require('../lib/visit-invites.cjs');const originalFetch=global.fetch;
process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
const ORG_A='aaaaaaaa-0000-4000-8000-000000000001',ORG_B='bbbbbbbb-0000-4000-8000-000000000001';
const tok=c=>c.repeat(43),h=t=>crypto.createHash('sha256').update(t).digest('hex');
const day=n=>{const d=new Date(Date.now()+n*864e5);return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(d);};
const T={komodo_web_sessions:['A','B','V'].map(c=>({token_hash:h(tok(c)),user_id:'u'+c.toLowerCase(),expires_at:'2099-01-01T00:00:00Z'})),
  komodo_tbl_usuarios:[{id:'ua',email:'a@example.com',papel:'operador'},{id:'ub',email:'b@example.com',papel:'operador'},{id:'uv',email:'v@example.com',papel:'operador'}],
  kac_memberships:[{organization_id:ORG_A,user_id:'ua',role:'operator',created_at:'2026-01-01'},{organization_id:ORG_B,user_id:'ub',role:'owner',created_at:'2026-01-01'},{organization_id:ORG_A,user_id:'uv',role:'viewer',created_at:'2026-01-01'}],
  kac_organizations:[{id:ORG_A,name:'Empresa A'},{id:ORG_B,name:'Empresa B'}],
  kac_audit_log:[],komodo_acessos:[{id:'vis-1',organization_id:ORG_A,status:0}],kac_visit_invites:[],kac_visit_invite_registrations:[]};
const calls=[];const res=(s,b)=>({ok:s<300,status:s,text:async()=>b==null?'':JSON.stringify(b)});
function match(r,u){return [...u.searchParams].every(([k,v])=>{if(['select','order','limit'].includes(k))return true;if(v.startsWith('eq.'))return String(r[k])===v.slice(3);if(v.startsWith('in.('))return v.slice(4,-1).split(',').includes(String(r[k]));return true;});}
let redeem={status:'ok',visit_id:'vis-1',invite_id:'x',organization_id:ORG_A,visit_date:'2026-10-20',hora_inicio:'14:00',hora_fim:'16:00'};let rateOk=true;
global.fetch=async(url,o={})=>{const u=new URL(url),t=u.pathname.replace('/rest/v1/',''),m=o.method||'GET';const body=o.body?JSON.parse(o.body):null;calls.push({t,m,q:decodeURIComponent(u.search),body});
  if(t==='rpc/kac_rate_hit')return res(200,rateOk);if(t==='rpc/kac_visit_invite_redeem')return res(200,redeem);
  const rows=T[t];if(!rows)return res(404,{});
  if(m==='POST'){const out=body.map(b=>({id:crypto.randomUUID(),uses:0,status:'active',created_at:new Date().toISOString(),...b}));rows.push(...out);return res(201,o.headers?.Prefer?.includes('representation')?out:null);}
  const sel=rows.filter(r=>match(r,u));if(m==='PATCH'){sel.forEach(r=>Object.assign(r,body));return res(200,sel);}return res(200,sel);};
test.after(()=>{global.fetch=originalFetch;});
function run(req){const r={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};return Promise.resolve(handler(req,r)).then(()=>({status:r.statusCode,headers:r.headers,body:r.body?JSON.parse(r.body):null}));}
function call(who,route,method='GET',body={},query={}){return run({method,query:{route:route.split('/'),...query},body,headers:{cookie:'kac_session='+tok(who),host:'x.example',origin:'https://x.example'}});}
function pub(route,body,headers={origin:'https://x.example','content-type':'application/json'}){return run({method:'POST',query:{route:route.split('/')},body,headers:{host:'x.example','x-real-ip':'203.0.113.7',...headers}});}
const base=()=>({modulo:'empresarial',nome:'Carla Convidada',anfitriao:'Rui',data:day(1),inicio:'14:00',fim:'16:00',usos:2});

test('token de 256 bits (base64url 43) e código de 8 sem caracteres ambíguos; normalização do código',()=>{const s=new Set();for(let i=0;i<200;i++){const t=V.newToken();assert.match(t,V.TOKEN_RE);s.add(t);const c=V.newCode();assert.match(c,/^[2-9A-HJ-NP-Z]{8}$/);}assert.equal(s.size,200);
  assert.equal(V.normCode('abcd-2345'),'ABCD2345');assert.equal(V.fmtCode('ABCD2345'),'ABCD-2345');assert.notEqual(V.codeHash(ORG_A,'ABCD2345'),V.codeHash(ORG_B,'ABCD2345'));});
test('validação: janela, usos, data passada/longe, validade do link',()=>{const c=s=>String(s??'').trim().slice(0,200);
  assert.equal(V.validateCreate(base(),c).errors.length,0);
  assert.ok(V.validateCreate({...base(),fim:'13:00'},c).errors.length);assert.ok(V.validateCreate({...base(),usos:21},c).errors.length);assert.ok(V.validateCreate({...base(),usos:0},c).errors.length===0);
  assert.ok(V.validateCreate({...base(),data:day(-2)},c).errors.length);assert.ok(V.validateCreate({...base(),data:day(70)},c).errors.length);assert.ok(V.validateCreate({...base(),data:'2026-02-30'},c).errors.length);
  assert.ok(V.validateCreate({...base(),validoAte:day(1)+'T17:00'},c).errors.length,'link não vale depois do fim');const ok=V.validateCreate({...base(),validoAte:day(1)+'T15:00'},c);assert.equal(ok.errors.length,0);assert.equal(ok.value.expires_at,new Date(day(1)+'T15:00:00-03:00').toISOString());
  assert.equal(V.validateCreate(base(),c).value.expires_at,new Date(day(1)+'T16:00:00-03:00').toISOString());});
let created;
test('criar: org da sessão (ignora a do corpo), grava só hashes, devolve token e código uma vez, no-store',async()=>{const r=await call('A','convites-visita','POST',{...base(),organization_id:ORG_B});assert.equal(r.status,201);created=r.body.data;
  assert.match(created.token,V.TOKEN_RE);assert.match(created.codigo,/^[2-9A-Z]{4}-[2-9A-Z]{4}$/);assert.equal(r.headers['Cache-Control'],'no-store');
  const row=T.kac_visit_invites.at(-1);assert.equal(row.organization_id,ORG_A);assert.equal(row.token_hash,h(created.token));assert.equal(row.code_hash,V.codeHash(ORG_A,created.codigo.replace('-','')));
  assert.ok(!JSON.stringify(T.kac_visit_invites).includes(created.token));assert.ok(!('token_hash' in created)&&!('code_hash' in created));
  const a=T.kac_audit_log.at(-1);assert.equal(a.action,'invite.create');assert.ok(!JSON.stringify(a.meta).includes('Carla'));});
test('viewer não cria nem revoga (403); B não vê nem revoga convite de A',async()=>{assert.equal((await call('V','convites-visita','POST',base())).status,403);
  assert.equal((await call('V','convites-visita/'+created.id+'/revogar','POST')).status,403);
  const l=await call('B','convites-visita','GET',{}, {modulo:'empresarial'});assert.equal(l.body.data.length,0);
  assert.equal((await call('B','convites-visita/'+created.id+'/revogar','POST')).status,404);assert.equal(T.kac_visit_invites.find(x=>x.id===created.id).status,'active');});
test('listar (A): sem hashes, com estado e cadastros',async()=>{T.kac_visit_invite_registrations.push({invite_id:created.id,organization_id:ORG_A,visit_id:'vis-1',nome:'Carla Convidada',placa:null,consent_at:'2026-10-18'});
  const l=await call('A','convites-visita','GET',{}, {modulo:'empresarial'});assert.equal(l.status,200);const i=l.body.data[0];assert.equal(i.estado,'active');assert.equal(i.cadastros[0].visitStatus,0);assert.ok(!JSON.stringify(l.body).match(/token_hash|code_hash|organization_id/));
  assert.equal((await call('A','convites-visita','GET',{}, {modulo:'x'})).status,400);});
test('portaria: busca pelo código na própria org; a outra org não acha o mesmo código',async()=>{const c=created.codigo.toLowerCase();const r=await call('A','convites-visita/codigo/'+c);assert.equal(r.status,200);assert.equal(r.body.data.id,created.id);assert.equal(r.body.data.cadastros.length,1);
  assert.equal((await call('B','convites-visita/codigo/'+c)).status,404);assert.equal((await call('A','convites-visita/codigo/XX')).status,404);});
test('página pública: ver exige Origin próprio e JSON; token malformado 404 genérico',async()=>{assert.equal((await pub('convite-publico/ver',{token:created.token},{'content-type':'application/json'})).status,403);
  assert.equal((await pub('convite-publico/ver',{token:created.token},{origin:'https://evil.example','content-type':'application/json'})).status,403);
  assert.equal((await pub('convite-publico/ver',{token:created.token},{origin:'https://x.example','content-type':'text/plain'})).status,403);
  assert.equal((await pub('convite-publico/ver',{token:'curto'})).status,404);assert.equal((await pub('convite-publico/ver',{token:V.newToken()})).status,404);
  const r=await pub('convite-publico/ver',{token:created.token});assert.equal(r.status,200);assert.equal(r.body.data.empresa,'Empresa A');assert.equal(r.body.data.restantes,2);assert.ok(!JSON.stringify(r.body).match(/token|hash|organization|"id"/));
  assert.equal((await run({method:'GET',query:{route:['convite-publico','ver']},body:{},headers:{host:'x.example',origin:'https://x.example'}})).status,404);});
test('página pública: confirmar exige consentimento, nome e honeypot vazio; chama o redeem só com o hash; audita na org do convite',async()=>{
  assert.equal((await pub('convite-publico/confirmar',{token:created.token,nome:'Carla Convidada'})).body.code,'consent_required');
  assert.equal((await pub('convite-publico/confirmar',{token:created.token,nome:'Al',consentimento:true})).status,422);
  assert.equal((await pub('convite-publico/confirmar',{token:created.token,nome:'Robo Silva',consentimento:true,website:'x'})).status,422);
  calls.length=0;redeem={...redeem,invite_id:created.id};const r=await pub('convite-publico/confirmar',{token:created.token,nome:' Carla  Convidada ',placa:'abc-1d23',consentimento:true});assert.equal(r.status,201);
  const c=calls.find(x=>x.t==='rpc/kac_visit_invite_redeem');assert.equal(c.body.p_token_hash,h(created.token));assert.equal(c.body.p_nome,'Carla Convidada');assert.equal(c.body.p_placa,'ABC-1D23');assert.equal(c.body.p_consent_version,V.CONSENT_VERSION);assert.ok(!JSON.stringify(c.body).includes(created.token));
  const a=T.kac_audit_log.at(-1);assert.equal(a.action,'invite.redeem');assert.equal(a.organization_id,ORG_A);assert.ok(!JSON.stringify(r.body).includes('vis-1'));
  for(const [st,code] of [['used_up',410],['revoked',410],['expired',410],['not_found',404]]){redeem={status:st};const x=await pub('convite-publico/confirmar',{token:created.token,nome:'Carla Convidada',consentimento:true});assert.equal(x.status,code);assert.equal(x.body.code,st);}});
test('limite de tentativas: 429 na página pública e na busca por código',async()=>{rateOk=false;try{assert.equal((await pub('convite-publico/ver',{token:created.token})).status,429);assert.equal((await call('A','convites-visita/codigo/'+created.codigo)).status,429);}finally{rateOk=true;}
  const b=calls.filter(c=>c.t==='rpc/kac_rate_hit').map(c=>c.body.p_bucket);assert.ok(b.some(x=>x.startsWith('inv:ip:')&&!x.includes('203.0.113.7')));});
test('revogar (A): muda o estado, audita; ver depois devolve 410 revoked',async()=>{const r=await call('A','convites-visita/'+created.id+'/revogar','POST');assert.equal(r.status,200);assert.equal(r.body.data.estado,'revoked');assert.equal(T.kac_audit_log.at(-1).action,'invite.revoke');
  const v=await pub('convite-publico/ver',{token:created.token});assert.equal(v.status,410);assert.equal(v.body.code,'revoked');assert.equal((await call('A','convites-visita/nao-uuid/revogar','POST')).status,404);});
test('UI: página pública sem script inline, token só do fragmento e removido da barra; anfitrião com Web Share e sem innerHTML',()=>{const root=path.join(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'convite.html'),'utf8');assert.ok(!/<script(?![^>]*src=)[^>]*>/.test(html));assert.ok(html.includes('privacidade-visitante.html'));assert.ok(/id="invConsent"[^>]*required/.test(html));assert.ok(html.includes('noindex'));
  const js=fs.readFileSync(path.join(root,'src/ui/convite-page.js'),'utf8');assert.ok(js.includes('location.hash')&&js.includes('replaceState'));assert.ok(!/innerHTML|localStorage|document\.cookie/.test(js));assert.ok(js.includes("credentials: 'omit'"));
  const ui=fs.readFileSync(path.join(root,'src/ui/VisitInvites.js'),'utf8');assert.ok(ui.includes('navigator.share'));assert.ok(!/innerHTML/.test(ui));assert.ok(ui.includes("'/convite.html#t='"));
  for(const f of ['index.html','residencial.html']){const s=fs.readFileSync(path.join(root,f),'utf8');assert.ok(s.includes('id="btnInvites"'));assert.ok(s.includes('data-nav="invites"'));}
  for(const b of ['agenda','residencial'])assert.ok(fs.readFileSync(path.join(root,'src/bundle/'+b+'.bundle.js'),'utf8').includes('KacVisitInvites'));});
test('migration 014: token/código só em hash, RLS, redeem sem anon, LGPD cobre convites',()=>{const s=fs.readFileSync(path.join(__dirname,'../docs/master/migrations/014_visit_invites.sql'),'utf8');
  assert.ok(/token_hash text not null unique/i.test(s));assert.ok(/enable row level security/i.test(s));assert.ok(/revoke all on function public\.kac_visit_invite_redeem[^;]*from public, anon, authenticated/i.test(s));
  for(const k of ['invite_registrations','kac_visit_invites','invites_anonymized'])assert.ok(s.includes(k));assert.ok(!/drop table|truncate/i.test(s.replace(/--.*$/gm,'')));});
