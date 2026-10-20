'use strict';
// Contrato do backup diário: cifrado, retenção curta, somente leitura, sem texto claro publicado.
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const src=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('workflow db-backup: diário, só leitura, guardado por secrets, cifrado, 14 dias, sem JSON em claro no artefato',()=>{
  const y=src('.github/workflows/db-backup.yml');
  assert.match(y,/schedule:\r?\n\s+- cron: '17 6 \* \* \*'/);assert.match(y,/permissions:\r?\n\s+contents: read/);
  assert.match(y,/ready=true/);assert.match(y,/steps\.guard\.outputs\.ready == 'true'/);
  assert.match(y,/openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -salt/);assert.match(y,/-pass env:BACKUP_PASSPHRASE/);
  assert.match(y,/retention-days: 14/);assert.match(y,/rm -f "\$RUNNER_TEMP\/bk\/kac_\$STAMP\.json"/);assert.ok(!/rm -f [^\n]*\*\.json/.test(y),"não apagar o manifesto");
  const up=y.slice(y.indexOf('upload-artifact'));assert.ok(!/\/bk\/\*\.json\s*$/m.test(up)&&!/\.json\r?\n/.test(up.replace(/manifest\.json|\.json\.enc(\.sha256)?/g,'')),'artefato só com .enc, .sha256 e manifesto');
  assert.ok(!/echo .*\$\{?(SUPABASE_SERVICE_ROLE_KEY|BACKUP_PASSPHRASE)/.test(y),'nunca ecoa segredos');
});
test('dump.mjs: só GET (sem POST/PATCH/DELETE), tabelas kac_/komodo_, exige as tabelas da 007',()=>{
  const d=src('scripts/backup/dump.mjs');assert.ok(!/method\s*:\s*['"](POST|PATCH|PUT|DELETE)/.test(d));
  for(const t of ['kac_plans','kac_subscriptions','kac_payment_events','komodo_acessos'])assert.ok(d.includes(`'${t}'`));
  assert.match(d,/\^\(kac\|komodo\)_/);assert.ok(!/console\.log\([^)]*rows/.test(d));
});
test('restore-check.mjs: mesma cifra do workflow, md5 com TimeZone UTC, esquema gerado das migrações do repo',()=>{
  const r=src('scripts/backup/restore-check.mjs');assert.match(r,/'-aes-256-cbc','-pbkdf2','-iter','600000','-md','sha256'/);
  assert.match(r,/SET TimeZone='UTC'/);assert.match(r,/migrationOrder\(fs\.readdirSync\(M\)\)/);
  assert.ok(!/const ORDER=\[/.test(r),'sem lista fixa de tabelas');assert.match(r,/contype='f'/);assert.match(r,/attidentity='a'/);assert.match(r,/attgenerated<>''/);assert.match(r,/filter\(c=>!generated\.has\(c\)\)/);assert.match(r,/c\.u==='jsonb'/);assert.match(r,/WARN /);
  assert.ok(!/console\.log\([^)]*row/.test(r),'nunca imprime linhas');
});
test('ordem das migrações = ordem de produção (008 antes de 007; 013b depois de 013; sem rollback) e cobre todas do repo',()=>{
  const {migrationOrder:m}=require('../scripts/backup/migration-order.cjs');
  assert.deepEqual(m(['014_x.sql','007_billing.sql','013b_y.sql','008_a.sql','013_z.sql','005_t.sql','006_h.sql','007_billing_rollback.sql','README.md']),['005_t.sql','006_h.sql','008_a.sql','007_billing.sql','013_z.sql','013b_y.sql','014_x.sql']);
  const all=fs.readdirSync(path.join(__dirname,'..','docs/master/migrations'));const o=m(all);
  assert.equal(o.length,all.filter(f=>f.endsWith('.sql')&&!f.endsWith('_rollback.sql')).length);assert.ok(o.indexOf('008_supabase_auth.sql')<o.indexOf('007_billing.sql'));assert.equal(o[o.length-1],all.filter(f=>/^\d{3}/.test(f)&&!f.endsWith('_rollback.sql')).sort().pop());
});
test('.gitignore bloqueia backups',()=>{const g=fs.existsSync(path.join(__dirname,'..','.gitignore'))?src('.gitignore'):'';assert.match(g,/kac_\*\.json/);assert.match(g,/\*\.json\.enc/);});
test('smoke-auth: job ligado por variável, usa secrets do usuário dedicado, script só lê e prova isolamento',()=>{
  const y=src('.github/workflows/post-deploy-smoke.yml');assert.match(y,/smoke-auth:\r?\n\s+if: vars\.KAC_SMOKE_AUTH == 'true'/);assert.match(y,/node scripts\/smoke-auth\.mjs/);assert.match(y,/secrets\.KAC_SMOKE_PASSWORD/);
  const s=src('scripts/smoke-auth.mjs');assert.ok(!/visitantes[^'`]*['`],\{method:'(POST|PUT|PATCH|DELETE)'/.test(s));assert.match(s,/rows\.length===0/);assert.ok(!/console\.log\([^)]*(pw|password)/i.test(s));
});
