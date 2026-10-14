# Architecture Decision Records

## ADR-01 — Isolamento de tenants
- **Opções:** (a) BD compartilhado + `organization_id` + RLS; (b) schema por tenant; (c) BD por tenant.
- **Decisão:** (a).
- **Motivo:** custo R$0, uma única trilha de migrações e compatível com PostgREST/Supabase Free.
- **Mitigações:** filtro por org também na API (defesa em profundidade); testes negativos A×B obrigatórios no CI (`tests/pglite/migrations-rls.mjs`, 20/20).
- **Revisão:** reavaliar (c) para clientes enterprise com exigência contratual.

## ADR-02 — Sessões próprias vs Supabase Auth
- **Decisão:** manter as sessões próprias na transição (o `kac_current_user()` lê `app.user_id`) e migrar para Supabase Auth na Fase C, trocando a função para `auth.uid()`. As policies não mudam.
- **Motivo:** MFA e Google OIDC grátis, menos código de segurança próprio.
- **Custo:** reset de senha dos usuários existentes (hoje só existe 1 admin).

## ADR-03 — Pagamentos
- **Decisão:** interface `PaymentProvider { createCheckout, cancel, parseWebhook }` com Mercado Pago primeiro e Stripe opcional. Webhooks são idempotentes (`provider_event_id` único) e a assinatura é verificada.
- **Restrição:** **apenas sandbox** até haver autorização explícita e um host com uso comercial permitido (o Vercel Hobby proíbe).

## ADR-04: Supabase Auth convivendo com as sessões próprias (Fase C)
- **Decisão:** a migração é gradual e controlada pelo flag `KAC_SUPABASE_AUTH` (padrão **desligado**).
  - A API aceita **ou** o cookie atual (`kac_session`) **ou** um `Authorization: Bearer` do Supabase.
  - O Bearer é **sempre validado no servidor** pelo GoTrue (`/auth/v1/user`) e exige e-mail verificado.
  - A autorização continua 100% no servidor, com o filtro `organization_id` (ADR-01).
- **Alternativas consideradas:**
  - (b) Corte direto para Supabase Auth: risco de deixar o admin trancado do lado de fora.
  - (c) Validar o JWT localmente via JWKS: menos latência, mas não detecta sessão revogada e depende da configuração de chaves. Fica para depois, com cache.
- **Sem lockout:** o login por senha atual continua até ser desligado explicitamente.
  - O admin vincula a conta em `POST /api/auth/supabase/link`, que exige **ao mesmo tempo** o cookie atual e o Bearer com **o mesmo e-mail verificado**.
- **MFA:** papéis admin/owner que entram via Supabase precisam de `aal2` (TOTP, grátis no plano Free). Sem isso a API responde 403 `mfa_required`. O cookie legado não muda até o desligamento da senha.
- **Convites:**
  - `POST /api/convites`: pode ser feito por owner (qualquer papel exceto owner) ou admin (operator/viewer). O token tem 32 bytes, é mostrado uma única vez, só o hash SHA-256 é gravado, e vale 72 h.
  - `POST /api/convites/aceitar`: chama a função SQL atômica `kac_accept_invite`, que trava o convite com `FOR UPDATE` e confere o e-mail do GoTrue (não o do corpo da requisição), a expiração e se já foi usado.
- **Banco:** a migração 008 é **proposta, não aplicada**: `auth_user_id`, `kac_invites` e a função `kac_accept_invite`, com rollback.
