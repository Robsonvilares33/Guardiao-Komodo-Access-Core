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
