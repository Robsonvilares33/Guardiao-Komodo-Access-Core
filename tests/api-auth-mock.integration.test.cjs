'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const handler = require('../api/[...route].js');
const tables = { komodo_tbl_usuarios: [], komodo_web_sessions: [], komodo_login_attempts: [], komodo_acessos: [] };
const originalFetch = global.fetch;
process.env.SUPABASE_URL = 'https://mock-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-not-a-real-key';
process.env.KAC_BOOTSTRAP_SECRET = 'mock-test-secret-with-at-least-thirty-two-characters';
function response(status, body = null) { return { ok: status >= 200 && status < 300, status, text: async () => body == null ? '' : JSON.stringify(body) }; }
function parseQuery(url) { return Object.fromEntries(new URL(url).searchParams.entries()); }
global.fetch = async (url, opts = {}) => {
  const u = new URL(url); const table = u.pathname.split('/').pop();
  if (u.pathname.endsWith('/rpc/komodo_bootstrap_admin_atomic')) {
    const p = JSON.parse(opts.body || '{}');
    if (tables.komodo_tbl_usuarios.length) return response(200, 'already_initialized');
    tables.komodo_tbl_usuarios.push({id:p.p_id,email:p.p_email,salt:p.p_salt,hash:p.p_hash,papel:'admin',criado_em:p.p_criado_em});
    return response(200, 'created');
  }
  if (u.pathname.endsWith('/rpc/komodo_consume_login_attempt_atomic')) {
    const p = JSON.parse(opts.body || '{}'); const now = Date.parse(p.p_now || new Date().toISOString());
    for (let i=tables.komodo_login_attempts.length-1;i>=0;i--) if (Date.parse(tables.komodo_login_attempts[i].created_at)<now-24*60*60*1000) tables.komodo_login_attempts.splice(i,1);
    const n=tables.komodo_login_attempts.filter(x=>x.ip_hash===p.p_ip_hash&&Date.parse(x.created_at)>=now-15*60*1000).length;
    if(n>=10)return response(200,false);
    tables.komodo_login_attempts.push({id:p.p_id,ip_hash:p.p_ip_hash,created_at:p.p_now});
    return response(200,true);
  }
  const rows = tables[table];
  if (!rows) return response(404, {code:'42P01'});
  const method = opts.method || 'GET';
  let body = opts.body ? JSON.parse(opts.body) : null;
  const q = parseQuery(url);
  if (method === 'POST') { const values = Array.isArray(body) ? body : [body]; rows.push(...values); return response(201, opts.headers?.Prefer === 'return=representation' ? values : null); }
  const matched = rows.filter(row => Object.entries(q).every(([key, value]) => {
    if (key === 'select' || key === 'order' || key === 'limit') return true;
    if (value.startsWith('eq.')) return String(row[key]) === decodeURIComponent(value.slice(3));
    if (value.startsWith('gte.')) return String(row[key]) >= decodeURIComponent(value.slice(4));
    if (value.startsWith('lt.')) return String(row[key]) < decodeURIComponent(value.slice(3));
    return true;
  }));
  if (method === 'PATCH') { matched.forEach(row => Object.assign(row, body)); return response(200, opts.headers?.Prefer === 'return=representation' ? matched : null); }
  if (method === 'DELETE') { for (const row of matched) { const i = rows.indexOf(row); if (i >= 0) rows.splice(i, 1); } return response(204); }
  return response(200, matched.slice(0, Number(q.limit) || matched.length));
};
function invoke(route, method='GET', body={}, headers={}) { const res = {statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}}; return Promise.resolve(handler({method,query:{route:route.split('/')},body,headers},res)).then(()=>({status:res.statusCode,headers:res.headers,body:res.body?JSON.parse(res.body):null})); }
test('bootstrap rejects a missing/incorrect server secret without creating a user', async () => {
  tables.komodo_tbl_usuarios.length = 0;
  const r = await invoke('auth/bootstrap','POST',{email:'admin@example.com',password:'Strong-password-123'});
  assert.equal(r.status,403); assert.equal(tables.komodo_tbl_usuarios.length,0);
});
test('bootstrap creates first admin and rejects a second bootstrap', async () => {
  tables.komodo_tbl_usuarios.length = 0;
  const payload = {email:'admin@example.com',password:'Strong-password-123',bootstrapSecret:process.env.KAC_BOOTSTRAP_SECRET};
  const first = await invoke('auth/bootstrap','POST',payload);
  assert.equal(first.status,201); assert.equal(tables.komodo_tbl_usuarios.length,1);
  assert.equal(tables.komodo_tbl_usuarios[0].papel,'admin');
  assert.notEqual(tables.komodo_tbl_usuarios[0].hash,payload.password);
  const second = await invoke('auth/bootstrap','POST',payload);
  assert.equal(second.status,409); assert.equal(tables.komodo_tbl_usuarios.length,1);
});
test('login creates HttpOnly session cookie and does not return token in JSON', async () => {
  tables.komodo_web_sessions.length = 0; tables.komodo_login_attempts.length = 0;
  const user = tables.komodo_tbl_usuarios[0];
  const r = await invoke('auth/login','POST',{email:user.email,password:'Strong-password-123'},{'x-forwarded-for':'192.0.2.1','x-forwarded-proto':'https'});
  assert.equal(r.status,200); assert.match(r.headers['Set-Cookie'],/HttpOnly/); assert.match(r.headers['Set-Cookie'],/Secure/);
  assert.equal(r.body.data.user.email,user.email); assert.equal(JSON.stringify(r.body).includes('kac_session='),false);
  assert.equal(tables.komodo_web_sessions.length,1);
});
test('unauthenticated visitor API is denied', async () => {
  const r = await invoke('visitantes/residencial','GET',{},{});
  assert.equal(r.status,401);
});
test.after(() => { global.fetch = originalFetch; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; delete process.env.KAC_BOOTSTRAP_SECRET; });
