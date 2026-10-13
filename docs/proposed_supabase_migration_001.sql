-- PROPOSED ONLY — DO NOT APPLY TO THE REAL SUPABASE PROJECT WITHOUT EXPLICIT APPROVAL.
-- Draft maps the current lab SQLite tables to PostgreSQL while preserving field names/contracts.
-- Review with the PostgreSQL adapter and tests before use.
BEGIN;
CREATE TABLE IF NOT EXISTS public.komodo_acessos (
 id TEXT PRIMARY KEY,
 modulo TEXT NOT NULL CHECK (modulo IN ('empresarial','residencial','clinica')),
 dia TEXT NOT NULL CHECK (dia IN ('seg','ter','qua','qui','sex','sab','dom')),
 hora TEXT NOT NULL CHECK (hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 nome TEXT NOT NULL, unidade TEXT, tipo TEXT, placa TEXT, acompanhantes TEXT,
 "placaAcompanhante" TEXT, historico TEXT,
 alerta SMALLINT NOT NULL DEFAULT 0 CHECK (alerta IN (0,1)),
 status SMALLINT NOT NULL DEFAULT 0 CHECK (status BETWEEN 0 AND 2)
);
CREATE INDEX IF NOT EXISTS idx_komodo_acessos_modulo_dia_hora ON public.komodo_acessos(modulo,dia,hora);
CREATE INDEX IF NOT EXISTS idx_komodo_acessos_modulo_nome ON public.komodo_acessos(modulo,nome);
CREATE TABLE IF NOT EXISTS public.komodo_tbl_usuarios (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, hash TEXT NOT NULL,
 papel TEXT NOT NULL DEFAULT 'operador' CHECK (papel IN ('admin','operador')), criado_em TEXT
);
ALTER TABLE public.komodo_acessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.komodo_tbl_usuarios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.komodo_acessos FROM anon, authenticated;
REVOKE ALL ON TABLE public.komodo_tbl_usuarios FROM anon, authenticated;
-- RLS enabled with no policies: only service_role (server-side API) can access.
-- RLS/grants/service-role access strategy must be reviewed before production.
COMMIT;
