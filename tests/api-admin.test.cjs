'use strict';
// UX item 9 — API de administração: flag, Bearer aal2, owner/admin, escopo da org, salvaguardas, auditoria, sem segredos.
const test=require('node:test');const assert=require('node:assert/strict');
const handler=require('../api/[...route].js');const {canManage}=require('../lib/admin-api.cjs');const originalFetch=global.fetch;
process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
const jwt=(sub,aal)=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub,aal,role:'authenticated'})).toString('base64url')+'.sig_'+'x'.repeat(20);
const A='a0000000-0000-4000-8000-000000000001',O2='b0000000-0000-4000-8000-000000000002',INV='c0000000-0000-4000-8000-000000000003',INV2='c0000000-0000-4000-8000-000000000004';
const AU={own:'11111111-1111-4111-8111-111111111111',adm:'22222222-2222-4222-8222-222222222222',op:'33333333-3333-4333-8333-333333333333'};
let T;function reset(){T={komodo_tbl_usuarios:[{id:'u_own',email:'own@x.com',auth_user_id:AU.own,papel:'admin',hash:'H',salt:'S'},{id:'u_adm',email:'adm@x.com',auth_user_id:AU.adm,papel:'operador',hash:'H',salt:'S'},{id:'u_op',email:'op@x.com',auth_user_id:AU.op,papel:'operador',hash:'H',salt:'S'},{id:'u_vw',email:'vw@x.com',auth_user_id:null},{id:'u_other',email:'other@y.com',auth_user_id:null}],
  kac_memberships:[{organization_id:A,user_id:'u_own',role:'owner',created_at:'1'},{organization_id:A,user_id:'u_adm',role:'admin',created_at:'2'},{organization_id:A,user_id:'u_op',role:'operator',created_at:'3'},{organization_id:A,user_id:'u_vw',role:'viewer',created_at:'4'},{organization_id:O2,user_id:'u_other',role:'owner',created_at:'5'}],
  kac_organizations:[{id:A,name:'Cond A',kind:'condominio',cnpj:null,timezone:'America/Sao_Paulo',status:'active'},{id:O2,name:'Outra',kind:'empresa'}],
  kac_invites:[{id:INV,organization_id:A,email:'n@x.com',role:'operator',token_hash:'SECRET_HASH',accepted_at:null,expires_at:'2999-01-01T00:00:00Z',created_at:'1'},{id:INV2,organization_id:A,email:'a@x.com',role:'admin',token_hash:'SECRET_HASH',accepted_at:null,expires_at:'2999-01-01T00:00:00Z',created_at:'2'}],
  kac_audit_log:[{id:1,organization_id:A,actor_user_id:'u_op',action:'visit.status',entity:'visit',meta:{nome:'PII'},created_at:'t'},{id:2,organization_id:O2,actor_user_id:'u_other',action:'x',entity:'visit',created_at:'t'}],kac_subscriptions:[{organization_id:A,plan_id:'free',status:'active'}]};}
function match(row,q){for(const [k,v] of q){if(['select','order','limit'].includes(k))continue;const val=row[k];const [op,...r]=v.split('.');const x=r.join('.');
  if(op==='eq'&&String(val)!==x)return false;if(op==='is'&&val!=null)return false;if(op==='gt'&&!(String(val)>x))return false;if(op==='lt'&&!(Number(val)<Number(x)))return false;if(op==='in'&&!x.slice(1,-1).split(',').includes(String(val)))return false;}return true;}
function res(s,b){return{ok:s<300,status:s,text:async()=>b==null?'':JSON.stringify(b)};}
global.fetch=async(url,o={})=>{const u=new URL(url);if(u.pathname==='/auth/v1/user'){const tok=(o.headers.Authorization||'').slice(7);try{const p=JSON.parse(Buffer.from(tok.split('.')[1],'base64url'));return res(200,{id:p.sub,email:'z@x.com',email_confirmed_at:'1'});}catch{return res(401,{});}}
  const tbl=u.pathname.split('/').pop();const rows=T[tbl]||[];const q=[...u.searchParams];const m=o.method||'GET';
  if(m==='GET'){let out=rows.filter(r=>match(r,q));const lim=u.searchParams.get('limit');if(u.searchParams.get('order')==='id.desc')out=[...out].sort((a,b)=>b.id-a.id);if(lim)out=out.slice(0,+lim);return res(200,out);}
  if(m==='POST'){const b=JSON.parse(o.body);rows.push(...b);T[tbl]=rows;return res(201,null);}
  if(m==='PATCH'){const b=JSON.parse(o.body);rows.filter(r=>match(r,q)).forEach(r=>Object.assign(r,b));return res(204,null);}
  if(m==='DELETE'){T[tbl]=rows.filter(r=>!match(r,q));return res(204,null);}return res(404,{});};
test.after(()=>{global.fetch=originalFetch;delete process.env.KAC_SUPABASE_AUTH;});
function call(method,parts,tok,body,query={}){const r={statusCode:0,setHeader(){},end(v){this.body=v;}};const headers={'x-real-ip':'10.1.1.1'};if(tok)headers.authorization='Bearer '+tok;
  return Promise.resolve(handler({method,query:{route:['admin',...parts],...query},body:body||{},headers},r)).then(()=>({status:r.statusCode,body:r.body?JSON.parse(r.body):null,raw:r.body||''}));}
const own=()=>jwt(AU.own,'aal2'),adm=()=>jwt(AU.adm,'aal2');
test('regras puras: owner intocável; admin não mexe em admin nem promove a admin',()=>{assert.ok(!canManage('owner','owner','viewer'));assert.ok(canManage('owner','admin','viewer'));assert.ok(!canManage('admin','admin','viewer'));assert.ok(!canManage('admin','operator','admin'));assert.ok(canManage('admin','operator','viewer'));assert.ok(!canManage('operator','viewer','viewer'));assert.ok(!canManage('owner','viewer','owner'));});
test('flag OFF → 404',async()=>{reset();delete process.env.KAC_SUPABASE_AUTH;assert.equal((await call('GET',['resumo'],own())).status,404);});
test('sem bearer → 401; aal1 → 403 mfa_required; operador → 403',async()=>{process.env.KAC_SUPABASE_AUTH='on';reset();assert.equal((await call('GET',['resumo'])).status,401);
  const r=await call('GET',['resumo'],jwt(AU.own,'aal1'));assert.equal(r.status,403);assert.equal(r.body.code,'mfa_required');assert.equal((await call('GET',['membros'],jwt(AU.op,'aal2'))).status,403);});
test('resumo e membros: só a própria org, sem hash/salt',async()=>{reset();const r=await call('GET',['resumo'],own());assert.equal(r.status,200);assert.equal(r.body.data.org.name,'Cond A');assert.equal(r.body.data.me.mfa,true);assert.equal(r.body.data.counts.members,4);
  const m=await call('GET',['membros'],adm());assert.equal(m.body.data.length,4);assert.ok(!m.raw.includes('other@y.com'));assert.ok(!/"hash"|"salt"/.test(m.raw));});
test('mudar papel: owner rebaixa admin (auditado); admin não altera admin, owner nem a si; papel owner proibido',async()=>{reset();
  assert.equal((await call('PUT',['membros','u_adm'],own(),{role:'viewer'})).status,200);assert.equal(T.kac_memberships.find(m=>m.user_id==='u_adm').role,'viewer');assert.ok(T.kac_audit_log.some(a=>a.action==='member.role'&&a.organization_id===A&&a.meta.to==='viewer'));
  reset();assert.equal((await call('PUT',['membros','u_own'],adm(),{role:'viewer'})).status,403);assert.equal((await call('PUT',['membros','u_adm'],adm(),{role:'viewer'})).status,403);
  assert.equal((await call('PUT',['membros','u_op'],own(),{role:'owner'})).status,403);assert.equal((await call('PUT',['membros','u_own'],own(),{role:'admin'})).status,403);
  assert.equal((await call('PUT',['membros','u_other'],own(),{role:'viewer'})).status,404);assert.equal(T.kac_memberships.find(m=>m.user_id==='u_other').role,'owner');});
test('remover membro: admin remove operador (auditado); outra org → 404',async()=>{reset();assert.equal((await call('DELETE',['membros','u_op'],adm())).status,200);assert.ok(!T.kac_memberships.some(m=>m.user_id==='u_op'));assert.ok(T.kac_audit_log.some(a=>a.action==='member.remove'));
  assert.equal((await call('DELETE',['membros','u_other'],adm())).status,404);assert.equal((await call('DELETE',['membros','u_own'],adm())).status,403);});
test('convites: lista sem token_hash; admin revoga operador mas não convite de admin; owner revoga',async()=>{reset();const l=await call('GET',['convites'],adm());assert.equal(l.body.data.length,2);assert.ok(!l.raw.includes('SECRET_HASH'));
  assert.equal((await call('DELETE',['convites',INV2],adm())).status,403);assert.equal((await call('DELETE',['convites',INV],adm())).status,200);assert.equal(T.kac_invites.length,1);assert.ok(T.kac_audit_log.some(a=>a.action==='invite.revoke'));
  assert.equal((await call('DELETE',['convites','nao-uuid'],own())).status,400);assert.equal((await call('DELETE',['convites',INV2],own())).status,200);});
test('empresa: valida (422) e audita só nomes dos campos',async()=>{reset();assert.equal((await call('PUT',['empresa'],adm(),{name:'X',kind:'castelo'})).status,422);
  const r=await call('PUT',['empresa'],adm(),{name:'Cond A Novo',kind:'condominio',cnpj:'11.222.333/0001-81',timezone:'America/Sao_Paulo'});assert.equal(r.status,200);assert.deepEqual(r.body.data.changed.sort(),['cnpj','name']);
  assert.equal(T.kac_organizations[0].cnpj,'11222333000181');assert.equal(T.kac_organizations[1].name,'Outra');assert.deepEqual(T.kac_audit_log.at(-1).meta.fields.sort(),['cnpj','name']);});
test('auditoria: só a org, sem meta (PII), ator por e-mail',async()=>{reset();const r=await call('GET',['auditoria'],adm(),null,{limit:'10'});assert.equal(r.body.data.length,1);assert.equal(r.body.data[0].actor,'op@x.com');assert.ok(!r.raw.includes('PII'));assert.ok(!r.raw.includes('test-only'));});
