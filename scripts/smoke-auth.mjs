// Smoke autenticado (somente leitura) com o usuário DEDICADO de smoke (org fictícia isolada, papel operador/viewer).
// Uso: KAC_E2E_EMAIL=... ADMIN_PASSWORD=... node scripts/smoke-auth.mjs [url]   (credenciais só do ambiente; nunca impressas)
// Prova o isolamento: o usuário de smoke enxerga 0 visitas (a org real não aparece). Não grava nada.
const U=(process.argv[2]||process.env.KAC_URL||'https://guardiao-komodo-access-core.vercel.app').replace(/\/$/,'');
const email=process.env.KAC_E2E_EMAIL, pw=process.env.ADMIN_PASSWORD; if(!email||!pw){console.error('credenciais ausentes');process.exit(2);}
const o=[];const ok=(n,c,x='')=>o.push(`${c===true?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);
const j=async r=>{try{return await r.json();}catch{return null;}};
let r=await fetch(U+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pw})});
const login=await j(r);const ck=(r.headers.get('set-cookie')||'').match(/kac_session=[^;]+/)?.[0];
ok('login do usuário de smoke',r.status===200&&!!ck,'HTTP '+r.status);
ok('papel não-admin',login?.data?.user?.papel!=='admin'&&login?.data?.papel!=='admin');
const H={cookie:ck||''};
for(const m of ['empresarial','residencial']){r=await fetch(`${U}/api/visitantes/${m}?limit=500`,{headers:H});const b=await j(r);const rows=Array.isArray(b)?b:b?.data;
  ok(`${m}: lista acessível`,r.status===200&&Array.isArray(rows),'HTTP '+r.status);ok(`${m}: isolamento — 0 visitas visíveis (org fictícia)`,Array.isArray(rows)&&rows.length===0,'n='+(rows?.length));}
r=await fetch(U+'/api/billing/plans',{headers:H});ok('rotas com flag desligada continuam 404',r.status===404);
r=await fetch(U+'/api/auth/logout',{method:'POST',headers:H});ok('logout',r.status===200);
r=await fetch(`${U}/api/visitantes/empresarial?limit=1`,{headers:H});ok('sessão encerrada → 401',r.status===401);
console.log(o.join('\n'));const f=o.filter(x=>!x.startsWith('PASS')).length;console.log('fail=',f);process.exit(f?1:0);
