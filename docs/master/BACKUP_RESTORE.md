# Backup e restauração (Supabase Free não tem backups automáticos)

## Backup (R$0)
1. `pg_dump` com a connection string do banco (lida do ambiente, nunca colada no comando) → `kac_YYYYMMDD.dump` (formato custom).
2. Guardar cifrado (age/gpg) em armazenamento do usuário (Google Drive/OneDrive), com retenção de 7 diários + 4 semanais.
3. Agendar via GitHub Actions (gratuito para repositório público; **o segredo fica em Actions secrets**) ou no Revision-PC. **Pendente de autorização**, porque cria um segredo novo.
4. Manter ping semanal para evitar a pausa por inatividade.

## Restauração (testar trimestralmente)

> Achado no ensaio da 008: ao restaurar `kac_audit_log`/`kac_visit_history` com ids explícitos, reposicionar as sequências (`select setval(pg_get_serial_sequence('<tabela>','id'), max(id)+1, false)`), senão o próximo INSERT falha por chave duplicada.
1. Criar um banco descartável (PGlite/Postgres local ou 2º projeto Free).
2. `pg_restore --no-owner` → conferir contagens por tabela e rodar `tests/pglite/migrations-rls.mjs`.
3. Registrar RPO (≤24 h) e RTO medidos.

**Status: backup diário automático PREPARADO (`.github/workflows/db-backup.yml`), inativo até os secrets serem cadastrados — ver seção abaixo.**

## Backups pré-migração (JSON via API, privados — nunca commitar)
Guardados em `/workspace/backups` (box, pasta 700/arquivos 600) e `C:\Users\yyy\Documents\kac_backups` (PC). SHA-256 conferido nos dois lados.
| Arquivo | Antes de | SHA-256 |
|---|---|---|
| kac_pre005_20261014T000935.json | 005 | 09be96ec…edb699 |
| kac_pre006_20261014T012856.json | 006 | dacbcf93…6e871 |
| kac_pre008_20261014T021730.json | 008 | dc7db18d…9445d |
| kac_pre007_20261014T145448.json | 007 (9 tabelas, inclui kac_invites) | 21dd7b3b639594a74dcb7d9eb40de12971d104385cfda04f703320b45f604d10 |

### Rollback da 007 (aplicada em 14/10/2026, versão `007_billing`)
1. Conferir que nada depende das tabelas (API com `KAC_BILLING` desligada em produção não as usa).
2. Exportar `kac_payment_events` e `kac_subscriptions` (se houver eventos) para JSON privado.
3. Executar `docs/master/migrations/007_billing_rollback.sql` (DROP das 3 tabelas novas; não toca nas tabelas 001–006/008).
4. Verificar: md5 da visita real, contagens, advisors. Ensaio: `node tests/pglite/prod007-billing.mjs <backup>` (49/49).

## Backup diário automático (GitHub Actions, R$0)
- Workflow `db-backup` (cron 06:17 UTC = 03:17 São Paulo + execução manual). Repositório público → minutos grátis.
- **Somente leitura**: `scripts/backup/dump.mjs` faz só GET no PostgREST com service_role, descobre todas as tabelas `kac_*`/`komodo_*` (inclui as da 007) e falha se faltar alguma esperada. Imprime só contagens.
- **Cifrado**: `openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -salt -pass env:BACKUP_PASSPHRASE`. Artefato = `kac_<UTC>.json.enc` + `.sha256` + `manifest.json` (contagens por tabela + SHA-256 do texto claro; sem dados). **Retenção 14 dias.** O JSON em claro é apagado do runner.
- **Teste de restauração a cada execução**: decifra o próprio artefato e restaura em PGlite (`scripts/backup/restore-check.mjs`): SHA-256 = manifesto, contagens, RLS e md5 de `komodo_acessos` (confere com a variável de repositório opcional `KAC_EXPECT_VISIT_MD5`; hoje `cc9fe7b3edad64f6423b865a40a729af`).
- **Para ativar (Settings → Secrets and variables → Actions, campos mascarados):**
  - Secret `SUPABASE_URL` = `https://hcqcmirculeiyrpiwlpm.supabase.co`
  - Secret `SUPABASE_SERVICE_ROLE_KEY` = chave service_role do projeto (Supabase → Project Settings → API).
  - Secret `BACKUP_PASSPHRASE` = senha forte (≥ 24 caracteres; ex.: `openssl rand -base64 32`). **Guardar também no gerenciador de senhas: sem ela o backup não pode ser decifrado.**
  - (opcional) Variable `KAC_EXPECT_VISIT_MD5` = md5 atual da tabela de visitas (só faz sentido enquanto a base não muda).
  Sem esses secrets, o job apenas registra um aviso e termina com sucesso.

### Restaurar / decifrar um artefato
1. GitHub → Actions → db-backup → execução → baixar `kac-db-backup-<data>` (zip) e extrair.
2. Conferir integridade: `sha256sum -c kac_<data>.json.enc.sha256`.
3. Decifrar (senha só do ambiente, nunca na linha de comando):
   `openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -in kac_<data>.json.enc -out kac_<data>.json -pass env:BACKUP_PASSPHRASE` (arquivo de saída em pasta privada, chmod 600).
4. Testar a restauração sem tocar em produção: `npm i --no-save @electric-sql/pglite@0.5.10 && EXPECT_VISIT_MD5=<md5> node scripts/backup/restore-check.mjs kac_<data>.json.enc kac_<data>.manifest.json`.
5. Restauração real (só com autorização): inserir tabela a tabela na ordem do `restore-check.mjs` (organizações → usuários → membros → visitas → sessões → tentativas → histórico → auditoria → convites → planos → assinaturas → eventos), `OVERRIDING SYSTEM VALUE` em `kac_payment_events` e reposicionar sequências (`setval`).
- Validado em 14/10/2026 no box com dados reais: dump (12 tabelas) → cifra → decifra → PGlite: todas as contagens, SHA-256 e md5 `cc9fe7b3…` PASS; senha errada → falha ao decifrar.
