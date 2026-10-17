-- Rollback da 011. Não toca em visitas/usuários; só remove o limitador compartilhado e os 3 índices.
-- Depois do rollback o código volta sozinho ao limite em memória (fallback já existente).
BEGIN;
DROP FUNCTION IF EXISTS public.kac_rate_hit(text, integer, integer, timestamptz);
DROP TABLE IF EXISTS public.kac_rate_hits;
DROP INDEX IF EXISTS public.komodo_web_sessions_user_id_idx;
DROP INDEX IF EXISTS public.kac_invites_created_by_idx;
DROP INDEX IF EXISTS public.kac_subscriptions_plan_id_idx;
COMMIT;
