// Uso: node tests/pglite/prod008-auth.mjs <backup.json>  (backup privado, NUNCA commitar). Ensaio da 008 sobre o estado real de produção (001–006).
import { PGlite } from '@electric-sql/pglite'; import fs from 'node:fs'; import crypto from 'node:crypto';
const R=new URL('../../docs',import.meta.url).pathname, M=R+'/master/migrations'; const bk=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const db=new PGlite(); const out=[]; const ok=(n,c,x='')=>out.push(`${c===true?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);
const q=async(s,p)=>(await db.query(s,p)).rows; const cnt=async t=>(await q(`select count(*)::int n from ${t}`))[0].n; const H=t=>crypto.createHash('sha256').update(t).digest('hex');
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
for(const f of ['proposed_supabase_migration_001.sql','proposed_supabase_migration_002_web_auth.sql','proposed_supabase_migration_003_atomic_auth.sql','proposed_supabase_migration_004_data.sql']) await db.exec(fs.readFileSync(R+'/'+f,'utf8'));
for(const f of ['005_tenancy.sql','006_visit_history_audit.sql']) await db.exec(fs.readFileSync(M+'/'+f,'utf8'));
await db.exec(`DELETE FROM kac_memberships; DELETE FROM kac_organizations; ALTER TABLE komodo_acessos DISABLE TRIGGER USER;`);
const T=['kac_organizations','komodo_tbl_usuarios','kac_memberships','komodo_acessos','komodo_web_sessions','komodo_login_attempts','kac_visit_history','kac_audit_log'];
for(const t of T){for(const row of bk.tables[t]){const k=Object.keys(row);await db.query(`insert into ${t}(${k.map(x=>'"'+x+'"').join(',')}) values(${k.map((_,i)=>'$'+(i+1)).join(',')})`,k.map(x=>row[x]&&typeof row[x]==='object'?JSON.stringify(row[x]):row[x]));} ok(`restore ${t}: ${bk.tables[t].length}`,await cnt(t)===bk.tables[t].length);}
await db.exec(`ALTER TABLE komodo_acessos ENABLE TRIGGER USER;`);
// restauração com ids explícitos: reposicionar sequências (achado do ensaio; ver BACKUP_RESTORE)
for(const t of ['kac_audit_log','kac_visit_history']) await db.exec(`select setval(pg_get_serial_sequence('${t}','id'), coalesce((select max(id) from ${t}),0)+1, false)`);
const snap=async()=>{const o={};for(const t of T)o[t]=JSON.stringify(await q(`select * from ${t} order by 1`));return o;};
const before=await snap(); const users=JSON.stringify(await q(`select id,email,salt,hash,papel from komodo_tbl_usuarios order by id`));
await db.exec(fs.readFileSync(M+'/008_supabase_auth.sql','utf8')); ok('008 aplica sobre o backup',true);
const after=await snap(); for(const t of T) ok(`${t} inalterada`,t==='komodo_tbl_usuarios'?JSON.stringify(await q(`select id,email,salt,hash,papel from komodo_tbl_usuarios order by id`))===users:after[t]===before[t]);
ok('auth_user_id nulo para usuário existente (sem vínculo automático)',(await q(`select count(*)::int n from komodo_tbl_usuarios where auth_user_id is not null`))[0].n===0);
ok('kac_invites vazia',await cnt('kac_invites')===0);
ok('sem grants anon/authenticated (tabelas)',(await q(`select count(*)::int n from information_schema.role_table_grants where grantee in ('anon','authenticated') and table_schema='public'`))[0].n===0);
ok('sem EXECUTE anon/authenticated/PUBLIC em kac_*',(await q(`select count(*)::int n from information_schema.role_routine_grants where grantee in ('anon','authenticated','PUBLIC') and routine_schema='public' and routine_name like 'kac_%'`))[0].n===0);
ok('RLS em todas as tabelas',(await q(`select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`))[0].n===0);
// convite TESTE no estado real e limpeza
const org=bk.tables.kac_organizations[0].id, tk=crypto.randomBytes(32).toString('base64url');
await db.query(`insert into kac_invites(organization_id,email,role,token_hash,expires_at) values($1,'teste.auditoria@example.com','viewer',$2,now()+interval '1 hour')`,[org,H(tk)]);
const r=(await q(`select kac_accept_invite($1,$2,$3,$4) r`,[H(tk),crypto.randomUUID(),'teste.auditoria@example.com','user_teste']))[0].r; ok('aceite no estado real → accepted viewer',r.status==='accepted'&&r.role==='viewer');
ok('admin real continua owner',(await q(`select role from kac_memberships where user_id=$1`,[bk.tables.komodo_tbl_usuarios[0].id]))[0].role==='owner');
await db.exec(fs.readFileSync(M+'/008_supabase_auth_rollback.sql','utf8'));
ok('rollback: kac_invites e função removidas',(await q(`select to_regclass('public.kac_invites') t, to_regprocedure('public.kac_accept_invite(text,uuid,text,text)') f`)).every(x=>x.t===null&&x.f===null));
ok('rollback: coluna auth_user_id removida',(await q(`select count(*)::int n from information_schema.columns where table_name='komodo_tbl_usuarios' and column_name='auth_user_id'`))[0].n===0);
ok('rollback: senha/hash do admin real intactos',JSON.stringify(await q(`select id,email,salt,hash,papel from komodo_tbl_usuarios where id<>'user_teste' order by id`))===users);
ok('rollback: visita real intacta',JSON.stringify(await q(`select * from komodo_acessos order by 1`))===before.komodo_acessos);
await db.exec(fs.readFileSync(M+'/008_supabase_auth.sql','utf8')); ok('008 reaplica após rollback',true);
console.log(out.join('\n')); console.log('fail=',out.filter(x=>!x.startsWith('PASS')).length);
