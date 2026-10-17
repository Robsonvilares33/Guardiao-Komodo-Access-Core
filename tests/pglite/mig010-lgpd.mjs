// Uso: node tests/pglite/mig010-lgpd.mjs (requer @electric-sql/pglite, dev). Banco descartável; não toca produção. Ensaio 001–009 → 010 → rollback → 010.
import { PGlite } from '@electric-sql/pglite'; import fs from 'node:fs';
const R=process.env.KAC_DOCS||new URL('../../docs',import.meta.url).pathname, M=R+'/master/migrations';
const db=new PGlite(); const out=[]; const ok=(n,c,x='')=>out.push(`${c===true?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);
const q=async(s,p)=>(await db.query(s,p)).rows; const one=async s=>Object.values((await q(s))[0])[0]; const tryq=async s=>{try{await db.exec(s);return true;}catch{return false;}};
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
for(const f of ['proposed_supabase_migration_001.sql','proposed_supabase_migration_002_web_auth.sql','proposed_supabase_migration_003_atomic_auth.sql','proposed_supabase_migration_004_data.sql']) await db.exec(fs.readFileSync(R+'/'+f,'utf8'));
for(const f of ['005_tenancy.sql','006_visit_history_audit.sql','008_supabase_auth.sql','007_billing.sql','009_onboarding.sql']) await db.exec(fs.readFileSync(M+'/'+f,'utf8'));
const A='00000000-0000-4000-8000-000000000001',B='bbbbbbbb-0000-4000-8000-000000000001';
await db.exec(`INSERT INTO kac_organizations(id,name) VALUES ('${B}','Org B') ON CONFLICT DO NOTHING;
 INSERT INTO komodo_acessos(id,modulo,dia,hora,nome,placa,status,data,organization_id) VALUES
 ('v_old','empresarial','seg','09:00','Maria Antiga','OLD1A11',0,(now()-interval '13 months')::date,'${A}'),
 ('v_new','empresarial','seg','09:00','Maria Atual','NEW1A11',0,now()::date,'${A}'),
 ('v_b','empresarial','seg','09:00','Maria Atual','BBB1A11',0,now()::date,'${B}');
 UPDATE komodo_acessos SET status=1 WHERE id='v_new';
 INSERT INTO kac_visit_history(visit_id,organization_id,action) VALUES ('v_ghost','${A}','deleted');
 INSERT INTO komodo_tbl_usuarios(id,email,salt,hash,papel) VALUES ('u1','u1@example.com',repeat('0',32),repeat('a',64),'admin') ON CONFLICT DO NOTHING;
 INSERT INTO komodo_web_sessions(token_hash,user_id,expires_at) SELECT repeat('a',64), id, now()-interval '3 days' FROM komodo_tbl_usuarios LIMIT 1;
 INSERT INTO komodo_login_attempts(id,ip_hash,created_at) VALUES (gen_random_uuid(),repeat('a',64),now()-interval '2 days'),(gen_random_uuid(),repeat('b',64),now());
 INSERT INTO kac_audit_log(organization_id,actor_user_id,action,entity,created_at) VALUES ('${A}','u','old','visit',now()-interval '14 months'),('${A}','u','new','visit',now());`);
const md5=async()=>one(`select md5(string_agg(t::text,',' order by t.id)) from komodo_acessos t`);const m0=await md5();
const SQL=fs.readFileSync(M+'/010_lgpd_retention.sql','utf8');await db.exec(SQL);ok('010 aplica',true);
ok('visitas intactas pela migração (md5)',(await md5())===m0);
ok('histórico órfão removido, histórico de visita viva mantido',(await one(`select count(*)::int from kac_visit_history where visit_id='v_ghost'`))===0&&(await one(`select count(*)::int from kac_visit_history where visit_id='v_new'`))>=2);
await db.exec(`DELETE FROM komodo_acessos WHERE id='v_new' AND organization_id='${A}'`);
ok('apagar visita apaga o histórico (cascade) sem linha nova',(await one(`select count(*)::int from kac_visit_history where visit_id='v_new'`))===0);
await db.exec(`INSERT INTO komodo_acessos(id,modulo,dia,hora,nome,placa,status,data,organization_id) VALUES ('v_new','empresarial','seg','09:00','Maria Atual','NEW1A11',0,now()::date,'${A}')`);
await db.exec('SET ROLE service_role');const pr=(await q(`select public.kac_purge_expired() r`))[0].r;await db.exec('RESET ROLE');
ok('expurgo: 1 visita, 1 auditoria, 1 sessão, 1 tentativa',pr.visits===1&&pr.audit===1&&pr.sessions===1&&pr.attempts===1,JSON.stringify(pr));
ok('expurgo mantém visitas dentro da retenção',(await one(`select string_agg(id,',' order by id) from komodo_acessos`))==='v_b,v_new');
await db.exec(`UPDATE kac_organizations SET retention_months=1 WHERE id='${A}'`);ok('retenção inválida recusada',!(await tryq(`UPDATE kac_organizations SET retention_months=0 WHERE id='${A}'`)));
await db.exec('SET ROLE service_role');const ex=(await q(`select public.kac_subject_export('${A}','maria atual',null) r`))[0].r;
ok('exportação do titular só da própria empresa',ex.visits.length===1&&ex.visits[0].id==='v_new'&&!JSON.stringify(ex).includes('BBB1A11'));
const n=(await q(`select public.kac_subject_delete('${A}','MARIA ATUAL',null,'u_admin') r`))[0].r;await db.exec('RESET ROLE');
ok('exclusão do titular só na própria empresa + auditoria',n===1&&(await one(`select count(*)::int from komodo_acessos where id='v_b'`))===1&&(await one(`select count(*)::int from kac_audit_log where action='lgpd.subject_delete'`))===1);
await db.exec('SET ROLE anon');ok('anon não executa expurgo',!(await tryq(`select public.kac_purge_expired()`)));await db.exec('RESET ROLE');
await db.exec('SET ROLE authenticated');ok('authenticated não executa exportação',!(await tryq(`select public.kac_subject_export('${A}','x',null)`)));await db.exec('RESET ROLE');
await db.exec(fs.readFileSync(M+'/010_lgpd_retention_rollback.sql','utf8'));ok('rollback aplica',(await one(`select count(*)::int from pg_proc where proname='kac_purge_expired'`))===0);
await db.exec(SQL);ok('010 reaplica (idempotente)',true);
console.log(out.join('\n'));const f=out.filter(x=>x.startsWith('FAIL')).length;console.log('fail=',f);process.exit(f?1:0);
