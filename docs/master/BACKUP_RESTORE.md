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

### Correção 19/10/2026 — teste de restauração acompanha as migrações
- Falha das execuções agendadas de 17/10 e 18/10 (`42703 column "kind" of relation "kac_organizations" does not exist`): o `restore-check.mjs` montava o esquema só até a 007 (lista fixa), e o banco já tinha 009–015. O dump e a cifra estavam certos, mas o artefato não foi publicado porque o passo de restauração falhou antes.
- Agora o `restore-check.mjs` aplica **todas** as migrações de `docs/master/migrations` (exceto `*_rollback.sql`) na ordem de produção (`scripts/backup/migration-order.cjs`: numérica, 008 antes de 007). A ordem de carga vem das FKs do esquema restaurado, e colunas IDENTITY/sequências são tratadas sem lista fixa. Uma migração nova entra no teste sozinha, sem editar o script.
- Deriva tolerada: tabela ou coluna que está no backup mas ainda não nas migrações do repo vira `WARN` (é criada como texto/jsonb só no PGlite) em vez de quebrar a restauração.
- Pendente (precisa de token com escopo `workflow`): publicar o artefato **cifrado** mesmo se o teste de restauração falhar (`id: enc` no passo Cifrar e `if: always() && steps.guard.outputs.ready == 'true' && steps.enc.outcome == 'success'` no upload). Hoje, se a restauração falhar, o artefato não sai.
- Restauração real (passo 5 acima): use a ordem de carga que o `restore-check.mjs` calcula (pais antes de filhos pelas FKs).

## Usuário dedicado de smoke (15/10/2026)
- Criado em produção (aditivo; backup antes: `kac_presmoke_20261015T220144.json`, SHA-256 72489f15…edf0947): org fictícia `Smoke CI (fictícia, sem dados reais)` (`53b19a65-0627-41eb-a662-48c2fee0a81a`), usuário `user_smoke_ci` / `smoke-ci@komodo-smoke.invalid` (papel `operador`, membro `viewer`), assinatura free.
- Isolamento: toda consulta de visitas filtra `organization_id` da sessão; verificado ao vivo (0 visitas visíveis, real intacta). Os jobs `smoke-auth` e `smoke-a11y` só leem.
- Senha: gerada no Revision-PC, só em GitHub Secrets (`KAC_SMOKE_EMAIL`, `KAC_SMOKE_PASSWORD`) e em `C:\Users\yyy\Documents\kac_backups\KAC_SMOKE_PASSWORD.txt` (ACL só yyy) até ir para o 1Password.
- Rollback (desligar e remover):
  1. Variáveis de repositório `KAC_SMOKE_AUTH` / `KAC_SMOKE_A11Y` = `false` (ou apagar) e apagar os 2 secrets.
  2. SQL: `delete from komodo_web_sessions where user_id='user_smoke_ci'; delete from kac_subscriptions where organization_id='53b19a65-0627-41eb-a662-48c2fee0a81a'; delete from komodo_tbl_usuarios where id='user_smoke_ci'; delete from kac_organizations where id='53b19a65-0627-41eb-a662-48c2fee0a81a';` (membros caem em cascata; conferir antes que a org não tem visitas).
  3. Conferir md5 da visita real.
- 2026-10-16: backup `kac_pre009_*` antes da migração 009 (somente leitura, modo 600, fora do repositório).

### Migrations 010 e 011 (aplicadas em 17/10/2026, 18:14 e 18:14 BRT, aprovadas pelo Robson)
- **Backup pré-010** `kac_pre010_20261017T181325` (cifrado AES-256, sha256 do texto 42fbb174…a2746): foi feito e conferido, mas **se perdeu** quando a box foi substituída logo depois da aplicação. Não existe mais cópia.
  - Contagens naquele momento: audit_log 117, invites 0, memberships 3, organizations 3, payment_events 0, plans 3, subscriptions 3, visit_history 108, acessos 1, login_attempts 4, usuarios 3, web_sessions 19.
- **Backup pós-011** `kac_post011_20261017T181731.json.enc` (sha256 do texto c34926e5…be27), guardado em dois lugares:
  - box: `/workspace/backups`, permissão 600;
  - PC: `C:\Users\yyy\Documents\kac_backups`.
  - A chave fica em outra pasta: `C:\Users\yyy\Documents\kac_backup_keys\kac_post011_20261017T181731.key` e `/home/box/.kac_backup_key` (600). Guardar também num cofre de senhas.
  - Para abrir: `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in <arquivo>.enc -pass file:<chave>`.
- **Histórico órfão apagado pela 010:** 108 linhas, todas de visitas já excluídas; a visita real não tinha histórico. 80 delas existem no `kac_pre009_20261016T131733.json`. As 28 mais novas eram do E2E na org de teste e não têm cópia.
- **md5 das visitas** antes e depois das duas migrations: `cc9fe7b3edad64f6423b865a40a729af`.
- **Rollback:** `011_rate_limit_indexes_rollback.sql` e depois `010_lgpd_retention_rollback.sql`.

### Migration 012 (aplicada em 17/10/2026, 18:40 BRT, aprovada pelo Robson)
- Backup antes da 012: `kac_pre012_20261017T184035.json.enc` (sha256 do texto 6e47cb83…). Está na box em `/workspace/backups` (permissão 600) e no PC em `C:\Users\yyy\Documents\kac_backups`. Cifrado com a mesma chave do backup pós-011, sem arquivo de chave novo.
- md5 das visitas antes e depois: `cc9fe7b3edad64f6423b865a40a729af`. Índice `kac_visit_history_visit_id_idx` criado. Rollback: `012_history_visit_idx_rollback.sql`.
