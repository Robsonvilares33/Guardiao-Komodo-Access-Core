-- Migration 004: data civil completa dos registros (America/Sao_Paulo).
-- Compatível com versões anteriores: coluna anulável; linhas antigas (data NULL)
-- continuam sendo listadas pelo dia da semana. RLS e grants não são alterados.
BEGIN;
ALTER TABLE public.komodo_acessos ADD COLUMN IF NOT EXISTS data date;
CREATE INDEX IF NOT EXISTS idx_komodo_acessos_modulo_data_hora ON public.komodo_acessos(modulo, data, hora);
COMMIT;
