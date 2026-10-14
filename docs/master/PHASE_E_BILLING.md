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
