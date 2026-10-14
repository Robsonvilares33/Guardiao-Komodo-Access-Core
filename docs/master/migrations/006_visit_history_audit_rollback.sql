-- Rollback de 006: remove triggers/funções/tabelas de histórico e auditoria. Visitas e esquema de 005 são preservados.
BEGIN;
DROP TRIGGER IF EXISTS trg_kac_track_visit ON public.komodo_acessos;
DROP FUNCTION IF EXISTS public.kac_track_visit();
DROP TRIGGER IF EXISTS trg_kac_touch_visit ON public.komodo_acessos;
DROP FUNCTION IF EXISTS public.kac_touch_updated_at();
DROP FUNCTION IF EXISTS public.kac_actor();
DROP TABLE IF EXISTS public.kac_visit_history;
DROP TABLE IF EXISTS public.kac_audit_log;
COMMIT;
