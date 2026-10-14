// Clique local da UI ALPR com flag ON e PostgREST simulado (não toca nenhum banco). Uso:
//   KAC_AXE=/caminho/axe.min.js node tests/e2e-local/alpr-ui.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import {createRequire} from 'node:module'; import {launch} from '../../scripts/e2e/cdp.mjs';
const require=createRequire(import.meta.url); const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..');
process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';process.env.KAC_ALPR='on';
const ORG='aaaaaaaa-0000-4000-8000-000000000001';const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
const T={komodo_web_sessions:[{token_hash:'*',user_id:'uA',expires_at:'2099-01-01'}],komodo_tbl_usuarios:[{id:'uA',email:'a@example.com',papel:'admin'}],kac_memberships:[{organization_id:ORG,user_id:'uA',role:'owner'}],
  komodo_acessos:[{id:'v1',organization_id:ORG,data:today,hora:'09:00',nome:'TESTE Fictício',unidade:'101',placa:'BRA2E19 - Preto',modulo:'empresarial'}]};
const writes=[];const realFetch=global.fetch;
global.fetch=async(url,o={})=>{const u=new URL(url);if(u.hostname!=='mock-project.supabase.co')return realFetch(url,o);const t=u.pathname.split('/').pop();if((o.method||'GET')!=='GET'){writes.push(t);}return {ok:true,status:200,text:async()=>JSON.stringify(T[t]||[])};};
const handler=require(ROOT+'/api/[...route].js');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
const srv=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://x');if(u.pathname.startsWith('/api/')){let b='';for await(const c of req)b+=c;const r={statusCode:0,setHeader:(k,v)=>res.setHeader(k,v),end:v=>{res.statusCode=r.statusCode;res.end(v);}};
  await handler({method:req.method,query:{route:u.pathname.slice(5).split('/'),...Object.fromEntries(u.searchParams)},body:b?JSON.parse(b):{},headers:{...req.headers,cookie:'kac_session='+'C'.repeat(43)}},r);return;}
  const f=path.join(ROOT,path.normalize(u.pathname).replace(/^\/+/,'')||'index.html');if(!f.startsWith(ROOT)||!fs.existsSync(f)){res.statusCode=404;return res.end();}res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));});
await new Promise(r=>srv.listen(8766,r));
// sessão: aceitar qualquer token_hash do mock
const o=[];const ok=(n,c,x='')=>o.push(`${c===true?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b=await launch();await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await b.nav('http://localhost:8766/alpr.html');await sleep(500);
ok('flag ON: seção de revisão visível',await b.ev(`!document.getElementById('secOn').hidden&&document.getElementById('secOff').hidden`));
await b.ev(`(()=>{document.getElementById('plate').value='bra-2e19';const c=document.getElementById('conf');c.value='0.95';c.dispatchEvent(new Event('input'));document.querySelector('#formRead button').click();})()`);await sleep(800);
const r1=await b.ev(`JSON.stringify({badge:document.getElementById('resBadge').textContent,cls:document.getElementById('resBadge').className,cands:[...document.querySelectorAll('#resCands li')].map(l=>l.textContent),focus:document.activeElement.id,conf:document.getElementById('confOut').textContent})`);
const j1=JSON.parse(r1||'{}');ok('placa exata 0,95 → Sugestão com a visita candidata e foco no resultado',j1.badge==='Sugestão'&&j1.cls==='badge suggest'&&/TESTE Fictício/.test(j1.cands[0]||'')&&j1.focus==='resTitle'&&j1.conf==='0,95',r1);
await b.ev(`document.getElementById('btnAccept').click()`);await sleep(200);
ok('confirmar registra na sessão e limpa o formulário',await b.ev(`document.querySelectorAll('#log li').length===1&&/confirmada/.test(document.querySelector('#log li').textContent)&&document.getElementById('result').hidden&&document.getElementById('plate').value===''`));
await b.ev(`(()=>{document.getElementById('plate').value='BRA2E18';document.getElementById('conf').value='0.99';document.querySelector('#formRead button').click();})()`);await sleep(800);
ok('1 caractere diferente → Revisão',await b.ev(`document.getElementById('resBadge').textContent==='Revisão'`));
await b.ev(`(()=>{document.getElementById('corr').value='xx';document.getElementById('btnCorrect').click();})()`);await sleep(200);
ok('correção inválida é recusada com mensagem',await b.ev(`/placa corrigida válida/.test(document.getElementById('alprMsg').textContent)&&!document.getElementById('result').hidden`));
await b.ev(`(()=>{document.getElementById('corr').value='bra-2e19';document.getElementById('btnCorrect').click();})()`);await sleep(200);
ok('correção válida registrada (normalizada)',await b.ev(`/corrigida para BRA2E19/.test(document.querySelector('#log li').textContent)`));
await b.ev(`(()=>{document.getElementById('plate').value='BRA2E19';document.getElementById('conf').value='0.3';document.querySelector('#formRead button').click();})()`);await sleep(800);
ok('confiança baixa → Descartada e botão Confirmar desabilitado',await b.ev(`document.getElementById('resBadge').textContent==='Descartada'&&document.getElementById('btnAccept').disabled`));
if(process.env.KAC_AXE){await b.ev(fs.readFileSync(process.env.KAC_AXE,'utf8'));const v=await b.ev(`axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']},resultTypes:['violations']}).then(r=>r.violations.map(v=>v.id+'['+v.impact+'] '+v.nodes.map(n=>n.target.join(' ')+' '+(n.any[0]&&n.any[0].message||'')).join(' | ')))`);ok('axe: 0 violações na página com resultado aberto',Array.isArray(v)&&v.length===0,JSON.stringify(v));}
ok('nenhuma escrita no banco simulado',writes.length===0,writes.join(','));ok('sem exceções JS',b.errors().length===0,b.errors().join('; '));
b.close();srv.close();console.log(o.join('\n'));const f=o.filter(x=>!x.startsWith('PASS')).length;console.log('fail=',f);process.exit(f?1:0);
