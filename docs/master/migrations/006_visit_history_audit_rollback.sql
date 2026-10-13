BEGIN;
DROP TRIGGER IF EXISTS trg_kac_track_visit ON public.komodo_acessos;
DROP FUNCTION IF EXISTS public.kac_track_visit();
DROP TRIGGER IF EXISTS trg_kac_touch_visit ON public.komodo_acessos;
DROP FUNCTION IF EXISTS public.kac_touch_updated_at();
DROP TABLE IF EXISTS public.kac_visit_history;
DROP TABLE IF EXISTS public.kac_audit_log;
COMMIT;
