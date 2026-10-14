// Uso: node tests/pglite/prod005-backup-restore.mjs <backup.json>  (backup é privado, NUNCA commitar)
import { PGlite } from '@electric-sql/pglite'; import fs from 'node:fs';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../docs'), M=R+'/master/migrations'; const bk=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const db=new PGlite(); const out=[]; const ok=(n,c,x='')=>out.push(`${c?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);
const q=async s=>(await db.query(s)).rows; const cnt=async t=>(await q(`select count(*)::int n from ${t}`))[0].n;
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
for(const f of ['proposed_supabase_migration_001.sql','proposed_supabase_migration_002_web_auth.sql','proposed_supabase_migration_003_atomic_auth.sql','proposed_supabase_migration_004_data.sql']) await db.exec(fs.readFileSync(R+'/'+f,'utf8'));
// esquema == produção?
const prod={komodo_acessos:'id,modulo,dia,hora,nome,unidade,tipo,placa,acompanhantes,placaAcompanhante,historico,alerta,status,data',komodo_tbl_usuarios:'id,email,salt,hash,papel,criado_em',komodo_web_sessions:'token_hash,user_id,expires_at,created_at',komodo_login_attempts:'id,ip_hash,created_at'};
for(const [t,c] of Object.entries(prod)){const got=(await q(`select string_agg(column_name,',' order by ordinal_position) c from information_schema.columns where table_name='${t}'`))[0].c;ok(`snapshot ${t} = produção`,got===c,got===c?'':got);}
// restaurar backup
for(const t of ['komodo_tbl_usuarios','komodo_acessos','komodo_web_sessions','komodo_login_attempts']){for(const row of bk.tables[t]){const k=Object.keys(row);await db.query(`insert into ${t}(${k.map(x=>'"'+x+'"').join(',')}) values(${k.map((_,i)=>'$'+(i+1)).join(',')})`,k.map(x=>row[x]));}
 ok(`restore ${t}: ${bk.tables[t].length} linhas`,await cnt(t)===bk.tables[t].length);}
const before={}; for(const t of Object.keys(prod)) before[t]=await cnt(t);
await db.exec(fs.readFileSync(M+'/005_tenancy.sql','utf8')); ok('005 aplica sobre cópia do backup',true);
for(const t of Object.keys(prod)) ok(`contagem ${t} inalterada`,await cnt(t)===before[t]);
ok('todas as visitas ligadas à org padrão',(await q(`select count(*)::int n from komodo_acessos where organization_id is distinct from '00000000-0000-4000-8000-000000000001'`))[0].n===0);
ok('admin é owner da org padrão',(await q(`select count(*)::int n from kac_memberships m join komodo_tbl_usuarios u on u.id=m.user_id where u.papel='admin' and m.role='owner'`))[0].n===before.komodo_tbl_usuarios);
await db.exec(`insert into komodo_acessos(id,modulo,dia,hora,nome,data) values('novo','empresarial','ter','10:00','TESTE AUDITORIA','2026-10-13')`);
ok('INSERT no formato atual da API recebe org padrão',(await q(`select organization_id from komodo_acessos where id='novo'`))[0].organization_id==='00000000-0000-4000-8000-000000000001');
await db.exec(`delete from komodo_acessos where id='novo'`);
ok('sem grants anon/authenticated nas tabelas',(await q(`select count(*)::int n from information_schema.role_table_grants where grantee in ('anon','authenticated') and table_schema='public'`))[0].n===0);
ok('RLS ligado em todas as tabelas',(await q(`select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`))[0].n===0);
await db.exec(fs.readFileSync(M+'/005_tenancy_rollback.sql','utf8'));
for(const t of Object.keys(prod)) ok(`rollback: ${t} inalterada`,await cnt(t)===before[t]);
const after=(await q(`select string_agg(column_name,',' order by ordinal_position) c from information_schema.columns where table_name='komodo_acessos'`))[0].c; ok('rollback: esquema volta igual à produção',after===prod.komodo_acessos);
console.log(out.join('\n')); console.log('fail=',out.filter(x=>x.startsWith('FAIL')).length);
