// Smoke test pós-deploy. Só faz leituras públicas: não precisa de segredo e não escreve nada.
// Uso: node scripts/smoke.mjs [baseUrl] [expectedSha]
const BASE = (process.argv[2] || process.env.SMOKE_URL || 'https://guardiao-komodo-access-core.vercel.app').replace(/\/$/, '');
const results = []; const check = (name, cond, info = '') => results.push({ name, ok: !!cond, info });
const get = async (p, opt = {}) => { const r = await fetch(BASE + p, { redirect: 'manual', ...opt }); let j = null; const t = await r.text(); try { j = JSON.parse(t); } catch {} return { r, t, j }; };
const home = await get('/');
check('GET / 200 + HTML do app', home.r.status === 200 && /AgendaNav\.js/.test(home.t), `status=${home.r.status}`);
for (const [h, re] of [['strict-transport-security', /max-age=\d+/], ['x-frame-options', /DENY/i], ['x-content-type-options', /nosniff/i], ['content-security-policy-report-only', /default-src 'self'/]])
  check(`header ${h}`, re.test(home.r.headers.get(h) || ''));
check('nenhum segredo no HTML', !/service_role|eyJhbGciOi|sk_live|SUPABASE_SERVICE/i.test(home.t));
for (const p of ['/login.html', '/residencial.html', '/src/ui/AgendaNav.js', '/src/core/KomodoDate.js']) { const x = await get(p); check(`GET ${p} 200`, x.r.status === 200, `status=${x.r.status}`); }
const health = await get('/api/health'); check('api/health online', health.r.status === 200 && health.j?.data?.status === 'online');
const st = await get('/api/auth/status'); check('api/auth/status ok (banco acessível)', st.r.status === 200 && st.j?.success === true && st.j?.data?.hasAdmin === true, `status=${st.r.status}`);
const v = await get('/api/visitantes/empresarial'); check('visitantes sem sessão → 401', v.r.status === 401);
const forged = await get('/api/visitantes/empresarial', { headers: { cookie: 'kac_session=' + 'x'.repeat(43) } }); check('cookie forjado → 401', forged.r.status === 401);
const del = await get('/api/visitantes/qualquer', { method: 'DELETE' }); check('DELETE sem sessão → 401', del.r.status === 401);
const ai = await get('/api/ai/chat', { method: 'POST' }); check('IA sem sessão → 401 (sem acesso)', ai.r.status === 401);
const nf = await get('/api/nao-existe'); check('rota inexistente → 404', nf.r.status === 404);
check('API com Cache-Control no-store', /no-store/.test(health.r.headers.get('cache-control') || ''));
const fail = results.filter(x => !x.ok);
for (const x of results) console.log(`${x.ok ? 'PASS' : 'FAIL'} ${x.name}${x.info && !x.ok ? ' — ' + x.info : ''}`);
console.log(`SMOKE ${BASE}: ${results.length - fail.length}/${results.length} PASS`);
process.exit(fail.length ? 1 : 0);
