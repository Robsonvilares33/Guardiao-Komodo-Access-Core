// Auditoria axe-core nos modais abertos (cadastro, dashboard, configuração; aba Morador no residencial). Só abre/fecha, não salva.
// Uso: ADMIN_PASSWORD via env; KAC_AXE=/caminho/axe.min.js node --experimental-websocket scripts/e2e/a11y-modals.mjs
import {launch} from './cdp.mjs'; import fs from 'node:fs'; import {createRequire} from 'node:module';
const U=process.env.KAC_URL||'https://guardiao-komodo-access-core.vercel.app';
const AXE=fs.readFileSync(process.env.KAC_AXE||createRequire(import.meta.url).resolve('axe-core/axe.min.js'),'utf8');
const FAIL_ON=(process.env.KAC_A11Y_FAIL_ON||'critical,serious').split(',');
const b=await launch();const o=[];const ok=(n,c,x='')=>o.push(`${c===true?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await b.nav(U+'/login.html');ok('login ('+(process.env.KAC_E2E_ROLE||'admin')+')',(await b.ev(`authService.login(${JSON.stringify(process.env.KAC_E2E_EMAIL||'robsonboiling@gmail.com')},${JSON.stringify(process.env.ADMIN_PASSWORD)}).then(s=>s.role).catch(()=>'ERR')`))===(process.env.KAC_E2E_ROLE||'admin'));
const cases=[['/','cadastro','btnOpenModal','#mainModalOverlay',null],['/','dashboard','btnOpenDashboard','#dashModalOverlay',null],['/','configuração','btnOpenConfig','#configModalOverlay',null],
 ['/residencial.html','cadastro (visitante)','btnOpenModal','#mainModalOverlay',null],['/residencial.html','cadastro (morador)','btnOpenModal','#mainModalOverlay','.modal-tab[data-target="sectionMorador"]'],['/residencial.html','dashboard','btnOpenDashboard','#dashModalOverlay',null],['/residencial.html','configuração','btnOpenConfig','#configModalOverlay',null]];
const all={};
for(const [page,name,btn,sel,tab] of cases){
  await b.nav(U+page);await sleep(2000);const P=(page==='/'?'empresarial':'residencial')+' '+name;
  const opened=await b.ev(`(()=>{const x=document.getElementById('${btn}');if(!x)return 'sem botão';x.click();return new Promise(r=>setTimeout(()=>{${tab?`const t=document.querySelector('${tab}');t&&t.click();`:''}setTimeout(()=>{const m=document.querySelector('${sel}');const cs=m&&getComputedStyle(m);const k=m&&m.firstElementChild;const h=Math.max(m?m.getBoundingClientRect().height:0,k?k.getBoundingClientRect().height:0);r(!!m&&cs.display!=='none'&&cs.visibility!=='hidden'&&h>0)},500)},1200))})()`);
  if(opened!==true){ok(`${P}: abre`,false,String(opened));continue;}
  await b.ev(AXE);const v=await b.ev(`axe.run('${sel}',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},resultTypes:['violations']}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,ex:v.nodes.slice(0,4).map(x=>x.target.join(' '))})))`);
  all[P]=v;const bad=(v||[]).filter(x=>FAIL_ON.includes(x.impact));ok(`${P}: 0 violações ${FAIL_ON.join('/')} (axe)`,Array.isArray(v)&&bad.length===0,JSON.stringify(bad));
}
ok('sem exceções JS',b.errors().length===0,b.errors().join('; '));
ok('nenhum diálogo de alerta',b.dialogs().length===0,b.dialogs().join(' | '));
await b.ev(`authService.logout()`);await sleep(1200);ok('logout → 401',(await b.ev(`fetch('/api/visitantes/empresarial').then(r=>r.status)`))===401);b.close();
console.log('axe nos modais (todas as severidades):');for(const [k,v] of Object.entries(all))console.log(' ',k+':',Array.isArray(v)?v.map(x=>`${x.id}[${x.impact}]x${x.n} ${x.ex.join(' ; ')}`).join(' | ')||'0':JSON.stringify(v));
console.log(o.join('\n'));const f=o.filter(x=>!x.startsWith('PASS')).length;console.log('fail=',f);process.exit(f?1:0);
