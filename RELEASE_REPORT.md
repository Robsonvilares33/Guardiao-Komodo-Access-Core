# Release Report — Guardião Komodo Access Core

- Versão: 0.9.0-rc1 (candidato; **não implantado**)
- Data: 2026-10-13 (America/Sao_Paulo)
- Ambiente de teste: Windows 10 Pro 10.0.19045, Node v22.22.0

## Testes
| Teste | Resultado |
|---|---|
| `node --check` em api/, src/, tests/ | 0 falhas |
| Suíte `node --test` (8 arquivos, mocks, sem rede) | 21/21 PASS |
| PostgreSQL real / concorrência das migrations | PENDENTE (sem psql/PGlite) |
| Deploy Vercel / smoke de produção | PENDENTE (não autorizado ainda; 403 no escopo) |

## Migrations
`docs/proposed_supabase_migration_001.sql`, `002_web_auth.sql`, `003_atomic_auth.sql`: **NÃO APLICADAS** no Supabase de produção.

## Mudanças nesta revisão
- Migration 001: RLS habilitado e acesso revogado de `anon`/`authenticated` em `komodo_acessos` e `komodo_tbl_usuarios`.
- Novo teste `tests/api-safe-defaults.test.cjs` (503 sem configuração, bootstrap fechado, IA sem sucesso falso, headers).
- Docs: VERCEL_ENV_SETUP, BOOTSTRAP_ADMIN, TESTING; README atualizado; `.env.example` só com valores fictícios.

## Riscos conhecidos
- Sem Content-Security-Policy (há muito JS inline/handlers; adicionar exige testes de UI).
- Limite de tentativas depende de `x-real-ip`/`x-forwarded-for` definidos pela Vercel.
- Sessões expiradas só são removidas quando reutilizadas (sem limpeza periódica).
- Rotas de IA desabilitadas (401 sem sessão, 503 com sessão).