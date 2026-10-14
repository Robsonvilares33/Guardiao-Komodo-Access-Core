// E2E de UI (Reagendar + Histórico) contra produção. Uso: ADMIN_PASSWORD via env (nunca na linha de comando):
//   node --experimental-websocket scripts/e2e/ui-visit-actions.mjs   [KAC_URL=https://...]
// Só cria/apaga uma linha 'TESTE AUDITORIA UI'; a visita real é comparada antes/depois (lista completa via API).
import {launch} from './cdp.mjs';
const U=process.env.KAC_URL||'https://guardiao-komodo-access-core.vercel.app';
const TZ='America/Sao_Paulo',iso=d=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ}).format(d),br=s=>s.split('-').reverse().join('/');
const DIAS=['dom','seg','ter','qua','qui','sex','sab'];const D0=iso(new Date()),D1=iso(new Date(Date.now()+3*864e5));const dia=s=>DIAS[new Date(s+'T12:00:00Z').getUTCDay()];const b=await launch();await b.send('Log.enable');
const o=[];const ok=(n,c,x='')=>o.push(`${c===true?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await b.nav(U+'/login.html');const pw=JSON.stringify(process.env.ADMIN_PASSWORD);
ok('login',(await b.ev(`authService.login('robsonboiling@gmail.com',${pw}).then(s=>s.role).catch(()=>'ERR')`))==='admin');
await b.nav(U+'/');await sleep(1500);
const realBefore=await b.ev(`apiService.get('/visitantes/empresarial?limit=500').then(r=>JSON.stringify((Array.isArray(r)?r:r.data).filter(x=>!/TESTE AUDITORIA/.test(x.nome)).map(x=>[x.id,x.data,x.hora,x.status,x.nome])))`);
const existing=await b.ev(`((appStore.getState('visitors').dailyData||[]).find(x=>x.nome==='TESTE AUDITORIA UI')||{}).id||null`);
const id=existing||await b.ev(`apiService.post('/visitantes',{modulo:'empresarial',dia:'${dia(D0)}',data:'${D0}',hora:'23:40',nome:'TESTE AUDITORIA UI',unidade:'TESTE'}).then(r=>(r&&r.data&&r.data.id)||(r&&r.id)||null)`);
ok('linha TESTE disponível (reaproveitada da tentativa anterior: '+(!!existing)+')',/^[0-9a-f-]{36}$/.test(id||''));
if(!/^[0-9a-f-]{36}$/.test(id||'')){console.log(o.join('\n'));console.log('ABORT sem id');b.close();process.exit(1);}
await b.ev(`renderController.reloadDailyData('${dia(D0)}','empresarial')`);await sleep(2500);
const sel=`#cardsContainer .card[data-id="${id}"]`;
ok('card tem botões Reagendar/Histórico com aria-label',await b.ev(`(()=>{const c=document.querySelector('${sel}');const r=c&&c.querySelector('[data-visit-action=reschedule]');const h=c&&c.querySelector('[data-visit-action=history]');return !!(r&&h&&r.getAttribute('aria-label').startsWith('Reagendar')&&r.getBoundingClientRect().height>=44)})()`));
ok('visita real também tem botões (sem alterar)',await b.ev(`[...document.querySelectorAll('#cardsContainer .card')].filter(c=>c.dataset.id!=='${id}').every(c=>c.querySelector('.visit-actions'))`));
await b.ev(`document.querySelector('${sel} [data-visit-action=reschedule]').click()`);await sleep(500);
ok('diálogo modal abre com foco no campo de data',await b.ev(`document.getElementById('visitDialog').open&&document.activeElement.id==='reschedData'`));
ok('diálogo cabe na tela mobile',await b.ev(`document.getElementById('visitDialog').getBoundingClientRect().width<=390`));
await b.ev(`(()=>{const d=document.getElementById('reschedData'),h=document.getElementById('reschedHora');d.value='${D1}';h.value='08:15';document.getElementById('reschedSave').click();})()`);await sleep(3500);
ok('diálogo fecha após salvar',await b.ev(`!document.getElementById('visitDialog').open`));
ok('TESTE saiu do dia original',await b.ev(`!document.querySelector('${sel}')`));
await b.ev(`(()=>{const p=document.getElementById('agendaDate');p.value='${D1}';p.dispatchEvent(new Event('change'));})()`);await sleep(3000);
ok('TESTE aparece no novo dia às 08:15',await b.ev(`(()=>{const v=(appStore.getState('visitors').dailyData||[]).find(x=>x.id==='${id}');return !!(v&&v.data==='${D1}'&&v.hora==='08:15'&&document.querySelector('${sel}'))})()`));
await b.ev(`document.querySelector('${sel} [data-visit-action=history]').click()`);await sleep(2500);
const hist=await b.ev(`[...document.querySelectorAll('.visit-history-list li')].map(li=>li.innerText.replace(/\\s+/g,' ')).join(' | ')`);
ok('histórico: Criado + Reagendado (antes → depois, dd/mm/aaaa)',/Criado/.test(hist)&&/Reagendado/.test(hist)&&hist.includes(br(D0)+' 23:40 → '+br(D1)+' 08:15'),hist);
await b.ev(`document.querySelector('.visit-dialog-close').click()`);await sleep(300);
ok('fechar devolve foco ao botão Histórico',await b.ev(`document.activeElement&&document.activeElement.dataset.visitAction==='history'`));
await b.ev(`document.querySelector('${sel} .btn-delete-card').click()`);await sleep(3500);
ok('excluir pela UI remove o TESTE',await b.ev(`!(appStore.getState('visitors').dailyData||[]).some(x=>x.id==='${id}')`));
const h2=await b.ev(`apiService.get('/visitantes/${id}/historico').then(r=>(Array.isArray(r)?r:r.data).map(x=>x.action).join(',')).catch(e=>'ERR '+e.message)`);ok('histórico pós-exclusão preservado',h2==='created,rescheduled,deleted',h2);
await b.ev(`agendaToday.click()`);await sleep(2500);
const realAfter=await b.ev(`apiService.get('/visitantes/empresarial?limit=500').then(r=>JSON.stringify((Array.isArray(r)?r:r.data).filter(x=>!/TESTE AUDITORIA/.test(x.nome)).map(x=>[x.id,x.data,x.hora,x.status,x.nome])))`);
ok('visita real intacta',realAfter===realBefore&&realBefore!=='[]'&&!/ERR/.test(realBefore));
ok('sem exceções JS',b.errors().length===0,b.errors().join('; '));
ok('CSP Report-Only: 0 violações',!b.events.some(e=>/Content.Security.Policy/i.test(e.params?.entry?.text||'')));
await b.ev(`authService.logout()`);await sleep(1500);ok('logout → 401',(await b.ev(`fetch('/api/visitantes/empresarial').then(r=>r.status)`))===401);
b.close();console.log(o.join('\n'));const f=o.filter(x=>!x.startsWith('PASS')).length;console.log('fail=',f);process.exit(f?1:0);
