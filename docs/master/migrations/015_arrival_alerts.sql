-- 015 — Aviso "seu visitante chegou" (Onda 1, item 3). ADITIVA: 3 tabelas novas + 2 colunas opcionais; nada é apagado.
-- Aparelhos (Web Push) e preferências são por USUÁRIO dentro da EMPRESA (some junto se o vínculo for removido).
-- O registro de envios NÃO guarda conteúdo (só canal, tipo, resultado, horário e o id da visita).
BEGIN;
-- Anfitrião da visita (quem é avisado na chegada): quem criou a visita/convite, ou um usuário escolhido da mesma empresa.
ALTER TABLE public.komodo_acessos ADD COLUMN IF NOT EXISTS host_user_id text;
ALTER TABLE public.kac_visit_invites ADD COLUMN IF NOT EXISTS host_user_id text;

CREATE TABLE IF NOT EXISTS public.kac_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id text NOT NULL,
  endpoint text NOT NULL UNIQUE CHECK (endpoint ~ '^https://' AND char_length(endpoint) <= 1024),
  p256dh text NOT NULL CHECK (char_length(p256dh) BETWEEN 80 AND 100),
  auth text NOT NULL CHECK (char_length(auth) BETWEEN 16 AND 32),
  label text CHECK (label IS NULL OR char_length(label) <= 60),
  fail_count int NOT NULL DEFAULT 0,
  last_ok_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, user_id) REFERENCES public.kac_memberships(organization_id, user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS kac_push_sub_user_idx ON public.kac_push_subscriptions(organization_id, user_id);

CREATE TABLE IF NOT EXISTS public.kac_notification_prefs (
  organization_id uuid NOT NULL,
  user_id text NOT NULL,
  push_enabled boolean NOT NULL DEFAULT false,
  email_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id),
  FOREIGN KEY (organization_id, user_id) REFERENCES public.kac_memberships(organization_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.kac_notification_log (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.kac_organizations(id) ON DELETE CASCADE,
  user_id text,
  visit_id text REFERENCES public.komodo_acessos(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('push','email')),
  kind text NOT NULL CHECK (kind IN ('arrival','test')),
  status text NOT NULL CHECK (status IN ('sent','failed','skipped')),
  error_code text CHECK (error_code IS NULL OR char_length(error_code) <= 40),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kac_notif_log_org_idx ON public.kac_notification_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kac_notif_log_email_idx ON public.kac_notification_log(created_at) WHERE channel = 'email' AND status = 'sent';
CREATE INDEX IF NOT EXISTS kac_notif_log_visit_idx ON public.kac_notification_log(visit_id);
CREATE INDEX IF NOT EXISTS kac_notif_log_user_idx ON public.kac_notification_log(organization_id, user_id);

ALTER TABLE public.kac_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kac_notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kac_notification_log ENABLE ROW LEVEL SECURITY;
-- Cada usuário só vê os PRÓPRIOS aparelhos/preferências; o registro é visível para owner/admin da empresa.
DROP POLICY IF EXISTS kac_push_own ON public.kac_push_subscriptions;
CREATE POLICY kac_push_own ON public.kac_push_subscriptions FOR SELECT TO authenticated USING (public.kac_is_member(organization_id) AND user_id = (SELECT public.kac_current_user()));
DROP POLICY IF EXISTS kac_prefs_own ON public.kac_notification_prefs;
CREATE POLICY kac_prefs_own ON public.kac_notification_prefs FOR SELECT TO authenticated USING (public.kac_is_member(organization_id) AND user_id = (SELECT public.kac_current_user()));
DROP POLICY IF EXISTS kac_notif_log_read ON public.kac_notification_log;
CREATE POLICY kac_notif_log_read ON public.kac_notification_log FOR SELECT TO authenticated USING (public.kac_is_member(organization_id, ARRAY['owner','admin']));
REVOKE ALL ON public.kac_push_subscriptions, public.kac_notification_prefs, public.kac_notification_log FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.kac_notification_log_id_seq FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kac_push_subscriptions, public.kac_notification_prefs, public.kac_notification_log TO service_role;
GRANT USAGE ON SEQUENCE public.kac_notification_log_id_seq TO service_role;

-- Convite: a visita criada pelo convite herda o anfitrião (host_user_id do convite ou quem o criou). Mesma assinatura da 014.
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
  INSERT INTO public.komodo_acessos(id, modulo, dia, hora, nome, unidade, tipo, placa, acompanhantes, "placaAcompanhante", historico, alerta, status, data, organization_id, host_user_id)
  VALUES (v_id, i.modulo, d, i.hora_inicio, nm, i.unidade, 'Convidado', COALESCE(pl, 'Sem veículo'), '0', '',
          'Pré-cadastro por convite (' || i.hora_inicio || '–' || i.hora_fim || ')', 0, 0, i.visit_date, i.organization_id, COALESCE(i.host_user_id, i.created_by));
  INSERT INTO public.kac_visit_invite_registrations(invite_id, organization_id, visit_id, nome, placa, consent_version, consent_at)
  VALUES (i.id, i.organization_id, v_id, nm, pl, left(coalesce(p_consent_version,'v1'), 40), p_now) RETURNING id INTO r_id;
  UPDATE public.kac_visit_invites SET uses = uses + 1 WHERE id = i.id;
  RETURN jsonb_build_object('status','ok','visit_id',v_id,'invite_id',i.id,'organization_id',i.organization_id,'registration_id',r_id,'visit_date',i.visit_date,'hora_inicio',i.hora_inicio,'hora_fim',i.hora_fim);
END $$;
REVOKE ALL ON FUNCTION public.kac_visit_invite_redeem(text,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kac_visit_invite_redeem(text,text,text,text,timestamptz) TO service_role;

-- LGPD (substitui as versões da 014; mesmas assinaturas). Expurgo também apaga o registro de avisos além da retenção e aparelhos sem uso.
CREATE OR REPLACE FUNCTION public.kac_purge_expired(p_now timestamptz DEFAULT now()) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v int; a int; s int; l int; sv int; ci int; nl int; ps int;
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
  DELETE FROM public.kac_notification_log x USING public.kac_organizations o
   WHERE x.organization_id = o.id AND x.created_at < p_now - make_interval(months => o.retention_months);
  GET DIAGNOSTICS nl = ROW_COUNT;
  DELETE FROM public.kac_push_subscriptions x USING public.kac_organizations o
   WHERE x.organization_id = o.id AND (x.fail_count >= 5 OR COALESCE(x.last_ok_at, x.created_at) < p_now - make_interval(months => o.retention_months));
  GET DIAGNOSTICS ps = ROW_COUNT;
  DELETE FROM public.kac_audit_log x USING public.kac_organizations o
   WHERE x.organization_id = o.id AND x.created_at < p_now - make_interval(months => o.retention_months);
  GET DIAGNOSTICS a = ROW_COUNT;
  DELETE FROM public.komodo_web_sessions WHERE expires_at < p_now - interval '1 day'; GET DIAGNOSTICS s = ROW_COUNT;
  DELETE FROM public.komodo_login_attempts WHERE created_at < p_now - interval '1 day'; GET DIAGNOSTICS l = ROW_COUNT;
  IF to_regclass('public.kac_rate_hits') IS NOT NULL THEN EXECUTE 'DELETE FROM public.kac_rate_hits WHERE expires_at < $1' USING p_now; END IF;
  INSERT INTO public.kac_audit_log(organization_id, actor_user_id, action, entity, meta)
  VALUES (NULL, 'system:purge', 'lgpd.purge', 'system', jsonb_build_object('visits', v, 'saved_visitors', sv, 'invites', ci, 'notifications', nl, 'push_devices', ps, 'audit', a, 'sessions', s, 'attempts', l));
  RETURN jsonb_build_object('visits', v, 'saved_visitors', sv, 'invites', ci, 'notifications', nl, 'push_devices', ps, 'audit', a, 'sessions', s, 'attempts', l);
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
       AND p_nome IS NOT NULL AND lower(i.visitor_name) = lower(btrim(p_nome))), '[]'::jsonb),
    'notifications', COALESCE((SELECT jsonb_agg(jsonb_build_object('visit_id', n.visit_id, 'channel', n.channel, 'kind', n.kind, 'status', n.status, 'created_at', n.created_at) ORDER BY n.id) FROM public.kac_notification_log n WHERE n.organization_id = p_org AND n.visit_id IN (
       SELECT id FROM public.komodo_acessos y WHERE y.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(y.nome) = lower(p_nome)) OR (p_placa IS NOT NULL AND upper(y.placa) = upper(p_placa))))), '[]'::jsonb))
  FROM public.komodo_acessos x
  WHERE x.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(x.nome) = lower(p_nome)) OR (p_placa IS NOT NULL AND upper(x.placa) = upper(p_placa)));
$$;
-- Titular: exclusão também apaga o cadastro salvo. Retorno continua sendo o nº de visitas (compatível); o salvo vai no meta da auditoria.
CREATE OR REPLACE FUNCTION public.kac_subject_delete(p_org uuid, p_nome text, p_placa text DEFAULT NULL, p_actor text DEFAULT NULL) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE n int; sv int; ir int; iv int; nn int;
BEGIN
  DELETE FROM public.kac_notification_log n WHERE n.organization_id = p_org AND n.visit_id IN (SELECT id FROM public.komodo_acessos x WHERE x.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(x.nome) = lower(p_nome)) OR (p_placa IS NOT NULL AND upper(x.placa) = upper(p_placa))));
  GET DIAGNOSTICS nn = ROW_COUNT;
  DELETE FROM public.komodo_acessos x WHERE x.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(x.nome) = lower(p_nome)) OR (p_placa IS NOT NULL AND upper(x.placa) = upper(p_placa)));
  GET DIAGNOSTICS n = ROW_COUNT;
  DELETE FROM public.kac_saved_visitors x WHERE x.organization_id = p_org AND ((p_nome IS NOT NULL AND x.nome_norm = lower(btrim(p_nome))) OR (p_placa IS NOT NULL AND upper(x.placa) = upper(p_placa)));
  GET DIAGNOSTICS sv = ROW_COUNT;
  DELETE FROM public.kac_visit_invite_registrations x WHERE x.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(x.nome) = lower(btrim(p_nome))) OR (p_placa IS NOT NULL AND upper(x.placa) = upper(p_placa)));
  GET DIAGNOSTICS ir = ROW_COUNT;
  UPDATE public.kac_visit_invites x SET visitor_name = NULL WHERE x.organization_id = p_org AND p_nome IS NOT NULL AND lower(x.visitor_name) = lower(btrim(p_nome));
  GET DIAGNOSTICS iv = ROW_COUNT;
  INSERT INTO public.kac_audit_log(organization_id, actor_user_id, action, entity, meta) VALUES (p_org, left(p_actor, 80), 'lgpd.subject_delete', 'visit', jsonb_build_object('count', n, 'saved_visitors', sv, 'invite_registrations', ir, 'invites_anonymized', iv, 'notifications', nn));
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.kac_purge_expired(timestamptz), public.kac_subject_export(uuid,text,text), public.kac_subject_delete(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kac_purge_expired(timestamptz), public.kac_subject_export(uuid,text,text), public.kac_subject_delete(uuid,text,text,text) TO service_role;
COMMIT;
