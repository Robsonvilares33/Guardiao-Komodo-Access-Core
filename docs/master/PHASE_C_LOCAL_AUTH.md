# Fase C — validação local do Supabase Auth (sem produção, R$ 0)

Ambiente: Postgres 17 (apt) + GoTrue/Supabase Auth v2.197.0 (binário oficial) + Mailpit (SMTP falso), tudo em 127.0.0.1. Nada fala com o projeto de produção; o flag `KAC_SUPABASE_AUTH` só é ligado **dentro do processo de teste**.

```bash
scripts/dev/gotrue-local.sh setup   # 1ª vez (instala Postgres, baixa GoTrue/Mailpit, aplica as 75 migrações do Auth)
scripts/dev/gotrue-local.sh start
GOTRUE_LOCAL_URL=http://127.0.0.1:9999 node --test tests/gotrue-local/
scripts/dev/gotrue-local.sh stop
```
Sem `GOTRUE_LOCAL_URL` os testes são pulados (CI).

## O que é validado (`tests/gotrue-local/phase-c-real.test.cjs`, 8 testes, usuários fictícios @example.com)
1. Cadastro sem sessão até confirmar; login antes da confirmação → `email_not_confirmed`; e-mail de confirmação chega e o link ativa a conta.
2. Senha fraca → 422; e-mail duplicado não abre sessão.
3. Login: JWT com `sub`, `email`, `aal1`, `role=authenticated`, expiração ≤ 1 h; senha errada → `invalid_credentials`.
4. JWT adulterado (sub trocado) → recusado pelo GoTrue.
5. API do app com flag ON (local): identidade sem usuário vinculado → 401; usuário A vê só a org A, B só a org B; B não altera visita de A (404).
6. Refresh token gira; logout revoga o refresh.
7. Recuperação de senha: resposta igual para e-mail inexistente; link do e-mail → nova senha; senha antiga deixa de valer; link de uso único.
8. Nenhum e-mail contém a senha.

## Limites
- Login com Google não é testável localmente (exige URL pública de callback) → validar num projeto Supabase gratuito separado.
- PostgREST é simulado em memória (o mesmo das demais suítes); as políticas RLS/grants são cobertas pelos ensaios PGlite.
- Envio real de e-mail (Gmail SMTP) fica para o projeto de teste, com a senha de app fornecida pelo Robson.
