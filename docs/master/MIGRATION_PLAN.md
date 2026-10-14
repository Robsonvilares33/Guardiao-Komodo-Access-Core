# Plano de migração

**005 APLICADA em produção em 2026-10-13 21:10 (horário de Brasília), versão 20261014001027, com autorização.** Antes houve um backup JSON (sha256 09be96ec…; 1 visita, 1 usuário, 3 sessões, 12 tentativas de login) e um teste de restauração e rollback no PGlite. Variante de produção: **sem grants** para anon/authenticated e `organization_id DEFAULT` = org padrão (compatível com a API atual). **006 APLICADA em produção em 2026-10-13 22:30 BRT (versão 20261014013009), com autorização.** Antes houve um backup JSON (sha256 dacbcf93…, em /workspace/backups e em Documents\\kac_backups) e um ensaio de restauração, 006 e rollback no PGlite (33/33). Variante de produção: histórico sem FK (sobrevive à exclusão), trigger também em DELETE, ator via `kac_actor()` (header x-kac-actor aceito só de service_role) e sem grants para anon/authenticated. 007 continua **não aplicada**.

Todas as migrações estão em `docs/master/migrations/` com rollback e são testadas por `tests/pglite/migrations-rls.mjs` (PGlite / PostgreSQL 18.6: **26/26 PASS**, incluindo rollback e reaplicação).

| # | Arquivo | O que faz | Compatível com o app atual? | Rollback |
|---|---|---|---|---|
| 005 | 005_tenancy.sql | organizations, memberships, `organization_id` + created_at/updated_at em komodo_acessos, backfill para a org padrão `00000000-…-0001`, policies RLS para `authenticated` | **Sim**: a API usa service_role (ignora RLS); colunas novas têm default | 005_tenancy_rollback.sql (preserva visitas; testado) |
| 006 | 006_visit_history_audit.sql | histórico de visita + audit log + triggers | Sim: os triggers só acrescentam linhas | 006_…_rollback.sql |
| 007 | 007_billing.sql | planos, assinaturas, eventos de pagamento; todas as orgs no plano `free` | Sim | 007_billing_rollback.sql |

## Bugs encontrados pelo PGlite (já corrigidos)
1. Trigger de histórico em `BEFORE INSERT` violava a FK (a visita ainda não existia). Corrigido com `AFTER INSERT OR UPDATE` para o histórico e `BEFORE UPDATE` para `updated_at`.
2. `authenticated` não tinha EXECUTE em `kac_is_member`, então toda policy falhava. Corrigido com GRANT.

## Ordem segura de aplicação
1. Backup (`pg_dump` / export) e contagem de linhas.
2. Aplicar 005 → testar o app ao vivo (login, CRUD, agenda) → aplicar 006 → testar → aplicar 007.
3. Só depois alterar a API para gravar `organization_id` da sessão.
4. Critério de sucesso: contagens iguais, advisor sem ERROR, E2E OK. Em caso de falha: rollback na ordem inversa.
