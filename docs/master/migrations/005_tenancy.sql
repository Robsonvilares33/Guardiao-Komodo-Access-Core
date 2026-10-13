-- 005_tenancy (PROPOSTA — NÃO APLICADA). Multi-tenant: banco compartilhado + organization_id + RLS.
-- Compatível: colunas novas anuláveis; linhas atuais vão para a organização "padrão" (backfill).
BEGIN;
CREATE TABLE IF NOT EXISTS public.kac_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','canceled')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.kac_memberships (
  organization_id uuid NOT NULL REFERENCES public.kac_organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.komodo_tbl_usuarios(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','operator','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_kac_memberships_user ON public.kac_memberships(user_id);
ALTER TABLE public.komodo_acessos ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.kac_organizations(id);
ALTER TABLE public.komodo_acessos ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.komodo_acessos ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_komodo_acessos_org_mod_data ON public.komodo_acessos(organization_id, modulo, data, hora);

-- Identidade do chamador: auth.uid() (Supabase Auth) ou app.user_id definido pela API na transação.
CREATE OR REPLACE FUNCTION public.kac_current_user() RETURNS text
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')
$$;
CREATE OR REPLACE FUNCTION public.kac_is_member(p_org uuid, p_roles text[] DEFAULT NULL) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM public.kac_memberships m
                 WHERE m.organization_id = p_org AND m.user_id = public.kac_current_user()
                   AND (p_roles IS NULL OR m.role = ANY (p_roles)))
$$;
REVOKE ALL ON FUNCTION public.kac_is_member(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kac_is_member(uuid, text[]) TO authenticated;

ALTER TABLE public.kac_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kac_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kac_org_read ON public.kac_organizations;
CREATE POLICY kac_org_read ON public.kac_organizations FOR SELECT TO authenticated USING (public.kac_is_member(id));
DROP POLICY IF EXISTS kac_mem_read ON public.kac_memberships;
CREATE POLICY kac_mem_read ON public.kac_memberships FOR SELECT TO authenticated USING (public.kac_is_member(organization_id));
DROP POLICY IF EXISTS kac_acessos_read ON public.komodo_acessos;
CREATE POLICY kac_acessos_read ON public.komodo_acessos FOR SELECT TO authenticated USING (public.kac_is_member(organization_id));
DROP POLICY IF EXISTS kac_acessos_write ON public.komodo_acessos;
CREATE POLICY kac_acessos_write ON public.komodo_acessos FOR INSERT TO authenticated WITH CHECK (public.kac_is_member(organization_id, ARRAY['owner','admin','operator']));
DROP POLICY IF EXISTS kac_acessos_update ON public.komodo_acessos;
CREATE POLICY kac_acessos_update ON public.komodo_acessos FOR UPDATE TO authenticated
  USING (public.kac_is_member(organization_id, ARRAY['owner','admin','operator']))
  WITH CHECK (public.kac_is_member(organization_id, ARRAY['owner','admin','operator']));
DROP POLICY IF EXISTS kac_acessos_delete ON public.komodo_acessos;
CREATE POLICY kac_acessos_delete ON public.komodo_acessos FOR DELETE TO authenticated USING (public.kac_is_member(organization_id, ARRAY['owner','admin']));
-- Grants mínimos para o papel autenticado (anon continua sem acesso).
GRANT SELECT ON public.kac_organizations, public.kac_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.komodo_acessos TO authenticated;

-- Backfill: organização padrão com o admin atual como owner.
INSERT INTO public.kac_organizations(id, name) VALUES ('00000000-0000-4000-8000-000000000001', 'Organização padrão') ON CONFLICT DO NOTHING;
INSERT INTO public.kac_memberships(organization_id, user_id, role)
  SELECT '00000000-0000-4000-8000-000000000001', id, CASE WHEN papel = 'admin' THEN 'owner' ELSE 'operator' END
  FROM public.komodo_tbl_usuarios ON CONFLICT DO NOTHING;
UPDATE public.komodo_acessos SET organization_id = '00000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;
COMMIT;
