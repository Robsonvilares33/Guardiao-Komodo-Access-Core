-- Rollback de 005 (remove políticas, colunas e tabelas de tenancy; dados de visitas são preservados).
BEGIN;
REVOKE ALL ON TABLE public.komodo_acessos FROM anon, authenticated;
DROP POLICY IF EXISTS kac_acessos_read ON public.komodo_acessos;
DROP POLICY IF EXISTS kac_acessos_write ON public.komodo_acessos;
DROP POLICY IF EXISTS kac_acessos_update ON public.komodo_acessos;
DROP POLICY IF EXISTS kac_acessos_delete ON public.komodo_acessos;
DROP INDEX IF EXISTS public.idx_komodo_acessos_org_mod_data;
ALTER TABLE public.komodo_acessos DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.komodo_acessos DROP COLUMN IF EXISTS created_at;
ALTER TABLE public.komodo_acessos DROP COLUMN IF EXISTS updated_at;
DROP TABLE IF EXISTS public.kac_memberships;
DROP TABLE IF EXISTS public.kac_organizations;
DROP FUNCTION IF EXISTS public.kac_is_member(uuid, text[]);
DROP FUNCTION IF EXISTS public.kac_current_user();
COMMIT;
