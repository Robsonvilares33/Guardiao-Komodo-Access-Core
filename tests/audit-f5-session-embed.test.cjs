'use strict';
// Achado 5: sessão por cookie resolvida em 1 consulta (embedding); fallback de 3 consultas se o embedding falhar.
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');
const orig=global.fetch;process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
const api=require('../api/[...route].js');const ORG='18f0142f-645c-4eb7-8c9f-c780a0ccb94e';
let mode='embed',calls=[];const exp=new Date(Date.now()+3600e3).toISOString();
global.fetch=async(url)=>{const u=new URL(url),t=u.pathname.split('/').pop(),sel=u.searchParams.get('select')||'';calls.push(t+'?'+sel);const j=(s,b)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json'}});
 if(sel.includes('kac_memberships(')){if(mode==='broken')return j(400,{code:'PGRST200',message:'no relationship'});
  return j(200,t==='komodo_web_sessions'?[{user_id:'u1',expires_at:exp,komodo_tbl_usuarios:{id:'u1',email:'a@x.com',papel:'operador',kac_memberships:[{organization_id:'00000000-0000-4000-8000-000000000009',role:'viewer',created_at:'2026-05-01'},{organization_id:ORG,role:'owner',created_at:'2026-01-01'}]}}]:[]);}
 if(t==='komodo_web_sessions')return j(200,[{user_id:'u1',expires_at:exp}]);if(t==='komodo_tbl_usuarios')return j(200,[{id:'u1',email:'a@x.com',papel:'operador'}]);if(t==='kac_memberships')return j(200,[{organization_id:ORG,role:'owner'}]);return j(200,[]);};
test.after(()=>{global.fetch=orig;});
const req={headers:{cookie:'kac_session='+crypto.randomBytes(32).toString('hex')}};
test('uma ida ao banco; empresa mais antiga vence',async()=>{calls=[];const s=await api.sessionFor(req);assert.equal(calls.length,1);assert.equal(s.orgId,ORG);assert.equal(s.orgRole,'owner');assert.equal(s.userId,'u1');assert.equal(s.via,'cookie');});
test('embedding quebrado: cai em 3 consultas e para de tentar',async()=>{mode='broken';calls=[];const s=await api.sessionFor(req);assert.equal(s.orgId,ORG);assert.equal(api._embed.ok,false);calls=[];await api.sessionFor(req);assert.equal(calls.length,3);api._embed.ok=true;mode='embed';});
