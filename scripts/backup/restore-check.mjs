// Restaura um backup (JSON ou .enc cifrado com openssl) num Postgres em memória (PGlite) e confere integridade.
//   node scripts/backup/restore-check.mjs <backup.json|backup.json.enc> [manifest.json]
//   .enc exige BACKUP_PASSPHRASE no ambiente. EXPECT_VISIT_MD5 (opcional) confere o md5 da tabela komodo_acessos.
// Saída: só PASS/FAIL/WARN, contagens e o md5 (nenhum dado de linha).
//
// O esquema acompanha o repositório AUTOMATICAMENTE: aplica 001–004 (docs/) e TODAS as migrações
// docs/master/migrations/NNN_*.sql (exceto *_rollback.sql) na ordem em que foram aplicadas em produção
// (numérica; única exceção histórica: 008 antes de 007). A ordem de carga vem das chaves estrangeiras
// do próprio esquema restaurado, e colunas IDENTITY/sequências são tratadas de forma genérica.
// Se o backup tiver tabela/coluna que ainda não está nas migrações do repo, a restauração NÃO quebra:
// cria a coluna/tabela como texto/jsonb e emite WARN (deriva de esquema a revisar).
import { PGlite } from '@electric-sql/pglite'; import fs from 'node:fs'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process'; import { createRequire } from 'node:module';
const { migrationOrder } = createRequire(import.meta.url)('./migration-order.cjs');
const [file,manPath]=process.argv.slice(2); if(!file){console.error('uso: restore-check.mjs <arquivo> [manifest]');process.exit(2);}
let raw;
if(file.endsWith('.enc')){ if(!process.env.BACKUP_PASSPHRASE){console.error('BACKUP_PASSPHRASE ausente');process.exit(2);}
  const r=spawnSync('openssl',['enc','-d','-aes-256-cbc','-pbkdf2','-iter','600000','-md','sha256','-in',file,'-pass','env:BACKUP_PASSPHRASE'],{maxBuffer:1<<30});
  if(r.status!==0){console.error('falha ao decifrar (senha errada ou arquivo corrompido)');process.exit(3);} raw=r.stdout; }
else raw=fs.readFileSync(file);
const out=[];const ok=(n,c,x='')=>out.push(`${c===true?'PASS':'FAIL'} ${n}${x?' — '+x:''}`);const warn=(n)=>out.push('WARN '+n);
let man=null;
if(manPath){man=JSON.parse(fs.readFileSync(manPath,'utf8'));ok('SHA-256 confere com o manifesto',crypto.createHash('sha256').update(raw).digest('hex')===man.sha256_plaintext);}
const bk=JSON.parse(raw.toString('utf8'));
ok('formato do backup reconhecido',bk&&bk.format==='kac-backup-v1'&&bk.tables&&typeof bk.tables==='object',String(bk&&bk.format));
const R=process.env.KAC_DOCS||new URL('../../docs',import.meta.url).pathname, M=R+'/master/migrations';
const db=new PGlite(); const q=async(s,p)=>(await db.query(s,p)).rows; const id=s=>'"'+String(s).replace(/"/g,'""')+'"';
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
for(const f of ['proposed_supabase_migration_001.sql','proposed_supabase_migration_002_web_auth.sql','proposed_supabase_migration_003_atomic_auth.sql','proposed_supabase_migration_004_data.sql']) await db.exec(fs.readFileSync(R+'/'+f,'utf8'));
const migs=migrationOrder(fs.readdirSync(M));
for(const f of migs){try{await db.exec(fs.readFileSync(M+'/'+f,'utf8'));}catch(e){ok(`migração ${f} aplica no PGlite`,false,String(e.message).slice(0,160));console.log(out.join('\n'));process.exit(1);}}
out.push(`INFO esquema do repo: ${migs.length} migrações (${migs[0]} … ${migs[migs.length-1]})`);
// Esquema restaurado (public): tabelas e colunas.
const cols=async t=>new Map((await q(`select column_name c, data_type d, udt_name u from information_schema.columns where table_schema='public' and table_name=$1`,[t])).map(r=>[r.c,r]));
const exists=new Set((await q(`select table_name t from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`)).map(r=>r.t));
const T=Object.keys(bk.tables).filter(t=>/^(kac|komodo)_[a-z0-9_]+$/.test(t));
const odd=Object.keys(bk.tables).filter(t=>!T.includes(t)); ok('nomes de tabela do backup válidos',odd.length===0,odd.join(','));
const jsType=v=>v!==null&&typeof v==='object'?'jsonb':'text';
for(const t of T){const rows=bk.tables[t]||[];const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  if(!exists.has(t)){warn(`tabela ${t} não existe nas migrações do repo (criada como texto para o teste)`);
    await db.exec(`CREATE TABLE public.${id(t)} (${keys.length?keys.map(k=>`${id(k)} ${jsType(rows.find(r=>r[k]!=null)?.[k]??null)}`).join(','):'_vazio text'}); ALTER TABLE public.${id(t)} ENABLE ROW LEVEL SECURITY;`);exists.add(t);continue;}
  const have=await cols(t);for(const k of keys)if(!have.has(k)){warn(`coluna ${t}.${k} não existe nas migrações do repo (adicionada para o teste)`);await db.exec(`ALTER TABLE public.${id(t)} ADD COLUMN ${id(k)} ${jsType(rows.find(r=>r[k]!=null)?.[k]??null)}`);}}
// Ordem de carga pelas FKs do esquema (pais antes de filhos).
const fks=await q(`select c.conrelid::regclass::text child, c.confrelid::regclass::text parent from pg_constraint c where c.contype='f' and c.connamespace='public'::regnamespace`);
const norm=s=>s.replace(/^public\./,'').replace(/"/g,''); const order=[];const seen=new Set();const visiting=new Set();
const visit=t=>{if(seen.has(t))return;if(visiting.has(t))return;visiting.add(t);for(const f of fks)if(norm(f.child)===t&&norm(f.parent)!==t&&T.includes(norm(f.parent)))visit(norm(f.parent));visiting.delete(t);seen.add(t);order.push(t);};
T.slice().sort().forEach(visit);
// Começa vazio (sementes das migrações saem; o backup é a fonte), sem gatilhos de usuário durante a carga.
if(T.length)await db.exec(`TRUNCATE ${T.map(t=>'public.'+id(t)).join(',')} CASCADE;`);
for(const t of T)await db.exec(`ALTER TABLE public.${id(t)} DISABLE TRIGGER USER;`);
for(const t of order){const rows=bk.tables[t]||[];const have=await cols(t);
  const identity=(await q(`select count(*)::int n from pg_attribute where attrelid=$1::regclass and attidentity='a' and not attisdropped`,['public.'+id(t)]))[0].n>0;
  // Colunas GERADAS (GENERATED ALWAYS AS … STORED) não aceitam valor: o banco recalcula. Ficam fora do INSERT e são conferidas depois.
  const generated=new Set((await q(`select attname a from pg_attribute where attrelid=$1::regclass and attgenerated<>'' and attnum>0 and not attisdropped`,['public.'+id(t)])).map(r=>r.a));
  const conv=(k,v)=>{if(v===null||v===undefined)return null;const c=have.get(k);if(c&&c.d==='ARRAY')return v;if(c&&(c.u==='json'||c.u==='jsonb'))return JSON.stringify(v);if(typeof v==='object')return JSON.stringify(v);return v;};
  try{for(const row of rows){const k=Object.keys(row).filter(c=>!generated.has(c));if(!k.length){await db.exec(`insert into public.${id(t)} default values`);continue;}
    await db.query(`insert into public.${id(t)}(${k.map(id).join(',')})${identity?' OVERRIDING SYSTEM VALUE':''} values(${k.map((_,i)=>'$'+(i+1)).join(',')})`,k.map(x=>conv(x,row[x])));}}
  catch(e){ok(`restore ${t}`,false,`${e.code||''} ${String(e.message).slice(0,140)}`);continue;}
  const n=(await q(`select count(*)::int n from public.${id(t)}`))[0].n; ok(`restore ${t}: ${n}`,n===rows.length);
  if(man&&man.counts&&t in man.counts)ok(`contagem ${t} = manifesto`,man.counts[t]===rows.length);
  for(const g of generated){const exp=rows.map(r=>r[g]===undefined||r[g]===null?null:String(r[g])).sort();const got=(await q(`select ${id(g)}::text v from public.${id(t)}`)).map(r=>r.v).sort();
    ok(`coluna gerada ${t}.${g} recalculada igual ao backup`,JSON.stringify(exp)===JSON.stringify(got));}}
for(const t of T)await db.exec(`ALTER TABLE public.${id(t)} ENABLE TRIGGER USER;`);
// Reposiciona todas as sequências (serial e identity) depois dos ids explícitos.
for(const t of T)for(const r of await q(`select a.attname c, pg_get_serial_sequence($1,a.attname) s from pg_attribute a where a.attrelid=$1::regclass and a.attnum>0 and not a.attisdropped`,['public.'+id(t)]))
  if(r.s)await db.query(`select setval($1::regclass, coalesce((select max(${id(r.c)})::bigint from public.${id(t)}),0)+1, false)`,[r.s]);
await db.exec(`SET TimeZone='UTC'; SET DateStyle='ISO, MDY';`); // mesmo formato de texto do Supabase (UTC)
if(T.includes('komodo_acessos')){const md5=(await q(`select md5(string_agg(t::text, ',' order by t.id)) h from komodo_acessos t`))[0].h;
  if(process.env.EXPECT_VISIT_MD5) ok('md5 de komodo_acessos = esperado',md5===process.env.EXPECT_VISIT_MD5,md5); else out.push('INFO md5 komodo_acessos '+md5);}
ok('RLS em todas as tabelas restauradas',(await q(`select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`))[0].n===0);
console.log(out.join('\n')); const fail=out.filter(x=>x.startsWith('FAIL')).length; console.log('fail=',fail,'warn=',out.filter(x=>x.startsWith('WARN')).length); process.exit(fail?1:0);
