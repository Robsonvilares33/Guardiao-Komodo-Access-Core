// Restaura um backup (JSON ou .enc cifrado com openssl) num Postgres em memória (PGlite) e confere integridade.
//   node scripts/backup/restore-check.mjs <backup.json|backup.json.enc> [manifest.json]
//   .enc exige BACKUP_PASSPHRASE no ambiente. EXPECT_VISIT_MD5 (opcional) confere o md5 da tabela komodo_acessos.
// Saída: só PASS/FAIL, contagens e o md5 (nenhum dado de linha).
import { PGlite } from '@electric-sql/pglite'; import fs from 'node:fs'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process';
const [file,manPath]=process.argv.slice(2); if(!file){console.error('uso: restore-check.mjs <arquivo> [manifest]');process.exit(2);}
let raw;
if(file.endsWith('.enc')){ if(!process.env.BACKUP_PASSPHRASE){console.error('BACKUP_PASSPHRASE ausente');process.exit(2);}
  const r=spawnSync('openssl',['enc','-d','-aes-256-cbc','-pbkdf2','-iter','600000','-md','sha256','-in',file,'-pass','env:BACKUP_PASSPHRASE'],{maxBuffer:1<<30});
  if(r.status!==0){console.error('falha ao decifrar (senha errada ou arquivo corrompido)');process.exit(3);} raw=r.stdout; }
else raw=fs.readFileSync(file);
const out=[];const ok=(n,c,x='')=>out.push(`${c===true?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);
if(manPath){const m=JSON.parse(fs.readFileSync(manPath,'utf8'));ok('SHA-256 confere com o manifesto',crypto.createHash('sha256').update(raw).digest('hex')===m.sha256_plaintext);}
const bk=JSON.parse(raw.toString('utf8'));
const R=new URL('../../docs',import.meta.url).pathname, M=R+'/master/migrations';
const db=new PGlite(); const q=async(s,p)=>(await db.query(s,p)).rows;
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
for(const f of ['proposed_supabase_migration_001.sql','proposed_supabase_migration_002_web_auth.sql','proposed_supabase_migration_003_atomic_auth.sql','proposed_supabase_migration_004_data.sql']) await db.exec(fs.readFileSync(R+'/'+f,'utf8'));
// Mesma ordem aplicada em produção: 005, 006, 008, 007.
for(const f of ['005_tenancy.sql','006_visit_history_audit.sql','008_supabase_auth.sql','007_billing.sql']) await db.exec(fs.readFileSync(M+'/'+f,'utf8'));
await db.exec(`DELETE FROM kac_subscriptions; DELETE FROM kac_plans; DELETE FROM kac_memberships; DELETE FROM kac_organizations; ALTER TABLE komodo_acessos DISABLE TRIGGER USER;`);
const ORDER=['kac_organizations','komodo_tbl_usuarios','kac_memberships','komodo_acessos','komodo_web_sessions','komodo_login_attempts','kac_visit_history','kac_audit_log','kac_invites','kac_plans','kac_subscriptions','kac_payment_events'];
const extra=Object.keys(bk.tables).filter(t=>!ORDER.includes(t)); ok('todas as tabelas do backup são conhecidas',extra.length===0,extra.join(','));
for(const t of ORDER){const rows=bk.tables[t]||[];const ov=t==='kac_payment_events'?' OVERRIDING SYSTEM VALUE':'';
  for(const row of rows){const k=Object.keys(row);await db.query(`insert into ${t}(${k.map(x=>'"'+x+'"').join(',')})${ov} values(${k.map((_,i)=>'$'+(i+1)).join(',')})`,k.map(x=>row[x]&&typeof row[x]==='object'?JSON.stringify(row[x]):row[x]));}
  const n=(await q(`select count(*)::int n from ${t}`))[0].n; ok(`restore ${t}: ${n}`,n===rows.length);}
await db.exec(`ALTER TABLE komodo_acessos ENABLE TRIGGER USER;`);
for(const t of ['kac_audit_log','kac_visit_history','kac_payment_events']) await db.exec(`select setval(pg_get_serial_sequence('${t}','id'), coalesce((select max(id) from ${t}),0)+1, false)`);
await db.exec(`SET TimeZone='UTC'; SET DateStyle='ISO, MDY';`); // mesmo formato de texto do Supabase (UTC)
const md5=(await q(`select md5(string_agg(t::text, ',' order by t.id)) h from komodo_acessos t`))[0].h;
if(process.env.EXPECT_VISIT_MD5) ok('md5 de komodo_acessos = esperado',md5===process.env.EXPECT_VISIT_MD5,md5); else out.push('INFO md5 komodo_acessos '+md5);
ok('RLS em todas as tabelas restauradas',(await q(`select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`))[0].n===0);
console.log(out.join('\n')); const fail=out.filter(x=>x.startsWith('FAIL')).length; console.log('fail=',fail); process.exit(fail?1:0);
