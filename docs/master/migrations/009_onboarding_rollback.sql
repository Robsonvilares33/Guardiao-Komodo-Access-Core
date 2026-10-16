-- Rollback de 009. Organizações/usuários criados pelo onboarding PERMANECEM (só perdem kind/cnpj/created_by).
-- Para removê-los também, antes do rollback: DELETE FROM kac_organizations WHERE created_by_auth_user IS NOT NULL; (cascade em memberships/subscriptions)
BEGIN;
DROP FUNCTION IF EXISTS public.kac_onboard_org(uuid, text, text, text, text, text, text);
DROP INDEX IF EXISTS public.uq_kac_org_created_by_auth;
ALTER TABLE public.kac_organizations DROP CONSTRAINT IF EXISTS kac_org_kind_chk, DROP CONSTRAINT IF EXISTS kac_org_cnpj_chk;
ALTER TABLE public.kac_organizations DROP COLUMN IF EXISTS created_by_auth_user, DROP COLUMN IF EXISTS cnpj, DROP COLUMN IF EXISTS kind;
COMMIT;
