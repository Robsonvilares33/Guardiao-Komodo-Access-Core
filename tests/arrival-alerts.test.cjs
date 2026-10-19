'use strict';
// Avisos de chegada (015): Web Push (RFC 8291/8292) sem dependências, SMTP mínimo, rotas do próprio usuário, aviso na chegada sem dados do visitante.
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');const fs=require('node:fs');const path=require('node:path');const {Duplex}=require('node:stream');
const WP=require('../lib/webpush.cjs');const SMTP=require('../lib/smtp.cjs');const AL=require('../lib/arrival-alerts.cjs');
const ua=crypto.createECDH('prime256v1');ua.generateKeys();const AUTH=crypto.randomBytes(16);
const SUB={endpoint:'https://fcm.googleapis.com/fcm/send/abc123',keys:{p256dh:ua.getPublicKey().toString('base64url'),auth:AUTH.toString('base64url')}};
const vk=crypto.createECDH('prime256v1');vk.generateKeys();
process.env.KAC_VAPID_PUBLIC_KEY=vk.getPublicKey().toString('base64url');process.env.KAC_VAPID_PRIVATE_KEY=vk.getPrivateKey().toString('base64url');
function decrypt(body){const salt=body.subarray(0,16),idlen=body[20],asPub=body.subarray(21,21+idlen),ct=body.subarray(21+idlen);const shared=ua.computeSecret(asPub);
  const ikm=Buffer.from(crypto.hkdfSync('sha256',shared,AUTH,Buffer.concat([Buffer.from('WebPush: info\0'),ua.getPublicKey(),asPub]),32));const cek=Buffer.from(crypto.hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16));const nonce=Buffer.from(crypto.hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12));
  const d=crypto.createDecipheriv('aes-128-gcm',cek,nonce);d.setAuthTag(ct.subarray(ct.length-16));const pt=Buffer.concat([d.update(ct.subarray(0,ct.length-16)),d.final()]);assert.equal(pt[pt.length-1],2);return pt.subarray(0,pt.length-1).toString('utf8');}

test('webpush: vetor oficial da RFC 8291',()=>{const as=crypto.createECDH('prime256v1');as.setPrivateKey(Buffer.from('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw','base64url'));
  const out=WP.encrypt('When I grow up, I want to be a watermelon',{keys:{p256dh:'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',auth:'BTBZMqHH6r4Tts7J_aSIgg'}},{salt:Buffer.from('DGv6ra1nlYgDCS1FRnbzlw','base64url'),ecdh:as});
  assert.equal(out.toString('base64url'),'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN');});
test('webpush: VAPID ES256 válido para a chave pública, aud = origem do endpoint, exp ≤ 24h',()=>{const keys=WP.vapidKeys();const h=WP.vapidHeader(SUB.endpoint,keys,{now:Date.parse('2026-10-19T00:00:00Z')});
  const m=/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(h);assert.ok(m);assert.equal(m[4],process.env.KAC_VAPID_PUBLIC_KEY);const c=JSON.parse(Buffer.from(m[2],'base64url'));assert.equal(c.aud,'https://fcm.googleapis.com');assert.ok(c.exp-Date.parse('2026-10-19T00:00:00Z')/1000<=86400);
  const pub=crypto.createPublicKey({key:{kty:'EC',crv:'P-256',x:Buffer.from(m[4],'base64url').subarray(1,33).toString('base64url'),y:Buffer.from(m[4],'base64url').subarray(33).toString('base64url')},format:'jwk'});
  assert.ok(crypto.verify('sha256',Buffer.from(m[1]+'.'+m[2]),{key:pub,dsaEncoding:'ieee-p1363'},Buffer.from(m[3],'base64url')));assert.ok(!h.includes(process.env.KAC_VAPID_PRIVATE_KEY));});
test('webpush: só envia para serviços de push conhecidos (sem SSRF) e valida as chaves',()=>{for(const ok of ['https://fcm.googleapis.com/fcm/send/x','https://web.push.apple.com/abc','https://updates.push.services.mozilla.com/wpush/v2/x','https://wns2-par02p.notify.windows.com/w/?token=x'])assert.ok(WP.allowedEndpoint(ok),ok);
  for(const bad of ['http://fcm.googleapis.com/x','https://evil.com/fcm.googleapis.com','https://fcm.googleapis.com.evil.com/x','https://fcm.googleapis.com:8443/x','https://user@fcm.googleapis.com/x','https://169.254.169.254/latest','https://localhost/x'])assert.ok(!WP.allowedEndpoint(bad),bad);
  assert.ok(WP.validKeys(SUB.keys));assert.ok(!WP.validKeys({p256dh:'abc',auth:'x'}));});
test('webpush: envio com cabeçalhos certos; 410 marca inscrição para apagar; sem chave VAPID não envia',async()=>{let seen;const f=async(u,o)=>{seen={u,o};return {status:201};};const r=await WP.send(SUB,'{"title":"t"}',{fetchImpl:f});assert.ok(r.ok);
  assert.equal(seen.o.headers['Content-Encoding'],'aes128gcm');assert.match(seen.o.headers.Authorization,/^vapid t=/);assert.equal(seen.o.redirect,'error');assert.equal(decrypt(seen.o.body),'{"title":"t"}');
  assert.ok((await WP.send(SUB,'x',{fetchImpl:async()=>({status:410})})).gone);assert.equal((await WP.send(SUB,'x',{env:{},fetchImpl:f})).code,'vapid_missing');assert.ok((await WP.send({...SUB,endpoint:'https://evil.com/x'},'x',{fetchImpl:f})).gone);});
function fakeSmtp(script){const sent=[];const s=new Duplex({read(){},write(c,e,cb){const line=c.toString();sent.push(line);const r=script(line,sent);if(r)setImmediate(()=>s.push(r));cb();}});s.setEncoding=()=>{};setImmediate(()=>s.push('220 fake ESMTP\r\n'));s.sent=sent;return s;}
test('smtp: AUTH PLAIN, MAIL/RCPT/DATA, cabeçalhos UTF-8, texto puro; erro de auth vira smtp_auth',async()=>{let sock;const conn=()=>sock=fakeSmtp(l=>l.startsWith('EHLO')?'250-fake\r\n250 AUTH PLAIN\r\n':l.startsWith('AUTH')?'235 ok\r\n':l.startsWith('MAIL')||l.startsWith('RCPT')?'250 ok\r\n':l==='DATA\r\n'?'354 go\r\n':l.endsWith('\r\n.\r\n')?'250 queued\r\n':l.startsWith('QUIT')?'221 bye\r\n':null);
  await SMTP.send({user:'remetente@gmail.com',pass:'abcdabcdabcdabcd',to:'dest+teste@gmail.com',subject:'Seu visitante chegou',text:'Olá,\nteste',fromName:'Guardião Komodo',connect:conn});
  const all=sock.sent.join('');assert.match(all,/RCPT TO:<dest\+teste@gmail\.com>/);assert.match(all,/Subject: Seu visitante chegou/);assert.match(all,/From: =\?UTF-8\?B\?/);assert.match(all,/Content-Type: text\/plain; charset=UTF-8/);
  const conn2=()=>fakeSmtp(l=>l.startsWith('EHLO')?'250 ok\r\n':l.startsWith('AUTH')?'535 bad\r\n':null);await assert.rejects(SMTP.send({user:'a@gmail.com',pass:'abcdabcdabcdabcd',to:'b@gmail.com',subject:'x',text:'y',connect:conn2}),/smtp_auth/);
  await assert.rejects(SMTP.send({user:'a@gmail.com',pass:'p',to:'b@gmail.com\r\nBcc: x@y.com',subject:'x',text:'y',connect:conn}),/smtp_config/);});
test('textos: sem dados do visitante; e-mail em português simples com como desligar',()=>{const t=AL.texts('arrival','14:00','empresarial',{});assert.equal(t.title,'Seu visitante chegou');assert.equal(t.body,'Um visitante agendado para as 14:00 chegou à portaria.');assert.match(t.text,/Para desligar/);
  assert.equal(AL.texts('arrival','<script>','x',{}).body,'Um visitante agendado chegou à portaria.');assert.equal(AL.maskEmail('robsonboiling+kactest3@gmail.com'),'ro•••@gmail.com');});

// ---- integração com a API (mock do PostgREST) ----
process.env.SUPABASE_URL='https://mock-project.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-not-a-real-key';
const handler=require('../api/[...route].js');const originalFetch=global.fetch;
const ORG_A='aaaaaaaa-0000-4000-8000-000000000001',ORG_B='bbbbbbbb-0000-4000-8000-000000000001';const tok=c=>c.repeat(43),h=t=>crypto.createHash('sha256').update(t).digest('hex');
const T={komodo_web_sessions:['A','B','H'].map(c=>({token_hash:h(tok(c)),user_id:'u'+c.toLowerCase(),expires_at:'2099-01-01T00:00:00Z'})),
  komodo_tbl_usuarios:[{id:'ua',email:'a@example.com',papel:'operador'},{id:'ub',email:'b@example.com',papel:'operador'},{id:'uh',email:'host@example.com',papel:'operador'}],
  kac_memberships:[{organization_id:ORG_A,user_id:'ua',role:'operator',created_at:'2026-01-01'},{organization_id:ORG_B,user_id:'ub',role:'owner',created_at:'2026-01-01'},{organization_id:ORG_A,user_id:'uh',role:'operator',created_at:'2026-01-02'}],
  kac_audit_log:[],komodo_acessos:[{id:'v1',organization_id:ORG_A,status:0,hora:'14:00',modulo:'empresarial',nome:'Fulano Secreto',placa:'ABC1D23',host_user_id:'uh'},{id:'v2',organization_id:ORG_A,status:0,hora:'15:00',modulo:'empresarial',nome:'Sem Anfitrião',host_user_id:null}],
  kac_push_subscriptions:[],kac_notification_prefs:[],kac_notification_log:[],kac_visit_history:[]};
const calls=[];const pushes=[];const res=(s,b)=>({ok:s<300,status:s,text:async()=>b==null?'':JSON.stringify(b)});
function match(r,u){return [...u.searchParams].every(([k,v])=>{if(['select','order','limit','on_conflict'].includes(k))return true;if(v.startsWith('eq.'))return String(r[k])===v.slice(3);if(v.startsWith('neq.'))return String(r[k])!==v.slice(4);if(v.startsWith('in.('))return v.slice(4,-1).split(',').includes(String(r[k]));if(v.startsWith('gte.'))return String(r[k]||'')>=v.slice(4);return true;});}
let pushStatus=201;
global.fetch=async(url,o={})=>{const u=new URL(url);if(u.hostname==='fcm.googleapis.com'){pushes.push({url,o});return {status:pushStatus};}
  const t=u.pathname.replace('/rest/v1/',''),m=o.method||'GET';const body=o.body?JSON.parse(o.body):null;calls.push({t,m,q:decodeURIComponent(u.search),body});
  if(t==='rpc/kac_rate_hit')return res(200,true);const rows=T[t];if(!rows)return res(404,{});
  if(m==='POST'){const key=u.searchParams.get('on_conflict');for(const b of body){const k=key?key.split(','):null;const ex=k&&rows.find(r=>k.every(c=>r[c]===b[c]));if(ex&&/merge-duplicates/.test(o.headers?.Prefer||''))Object.assign(ex,b);else rows.push({id:crypto.randomUUID(),created_at:new Date().toISOString(),...b});}return res(201,null);}
  const sel=rows.filter(r=>match(r,u));if(m==='PATCH'){sel.forEach(r=>Object.assign(r,body));return res(200,sel);}if(m==='DELETE'){for(const r of sel)rows.splice(rows.indexOf(r),1);return res(204,null);}return res(200,sel);};
test.after(()=>{global.fetch=originalFetch;});
function call(who,route,method='GET',body={},query={}){const r={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};return Promise.resolve(handler({method,query:{route:route.split('/'),...query},body,headers:{cookie:'kac_session='+tok(who),host:'x.example',origin:'https://x.example'}},r)).then(()=>({status:r.statusCode,body:r.body?JSON.parse(r.body):null}));}

test('GET /avisos: chave pública VAPID (nunca a privada), tudo desligado por padrão',async()=>{const r=await call('H','avisos');assert.equal(r.status,200);assert.equal(r.body.data.vapidPublicKey,process.env.KAC_VAPID_PUBLIC_KEY);assert.equal(r.body.data.push,false);assert.equal(r.body.data.email,false);
  assert.ok(!JSON.stringify(r.body).includes(process.env.KAC_VAPID_PRIVATE_KEY));assert.equal(r.body.data.emailDisponivel,false);});
test('aparelho: endpoint fora da lista ou chaves ruins → 422; válido grava na org/usuário da sessão e liga o push',async()=>{assert.equal((await call('H','avisos/aparelhos','POST',{endpoint:'https://evil.com/x',keys:SUB.keys})).status,422);
  assert.equal((await call('H','avisos/aparelhos','POST',{endpoint:SUB.endpoint,keys:{p256dh:'x',auth:'y'}})).status,422);
  const r=await call('H','avisos/aparelhos','POST',{...SUB,label:'Android (Chrome)<script>',organization_id:ORG_B,user_id:'ub'});assert.equal(r.status,201);
  const s=T.kac_push_subscriptions.at(-1);assert.equal(s.organization_id,ORG_A);assert.equal(s.user_id,'uh');assert.equal(s.label,'Android (Chrome)script');assert.equal(T.kac_notification_prefs.find(p=>p.user_id==='uh').push_enabled,true);});
test('e-mail não pode ser ligado sem SMTP configurado (409)',async()=>{assert.equal((await call('H','avisos','PUT',{email:true})).status,409);});
test('chegada: portaria marca "Na portaria" → push ao ANFITRIÃO, texto sem nome/placa, registro sem conteúdo',async()=>{pushes.length=0;
  const r=await call('A','visitantes/v1/status','PUT',{status:1,from:0});assert.equal(r.status,200);assert.equal(pushes.length,1);const msg=JSON.parse(decrypt(pushes[0].o.body));
  assert.equal(msg.title,'Seu visitante chegou');assert.match(msg.body,/14:00/);assert.ok(!/Fulano|Secreto|ABC1D23/.test(JSON.stringify(msg)));
  const l=T.kac_notification_log.at(-1);assert.deepEqual([l.organization_id,l.user_id,l.visit_id,l.channel,l.kind,l.status],[ORG_A,'uh','v1','push','arrival','sent']);
  assert.ok(T.kac_push_subscriptions[0].last_ok_at);});
test('chegada: sem anfitrião não avisa; desfazer não avisa; outra org não dispara',async()=>{pushes.length=0;await call('A','visitantes/v2/status','PUT',{status:1,from:0});assert.equal(pushes.length,0);
  await call('A','visitantes/v1/status','PUT',{status:0,from:1,undo:true});await call('A','visitantes/v1/status','PUT',{status:1,from:0,undo:true});assert.equal(pushes.length,0);
  const r=await call('B','visitantes/v1/status','PUT',{status:1,from:0});assert.equal(r.status,404);assert.equal(pushes.length,0);});
test('aparelho cancelado (410) é apagado; teste manual exige limite e é só do próprio usuário',async()=>{pushStatus=410;const r=await call('H','avisos/teste','POST',{});pushStatus=201;assert.equal(r.status,200);assert.equal(r.body.data.push.failed,1);assert.equal(T.kac_push_subscriptions.length,0);
  const b=await call('B','avisos');assert.equal(b.body.data.aparelhos.length,0);});
test('criar visita define o anfitrião (quem cria) e aceita outro usuário só da mesma empresa',async()=>{const base={modulo:'empresarial',dia:'ter',data:'2026-10-20',hora:'10:00',nome:'Visita Nova'};
  assert.equal((await call('A','visitantes','POST',base)).status,201);assert.equal(T.komodo_acessos.at(-1).host_user_id,'ua');
  assert.equal((await call('A','visitantes','POST',{...base,anfitriaoUsuario:'uh'})).status,201);assert.equal(T.komodo_acessos.at(-1).host_user_id,'uh');
  assert.equal((await call('A','visitantes','POST',{...base,anfitriaoUsuario:'ub'})).status,422);});
test('membros: só da própria empresa',async()=>{const r=await call('A','avisos/membros');assert.deepEqual(r.body.data.map(x=>x.id).sort(),['ua','uh']);});
test('e-mail de reserva: só se ligado, sem push entregue, com limite diário e por usuário',async()=>{const sent=[];const env={KAC_SMTP_USER:'remetente@gmail.com',KAC_SMTP_PASS:'abcd efgh ijkl mnop',KAC_EMAIL_DAILY_CAP:'2',KAC_VAPID_PUBLIC_KEY:process.env.KAC_VAPID_PUBLIC_KEY,KAC_VAPID_PRIVATE_KEY:process.env.KAC_VAPID_PRIVATE_KEY};
  const store={prefs:{push_enabled:false,email_enabled:true},log:[]};let rate=true;
  const db=async(t,{method='GET',query='',body}={})=>{if(t==='kac_notification_prefs')return [store.prefs];if(t==='kac_notification_log'){if(method==='POST'){store.log.push(...body);return null;}return store.log.filter(l=>l.channel==='email'&&l.status==='sent');}if(t==='komodo_tbl_usuarios')return [{email:'host+alias@gmail.com'}];return [];};
  const A=AL.createAlerts({db,reply:()=>{},audit:async()=>{},rateHit:async()=>rate,env,smtp:{send:async m=>{sent.push(m);}}});
  let r=await A.deliver(ORG_A,'uh',{kind:'arrival',visitId:'v1',hora:'14:00'});assert.equal(r.email,'sent');assert.equal(sent[0].to,'host+alias@gmail.com');assert.equal(sent[0].pass,'abcdefghijklmnop');assert.ok(!/Fulano/.test(sent[0].text));
  await A.deliver(ORG_A,'uh',{kind:'arrival'});r=await A.deliver(ORG_A,'uh',{kind:'arrival'});assert.equal(r.email,'daily_cap');assert.equal(sent.length,2);
  rate=false;store.log=[];r=await A.deliver(ORG_A,'uh',{kind:'arrival'});assert.equal(r.email,'user_rate_limited');
  store.prefs={push_enabled:false,email_enabled:false};r=await A.deliver(ORG_A,'uh',{kind:'arrival'});assert.equal(r.email,'off');
  assert.ok(store.log.every(l=>Object.keys(l).every(k=>['organization_id','user_id','visit_id','channel','kind','status','error_code'].includes(k))));});
test('UI e service worker: push/notificationclick só abrem o próprio site; tela acessível; sem innerHTML',()=>{const root=path.join(__dirname,'..');const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  assert.ok(sw.includes("addEventListener('push'")&&sw.includes("addEventListener('notificationclick'")&&sw.includes('u.origin === self.location.origin'));
  const ui=fs.readFileSync(path.join(root,'src/ui/ArrivalAlerts.js'),'utf8');assert.ok(!/innerHTML/.test(ui));assert.ok(ui.includes("role', 'switch'")&&ui.includes('requestPermission')&&ui.includes('userVisibleOnly: true'));assert.ok(/Tela de Início/.test(ui));
  for(const f of ['index.html','residencial.html']){const s=fs.readFileSync(path.join(root,f),'utf8');assert.ok(s.includes('id="btnAlerts"')&&s.includes('data-nav="alerts"'));}
  for(const b of ['agenda','residencial'])assert.ok(fs.readFileSync(path.join(root,'src/bundle/'+b+'.bundle.js'),'utf8').includes('KacArrivalAlerts'));});
test('migration 015: aditiva, RLS, registro sem conteúdo, LGPD',()=>{const s=fs.readFileSync(path.join(__dirname,'../docs/master/migrations/015_arrival_alerts.sql'),'utf8').replace(/--.*$/gm,'');
  assert.ok(!/drop table|drop column|truncate/i.test(s));assert.equal((s.match(/enable row level security/gi)||[]).length,3);for(const k of ["'notifications', nl","'notifications', COALESCE","'notifications', nn",'ADD COLUMN IF NOT EXISTS host_user_id'])assert.ok(s.includes(k),k);});
