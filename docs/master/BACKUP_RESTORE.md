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

**Status: PLANEJADO; nenhum backup foi configurado ainda.**

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
