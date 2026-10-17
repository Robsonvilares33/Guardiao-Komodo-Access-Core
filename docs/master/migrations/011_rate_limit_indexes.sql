-- 011 — limite de taxa compartilhado no banco (achados 10/11) + índices das FKs sem índice (achado 14).
-- Não altera dados existentes. Idempotente. Preparada, NÃO aplicada em produção (precisa da aprovação do Robson).
-- Pré-requisito: 010 (o expurgo diário já limpa kac_rate_hits com mais de 1 dia, se a tabela existir).
BEGIN;

-- Contadores por janela fixa. bucket é sempre um prefixo curto + hash (nunca e-mail/IP em claro).
CREATE TABLE IF NOT EXISTS public.kac_rate_hits (
  bucket       text        NOT NULL CHECK (char_length(bucket) BETWEEN 3 AND 120),
  window_start timestamptz NOT NULL,
  hits         integer     NOT NULL DEFAULT 1,
  expires_at   timestamptz NOT NULL,                -- fim da janela; o expurgo da 010 apaga por esta coluna
  PRIMARY KEY (bucket, window_start)
);
CREATE INDEX IF NOT EXISTS kac_rate_hits_expires_idx ON public.kac_rate_hits (expires_at);
ALTER TABLE public.kac_rate_hits ENABLE ROW LEVEL SECURITY;  -- sem policy: só o servidor (service_role) acessa
REVOKE ALL ON public.kac_rate_hits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kac_rate_hits TO service_role;

-- Conta 1 tentativa e diz se ainda está dentro do limite. Atômico (INSERT … ON CONFLICT … RETURNING).
CREATE OR REPLACE FUNCTION public.kac_rate_hit(p_bucket text, p_window_seconds integer, p_max integer, p_now timestamptz DEFAULT now())
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE w timestamptz; n integer;
BEGIN
  IF p_bucket IS NULL OR char_length(p_bucket) NOT BETWEEN 3 AND 120 THEN RAISE EXCEPTION 'bucket inválido'; END IF;
  IF p_window_seconds NOT BETWEEN 1 AND 86400 OR p_max NOT BETWEEN 1 AND 100000 THEN RAISE EXCEPTION 'limite inválido'; END IF;
  w := to_timestamp(floor(extract(epoch FROM p_now) / p_window_seconds) * p_window_seconds);
  INSERT INTO public.kac_rate_hits AS r (bucket, window_start, hits, expires_at) VALUES (p_bucket, w, 1, w + make_interval(secs => p_window_seconds))
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING r.hits INTO n;
  RETURN n <= p_max;
END $$;
REVOKE ALL ON FUNCTION public.kac_rate_hit(text, integer, integer, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kac_rate_hit(text, integer, integer, timestamptz) TO service_role;

-- Índices das FKs apontadas pelo advisor de performance (tabelas pequenas: criação instantânea).
CREATE INDEX IF NOT EXISTS komodo_web_sessions_user_id_idx ON public.komodo_web_sessions (user_id);
CREATE INDEX IF NOT EXISTS kac_invites_created_by_idx     ON public.kac_invites (created_by);
CREATE INDEX IF NOT EXISTS kac_subscriptions_plan_id_idx  ON public.kac_subscriptions (plan_id);

COMMIT;
