'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const src=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function ctx(){const calls=[];const window={authService:{isRemoteMode:()=>true},apiService:{put:async(e,p)=>{calls.push(['PUT',e,p]);return{success:true};},get:async e=>{calls.push(['GET',e]);return{data:[]};}}};
  const document={readyState:'complete',getElementById:()=>null,addEventListener(){},querySelectorAll:()=>[]};
  const c={window,document,location:{pathname:'/'},console,Intl,Date,MutationObserver:class{observe(){}}};c.self=c;vm.createContext(c);
  vm.runInContext(src('src/db/dao/VisitorRepository.js'),c);vm.runInContext(src('src/ui/VisitActions.js'),c);return{c,window,calls};}
test('reschedule chama PUT /visitantes/:id/reagendar com data e hora (id codificado)',async()=>{const {window,calls}=ctx();await window.VisitorRepository.reschedule('a b/1','2026-10-16','08:15');assert.equal(JSON.stringify(calls[0]),JSON.stringify(['PUT','/visitantes/a%20b%2F1/reagendar',{data:'2026-10-16',hora:'08:15'}]));});
test('history chama GET /visitantes/:id/historico',async()=>{const {window,calls}=ctx();await window.VisitorRepository.history('x1');assert.equal(JSON.stringify(calls[0]),JSON.stringify(['GET','/visitantes/x1/historico']));});
test('reschedule fora do modo online é recusado',async()=>{const {window}=ctx();window.authService.isRemoteMode=()=>false;await assert.rejects(window.VisitorRepository.reschedule('x','2026-10-16','08:00'));});
test('horário do histórico exibido em America/Sao_Paulo (UTC-3)',()=>{const {window}=ctx();const s=window.VisitActions._fmt.stamp('2026-10-14T01:30:00Z');assert.match(s,/13\/10\/2026/);assert.match(s,/22:30/);});
test('datas ISO formatadas dd/mm/aaaa sem deslocamento de fuso',()=>{const {window}=ctx();assert.equal(window.VisitActions._fmt.br('2026-10-16'),'16/10/2026');assert.equal(window.VisitActions._fmt.br(null),'—');});
test('VisitActions não usa innerHTML (anti-XSS) e botões têm aria-label',()=>{const s=src('src/ui/VisitActions.js');assert.ok(!/\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML/.test(s));assert.match(s,/'aria-label': 'Reagendar ' \+ nome/);assert.match(s,/aria-live/);});
test('script incluído nas duas páginas, depois de VisitorRepository',()=>{for(const f of ['index.html','residencial.html']){const h=src(f);assert.ok(h.indexOf('VisitActions.js')>h.indexOf('VisitorRepository.js')&&h.indexOf('VisitorRepository.js')>0,f);}});
