-- PROPOSTA — NÃO APLICADA. Planos, assinaturas e eventos de pagamento (somente sandbox).
BEGIN;
CREATE TABLE IF NOT EXISTS public.kac_plans (
  id text PRIMARY KEY, name text NOT NULL, price_cents integer NOT NULL CHECK (price_cents >= 0),
  max_seats integer NOT NULL, max_sites integer NOT NULL, max_visits_month integer NOT NULL, active boolean NOT NULL DEFAULT true);
INSERT INTO public.kac_plans VALUES ('free','Gratuito',0,2,1,300,true) ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.kac_subscriptions (
  organization_id uuid PRIMARY KEY REFERENCES public.kac_organizations(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.kac_plans(id),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled','expired')),
  provider text CHECK (provider IN ('mercadopago','stripe')), provider_ref text,
  current_period_end timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.kac_payment_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, provider text NOT NULL, provider_event_id text NOT NULL,
  organization_id uuid REFERENCES public.kac_organizations(id) ON DELETE SET NULL, type text NOT NULL,
  payload jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), UNIQUE (provider, provider_event_id));
ALTER TABLE public.kac_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kac_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kac_payment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kac_plans_read ON public.kac_plans;
CREATE POLICY kac_plans_read ON public.kac_plans FOR SELECT TO authenticated USING (active);
DROP POLICY IF EXISTS kac_subs_read ON public.kac_subscriptions;
CREATE POLICY kac_subs_read ON public.kac_subscriptions FOR SELECT TO authenticated
  USING (public.kac_is_member(organization_id, ARRAY['owner','admin']));
GRANT SELECT ON public.kac_plans, public.kac_subscriptions TO authenticated;
-- kac_payment_events: sem policy/grant → só service_role (webhook no servidor).
INSERT INTO public.kac_subscriptions(organization_id, plan_id, status)
  SELECT id, 'free', 'active' FROM public.kac_organizations ON CONFLICT DO NOTHING;
COMMIT;
