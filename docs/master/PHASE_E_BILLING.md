# Fase E — Planos, assentos e pagamentos (sandbox/mock)

Situação: **implementado e testado atrás de flag (`KAC_BILLING`, desligada)**; nenhuma cobrança real; migração 007 **proposta, não aplicada**.

## Modelo
| Plano | Preço/mês | Assentos | Locais | Visitas/mês | Situação |
|---|---|---|---|---|---|
| free | R$0 | 2 | 1 | 300 | ativo (seed da 007) |
| pro | R$99 (proposto) | 10 | 3 | 5.000 | inativo até decisão comercial |
| business | R$299 (proposto) | 50 | 20 | 50.000 | inativo |
Preços são placeholders para modelagem; definir com você antes de qualquer venda.

- `lib/billing.cjs`: `seatCheck` (bloqueia convite além do limite), `usageCheck` (aviso a 80%), máquina de estados da assinatura (`applyEvent`: idempotente por id de evento, valida org/transição), provedor **mock** (checkout local + webhook HMAC com janela de 5 min). `mercadopago`/`stripe`: interface reservada, `PROVIDER_NOT_CONFIGURED`.
- API (flag ON): `GET /billing/plans`, `GET /billing/seats` (org do usuário, MFA exigido para admin quando Fase C ligada). Não há checkout/webhook expostos.
- 007 revisada: zero grants para anon/authenticated (igual 005–008), provider `mock` permitido, `UNIQUE(provider, provider_event_id)` para idempotência. Ensaio: `tests/pglite/mig007-billing.mjs` 9/9 (aplica, grants 0, RLS, duplicado rejeitado, rollback, reaplica).

## Para ir além (precisa de autorização)
1. Aplicar 007 em produção (backup + ensaio, mesmo procedimento).
2. Escolher provedor (Mercado Pago tem Pix nativo; Stripe BR) e criar **conta sandbox** (R$0) — chaves só no ambiente da Vercel.
3. Expor checkout/webhook (rota de webhook com verificação de assinatura do provedor real, gravação em `kac_payment_events`).
4. Aplicar `seatCheck` em `POST /convites` (depende de 007).
5. Termos de uso/política de cancelamento e nota fiscal (fora do escopo técnico).

## Mercado Pago SANDBOX (14/10/2026) — implementado e testado atrás de `KAC_BILLING` (desligada em produção)
- `lib/mercadopago.cjs` + `provider('mercadopago')`. Só aceita `MP_TEST_ACCESS_TOKEN`/`MP_TEST_PUBLIC_KEY` com prefixo `TEST-` (recusa `APP_USR-`); nunca lê variáveis de produção. Webhook secret ≥ 32.
- `POST /api/billing/checkout` (sessão + MFA + org; só admin/owner): cria preferência do Checkout Pro e devolve `sandbox_init_point`. `external_reference` = `kac1.<org>.<plano>.<nonce>.<HMAC>` (org vem da sessão, não do cliente).
- `POST /api/billing/webhook/mercadopago` (sem sessão): `x-signature` `ts=..,v1=..` = HMAC-SHA256(secret, `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`) com comparação em tempo constante; janela anti-replay ±5 min; ignora `live_mode=true`; **não confia no corpo**: busca `/v1/payments/<id>` com o token de teste e resolve org/plano pelo `external_reference` assinado; idempotência por `mp:payment:<id>:<status>`. Respostas só `{"received":true|false}`; logs só com código de erro.
- Persistência: **em memória por instância** (perde no cold start). Definitiva depende da migração 007 (`kac_payment_events`, UNIQUE provider+evento) — **não autorizada**.
- Testes: `tests/mercadopago.test.cjs` (fetch simulado). Smoke real: `scripts/mp-sandbox-smoke.mjs`.
- **Limitação conhecida:** com flag desligada em produção, a URL de teste configurada no MP (`/api/billing/webhook/mercadopago` em produção) responde **404**; notificações de teste do MP não são processadas até ligar a flag (ou apontar a URL de teste para um ambiente com a flag ligada).
- **Bloqueio do sandbox:** o token `TEST-` da conta principal recebe `403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES` ao criar preferência (leitura funciona). Caminho usual do MP: usar as credenciais do **usuário de teste vendedor** (formato `APP_USR-`, conta marcada `test_user`). Exige decisão: adaptar a trava para aceitar `APP_USR-` somente se `/users/me` tiver a tag `test_user`.
