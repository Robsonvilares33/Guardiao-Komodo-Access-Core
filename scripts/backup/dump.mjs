// Backup diário SOMENTE LEITURA (GET no PostgREST com service_role). Uso (CI ou local):
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup/dump.mjs <saida.json> <manifest.json>
// Nunca imprime segredos nem dados: só nomes de tabela e contagens. Cifragem é feita fora (openssl), ver BACKUP_RESTORE.md.
import fs from 'node:fs'; import crypto from 'node:crypto';
const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,''), key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key){console.error('config ausente');process.exit(2);}
const [out,man]=process.argv.slice(2); if(!out||!man){console.error('uso: dump.mjs <saida.json> <manifest.json>');process.exit(2);}
const H={apikey:key,Authorization:'Bearer '+key};
// Descobre as tabelas expostas (OpenAPI do PostgREST) e mantém só kac_* e komodo_*.
const spec=await (await fetch(url+'/rest/v1/',{headers:{...H,Accept:'application/openapi+json'}})).json();
const tables=Object.keys(spec.definitions||{}).filter(t=>/^(kac|komodo)_[a-z0-9_]+$/.test(t)).sort();
const REQUIRED=['kac_organizations','kac_memberships','komodo_acessos','komodo_tbl_usuarios','kac_visit_history','kac_audit_log','kac_invites','kac_plans','kac_subscriptions','kac_payment_events'];
const missing=REQUIRED.filter(t=>!tables.includes(t)); if(missing.length){console.error('tabelas esperadas ausentes: '+missing.join(','));process.exit(3);}
const data={project:new URL(url).hostname.split('.')[0],taken_at:new Date().toISOString(),format:'kac-backup-v1',tables:{}};
const PAGE=1000;
for(const t of tables){const rows=[];for(let from=0;;from+=PAGE){const r=await fetch(`${url}/rest/v1/${t}?select=*`,{headers:{...H,Accept:'application/json','Range-Unit':'items',Range:`${from}-${from+PAGE-1}`,Prefer:'count=exact'}});
  if(!r.ok){console.error(`falha ao ler ${t}: HTTP ${r.status}`);process.exit(4);} const page=await r.json(); rows.push(...page); const total=Number((r.headers.get('content-range')||'').split('/')[1]); if(page.length<PAGE||(Number.isFinite(total)&&rows.length>=total))break;}
  data.tables[t]=rows;}
const body=JSON.stringify(data); fs.writeFileSync(out,body,{mode:0o600});
const manifest={format:data.format,project:data.project,taken_at:data.taken_at,sha256_plaintext:crypto.createHash('sha256').update(body).digest('hex'),bytes:Buffer.byteLength(body),counts:Object.fromEntries(tables.map(t=>[t,data.tables[t].length]))};
fs.writeFileSync(man,JSON.stringify(manifest,null,2));
for(const [t,n] of Object.entries(manifest.counts))console.log(`${t}: ${n}`);
