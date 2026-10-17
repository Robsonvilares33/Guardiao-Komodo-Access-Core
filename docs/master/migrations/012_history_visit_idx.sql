-- 012 — índice para a FK kac_visit_history_visit_fk (criada pela 010, ON DELETE CASCADE).
-- O advisor de performance (INFO unindexed_foreign_keys) apontou após aplicar a 010: o índice existente começa por organization_id.
-- Sem ele, cada exclusão de visita varre o histórico. Só cria índice; não altera dados. Idempotente.
-- PREPARADA, NÃO APLICADA (precisa da aprovação do Robson).
CREATE INDEX IF NOT EXISTS kac_visit_history_visit_id_idx ON public.kac_visit_history (visit_id);
