# Fase C — Supabase Auth (e-mail + verificação, Google OIDC, MFA de admin, convites)

**Status:** código **implementado e testado atrás de flag DESLIGADO** (`KAC_SUPABASE_AUTH`). Nada mudou para os usuários.
Migração 008 **proposta, não aplicada**. Nenhuma configuração do Supabase Auth, do Google ou de SMTP foi alterada.

## Limites do plano gratuito (R$0) — conferidos em 2026-10
| Item | Free | Observação |
|---|---|---|
| MAU (Supabase Auth) | 50.000 | Inclui login social (Google) |
| MFA TOTP (app autenticador) | Incluído | MFA por SMS/telefone **não** (US$75/mês no Pro) |
| Google OAuth (OIDC) | Incluído | Cliente OAuth no Google Cloud é gratuito |
| SMTP padrão do Supabase | **2 e-mails/hora** e **só para membros da equipe da org Supabase** | Inviável para convites e verificação reais → precisa de SMTP próprio |
| SMTP próprio | Incluído | Começa com 30 e-mails/h (ajustável). Opção grátis: Gmail/Google Workspace via SMTP com senha de app, ou provedores com plano gratuito (ex.: Brevo ~300/dia, Resend ~100/dia — confirmar no cadastro) |
| Logs de auditoria do Auth | 1 hora | Nossa `kac_audit_log` cobre o necessário |

## Fluxos
1. **Admin existente (sem lockout):**
   1. Entra com a senha atual.
   2. Cria a conta Supabase com o **mesmo e-mail** (verificado).
   3. Chama "vincular" (cookie + Bearer).
   4. Cadastra o TOTP.
   5. Só depois disso a senha local pode ser desativada (passo futuro, separado).
2. **Convite:**
   1. O owner/admin (com aal2) gera o convite e o link sai **uma vez**.
   2. O convidado entra com e-mail ou Google, confirma o e-mail e aceita o convite.
   3. A função atômica cria o usuário (sem senha local) e a membership **só na org do convite**.
3. **Google OIDC:** o mesmo fluxo; o e-mail do Google já chega verificado.

## Testes (sem tocar produção)
- `tests/api-phase-c-auth.test.cjs`, 17 testes:
  - com o flag OFF: 404, Bearer ignorado, GoTrue nunca chamado, cookie inalterado;
  - isolamento de tenant e IDOR via Bearer;
  - e-mail não verificado, token inválido ou forjado;
  - vínculo exige cookie + mesmo e-mail;
  - MFA aal1 → 403 e aal2 → 200;
  - papéis que podem convidar, token só como hash;
  - aceite usa o e-mail do GoTrue e mapeia os erros.
- Testes de mutação: removendo a checagem de MFA ou a de e-mail verificado, um teste falha em cada caso.
- `tests/pglite/mig008-invites.mjs` (PGlite), 17 checagens:
  - o admin legado mantém a senha;
  - mismatch, expirado, reuso e token inválido;
  - convite de outra org dá acesso só a ela;
  - vínculo do usuário legado sem duplicar;
  - unicidade de `auth_user_id`;
  - audit;
  - aceite duplo **sequencial** (o `FOR UPDATE` cobre concorrência real; não testei com 2 conexões);
  - rollback e reaplicação.

## Pendências de código (antes de ligar o flag)
- Telas: login Supabase (e-mail/Google), cadastro de TOTP, gerar e aceitar convite.
- Validação local por JWKS com cache (opcional).
- CSP: liberar `connect-src https://hcqcmirculeiyrpiwlpm.supabase.co` e `https://accounts.google.com`, conforme o fluxo escolhido.

## Autorizações e passos de console necessários (nada foi feito)
| # | Onde | Passo exato | Custo | Risco / reversão |
|---|---|---|---|---|
| A1 | Supabase (banco) | Aplicar a migração 008 (backup + PGlite + rollback, mesmo procedimento da 005/006) | R$0 | Reversível via `008_supabase_auth_rollback.sql` |
| A2 | Supabase → Auth → URL Configuration | Site URL `https://guardiao-komodo-access-core.vercel.app`. Redirect URLs: `https://guardiao-komodo-access-core.vercel.app/**` (e, se quiser previews, `https://guardiao-komodo-access-core-*-robsonvilares-projects.vercel.app/**`) | R$0 | Reversível |
| A3 | Supabase → Auth → Providers → Email | Manter "Confirm email" **ligado**. Signup aberto **desligado** (só por convite), se você preferir | R$0 | Reversível |
| A4 | Supabase → Auth → MFA | Manter o TOTP habilitado (padrão) | R$0 | — |
| A5 | Google Cloud Console | Projeto → OAuth consent screen (External, nome "Guardião Komodo", escopos `openid email profile`) → Credentials → OAuth client ID (Web). Redirect URI: `https://hcqcmirculeiyrpiwlpm.supabase.co/auth/v1/callback` | R$0 | Pode ficar em modo "Testing" (até 100 usuários de teste) sem verificação do Google |
| A6 | Supabase → Auth → Providers → Google | Colar o Client ID e o Client Secret do passo A5 (**você** cola; eu não vejo nem guardo o secret) | R$0 | Reversível |
| A7 | SMTP próprio | Escolher o provedor (Gmail com senha de app ou um plano gratuito). Supabase → Auth → SMTP Settings: host/porta/usuário/senha (**você** cola) e o remetente | R$0 dentro do limite gratuito | Sem isso, verificação e convites só chegam a membros da equipe Supabase (2/h) |
| A8 | Vercel env (Production) | `KAC_SUPABASE_ANON_KEY` (chave pública/publishable) e, por último, `KAC_SUPABASE_AUTH=on` | R$0 | Desligar = remover a env e fazer redeploy |
| A9 | Produção | Ligar primeiro só para o admin (vincular + TOTP), validar e depois liberar os convites | R$0 | Senha local continua como fallback |
