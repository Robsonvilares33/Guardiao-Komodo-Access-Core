-- 014 — Convite de visita por link ou código curto (Onda 1 item 2). ADITIVA: 2 tabelas novas + 1 função nova;
-- substitui (CREATE OR REPLACE, mesmas assinaturas) as funções LGPD da 013 para incluir as tabelas novas. Nada existente é apagado.
-- Token do link: 256 bits aleatórios gerados no servidor; só o SHA-256 fica no banco. Código curto: só o SHA-256 (org + código).
-- Aplicar depois de backup (scripts/backup/dump.mjs). Rollback: 014_visit_invites_rollback.sql.
BEGIN;
CREATE TABLE IF NOT EXISTS public.kac_visit_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kac_organizations(id) ON DELETE CASCADE,
  modulo text NOT NULL CHECK (modulo IN ('empresarial','residencial','clinica')),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  code_hash text NOT NULL CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  visitor_name text CHECK (visitor_name IS NULL OR char_length(visitor_name) <= 120),
  host_label text CHECK (host_label IS NULL OR char_length(host_label) <= 120),
  unidade text CHECK (unidade IS NULL OR char_length(unidade) <= 120),
  note text CHECK (note IS NULL OR char_length(note) <= 300),
  visit_date date NOT NULL,
  hora_inicio text NOT NULL CHECK (hora_inicio ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  hora_fim text NOT NULL CHECK (hora_fim ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  expires_at timestamptz NOT NULL,
  max_uses smallint NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 20),
  uses smallint NOT NULL DEFAULT 0 CHECK (uses >= 0 AND uses <= max_uses),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  revoked_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kac_visit_invites_code_unique UNIQUE (organization_id, code_hash),
  CONSTRAINT kac_visit_invites_window_chk CHECK (hora_fim > hora_inicio)
);
CREATE INDEX IF NOT EXISTS kac_visit_invites_org_created_idx ON public.kac_visit_invites (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kac_visit_invites_expires_idx ON public.kac_visit_invites (expires_at);
DROP TRIGGER IF EXISTS trg_kac_touch_visit_invite ON public.kac_visit_invites;
CREATE TRIGGER trg_kac_touch_visit_invite BEFORE UPDATE ON public.kac_visit_invites FOR EACH ROW EXECUTE FUNCTION public.kac_touch_updated_at();

-- Cada uso do convite: dados mínimos que a pessoa informou + consentimento. Apagar a visita apaga o cadastro (cascade).
CREATE TABLE IF NOT EXISTS public.kac_visit_invite_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.kac_visit_invites(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.kac_organizations(id) ON DELETE CASCADE,
  visit_id text NOT NULL REFERENCES public.komodo_acessos(id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 3 AND 120),
  placa text CHECK (placa IS NULL OR char_length(placa) <= 10),
  consent_version text NOT NULL CHECK (char_length(consent_version) <= 40),
  consent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kac_visit_invite_reg_invite_idx ON public.kac_visit_invite_registrations (invite_id);
CREATE INDEX IF NOT EXISTS kac_visit_invite_reg_visit_idx ON public.kac_visit_invite_registrations (visit_id);
CREATE INDEX IF NOT EXISTS kac_visit_invite_reg_org_idx ON public.kac_visit_invite_registrations (organization_id);

-- RLS por empresa (acesso real só pelo servidor/service_role; GRANTs de anon/authenticated revogados, como na 006/013).
ALTER TABLE public.kac_visit_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kac_visit_invite_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kac_vinv_read ON public.kac_visit_invites;
CREATE POLICY kac_vinv_read ON public.kac_visit_invites FOR SELECT TO authenticated USING (public.kac_is_member(organization_id));
DROP POLICY IF EXISTS kac_vinv_insert ON public.kac_visit_invites;
CREATE POLICY kac_vinv_insert ON public.kac_visit_invites FOR INSERT TO authenticated WITH CHECK (public.kac_is_member(organization_id, ARRAY['owner','admin','operator']));
DROP POLICY IF EXISTS kac_vinv_update ON public.kac_visit_invites;
CREATE POLICY kac_vinv_update ON public.kac_visit_invites FOR UPDATE TO authenticated
  USING (public.kac_is_member(organization_id, ARRAY['owner','admin','operator'])) WITH CHECK (public.kac_is_member(organization_id, ARRAY['owner','admin','operator']));
DROP POLICY IF EXISTS kac_vinv_reg_read ON public.kac_visit_invite_registrations;
CREATE POLICY kac_vinv_reg_read ON public.kac_visit_invite_registrations FOR SELECT TO authenticated USING (public.kac_is_member(organization_id));
REVOKE ALL ON public.kac_visit_invites, public.kac_visit_invite_registrations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kac_visit_invites, public.kac_visit_invite_registrations TO service_role;

-- Uso do convite pela página pública (o servidor passa só o hash do token). Atômico: trava o convite, confere status/validade/usos,
-- cria a visita na agenda da empresa do convite e o cadastro, e conta o uso. Respostas: ok | not_found | revoked | expired | used_up | invalid.
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
COMMIT;
