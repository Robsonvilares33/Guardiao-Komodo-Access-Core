// Uso: node tests/pglite/prod007-billing.mjs <backup.json>  (backup privado, NUNCA commitar). Ensaio da 007 sobre o estado real (001–006 + 008).
import { PGlite } from '@electric-sql/pglite'; import fs from 'node:fs';
const R=new URL('../../docs',import.meta.url).pathname, M=R+'/master/migrations'; const bk=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const db=new PGlite(); const out=[]; const ok=(n,c,x='')=>out.push(`${c===true?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);
const q=async(s,p)=>(await db.query(s,p)).rows; const cnt=async t=>(await q(`select count(*)::int n from ${t}`))[0].n;
const tryq=async s=>{try{await db.exec(s);return true;}catch{return false;}};
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
for(const f of ['proposed_supabase_migration_001.sql','proposed_supabase_migration_002_web_auth.sql','proposed_supabase_migration_003_atomic_auth.sql','proposed_supabase_migration_004_data.sql']) await db.exec(fs.readFileSync(R+'/'+f,'utf8'));
for(const f of ['005_tenancy.sql','006_visit_history_audit.sql','008_supabase_auth.sql']) await db.exec(fs.readFileSync(M+'/'+f,'utf8'));
// Supabase concede ALL a service_role por default privileges; simular para provar que a 007 restringe.
await db.exec(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role, anon, authenticated;`);
await db.exec(`DELETE FROM kac_memberships; DELETE FROM kac_organizations; ALTER TABLE komodo_acessos DISABLE TRIGGER USER;`);
const T=['kac_organizations','komodo_tbl_usuarios','kac_memberships','komodo_acessos','komodo_web_sessions','komodo_login_attempts','kac_visit_history','kac_audit_log','kac_invites'];
for(const t of T){for(const row of bk.tables[t]){const k=Object.keys(row);await db.query(`insert into ${t}(${k.map(x=>'"'+x+'"').join(',')}) values(${k.map((_,i)=>'$'+(i+1)).join(',')})`,k.map(x=>row[x]&&typeof row[x]==='object'?JSON.stringify(row[x]):row[x]));} ok(`restore ${t}: ${bk.tables[t].length}`,await cnt(t)===bk.tables[t].length);}
await db.exec(`ALTER TABLE komodo_acessos ENABLE TRIGGER USER;`);
const snap=async()=>{const o={};for(const t of T)o[t]=JSON.stringify(await q(`select * from ${t} order by 1`));return o;};
const before=await snap();
const SQL=fs.readFileSync(M+'/007_billing.sql','utf8');
await db.exec(SQL); ok('007 aplica sobre o backup',true);
const after=await snap(); for(const t of T) ok(`${t} inalterada`,after[t]===before[t]);
ok('planos: free ativo; pro/business inativos',JSON.stringify(await q(`select id,active from kac_plans order by id`))==='[{"id":"business","active":false},{"id":"free","active":true},{"id":"pro","active":false}]');
ok('assinatura free/active para cada org existente',(await q(`select count(*)::int n from kac_subscriptions where plan_id='free' and status='active'`))[0].n===bk.tables.kac_organizations.length);
ok('kac_payment_events vazia',await cnt('kac_payment_events')===0);
const g=await q(`select table_name,grantee,string_agg(privilege_type,',' order by privilege_type) p from information_schema.role_table_grants where table_schema='public' and table_name in ('kac_plans','kac_subscriptions','kac_payment_events') and grantee<>'postgres' group by 1,2 order by 1,2`);
ok('grants: só service_role, mínimos',JSON.stringify(g)===JSON.stringify([{table_name:'kac_payment_events',grantee:'service_role',p:'INSERT,SELECT'},{table_name:'kac_plans',grantee:'service_role',p:'SELECT'},{table_name:'kac_subscriptions',grantee:'service_role',p:'INSERT,SELECT,UPDATE'}]),JSON.stringify(g));
ok('sem grants anon/authenticated em nenhuma tabela public',(await q(`select count(*)::int n from information_schema.role_table_grants where grantee in ('anon','authenticated') and table_schema='public'`))[0].n===0);
ok('RLS em todas as tabelas',(await q(`select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`))[0].n===0);
await db.exec(`SET ROLE service_role`);
await db.exec(`insert into kac_payment_events(provider,provider_event_id,organization_id,type,payload) values('mercadopago','teste-e1','${bk.tables.kac_organizations[0].id}','checkout.completed','{}')`);
ok('service_role: idempotência (evento duplicado rejeitado)',!(await tryq(`insert into kac_payment_events(provider,provider_event_id,type,payload) values('mercadopago','teste-e1','x','{}')`)));
ok('service_role: não apaga eventos (trilha imutável)',!(await tryq(`delete from kac_payment_events`)));
ok('service_role: não altera planos',!(await tryq(`update kac_plans set price_cents=1`)));
await db.exec(`RESET ROLE`);
await db.exec(`SET ROLE anon`); ok('anon: sem acesso',!(await tryq(`select * from kac_payment_events`))); await db.exec(`RESET ROLE`);
await db.exec(fs.readFileSync(M+'/007_billing_rollback.sql','utf8'));
ok('rollback: 3 tabelas removidas',(await q(`select to_regclass('public.kac_plans') a, to_regclass('public.kac_subscriptions') b, to_regclass('public.kac_payment_events') c`)).every(x=>!x.a&&!x.b&&!x.c));
const rb=await snap(); for(const t of T) ok(`rollback: ${t} intacta`,rb[t]===before[t]);
await db.exec(SQL); ok('007 reaplica após rollback',true); await db.exec(SQL); ok('007 idempotente (2ª aplicação)',await cnt('kac_plans')===3);
console.log(out.join('\n')); console.log('fail=',out.filter(x=>!x.startsWith('PASS')).length);
