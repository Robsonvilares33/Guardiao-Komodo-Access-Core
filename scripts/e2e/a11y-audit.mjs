// Fase D (D4–D8): auditoria de acessibilidade ao vivo com axe-core (sem CDN; caminho local via KAC_AXE ou node_modules) + cliques de D4–D6.
// Uso: ADMIN_PASSWORD via env;  KAC_AXE=/caminho/axe.min.js node --experimental-websocket scripts/e2e/a11y-audit.mjs
// Não grava dados: só lê páginas, digita num campo e alterna um botão (restaurado), sem salvar.
import {launch} from './cdp.mjs'; import fs from 'node:fs'; import {createRequire} from 'node:module';
const U=process.env.KAC_URL||'https://guardiao-komodo-access-core.vercel.app';
const axePath=process.env.KAC_AXE||createRequire(import.meta.url).resolve('axe-core/axe.min.js'); const AXE=fs.readFileSync(axePath,'utf8');
const b=await launch();const o=[];const ok=(n,c,x='')=>o.push(`${c===true?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
const report={};
async function audit(name){await b.ev(AXE);const r=await b.ev(`axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},resultTypes:['violations']}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,ex:v.nodes.slice(0,3).map(x=>x.target.join(' '))})))`);report[name]=r;return r;}
const crit=r=>(r||[]).filter(v=>v.impact==='critical');
await b.nav(U+'/login.html');let r=await audit('login');ok('login: 0 violações críticas (axe)',Array.isArray(r)&&crit(r).length===0,JSON.stringify(crit(r)));
await b.nav(U+'/auth.html');await sleep(800);r=await audit('auth');ok('auth.html: 0 violações críticas (axe)',Array.isArray(r)&&crit(r).length===0,JSON.stringify(crit(r)));
await b.nav(U+'/login.html');const pw=JSON.stringify(process.env.ADMIN_PASSWORD);
ok('login admin',(await b.ev(`authService.login('robsonboiling@gmail.com',${pw}).then(s=>s.role).catch(()=>'ERR')`))==='admin');
for(const page of ['/','/residencial.html']){
  await b.nav(U+page);await sleep(2500);const P=page==='/'?'empresarial':'residencial';
  // D4
  const d4=await b.ev(`(()=>{const g=[...document.querySelectorAll('.btn-toggle-group')].find(g=>g.querySelectorAll('.btn-toggle').length>1);if(!g)return 'sem grupo';const bs=[...g.querySelectorAll('.btn-toggle')];const orig=bs.find(x=>x.classList.contains('active'));const other=bs.find(x=>x!==orig);const before=bs.map(x=>x.getAttribute('aria-pressed')).join(',');other.click();return new Promise(res=>setTimeout(()=>{const mid=bs.map(x=>x.getAttribute('aria-pressed')).join(',');orig.click();setTimeout(()=>res(before+'|'+mid+'|'+bs.map(x=>x.getAttribute('aria-pressed')).join(',')),100);},100));})()`);
  const [bf,md,af]=String(d4).split('|');ok(`${P} D4: aria-pressed acompanha o clique e volta ao original`,!!md&&bf===af&&bf!==md&&bf.includes('true'),String(d4));
  const tab=await b.ev(`[...document.querySelectorAll('.tab[data-dia]')].filter(t=>t.getAttribute('aria-current')==='date').length`);ok(`${P} D4: exatamente uma aba de dia com aria-current=date`,tab===1,String(tab));
  // D5
  const d5=await b.ev(`(()=>{const i=document.querySelector('input[data-field="nome"]');const v0=i.value;i.value='Jo';i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new FocusEvent('blur'));const inv=i.getAttribute('aria-invalid');const h=document.getElementById((i.getAttribute('aria-describedby')||'').split(' ').pop());const t=h&&h.textContent;i.value='João Teste';i.dispatchEvent(new Event('input',{bubbles:true}));const inv2=i.getAttribute('aria-invalid');i.value=v0;i.dispatchEvent(new Event('input',{bubbles:true}));return JSON.stringify({inv,t,inv2});})()`);
  const j5=JSON.parse(d5||'{}');ok(`${P} D5: nome curto → aria-invalid + dica ligada; corrigido → limpa`,j5.inv==='true'&&/3 caracteres/.test(j5.t||'')&&j5.inv2===null,d5);
  // D6
  const st=await b.ev(`(()=>{const s=document.getElementById('agendaStatus');return s&&s.getAttribute('role')+'|'+s.textContent})()`);ok(`${P} D6: região de status da agenda anunciada`,/^status\|(\d+ registros? na agenda\.|Nenhum)/.test(st||''),String(st));
  r=await audit(P);ok(`${P}: 0 violações críticas (axe)`,Array.isArray(r)&&crit(r).length===0,JSON.stringify(crit(r)));
}
ok('sem exceções JS',b.errors().length===0,b.errors().join('; '));
ok('CSP Report-Only: 0 violações',!b.events.some(e=>/Content.Security.Policy/i.test(e.params?.entry?.text||'')));
ok('nenhum diálogo de alerta disparado',b.dialogs().length===0,b.dialogs().join(' | '));
await b.ev(`authService.logout()`);await sleep(1200);ok('logout → 401',(await b.ev(`fetch('/api/visitantes/empresarial').then(r=>r.status)`))===401);
b.close();
if(process.env.KAC_A11Y_REPORT)fs.writeFileSync(process.env.KAC_A11Y_REPORT,JSON.stringify(report,null,1));
console.log('axe (todas as severidades):');for(const [k,v] of Object.entries(report))console.log(' ',k,Array.isArray(v)?v.map(x=>`${x.id}[${x.impact}]x${x.n}`).join(', ')||'0':JSON.stringify(v));
console.log(o.join('\n'));const f=o.filter(x=>!x.startsWith('PASS')).length;console.log('fail=',f);process.exit(f?1:0);
