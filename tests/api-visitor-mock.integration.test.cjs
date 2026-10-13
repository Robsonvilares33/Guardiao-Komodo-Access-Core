'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/[...route].js');
const tables = { komodo_tbl_usuarios: [], komodo_web_sessions: [], komodo_login_attempts: [], komodo_acessos: [] };
const originalFetch = global.fetch;
process.env.SUPABASE_URL = 'https://mock-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-not-a-real-key';
function response(status, body = null) { return {ok:status>=200&&status<300,status,text:async()=>body==null?'':JSON.stringify(body)}; }
function invoke(route,method='GET',body={},headers={}) { const res={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}}; return Promise.resolve(handler({method,query:{route:route.split('/')},body,headers},res)).then(()=>({status:res.statusCode,headers:res.headers,body:res.body?JSON.parse(res.body):null})); }
global.fetch=async(url,opts={})=>{const u=new URL(url),table=u.pathname.split('/').pop();if(u.pathname.endsWith('/rpc/komodo_consume_login_attempt_atomic')){const p=JSON.parse(opts.body||'{}'),now=Date.parse(p.p_now||new Date().toISOString());for(let i=tables.komodo_login_attempts.length-1;i>=0;i--)if(Date.parse(tables.komodo_login_attempts[i].created_at)<now-24*60*60*1000)tables.komodo_login_attempts.splice(i,1);const n=tables.komodo_login_attempts.filter(x=>x.ip_hash===p.p_ip_hash&&Date.parse(x.created_at)>=now-15*60*1000).length;if(n>=10)return response(200,false);tables.komodo_login_attempts.push({id:p.p_id,ip_hash:p.p_ip_hash,created_at:p.p_now});return response(200,true);}const rows=tables[table];if(!rows)return response(404,{code:'42P01'});const q=Object.fromEntries(u.searchParams.entries()),method=opts.method||'GET',body=opts.body?JSON.parse(opts.body):null;if(method==='POST'){const v=Array.isArray(body)?body:[body];rows.push(...v);return response(201,opts.headers?.Prefer==='return=representation'?v:null);}const matches=rows.filter(row=>Object.entries(q).every(([k,v])=>{if(['select','order','limit'].includes(k))return true;if(v.startsWith('eq.'))return String(row[k])===decodeURIComponent(v.slice(3));return true;}));if(method==='PATCH'){matches.forEach(x=>Object.assign(x,body));return response(200,opts.headers?.Prefer==='return=representation'?matches:null);}if(method==='DELETE'){matches.forEach(x=>rows.splice(rows.indexOf(x),1));return response(204);}return response(200,matches.slice(0,Number(q.limit)||matches.length));};
test('authenticated operator can create and list visitors but cannot delete',async()=>{
  tables.komodo_tbl_usuarios.splice(0,tables.komodo_tbl_usuarios.length,{id:'op1',email:'op@example.com',papel:'operador',salt:'00112233445566778899aabbccddeeff',hash:require('node:crypto').pbkdf2Sync('Test-password-123','00112233445566778899aabbccddeeff',150000,32,'sha256').toString('hex')});
  tables.komodo_web_sessions.length=0;tables.komodo_login_attempts.length=0;tables.komodo_acessos.length=0;
  const login=await invoke('auth/login','POST',{email:'op@example.com',password:'Test-password-123'},{'x-forwarded-for':'192.0.2.2','x-forwarded-proto':'https'});
  assert.equal(login.status,200);const cookie=login.headers['Set-Cookie'].split(';')[0];
  const record={id:'visit-test-1',modulo:'residencial',dia:'seg',hora:'10:30',nome:'Visitante Teste',unidade:'A-101',tipo:'visita',placa:'ABC1234',acompanhantes:'',placaAcompanhante:'',historico:'',alerta:0,status:0};
  const created=await invoke('visitantes','POST',record,{cookie,'x-forwarded-proto':'https'});assert.equal(created.status,201);
  const listed=await invoke('visitantes/residencial','GET',{}, {cookie,'x-forwarded-proto':'https'});assert.equal(listed.status,200);assert.equal(listed.body.data.length,1);assert.equal(listed.body.data[0].nome,'Visitante Teste');
  const deleted=await invoke('visitantes/visit-test-1','DELETE',{}, {cookie,'x-forwarded-proto':'https'});assert.equal(deleted.status,403);assert.equal(tables.komodo_acessos.length,1);
});
test.after(()=>{global.fetch=originalFetch;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;});
