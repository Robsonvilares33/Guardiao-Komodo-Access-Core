-- Rollback da 015: volta o redeem e as funções LGPD da 014 e remove as tabelas/colunas de avisos.
BEGIN;
CREATE OR REPLACE FUNCTION public.kac_visit_invite_redeem(p_token_hash text, p_nome text, p_placa text DEFAULT NULL,
  p_consent_version text DEFAULT 'v1', p_now timestamptz DEFAULT now())
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE i public.kac_visit_invites; v_id text := gen_random_uuid()::text; r_id uuid; d text; nm text := btrim(coalesce(p_nome,'')); pl text := NULLIF(upper(regexp_replace(coalesce(p_placa,''), '[^A-Za-z0-9-]', '', 'g')), '');
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN RETURN jsonb_build_object('status','not_found'); END IF;
  SELECT * INTO i FROM public.kac_visit_invites WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF i.status <> 'active' THEN RETURN jsonb_build_object('status','revoked'); END IF;
  IF p_now > i.expires_at THEN RETURN jsonb_build_object('status','expired'); END IF;
  IF i.uses >= i.max_uses THEN RETURN jsonb_build_object('status','used_up'); END IF;
  IF char_length(nm) < 3 OR char_length(nm) > 120 OR (pl IS NOT NULL AND char_length(pl) > 10) THEN RETURN jsonb_build_object('status','invalid'); END IF;
  d := (ARRAY['dom','seg','ter','qua','qui','sex','sab'])[extract(dow FROM i.visit_date)::int + 1];
  INSERT INTO public.komodo_acessos(id, modulo, dia, hora, nome, unidade, tipo, placa, acompanhantes, "placaAcompanhante", historico, alerta, status, data, organization_id)
  VALUES (v_id, i.modulo, d, i.hora_inicio, nm, i.unidade, 'Convidado', COALESCE(pl, 'Sem veículo'), '0', '',
          'Pré-cadastro por convite (' || i.hora_inicio || '–' || i.hora_fim || ')', 0, 0, i.visit_date, i.organization_id);
  INSERT INTO public.kac_visit_invite_registrations(invite_id, organization_id, visit_id, nome, placa, consent_version, consent_at)
  VALUES (i.id, i.organization_id, v_id, nm, pl, left(coalesce(p_consent_version,'v1'), 40), p_now) RETURNING id INTO r_id;
  UPDATE public.kac_visit_invites SET uses = uses + 1 WHERE id = i.id;
  RETURN jsonb_build_object('status','ok','visit_id',v_id,'invite_id',i.id,'organization_id',i.organization_id,'registration_id',r_id,'visit_date',i.visit_date,'hora_inicio',i.hora_inicio,'hora_fim',i.hora_fim);
END $$;
REVOKE ALL ON FUNCTION public.kac_visit_invite_redeem(text,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kac_visit_invite_redeem(text,text,text,text,timestamptz) TO service_role;

-- LGPD (substitui as versões da 013; mesmas assinaturas). Expurgo também apaga convites vencidos além da retenção (cadastros do convite vão junto).
CREATE OR REPLACE FUNCTION public.kac_purge_expired(p_now timestamptz DEFAULT now()) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v int; a int; s int; l int; sv int; ci int;
BEGIN
  DELETE FROM public.komodo_acessos x USING public.kac_organizations o
   WHERE x.organization_id = o.id AND COALESCE(x.data::timestamptz, x.created_at, p_now) < p_now - make_interval(months => o.retention_months);
  GET DIAGNOSTICS v = ROW_COUNT;
  DELETE FROM public.kac_saved_visitors x USING public.kac_organizations o
   WHERE x.organization_id = o.id AND x.last_seen_at < p_now - make_interval(months => o.retention_months);
  GET DIAGNOSTICS sv = ROW_COUNT;
  DELETE FROM public.kac_visit_invites x USING public.kac_organizations o
   WHERE x.organization_id = o.id AND x.expires_at < p_now - make_interval(months => o.retention_months);
  GET DIAGNOSTICS ci = ROW_COUNT;
  DELETE FROM public.kac_audit_log x USING public.kac_organizations o
   WHERE x.organization_id = o.id AND x.created_at < p_now - make_interval(months => o.retention_months);
  GET DIAGNOSTICS a = ROW_COUNT;
  DELETE FROM public.komodo_web_sessions WHERE expires_at < p_now - interval '1 day'; GET DIAGNOSTICS s = ROW_COUNT;
  DELETE FROM public.komodo_login_attempts WHERE created_at < p_now - interval '1 day'; GET DIAGNOSTICS l = ROW_COUNT;
  IF to_regclass('public.kac_rate_hits') IS NOT NULL THEN EXECUTE 'DELETE FROM public.kac_rate_hits WHERE expires_at < $1' USING p_now; END IF;
  INSERT INTO public.kac_audit_log(organization_id, actor_user_id, action, entity, meta)
  VALUES (NULL, 'system:purge', 'lgpd.purge', 'system', jsonb_build_object('visits', v, 'saved_visitors', sv, 'invites', ci, 'audit', a, 'sessions', s, 'attempts', l));
  RETURN jsonb_build_object('visits', v, 'saved_visitors', sv, 'invites', ci, 'audit', a, 'sessions', s, 'attempts', l);
END $$;

-- Titular: exportação inclui o cadastro salvo (mesmo critério: nome exato sem maiúsculas ou placa exata).
CREATE OR REPLACE FUNCTION public.kac_subject_export(p_org uuid, p_nome text, p_placa text DEFAULT NULL) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT jsonb_build_object('visits', COALESCE(jsonb_agg(to_jsonb(x) - 'organization_id' ORDER BY x.data, x.hora), '[]'::jsonb),
    'history', COALESCE((SELECT jsonb_agg(to_jsonb(h) - 'organization_id' ORDER BY h.id) FROM public.kac_visit_history h WHERE h.organization_id = p_org AND h.visit_id IN (
       SELECT id FROM public.komodo_acessos y WHERE y.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(y.nome) = lower(p_nome)) OR (p_placa IS NOT NULL AND upper(y.placa) = upper(p_placa))))), '[]'::jsonb),
    'saved_visitors', COALESCE((SELECT jsonb_agg(to_jsonb(sv) - 'organization_id' - 'nome_norm' ORDER BY sv.created_at) FROM public.kac_saved_visitors sv WHERE sv.organization_id = p_org
       AND ((p_nome IS NOT NULL AND sv.nome_norm = lower(btrim(p_nome))) OR (p_placa IS NOT NULL AND upper(sv.placa) = upper(p_placa)))), '[]'::jsonb),
    'invite_registrations', COALESCE((SELECT jsonb_agg(to_jsonb(r) - 'organization_id' ORDER BY r.created_at) FROM public.kac_visit_invite_registrations r WHERE r.organization_id = p_org
       AND ((p_nome IS NOT NULL AND lower(r.nome) = lower(btrim(p_nome))) OR (p_placa IS NOT NULL AND upper(r.placa) = upper(p_placa)))), '[]'::jsonb),
    'invites', COALESCE((SELECT jsonb_agg(to_jsonb(i) - 'organization_id' - 'token_hash' - 'code_hash' ORDER BY i.created_at) FROM public.kac_visit_invites i WHERE i.organization_id = p_org
       AND p_nome IS NOT NULL AND lower(i.visitor_name) = lower(btrim(p_nome))), '[]'::jsonb))
  FROM public.komodo_acessos x
  WHERE x.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(x.nome) = lower(p_nome)) OR (p_placa IS NOT NULL AND upper(x.placa) = upper(p_placa)));
$$;
-- Titular: exclusão também apaga o cadastro salvo. Retorno continua sendo o nº de visitas (compatível); o salvo vai no meta da auditoria.
CREATE OR REPLACE FUNCTION public.kac_subject_delete(p_org uuid, p_nome text, p_placa text DEFAULT NULL, p_actor text DEFAULT NULL) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE n int; sv int; ir int; iv int;
BEGIN
  DELETE FROM public.komodo_acessos x WHERE x.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(x.nome) = lower(p_nome)) OR (p_placa IS NOT NULL AND upper(x.placa) = upper(p_placa)));
  GET DIAGNOSTICS n = ROW_COUNT;
  DELETE FROM public.kac_saved_visitors x WHERE x.organization_id = p_org AND ((p_nome IS NOT NULL AND x.nome_norm = lower(btrim(p_nome))) OR (p_placa IS NOT NULL AND upper(x.placa) = upper(p_placa)));
  GET DIAGNOSTICS sv = ROW_COUNT;
  DELETE FROM public.kac_visit_invite_registrations x WHERE x.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(x.nome) = lower(btrim(p_nome))) OR (p_placa IS NOT NULL AND upper(x.placa) = upper(p_placa)));
  GET DIAGNOSTICS ir = ROW_COUNT;
  UPDATE public.kac_visit_invites x SET visitor_name = NULL WHERE x.organization_id = p_org AND p_nome IS NOT NULL AND lower(x.visitor_name) = lower(btrim(p_nome));
  GET DIAGNOSTICS iv = ROW_COUNT;
  INSERT INTO public.kac_audit_log(organization_id, actor_user_id, action, entity, meta) VALUES (p_org, left(p_actor, 80), 'lgpd.subject_delete', 'visit', jsonb_build_object('count', n, 'saved_visitors', sv, 'invite_registrations', ir, 'invites_anonymized', iv));
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.kac_purge_expired(timestamptz), public.kac_subject_export(uuid,text,text), public.kac_subject_delete(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kac_purge_expired(timestamptz), public.kac_subject_export(uuid,text,text), public.kac_subject_delete(uuid,text,text,text) TO service_role;
DROP TABLE IF EXISTS public.kac_notification_log;
DROP TABLE IF EXISTS public.kac_notification_prefs;
DROP TABLE IF EXISTS public.kac_push_subscriptions;
ALTER TABLE public.kac_visit_invites DROP COLUMN IF EXISTS host_user_id;
ALTER TABLE public.komodo_acessos DROP COLUMN IF EXISTS host_user_id;
COMMIT;
