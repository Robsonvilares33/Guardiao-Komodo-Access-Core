'use strict';
// Achado 3 (LGPD): exportar/apagar dados de um titular — só owner/admin com aal2, escopo da própria org, confirmação, 501 se a migração 010 faltar.
const test=require('node:test');const assert=require('node:assert/strict');const {createAdmin}=require('../lib/admin-api.cjs');
const ORG='a0000000-0000-4000-8000-000000000001';
function mk(sess,rpc){const calls=[];const reply=(res,st,b)=>{res.s=st;res.b=b;};const db=async(t,o={})=>{calls.push([t,o]);if(t.startsWith('rpc/')){if(rpc==='missing'){const e=new Error('DATABASE_ERROR');e.status=404;e.code='PGRST202';throw e;}return t.endsWith('delete')?1:{visits:[{id:'v1'}],history:[]};}return [];};
 const h=createAdmin({db,reply,audit:async()=>{},bearerSession:async()=>sess,ONB:{},clean:(v,n)=>String(v??'').trim().slice(0,n)});return {calls,run:async(route,body={},M='POST')=>{const res={};await h({method:M},res,route,body,{});return res;}};}
const owner={orgId:ORG,orgRole:'owner',aal:'aal2',userId:'u1'};
test('exporta pelo nome, com a org da sessão (nunca do cliente)',async()=>{const m=mk(owner);const r=await m.run('/admin/titular/exportar',{nome:'Maria',p_org:'b0000000-0000-4000-8000-000000000002'});assert.equal(r.s,200);assert.equal(m.calls[0][1].body.p_org,ORG);});
test('apagar exige confirmar:true',async()=>{const m=mk(owner);assert.equal((await m.run('/admin/titular/apagar',{nome:'Maria'})).s,422);const r=await m.run('/admin/titular/apagar',{nome:'Maria',confirmar:true});assert.equal(r.s,200);assert.equal(r.b.data.apagadas,1);});
test('sem nome nem placa → 422',async()=>{assert.equal((await mk(owner).run('/admin/titular/exportar',{})).s,422);});
test('operador ou sem MFA → 403',async()=>{assert.equal((await mk({...owner,orgRole:'operator'}).run('/admin/titular/exportar',{nome:'x'})).s,403);assert.equal((await mk({...owner,aal:'aal1'}).run('/admin/titular/exportar',{nome:'x'})).s,403);});
test('migração 010 ausente → 501 migration_pending',async()=>{const r=await mk(owner,'missing').run('/admin/titular/exportar',{nome:'x'});assert.equal(r.s,501);assert.equal(r.b.code,'migration_pending');});
test('F6: GET /admin e /admin/seguranca respondem 200',async()=>{assert.equal((await mk(owner).run('/admin',{},'GET')).s,200);const r=await mk(owner).run('/admin/seguranca',{},'GET');assert.equal(r.s,200);assert.equal(r.b.data.mfa,true);});
