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
test('restore-check.mjs: mesma cifra do workflow, md5 com TimeZone UTC, ordem 005→006→008→007',()=>{
  const r=src('scripts/backup/restore-check.mjs');assert.match(r,/'-aes-256-cbc','-pbkdf2','-iter','600000','-md','sha256'/);
  assert.match(r,/SET TimeZone='UTC'/);assert.match(r,/'005_tenancy.sql','006_visit_history_audit.sql','008_supabase_auth.sql','007_billing.sql'/);
});
test('.gitignore bloqueia backups',()=>{const g=fs.existsSync(path.join(__dirname,'..','.gitignore'))?src('.gitignore'):'';assert.match(g,/kac_\*\.json/);assert.match(g,/\*\.json\.enc/);});
