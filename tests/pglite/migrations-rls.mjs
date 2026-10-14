import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const R=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../docs');
// Requer: npm i --no-save @electric-sql/pglite  (dev-only, não vai para produção)
const M=R+'/master/migrations';
const db=new PGlite(); const out=[]; let pass=0,fail=0;
const ok=(name,cond,extra='')=>{cond?pass++:fail++;out.push(`${cond?'PASS':'FAIL'} ${name}${extra?' — '+extra:''}`);};
const ex=async(sql)=>db.exec(sql);
const q=async(sql,p)=>(await db.query(sql,p)).rows;
const tryq=async(sql,p)=>{try{await db.query(sql,p);return null;}catch(e){return e.message;}};
await ex(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;`);
for(const f of ['proposed_supabase_migration_001.sql','proposed_supabase_migration_002_web_auth.sql','proposed_supabase_migration_003_atomic_auth.sql','proposed_supabase_migration_004_data.sql']) await ex(fs.readFileSync(R+'/'+f,'utf8'));
ok('001-004 aplicam em Postgres limpo',true);
// estado "produção atual": 1 admin + 1 visita legada
await ex(`INSERT INTO komodo_tbl_usuarios(id,email,salt,hash,papel) VALUES ('uA','a@example.com','s','h','admin'),('uB','b@example.com','s','h','admin'),('uV','v@example.com','s','h','operador');
INSERT INTO komodo_acessos(id,modulo,dia,hora,nome,data) VALUES ('legacy1','empresarial','ter','09:00','Legado',NULL);`);
await ex(fs.readFileSync(M+'/005_tenancy.sql','utf8')); ok('005 aplica sobre dados existentes',true);
// Simula a Fase C (Supabase Auth): em produção a 005 NÃO concede nada a authenticated.
ok('005 produção: authenticated sem grants',(await q(`select count(*)::int n from information_schema.role_table_grants where grantee='authenticated' and table_schema='public'`))[0].n===0);
await ex(`GRANT SELECT ON kac_organizations,kac_memberships TO authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON komodo_acessos TO authenticated; GRANT EXECUTE ON FUNCTION kac_is_member(uuid,text[]), kac_current_user() TO authenticated;`);
ok('005 backfill: linha legada recebe org padrão',(await q(`select organization_id from komodo_acessos where id='legacy1'`))[0].organization_id==='00000000-0000-4000-8000-000000000001');
await ex(fs.readFileSync(M+'/006_visit_history_audit.sql','utf8')); ok('006 aplica',true);
await ex(`GRANT SELECT ON kac_visit_history TO authenticated;`).catch(()=>{});
// cenário: org A (uA owner, uV viewer), org B (uB owner)
await ex(`INSERT INTO kac_organizations(id,name) VALUES ('aaaaaaaa-0000-4000-8000-000000000001','Org A'),('bbbbbbbb-0000-4000-8000-000000000001','Org B');
DELETE FROM kac_memberships; INSERT INTO kac_memberships VALUES ('aaaaaaaa-0000-4000-8000-000000000001','uA','owner'),('aaaaaaaa-0000-4000-8000-000000000001','uV','viewer'),('bbbbbbbb-0000-4000-8000-000000000001','uB','owner');
INSERT INTO komodo_acessos(id,modulo,dia,hora,nome,data,organization_id) VALUES ('a1','empresarial','ter','10:00','Visita A','2026-10-13','aaaaaaaa-0000-4000-8000-000000000001'),('b1','empresarial','ter','11:00','Visita B','2026-10-13','bbbbbbbb-0000-4000-8000-000000000001');`);
const as=async(user,fn)=>{await ex(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('app.user_id','${user}',true);`);try{return await fn();}finally{await ex('ROLLBACK');}};
ok('Org A vê só as próprias visitas',JSON.stringify(await as('uA',()=>q(`select id from komodo_acessos order by id`)).then(r=>r.map(x=>x.id)))==='["a1"]');
ok('Org B vê só as próprias visitas',JSON.stringify((await as('uB',()=>q(`select id from komodo_acessos order by id`))).map(x=>x.id))==='["b1"]');
ok('Org B NÃO consegue inserir na Org A',!!(await as('uB',()=>tryq(`insert into komodo_acessos(id,modulo,dia,hora,nome,data,organization_id) values('x','empresarial','ter','10:00','Invasor','2026-10-13','aaaaaaaa-0000-4000-8000-000000000001')`))));
ok('Org B NÃO consegue alterar visita da Org A (0 linhas)',(await as('uB',async()=>{await q(`update komodo_acessos set nome='hack' where id='a1'`);return q(`select 1`);}))&&(await q(`select nome from komodo_acessos where id='a1'`))[0].nome==='Visita A');
ok('Org B NÃO consegue apagar visita da Org A',(await as('uB',async()=>{await q(`delete from komodo_acessos where id='a1'`);return true;}))&&(await q(`select count(*)::int n from komodo_acessos where id='a1'`))[0].n===1);
ok('viewer NÃO consegue inserir',!!(await as('uV',()=>tryq(`insert into komodo_acessos(id,modulo,dia,hora,nome,data,organization_id) values('v','empresarial','ter','10:00','Viewer','2026-10-13','aaaaaaaa-0000-4000-8000-000000000001')`))));
ok('sem app.user_id (anônimo autenticado) vê 0 linhas',(await (async()=>{await ex(`BEGIN; SET LOCAL ROLE authenticated;`);try{return (await q(`select count(*)::int n from komodo_acessos`))[0].n;}finally{await ex('ROLLBACK');}})())===0);
ok('anon não tem acesso',!!(await (async()=>{await ex(`BEGIN; SET LOCAL ROLE anon;`);try{return await tryq(`select 1 from komodo_acessos`);}finally{await ex('ROLLBACK');}})()));
ok('Org B não lê memberships da Org A',(await as('uB',()=>q(`select count(*)::int n from kac_memberships where organization_id='aaaaaaaa-0000-4000-8000-000000000001'`)))[0].n===0);
// reagendamento com histórico (7.3-09)
await as('uA',async()=>{await q(`update komodo_acessos set data='2026-10-15', dia='qui', hora='14:00' where id='a1'`);await ex('COMMIT');await ex('BEGIN');});
const h=await q(`select action,old_data::text,new_data::text from kac_visit_history where visit_id='a1' order by id`);
ok('7.3-09 reagendamento grava histórico (created + rescheduled)',h.map(x=>x.action).join(',')==='created,rescheduled'&&h[1].old_data==='2026-10-13'&&h[1].new_data==='2026-10-15');
ok('updated_at atualizado pelo trigger',(await q(`select updated_at>created_at ok from komodo_acessos where id='a1'`))[0].ok===true);
ok('Org B não lê histórico da Org A',(await as('uB',()=>q(`select count(*)::int n from kac_visit_history where visit_id='a1'`)))[0].n===0);
await ex(fs.readFileSync(M+'/007_billing.sql','utf8')); ok('007 aplica',true);
ok('Org B não vê assinatura da Org A',(await as('uB',()=>q(`select count(*)::int n from kac_subscriptions where organization_id='aaaaaaaa-0000-4000-8000-000000000001'`)))[0].n===0);
ok('viewer não vê assinatura',(await as('uV',()=>q(`select count(*)::int n from kac_subscriptions`)))[0].n===0);
ok('authenticated não lê payment_events',!!(await as('uA',()=>tryq(`select 1 from kac_payment_events`))));
ok('webhook idempotente (evento duplicado rejeitado)',!!(await (async()=>{await q(`insert into kac_payment_events(provider,provider_event_id,type,payload) values('mercadopago','e1','payment','{}')`);return tryq(`insert into kac_payment_events(provider,provider_event_id,type,payload) values('mercadopago','e1','payment','{}')`);})()));
await ex(fs.readFileSync(M+'/007_billing_rollback.sql','utf8')); ok('rollback 007',true);
// concorrência: bootstrap atômico continua
ok('003 bootstrap retorna already_initialized com usuários existentes',(await q(`select komodo_bootstrap_admin_atomic('z','z@example.com','s','h','x') r`))[0].r==='already_initialized');
// rollback e reaplicação
await ex(fs.readFileSync(M+'/006_visit_history_audit_rollback.sql','utf8'));
await ex(fs.readFileSync(M+'/005_tenancy_rollback.sql','utf8'));
ok('rollback 006+005 preserva visitas',(await q(`select count(*)::int n from komodo_acessos`))[0].n===3);
ok('rollback remove organization_id',(await q(`select count(*)::int n from information_schema.columns where table_name='komodo_acessos' and column_name='organization_id'`))[0].n===0);
await ex(fs.readFileSync(M+'/005_tenancy.sql','utf8')); await ex(fs.readFileSync(M+'/006_visit_history_audit.sql','utf8'));
ok('005+006 reaplicam após rollback (idempotência)',true);
console.log(out.join('\n')); console.log(`TOTAL pass=${pass} fail=${fail} (PGlite ${(await q('select version() v'))[0].v.split(' ').slice(0,2).join(' ')})`);
