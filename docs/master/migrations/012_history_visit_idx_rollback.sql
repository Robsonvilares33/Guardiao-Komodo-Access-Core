-- Rollback da 012: remove só o índice.
DROP INDEX IF EXISTS public.kac_visit_history_visit_id_idx;
