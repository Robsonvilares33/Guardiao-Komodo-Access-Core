# Testes

Requisitos: Node.js ≥ 20 (testado com v22.22.0). Sem dependências npm.

```
node --test tests/api-auth-mock.integration.test.cjs tests/api-rate-limit.integration.test.cjs tests/api-session-lifecycle.integration.test.cjs tests/api-smoke.test.cjs tests/api-visitor-mock.integration.test.cjs tests/bootstrap-ui-contract.test.cjs tests/visitor-repository-contract.test.cjs tests/api-safe-defaults.test.cjs
```
(No Windows, `node --test tests/` não aceita diretório; passe os arquivos.)

- Todos os testes usam `global.fetch` simulado e variáveis fictícias; **não** carregam `.env`, não acessam rede nem Supabase.
- Verificação de sintaxe: `node --check` em `api/`, `src/`, `tests/`.
- **Pendente:** validação das migrations em PostgreSQL real/descartável (atomicidade, RLS) — ver `tests/postgres-atomicity-validation-plan.md`. Não há PostgreSQL/PGlite disponível neste ambiente.
