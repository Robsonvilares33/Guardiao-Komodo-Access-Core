// Uso: node tests/pglite/prod006-history.mjs <backup.json>  (backup privado, NUNCA commitar). Requer @electric-sql/pglite (dev).
import { PGlite } from '@electric-sql/pglite'; import fs from 'node:fs';
const R=new URL('../../docs',import.meta.url).pathname, M=R+'/master/migrations'; const bk=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const db=new PGlite(); const out=[]; const ok=(n,c,x='')=>out.push(`${c?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);
const q=async (s,p)=>(await db.query(s,p)).rows; const cnt=async t=>(await q(`select count(*)::int n from ${t}`))[0].n;
const DEF='00000000-0000-4000-8000-000000000001';
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
for(const f of ['proposed_supabase_migration_001.sql','proposed_supabase_migration_002_web_auth.sql','proposed_supabase_migration_003_atomic_auth.sql','proposed_supabase_migration_004_data.sql']) await db.exec(fs.readFileSync(R+'/'+f,'utf8'));
await db.exec(fs.readFileSync(M+'/005_tenancy.sql','utf8'));
// restaurar backup pré-006 (estado atual de produção, já com 005)
await db.exec(`DELETE FROM kac_memberships; DELETE FROM kac_organizations;`);
for(const t of ['kac_organizations','komodo_tbl_usuarios','kac_memberships','komodo_acessos','komodo_web_sessions','komodo_login_attempts']){for(const row of bk.tables[t]){const k=Object.keys(row);await db.query(`insert into ${t}(${k.map(x=>'"'+x+'"').join(',')}) values(${k.map((_,i)=>'$'+(i+1)).join(',')})`,k.map(x=>row[x]));}
 ok(`restore ${t}: ${bk.tables[t].length}`,await cnt(t)===bk.tables[t].length);}
const T=Object.keys(bk.tables); const before={}; for(const t of T) before[t]=await cnt(t);
const realBefore=JSON.stringify((await q(`select * from komodo_acessos order by id`)));
await db.exec(fs.readFileSync(M+'/006_visit_history_audit.sql','utf8')); ok('006 aplica sobre o backup',true);
for(const t of T) ok(`contagem ${t} inalterada`,await cnt(t)===before[t]);
ok('visita real intacta (todas as colunas)',JSON.stringify(await q(`select * from komodo_acessos order by id`))===realBefore);
ok('aplicar 006 não cria histórico para linhas existentes',await cnt('kac_visit_history')===0);
// fluxo da API (service_role via PostgREST: claims + header)
const asApi=async(actor,sql)=>{await db.exec('BEGIN');await db.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true), set_config('request.headers',$1,true)`,[JSON.stringify({'x-kac-actor':actor})]);try{await db.exec(sql);}finally{await db.exec('COMMIT');}};
await asApi('user_admin',`insert into komodo_acessos(id,modulo,dia,hora,nome,data) values('t1','empresarial','ter','10:00','TESTE AUDITORIA','2026-10-13')`);
await asApi('user_admin',`update komodo_acessos set data='2026-10-15',dia='qui',hora='11:30' where id='t1'`);
await asApi('user_admin',`update komodo_acessos set status=1 where id='t1'`);
await asApi('user_admin',`delete from komodo_acessos where id='t1'`);
const h=await q(`select action,old_data::text od,new_data::text nd,old_hora,new_hora,organization_id,actor_user_id from kac_visit_history where visit_id='t1' order by id`);
ok('histórico: created,rescheduled,status_changed,deleted',h.map(x=>x.action).join(',')==='created,rescheduled,status_changed,deleted',h.map(x=>x.action).join(','));
ok('reagendamento guarda data/hora antigas e novas',h[1]?.od==='2026-10-13'&&h[1]?.nd==='2026-10-15'&&h[1]?.old_hora==='10:00'&&h[1]?.new_hora==='11:30');
ok('histórico com org da visita (org padrão)',h.every(x=>x.organization_id===DEF));
ok('ator registrado via header service_role',h.every(x=>x.actor_user_id==='user_admin'));
ok('histórico sobrevive à exclusão da visita',h.length===4&&await cnt(`komodo_acessos where id='t1'`)===0);
// header sem claim service_role NÃO define ator
await db.exec('BEGIN');await db.query(`select set_config('request.jwt.claims','{"role":"authenticated"}',true), set_config('request.headers','{"x-kac-actor":"impostor"}',true)`);await db.exec(`insert into komodo_acessos(id,modulo,dia,hora,nome,data) values('t2','empresarial','ter','10:00','TESTE AUDITORIA','2026-10-13')`);await db.exec('COMMIT');
ok('header x-kac-actor ignorado fora de service_role',(await q(`select actor_user_id from kac_visit_history where visit_id='t2'`))[0].actor_user_id===null);
await db.exec(`delete from komodo_acessos where id='t2'`);
ok('sem grants anon/authenticated (tabelas)',(await q(`select count(*)::int n from information_schema.role_table_grants where grantee in ('anon','authenticated') and table_schema='public'`))[0].n===0);
ok('sem EXECUTE para anon/authenticated nas funções kac_',(await q(`select count(*)::int n from information_schema.role_routine_grants where grantee in ('anon','authenticated','PUBLIC') and routine_schema='public' and routine_name like 'kac_%'`))[0].n===0);
ok('RLS ligado em todas as tabelas',(await q(`select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`))[0].n===0);
await db.exec(`insert into kac_audit_log(organization_id,actor_user_id,action,entity,entity_id) values('${DEF}','user_admin','visit.create','visit','t1')`);
await db.exec(fs.readFileSync(M+'/006_visit_history_audit_rollback.sql','utf8'));
for(const t of T) ok(`rollback: ${t} inalterada`,await cnt(t)===before[t]);
ok('rollback: visita real intacta',JSON.stringify(await q(`select * from komodo_acessos order by id`))===realBefore);
ok('rollback: tabelas 006 removidas e 005 preservada',(await q(`select to_regclass('public.kac_visit_history') h, to_regclass('public.kac_memberships') m`))[0].h===null);
await db.exec(fs.readFileSync(M+'/006_visit_history_audit.sql','utf8')); ok('006 reaplica após rollback',true);
console.log(out.join('\n')); console.log('fail=',out.filter(x=>x.startsWith('FAIL')).length);
