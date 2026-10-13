-- PROPOSED ONLY — DO NOT APPLY TO THE REAL SUPABASE PROJECT WITHOUT EXPLICIT APPROVAL.
BEGIN;
CREATE TABLE IF NOT EXISTS public.komodo_web_sessions (
 token_hash TEXT PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
 user_id TEXT NOT NULL REFERENCES public.komodo_tbl_usuarios(id) ON DELETE CASCADE,
 expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_komodo_web_sessions_expiry ON public.komodo_web_sessions(expires_at);
CREATE TABLE IF NOT EXISTS public.komodo_login_attempts (
 id UUID PRIMARY KEY, ip_hash TEXT NOT NULL CHECK (ip_hash ~ '^[a-f0-9]{64}$'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_komodo_login_attempts_ip_created ON public.komodo_login_attempts(ip_hash,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_komodo_login_attempts_created ON public.komodo_login_attempts(created_at);
ALTER TABLE public.komodo_web_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.komodo_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.komodo_web_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.komodo_login_attempts FROM anon, authenticated;
COMMIT;
-- API must use SUPABASE_SERVICE_ROLE_KEY server-side only.
