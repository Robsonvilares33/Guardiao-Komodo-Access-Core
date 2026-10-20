// Uso: node tests/pglite/backup-restore-check.mjs  (requer @electric-sql/pglite, dev). Banco descartável, dados FICTÍCIOS.
// Monta um backup no formato kac-backup-v1 (como o dump do PostgREST: select * em JSON) a partir de um banco com TODAS as
// migrações e linhas reais nas tabelas com armadilhas: coluna GERADA (kac_saved_visitors.nome_norm), IDENTITY ALWAYS
// (kac_payment_events.id), jsonb com escalar string, gatilhos de usuário (visitas/convites/salvos). Depois roda o restore-check.
import { PGlite } from '@electric-sql/pglite'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { createRequire } from 'node:module';
const R=process.env.KAC_DOCS||new URL('../../docs',import.meta.url).pathname, M=R+'/master/migrations';
const CHECK=process.env.RESTORE_CHECK||new URL('../../scripts/backup/restore-check.mjs',import.meta.url).pathname;
const { migrationOrder } = createRequire(import.meta.url)(path.join(path.dirname(CHECK),'migration-order.cjs'));
const out=[];const ok=(n,c,x='')=>out.push(`${c===true?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);
const db=new PGlite(); const q=async s=>(await db.query(s)).rows;
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
for(const f of ['proposed_supabase_migration_001.sql','proposed_supabase_migration_002_web_auth.sql','proposed_supabase_migration_003_atomic_auth.sql','proposed_supabase_migration_004_data.sql']) await db.exec(fs.readFileSync(R+'/'+f,'utf8'));
for(const f of migrationOrder(fs.readdirSync(M))) await db.exec(fs.readFileSync(M+'/'+f,'utf8'));
const A='00000000-0000-4000-8000-000000000001';
await db.exec(`INSERT INTO kac_organizations(id,name) VALUES ('${A}','Org Fictícia') ON CONFLICT (id) DO NOTHING;
 INSERT INTO komodo_tbl_usuarios(id,email,salt,hash,papel) VALUES ('ua','a@example.com','x','x','operador') ON CONFLICT DO NOTHING;
 INSERT INTO kac_memberships(organization_id,user_id,role) VALUES ('${A}','ua','owner') ON CONFLICT DO NOTHING;
 INSERT INTO komodo_acessos(id,modulo,dia,hora,nome,status,data,organization_id) VALUES ('v1','empresarial','seg','09:00','Fulano Teste',0,'2026-10-19','${A}');
 INSERT INTO kac_saved_visitors(organization_id,modulo,nome,placa) VALUES ('${A}','empresarial','  Maria DA Silva ','ABC1D23'),('${A}','residencial','João Fictício',null);
 INSERT INTO kac_payment_events(provider,provider_event_id,organization_id,type,payload) VALUES ('mercadopago','ev1','${A}','payment','{"a":1,"b":[1,2]}'),('mercadopago','ev2',null,'test','"so-um-texto"');`);
const tables=(await q(`select table_name t from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name ~ '^(kac|komodo)_' order by 1`)).map(r=>r.t);
const bk={project:'fixture',taken_at:new Date().toISOString(),format:'kac-backup-v1',tables:{}};
for(const t of tables) bk.tables[t]=(await q(`select coalesce(json_agg(x),'[]'::json) j from (select * from public."${t}") x`))[0].j;
ok('fixture tem linhas na tabela com coluna gerada',bk.tables.kac_saved_visitors.length===2&&bk.tables.kac_saved_visitors.every(r=>'nome_norm' in r));
ok('fixture tem linhas na tabela IDENTITY ALWAYS',bk.tables.kac_payment_events.length===2);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kacfx-'));const file=path.join(dir,'kac_fixture.json');fs.writeFileSync(file,JSON.stringify(bk),{mode:0o600});
const r=spawnSync(process.execPath,[CHECK,file],{encoding:'utf8',env:{...process.env,KAC_DOCS:R}});
const lines=(r.stdout||'').split('\n');
ok('restore-check termina sem FAIL',r.status===0,(lines.filter(l=>l.startsWith('FAIL'))[0]||r.stderr||'').slice(0,200));
ok('kac_saved_visitors restaurado com 2 linhas',lines.includes('PASS restore kac_saved_visitors: 2'));
ok('coluna gerada recalculada e conferida',lines.includes('PASS coluna gerada kac_saved_visitors.nome_norm recalculada igual ao backup'));
ok('kac_payment_events (IDENTITY ALWAYS, jsonb escalar) restaurado',lines.includes('PASS restore kac_payment_events: 2'));
ok('nenhum WARN de deriva',!lines.some(l=>l.startsWith('WARN')));
fs.rmSync(dir,{recursive:true,force:true});
console.log(out.join('\n'));const fail=out.filter(x=>x.startsWith('FAIL')).length;console.log('fail=',fail);process.exit(fail?1:0);
