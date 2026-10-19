'use strict';
// Visitantes salvos (013): API escopada à org da sessão, touch ao criar visita (sem documento), edição/remoção com IDOR negado, UI acessível.
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');const fs=require('node:fs');const path=require('node:path');
const handler=require('../api/[...route].js');const S=require('../lib/saved-visitors.cjs');const originalFetch=global.fetch;
process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
const ORG_A='aaaaaaaa-0000-4000-8000-000000000001',ORG_B='bbbbbbbb-0000-4000-8000-000000000001';
const SV_A='11111111-0000-4000-8000-00000000000a',SV_B='22222222-0000-4000-8000-00000000000b';
const tok=c=>c.repeat(43),h=t=>crypto.createHash('sha256').update(t).digest('hex');
const T={komodo_web_sessions:['A','B','V'].map(c=>({token_hash:h(tok(c)),user_id:'u'+c.toLowerCase(),expires_at:'2099-01-01T00:00:00Z'})),
  komodo_tbl_usuarios:[{id:'ua',email:'a@example.com',papel:'operador'},{id:'ub',email:'b@example.com',papel:'operador'},{id:'uv',email:'v@example.com',papel:'operador'}],
  kac_memberships:[{organization_id:ORG_A,user_id:'ua',role:'operator',created_at:'2026-01-01'},{organization_id:ORG_B,user_id:'ub',role:'owner',created_at:'2026-01-01'},{organization_id:ORG_A,user_id:'uv',role:'viewer',created_at:'2026-01-01'}],
  kac_audit_log:[],komodo_acessos:[],
  kac_saved_visitors:[{id:SV_A,organization_id:ORG_A,modulo:'empresarial',nome:'Ana Souza',tipo:'Visita',placa:'ABC1D23',visits_count:2,last_seen_at:'2026-10-10'},{id:SV_B,organization_id:ORG_B,modulo:'empresarial',nome:'Ana Segredo B',placa:'BBB1B11',visits_count:1,last_seen_at:'2026-10-11'}]};
const calls=[];const res=(s,b)=>({ok:s<300,status:s,text:async()=>b==null?'':JSON.stringify(b)});
function match(r,u){return [...u.searchParams].every(([k,v])=>{if(['select','order','limit'].includes(k))return true;if(v.startsWith('eq.'))return String(r[k])===v.slice(3);if(v.startsWith('ilike.')){const t=v.slice(6).replace(/\*/g,'').toLowerCase();return String(r[k]||'').toLowerCase().includes(t);}return true;});}
global.fetch=async(url,o={})=>{const u=new URL(url),t=u.pathname.replace('/rest/v1/',''),m=o.method||'GET';const body=o.body?JSON.parse(o.body):null;calls.push({t,m,q:decodeURIComponent(u.search),body});
  if(t==='rpc/kac_saved_visitor_touch'){return res(200,'00000000-0000-4000-8000-0000000000ff');}
  if(t==='rpc/kac_rate_hit')return res(200,true);
  const rows=T[t];if(!rows)return res(404,{});
  if(m==='POST'){rows.push(...body);return res(201,null);}const sel=rows.filter(r=>match(r,u));
  if(m==='PATCH'){if(body.nome&&rows.some(r=>r!==sel[0]&&r.organization_id===sel[0]?.organization_id&&r.nome.toLowerCase()===body.nome.toLowerCase()))return res(409,{code:'23505'});sel.forEach(r=>Object.assign(r,body));return res(200,sel);}
  if(m==='DELETE'){for(const r of sel)rows.splice(rows.indexOf(r),1);return res(204,null);}return res(200,sel);};
test.after(()=>{global.fetch=originalFetch;});
function call(who,route,method='GET',body={},query={}){const r={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};
  return Promise.resolve(handler({method,query:{route:route.split('/'),...query},body,headers:{cookie:'kac_session='+tok(who),host:'x.example'}},r)).then(()=>({status:r.statusCode,body:r.body?JSON.parse(r.body):null}));}

test('sugestão: A vê só os salvos da própria empresa, filtrados pelo nome',async()=>{const r=await call('A','visitantes-salvos','GET',{}, {modulo:'empresarial',q:'ana'});assert.equal(r.status,200);assert.deepEqual(r.body.data.map(x=>x.id),[SV_A]);
  const q=calls.filter(c=>c.t==='kac_saved_visitors').at(-1).q;assert.ok(q.includes('organization_id=eq.'+ORG_A));assert.ok(q.includes('modulo=eq.empresarial'));assert.ok(!q.includes('organization_id=eq.'+ORG_B));});
test('sugestão: B não acha o salvo de A pelo nome nem pela listagem',async()=>{const r=await call('B','visitantes-salvos','GET',{}, {modulo:'empresarial',q:'souza'});assert.equal(r.body.data.length,0);const l=await call('B','visitantes-salvos','GET',{}, {modulo:'empresarial'});assert.deepEqual(l.body.data.map(x=>x.id),[SV_B]);});
test('sugestão: módulo inválido 400, termo curto devolve vazio, caracteres de filtro neutralizados',async()=>{assert.equal((await call('A','visitantes-salvos','GET',{}, {modulo:'x'})).status,400);assert.deepEqual((await call('A','visitantes-salvos','GET',{}, {modulo:'empresarial',q:'a'})).body.data,[]);
  await call('A','visitantes-salvos','GET',{}, {modulo:'empresarial',q:'an*),organization_id.eq.'+ORG_B});const q=calls.filter(c=>c.t==='kac_saved_visitors').at(-1).q;assert.ok(!/[(),]/.test(q.split('nome=ilike.')[1]||''));});
test('sem sessão: 401',async()=>{const r={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};await handler({method:'GET',query:{route:['visitantes-salvos'],modulo:'empresarial'},body:{},headers:{host:'x'}},r);assert.equal(r.statusCode,401);});
test('criar visita salva o visitante na org da sessão, sem documento no tipo, com placa estruturada',async()=>{calls.length=0;
  const r=await call('A','visitantes','POST',{modulo:'residencial',dia:'ter',data:'2026-10-13',hora:'10:00',nome:'Carlos Lima',unidade:'Casa 12',tipo:'Visitante (Pessoal) (123.456.789-00)',placa:'XYZ9A88 - Preto (Fiat)',organization_id:ORG_B,visitante:{placa:'xyz9a88',cor:'Preto',marca:'Fiat',tipo:'Visitante (Pessoal)'}});
  assert.equal(r.status,201);const t=calls.find(c=>c.t==='rpc/kac_saved_visitor_touch');assert.ok(t);assert.equal(t.body.p_org,ORG_A);assert.equal(t.body.p_nome,'Carlos Lima');assert.equal(t.body.p_placa,'XYZ9A88');assert.equal(t.body.p_marca,'Fiat');assert.equal(t.body.p_unidade,'Casa 12');
  assert.ok(!JSON.stringify(t.body).includes('123.456'));assert.equal(r.body.data.savedVisitorId,'00000000-0000-4000-8000-0000000000ff');});
test('salvar=false não grava visitante salvo; placa inválida não é salva',async()=>{calls.length=0;await call('A','visitantes','POST',{modulo:'empresarial',dia:'ter',data:'2026-10-13',hora:'10:00',nome:'Sem Salvar',salvar:false});assert.ok(!calls.some(c=>c.t==='rpc/kac_saved_visitor_touch'));
  calls.length=0;await call('A','visitantes','POST',{modulo:'empresarial',dia:'ter',data:'2026-10-13',hora:'10:00',nome:'Placa Ruim',placa:'Sem veículo'});const t=calls.find(c=>c.t==='rpc/kac_saved_visitor_touch');assert.equal(t.body.p_placa,null);});
test('falha ao salvar visitante não derruba a visita (201)',async()=>{const f=global.fetch;const err=console.error;console.error=()=>{};global.fetch=async(u,o)=>String(u).includes('kac_saved_visitor_touch')?res(500,{}):f(u,o);try{const r=await call('A','visitantes','POST',{modulo:'empresarial',dia:'ter',data:'2026-10-13',hora:'10:00',nome:'Falha Touch'});assert.equal(r.status,201);assert.equal(r.body.data.savedVisitorId,null);}finally{global.fetch=f;console.error=err;}});
test('editar: A edita o próprio (normaliza placa, valida), auditoria sem dados pessoais',async()=>{const r=await call('A','visitantes-salvos/'+SV_A,'PUT',{nome:'Ana Souza Lima',placa:'abc1d23',cor:'Prata',observacao:'Entrega às terças',organization_id:ORG_B});assert.equal(r.status,200);
  const row=T.kac_saved_visitors.find(x=>x.id===SV_A);assert.equal(row.nome,'Ana Souza Lima');assert.equal(row.organization_id,ORG_A);assert.equal(row.placa,'ABC1D23');
  const a=T.kac_audit_log.at(-1);assert.equal(a.action,'saved_visitor.update');assert.equal(a.organization_id,ORG_A);assert.deepEqual(a.meta,{});
  assert.equal((await call('A','visitantes-salvos/'+SV_A,'PUT',{nome:'An'})).status,422);assert.equal((await call('A','visitantes-salvos/'+SV_A,'PUT',{nome:'Ana Ok',placa:'12'})).status,422);});
test('editar para nome já salvo: 409 com mensagem clara',async()=>{T.kac_saved_visitors.push({id:'33333333-0000-4000-8000-00000000000c',organization_id:ORG_A,modulo:'empresarial',nome:'Bruno Dias'});const r=await call('A','visitantes-salvos/'+SV_A,'PUT',{nome:'bruno dias'});assert.equal(r.status,409);assert.match(r.body.message,/Já existe um visitante salvo/);});
test('IDOR: B não edita nem remove o salvo de A (404, nada muda)',async()=>{const before=JSON.stringify(T.kac_saved_visitors.find(x=>x.id===SV_A));assert.equal((await call('B','visitantes-salvos/'+SV_A,'PUT',{nome:'Hack'})).status,404);assert.equal((await call('B','visitantes-salvos/'+SV_A,'DELETE')).status,404);assert.equal(JSON.stringify(T.kac_saved_visitors.find(x=>x.id===SV_A)),before);
  for(const id of ['x','*',SV_A+'%2C']) assert.equal((await call('A','visitantes-salvos/'+id,'DELETE')).status,404);});
test('leitura (viewer) não edita nem remove: 403',async()=>{assert.equal((await call('V','visitantes-salvos/'+SV_A,'DELETE')).status,403);assert.ok(T.kac_saved_visitors.some(x=>x.id===SV_A));assert.equal((await call('V','visitantes-salvos','GET',{}, {modulo:'empresarial'})).status,200);});
test('remover: A remove o próprio; visitas não são tocadas',async()=>{const nv=T.komodo_acessos.length;const r=await call('A','visitantes-salvos/'+SV_A,'DELETE');assert.equal(r.status,200);assert.ok(!T.kac_saved_visitors.some(x=>x.id===SV_A));assert.equal(T.komodo_acessos.length,nv);assert.equal(T.kac_audit_log.at(-1).action,'saved_visitor.delete');});
test('helpers: placa da visita composta, tipo sem documento',()=>{assert.equal(S.plateFrom('ABC1D23 - Prata (Fiat)'),'ABC1D23');assert.equal(S.plateFrom('Sem veículo'),'');const c=(v,n)=>String(v??'').trim().slice(0,n);assert.equal(S.tipoOf('', 'Morador (12.345) - Filho',c),'Morador');});
test('UI: combobox acessível, sem innerHTML, carregado nos dois bundles; migration 013 + rollback; LGPD cobre a tabela',()=>{const src=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');const s=src('src/ui/SavedVisitors.js');
  for(const x of ["'combobox'","aria-expanded","aria-activedescendant","'listbox'","'option'","aria-live","ArrowDown","Escape","showModal"]) assert.ok(s.includes(x),x);assert.doesNotMatch(s,/innerHTML/);
  for(const [p,b] of [['index.html','src/bundle/agenda.bundle.js'],['residencial.html','src/bundle/residencial.bundle.js']]){assert.match(src(p),/src\/ui\/SavedVisitors\.js/);assert.ok(src(b).includes('KacSavedVisitors'));assert.match(src(p),/id="svRemember" checked/);assert.match(src(p),/data-nav="saved"/);}
  const m=src('docs/master/migrations/013_saved_visitors.sql');assert.match(m,/ENABLE ROW LEVEL SECURITY/);assert.match(m,/kac_saved_visitors x USING public\.kac_organizations/);assert.match(m,/'saved_visitors', COALESCE/);assert.match(m,/DELETE FROM public\.kac_saved_visitors x WHERE x\.organization_id = p_org/);assert.doesNotMatch(m,/DROP TABLE|TRUNCATE/);
  assert.match(src('docs/master/migrations/013_saved_visitors_rollback.sql'),/DROP TABLE IF EXISTS public\.kac_saved_visitors/);
  const css=src('src/ui/styles/kac-theme.css');assert.match(css,/\.sv-opt\{min-height:var\(--kac-tap\)/);});
