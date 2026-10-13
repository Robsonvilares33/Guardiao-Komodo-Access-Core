# Configuração de variáveis no Vercel

Configure **somente** no painel do Vercel (Project → Settings → Environment Variables), ambiente *Production* (e *Preview* só se necessário). Nunca no repositório, nunca com prefixo `NEXT_PUBLIC_`/`VITE_`.

| Variável | Obrigatória | Uso | Exposição |
|---|---|---|---|
| `SUPABASE_URL` | Sim | URL `https://<ref>.supabase.co` | Somente servidor (`api/[...route].js`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Acesso server-side via PostgREST | Somente servidor. Marque como *Sensitive*. |
| `KAC_BOOTSTRAP_SECRET` | Só na janela de bootstrap | Criação do primeiro admin | Somente servidor, temporária (ver BOOTSTRAP_ADMIN.md) |

Sem `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` válidas a API responde **503** em rotas que usam banco (comportamento seguro). `/api/health` continua 200.

**Pré-requisito:** as migrations em `docs/proposed_supabase_migration_00*.sql` **NÃO foram aplicadas** no Supabase de produção. Sem elas, login/bootstrap/visitantes retornam 500/503. Aplicação requer autorização explícita.
Após alterar variáveis, faça um novo deploy (variáveis só valem para deploys novos).
