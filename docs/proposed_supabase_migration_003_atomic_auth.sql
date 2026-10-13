-- PROPOSED ONLY. Validate in disposable PostgreSQL first.
-- Never apply to the real Supabase project without explicit authorization.
BEGIN;

-- Serialize bootstrap attempts. The transaction-level advisory lock protects
-- the "no users yet" check and insert as one database transaction.
CREATE OR REPLACE FUNCTION public.komodo_bootstrap_admin_atomic(
  p_id text, p_email text, p_salt text, p_hash text, p_criado_em text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('komodo:first-admin-bootstrap', 0));
  IF EXISTS (SELECT 1 FROM public.komodo_tbl_usuarios) THEN
    RETURN 'already_initialized';
  END IF;
  INSERT INTO public.komodo_tbl_usuarios(id,email,salt,hash,papel,criado_em)
  VALUES (p_id, lower(trim(p_email)), p_salt, p_hash, 'admin', p_criado_em);
  RETURN 'created';
EXCEPTION WHEN unique_violation THEN
  RETURN 'already_initialized';
END;
$$;

-- Atomic per-IP rate gate: the per-IP advisory lock serializes count+insert.
-- Each attempted login consumes a slot before credential validation.
CREATE OR REPLACE FUNCTION public.komodo_consume_login_attempt_atomic(
  p_id uuid, p_ip_hash text, p_now timestamptz DEFAULT now()
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE n integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('komodo:login:' || p_ip_hash, 0));
  DELETE FROM public.komodo_login_attempts
   WHERE created_at < p_now - interval '24 hours';
  SELECT count(*) INTO n
    FROM public.komodo_login_attempts
   WHERE ip_hash = p_ip_hash
     AND created_at >= p_now - interval '15 minutes';
  IF n >= 10 THEN
    RETURN false;
  END IF;
  INSERT INTO public.komodo_login_attempts(id,ip_hash,created_at)
  VALUES (p_id,p_ip_hash,p_now);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.komodo_bootstrap_admin_atomic(text,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.komodo_consume_login_attempt_atomic(uuid,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.komodo_bootstrap_admin_atomic(text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.komodo_consume_login_attempt_atomic(uuid,text,timestamptz) TO service_role;

COMMIT;
