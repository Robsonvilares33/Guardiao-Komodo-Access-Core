-- 007 — Planos, assinaturas e eventos de pagamento (sandbox). Autorizada em 14/10/2026. Puramente aditiva: só cria tabelas novas.
-- Preços de pro/business são PROVISÓRIOS (planos inativos).
-- Rev. 2026-10-14: alinhada à política zero-grant (anon/authenticated sem acesso; só service_role via API), provider 'mock', planos pro/business inativos.
BEGIN;
CREATE TABLE IF NOT EXISTS public.kac_plans (
  id text PRIMARY KEY, name text NOT NULL, price_cents integer NOT NULL CHECK (price_cents >= 0),
  max_seats integer NOT NULL, max_sites integer NOT NULL, max_visits_month integer NOT NULL, active boolean NOT NULL DEFAULT true);
INSERT INTO public.kac_plans VALUES ('free','Gratuito',0,2,1,300,true) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.kac_plans VALUES ('pro','Profissional',9900,10,3,5000,false),('business','Empresarial',29900,50,20,50000,false) ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.kac_subscriptions (
  organization_id uuid PRIMARY KEY REFERENCES public.kac_organizations(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.kac_plans(id),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled','expired')),
  provider text CHECK (provider IN ('mock','mercadopago','stripe')), provider_ref text,
  current_period_end timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.kac_payment_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, provider text NOT NULL, provider_event_id text NOT NULL,
  organization_id uuid REFERENCES public.kac_organizations(id) ON DELETE SET NULL, type text NOT NULL,
  payload jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), UNIQUE (provider, provider_event_id));
ALTER TABLE public.kac_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kac_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kac_payment_events ENABLE ROW LEVEL SECURITY;
-- Sem policies/grants para anon/authenticated (mesma política da 005–008): leitura e escrita só pela API com service_role.
REVOKE ALL ON TABLE public.kac_plans, public.kac_subscriptions, public.kac_payment_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.kac_plans, public.kac_subscriptions, public.kac_payment_events FROM PUBLIC, service_role;
-- Grants explícitos e mínimos para a API (service_role). Eventos: só inserir/ler (trilha imutável, sem UPDATE/DELETE).
GRANT SELECT ON TABLE public.kac_plans TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.kac_subscriptions TO service_role;
GRANT SELECT, INSERT ON TABLE public.kac_payment_events TO service_role;
CREATE INDEX IF NOT EXISTS kac_payment_events_org_idx ON public.kac_payment_events(organization_id);
INSERT INTO public.kac_subscriptions(organization_id, plan_id, status)
  SELECT id, 'free', 'active' FROM public.kac_organizations ON CONFLICT DO NOTHING;
COMMIT;
