// Carrega páginas com sessão e conta violações de CSP e exceções JS. Só leitura (não grava nada). ADMIN_PASSWORD via env.
//   node --experimental-websocket scripts/e2e/csp-pages.mjs  [KAC_URL=...] [KAC_E2E_EMAIL=...]
import {launch} from './cdp.mjs';
const U=process.env.KAC_URL||'https://guardiao-komodo-access-core.vercel.app';
const b=await launch();await b.send('Log.enable');const sleep=ms=>new Promise(r=>setTimeout(r,ms));const o=[];const ok=(n,c,x='')=>o.push(`${c===true?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);
const csp=()=>b.events.filter(e=>/Content.Security.Policy/i.test(e.params?.entry?.text||'')).map(e=>e.params.entry.text.slice(0,160));
await b.nav(U+'/login.html');
ok('login',(await b.ev(`authService.login(${JSON.stringify(process.env.KAC_E2E_EMAIL||'robsonboiling@gmail.com')},${JSON.stringify(process.env.ADMIN_PASSWORD)}).then(s=>!!s.role).catch(()=>false)`))===true);
for(const p of ['/','/residencial.html','/auth.html','/alpr.html']){const c0=csp().length,e0=b.errors().length;await b.nav(U+p);await sleep(1500);
  const body=await b.ev(`document.body&&document.body.innerText.length>0`);
  ok(p+' carrega',body===true);ok(p+' CSP: 0 violações',csp().length===c0,csp().slice(c0).join('; '));ok(p+' sem exceções JS',b.errors().length===e0,b.errors().slice(e0).join('; '));}
await b.nav(U+'/login.html');await b.ev(`authService.logout&&authService.logout()`);
console.log(o.join('\n'));console.log('fail=',o.filter(x=>x.startsWith('FAIL')).length);b.close();process.exit(0);
