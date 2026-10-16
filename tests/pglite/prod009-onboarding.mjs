// Uso: node tests/pglite/prod009-onboarding.mjs <backup.json>  (backup privado, NUNCA commitar). Ensaio da 009 sobre o estado real (001–008).
import { PGlite } from '@electric-sql/pglite'; import fs from 'node:fs';
const R=new URL('../../docs',import.meta.url).pathname, M=R+'/master/migrations'; const bk=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const db=new PGlite(); const out=[]; const ok=(n,c,x='')=>out.push(`${c===true?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);
const q=async(s,p)=>(await db.query(s,p)).rows; const cnt=async t=>(await q(`select count(*)::int n from ${t}`))[0].n; const tryq=async s=>{try{await db.exec(s);return true;}catch{return false;}};
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
for(const f of ['proposed_supabase_migration_001.sql','proposed_supabase_migration_002_web_auth.sql','proposed_supabase_migration_003_atomic_auth.sql','proposed_supabase_migration_004_data.sql']) await db.exec(fs.readFileSync(R+'/'+f,'utf8'));
for(const f of ['005_tenancy.sql','006_visit_history_audit.sql','008_supabase_auth.sql','007_billing.sql']) await db.exec(fs.readFileSync(M+'/'+f,'utf8'));
await db.exec(`DELETE FROM kac_subscriptions; DELETE FROM kac_memberships; DELETE FROM kac_organizations; ALTER TABLE komodo_acessos DISABLE TRIGGER USER;`);
const T=['kac_organizations','komodo_tbl_usuarios','kac_memberships','komodo_acessos','kac_visit_history','kac_audit_log','kac_invites','kac_subscriptions'];
for(const t of T){for(const row of bk.tables[t]){const k=Object.keys(row);await db.query(`insert into ${t}(${k.map(x=>'"'+x+'"').join(',')}) values(${k.map((_,i)=>'$'+(i+1)).join(',')}) on conflict do nothing`,k.map(x=>row[x]&&typeof row[x]==='object'?JSON.stringify(row[x]):row[x]));} ok(`restore ${t}: ${bk.tables[t].length}`,await cnt(t)===bk.tables[t].length);}
await db.exec(`ALTER TABLE komodo_acessos ENABLE TRIGGER USER;`);
for(const t of ['kac_audit_log','kac_visit_history'])await db.exec(`select setval(pg_get_serial_sequence('${t}','id'),greatest(1,(select coalesce(max(id),1) from ${t})))`); // como no Postgres real após restore
const snap=async()=>{const o={};for(const t of T)o[t]=JSON.stringify(await q(`select * from ${t} order by 1`));return o;}; const before=await snap();
const SQL=fs.readFileSync(M+'/009_onboarding.sql','utf8'); await db.exec(SQL); ok('009 aplica sobre o backup',true);
const NEW=['kind','cnpj','created_by_auth_user'];const strip=j=>JSON.stringify(JSON.parse(j).map(r=>{const c={...r};let extra=false;for(const k of NEW){if(c[k]!=null)extra=true;delete c[k];}return extra?{EXTRA:1}:c;}));
const after=await snap(); for(const t of T) ok(`${t} inalterada pela migração (colunas originais; novas colunas nulas)`,strip(after[t])===before[t]);
const md5=async()=>(await q(`select md5(string_agg(t::text,',' order by t.id)) h from komodo_acessos t`))[0].h; const md5a=await md5();
const call=async(a)=>{await db.exec('SET ROLE service_role');try{return (await q(`select public.kac_onboard_org($1,$2,$3,$4,$5,$6,$7) r`,a))[0].r;}finally{await db.exec('RESET ROLE');}}; // função roda como service_role (único com EXECUTE)
const A='aaaaaaaa-1111-4111-8111-000000000001',Bu='bbbbbbbb-1111-4111-8111-000000000002';
let r=await call([A,'Teste.Auditoria.A@Example.com','u_teste_a','TESTE AUDITORIA Condomínio','condominio','11222333000181','America/Sao_Paulo']);ok('cria org (service_role)',r.status==='created',JSON.stringify(r));const orgA=r.organization_id;
ok('owner + free/active + usuário sem senha + auditoria',(await q(`select (select role from kac_memberships where organization_id=$1 and user_id='u_teste_a') m,(select plan_id||'/'||status from kac_subscriptions where organization_id=$1) s,(select salt||hash||papel from komodo_tbl_usuarios where id='u_teste_a') u,(select count(*)::int from kac_audit_log where organization_id=$1 and action='org.create') a`,[orgA]))[0].m==='owner');
const row=(await q(`select (select plan_id||'/'||status from kac_subscriptions where organization_id=$1) s,(select salt||hash||papel from komodo_tbl_usuarios where id='u_teste_a') u,(select count(*)::int from kac_audit_log where organization_id=$1 and action='org.create') a,(select email from komodo_tbl_usuarios where id='u_teste_a') e`,[orgA]))[0];
ok('assinatura free/active',row.s==='free/active');ok('usuário local sem senha (só Supabase), papel admin',row.u==='admin');ok('auditoria org.create',row.a===1);ok('e-mail normalizado',row.e==='teste.auditoria.a@example.com');
ok('2ª org pela mesma conta → limit_reached',(await call([A,'teste.auditoria.a@example.com','u_x','Outra','outro',null,'America/Sao_Paulo'])).status==='limit_reached');
ok('validações: nome, tipo, CNPJ, fuso',(await call([Bu,'b@example.com','u_b','x','outro',null,'America/Sao_Paulo'])).status==='invalid_name'&&(await call([Bu,'b@example.com','u_b','Nome ok','hotel',null,'America/Sao_Paulo'])).status==='invalid_kind'&&(await call([Bu,'b@example.com','u_b','Nome ok','outro','123','America/Sao_Paulo'])).status==='invalid_cnpj'&&(await call([Bu,'b@example.com','u_b','Nome ok','outro',null,'Marte/Base'])).status==='invalid_timezone');
const real=bk.tables.komodo_tbl_usuarios[0].email;ok('e-mail de usuário existente → email_in_use (não sequestra conta)',(await call([Bu,real,'u_b','Nome ok','outro',null,'America/Sao_Paulo'])).status==='email_in_use');
ok('usuário real e orgs reais intactos',JSON.stringify(await q(`select * from komodo_tbl_usuarios where id<>'u_teste_a' order by 1`))===JSON.stringify(JSON.parse(before.komodo_tbl_usuarios))&&(await q(`select count(*)::int n from kac_memberships where user_id='u_teste_a'`))[0].n===1);
ok('visitas reais: md5 inalterado',(await md5())===md5a);
await db.exec(`SET ROLE anon`);ok('anon não executa',!(await tryq(`select public.kac_onboard_org('${Bu}','b@example.com','u_b','Nome ok','outro',null,'America/Sao_Paulo')`)));await db.exec(`RESET ROLE; SET ROLE authenticated`);ok('authenticated não executa',!(await tryq(`select public.kac_onboard_org('${Bu}','b@example.com','u_b','Nome ok','outro',null,'America/Sao_Paulo')`)));await db.exec('RESET ROLE');
await db.exec(`DELETE FROM kac_audit_log WHERE organization_id IN (SELECT id FROM kac_organizations WHERE created_by_auth_user IS NOT NULL); DELETE FROM kac_organizations WHERE created_by_auth_user IS NOT NULL; DELETE FROM komodo_tbl_usuarios WHERE id='u_teste_a';`);
await db.exec(fs.readFileSync(M+'/009_onboarding_rollback.sql','utf8'));const rb=await snap();for(const t of T)ok(`rollback: ${t} igual ao original`,rb[t]===before[t]);
ok('rollback remove colunas/função',(await q(`select count(*)::int n from information_schema.columns where table_name='kac_organizations' and column_name in ('kind','cnpj','created_by_auth_user')`))[0].n===0);
await db.exec(SQL);await db.exec(SQL);ok('009 reaplica e é idempotente',true);
console.log(out.join('\n'));console.log('fail=',out.filter(x=>!x.startsWith('PASS')).length);
