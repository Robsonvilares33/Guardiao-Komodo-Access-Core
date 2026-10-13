# Plano de testes (sec. 17)

| Camada | Ferramenta | Situação |
|---|---|---|
| Unidade/API (mock fetch) | `node --test tests/*.test.cjs` | 44 testes: 42 pass, 2 todo |
| Migrações + RLS | `tests/pglite/migrations-rls.mjs` (PGlite) | 26/26 PASS |
| E2E ao vivo | CDP headless (box) + API autenticada | Login/range/400/logout/401 validados em 8df505c |

## Orgs de teste
**Org A** (owner uA, viewer uV) e **Org B** (owner uB). Hoje rodam só no PGlite; em produção será criado um par `TESTE AUDITORIA A/B` somente após a 005 aprovada.

## Negativos cross-tenant obrigatórios (todos passam no PGlite)
- B não lê, insere, altera ou apaga visitas de A.
- B não lê memberships, histórico nem assinatura de A.
- Viewer não escreve e não vê billing.
- `anon` sem acesso; `authenticated` sem `app.user_id` vê 0 linhas.
- `authenticated` não lê payment_events.

## Regras
Dados reais nunca são alterados: só linhas `TESTE AUDITORIA` criadas e apagadas pelo próprio teste. Rodar o PGlite no CI antes de qualquer migração.
