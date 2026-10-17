// Uso: node tests/pglite/mig012-history-idx.mjs. Banco descartável. Ensaio 001–011 → 012 → rollback → 012 (2x).
import { PGlite } from '@electric-sql/pglite'; import fs from 'node:fs';
const R=process.env.KAC_DOCS||new URL('../../docs',import.meta.url).pathname, M=R+'/master/migrations'; const db=new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
for(const f of ['proposed_supabase_migration_001.sql','proposed_supabase_migration_002_web_auth.sql','proposed_supabase_migration_003_atomic_auth.sql','proposed_supabase_migration_004_data.sql']) await db.exec(fs.readFileSync(R+'/'+f,'utf8'));
for(const f of ['005_tenancy.sql','006_visit_history_audit.sql','008_supabase_auth.sql','007_billing.sql','009_onboarding.sql','010_lgpd_retention.sql','011_rate_limit_indexes.sql','012_history_visit_idx.sql','012_history_visit_idx_rollback.sql','012_history_visit_idx.sql','012_history_visit_idx.sql']) await db.exec(fs.readFileSync(M+'/'+f,'utf8'));
const n=(await db.query(`select count(*)::int n from pg_indexes where indexname='kac_visit_history_visit_id_idx'`)).rows[0].n;
console.log(n===1?'PASS 012 aplica, rollback, reaplica':'FAIL 012');console.log('fail=',n===1?0:1);process.exit(n===1?0:1);
