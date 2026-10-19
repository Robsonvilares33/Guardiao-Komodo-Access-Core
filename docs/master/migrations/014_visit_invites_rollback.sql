-- Rollback da 014. ATENÇÃO: remove convites e cadastros de convite (as visitas já criadas na agenda continuam).
-- Restaura as funções LGPD exatamente como na 013.
BEGIN;
DROP FUNCTION IF EXISTS public.kac_visit_invite_redeem(text,text,text,text,timestamptz);
DROP TABLE IF EXISTS public.kac_visit_invite_registrations;
DROP TABLE IF EXISTS public.kac_visit_invites;
-- LGPD (substitui as versões da 010; mesmas assinaturas). Expurgo: visitante salvo não visto além da retenção da empresa.
CREATE OR REPLACE FUNCTION public.kac_purge_expired(p_now timestamptz DEFAULT now()) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v int; a int; s int; l int; sv int;
BEGIN
  DELETE FROM public.komodo_acessos x USING public.kac_organizations o
   WHERE x.organization_id = o.id AND COALESCE(x.data::timestamptz, x.created_at, p_now) < p_now - make_interval(months => o.retention_months);
  GET DIAGNOSTICS v = ROW_COUNT;
  DELETE FROM public.kac_saved_visitors x USING public.kac_organizations o
   WHERE x.organization_id = o.id AND x.last_seen_at < p_now - make_interval(months => o.retention_months);
  GET DIAGNOSTICS sv = ROW_COUNT;
  DELETE FROM public.kac_audit_log x USING public.kac_organizations o
   WHERE x.organization_id = o.id AND x.created_at < p_now - make_interval(months => o.retention_months);
  GET DIAGNOSTICS a = ROW_COUNT;
  DELETE FROM public.komodo_web_sessions WHERE expires_at < p_now - interval '1 day'; GET DIAGNOSTICS s = ROW_COUNT;
  DELETE FROM public.komodo_login_attempts WHERE created_at < p_now - interval '1 day'; GET DIAGNOSTICS l = ROW_COUNT;
  IF to_regclass('public.kac_rate_hits') IS NOT NULL THEN EXECUTE 'DELETE FROM public.kac_rate_hits WHERE expires_at < $1' USING p_now; END IF;
  INSERT INTO public.kac_audit_log(organization_id, actor_user_id, action, entity, meta)
  VALUES (NULL, 'system:purge', 'lgpd.purge', 'system', jsonb_build_object('visits', v, 'saved_visitors', sv, 'audit', a, 'sessions', s, 'attempts', l));
  RETURN jsonb_build_object('visits', v, 'saved_visitors', sv, 'audit', a, 'sessions', s, 'attempts', l);
END $$;

-- Titular: exportação inclui o cadastro salvo (mesmo critério: nome exato sem maiúsculas ou placa exata).
CREATE OR REPLACE FUNCTION public.kac_subject_export(p_org uuid, p_nome text, p_placa text DEFAULT NULL) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT jsonb_build_object('visits', COALESCE(jsonb_agg(to_jsonb(x) - 'organization_id' ORDER BY x.data, x.hora), '[]'::jsonb),
    'history', COALESCE((SELECT jsonb_agg(to_jsonb(h) - 'organization_id' ORDER BY h.id) FROM public.kac_visit_history h WHERE h.organization_id = p_org AND h.visit_id IN (
       SELECT id FROM public.komodo_acessos y WHERE y.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(y.nome) = lower(p_nome)) OR (p_placa IS NOT NULL AND upper(y.placa) = upper(p_placa))))), '[]'::jsonb),
    'saved_visitors', COALESCE((SELECT jsonb_agg(to_jsonb(sv) - 'organization_id' - 'nome_norm' ORDER BY sv.created_at) FROM public.kac_saved_visitors sv WHERE sv.organization_id = p_org
       AND ((p_nome IS NOT NULL AND sv.nome_norm = lower(btrim(p_nome))) OR (p_placa IS NOT NULL AND upper(sv.placa) = upper(p_placa)))), '[]'::jsonb))
  FROM public.komodo_acessos x
  WHERE x.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(x.nome) = lower(p_nome)) OR (p_placa IS NOT NULL AND upper(x.placa) = upper(p_placa)));
$$;
-- Titular: exclusão também apaga o cadastro salvo. Retorno continua sendo o nº de visitas (compatível); o salvo vai no meta da auditoria.
CREATE OR REPLACE FUNCTION public.kac_subject_delete(p_org uuid, p_nome text, p_placa text DEFAULT NULL, p_actor text DEFAULT NULL) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE n int; sv int;
BEGIN
  DELETE FROM public.komodo_acessos x WHERE x.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(x.nome) = lower(p_nome)) OR (p_placa IS NOT NULL AND upper(x.placa) = upper(p_placa)));
  GET DIAGNOSTICS n = ROW_COUNT;
  DELETE FROM public.kac_saved_visitors x WHERE x.organization_id = p_org AND ((p_nome IS NOT NULL AND x.nome_norm = lower(btrim(p_nome))) OR (p_placa IS NOT NULL AND upper(x.placa) = upper(p_placa)));
  GET DIAGNOSTICS sv = ROW_COUNT;
  INSERT INTO public.kac_audit_log(organization_id, actor_user_id, action, entity, meta) VALUES (p_org, left(p_actor, 80), 'lgpd.subject_delete', 'visit', jsonb_build_object('count', n, 'saved_visitors', sv));
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.kac_purge_expired(timestamptz), public.kac_subject_export(uuid,text,text), public.kac_subject_delete(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kac_purge_expired(timestamptz), public.kac_subject_export(uuid,text,text), public.kac_subject_delete(uuid,text,text,text) TO service_role;
COMMIT;
