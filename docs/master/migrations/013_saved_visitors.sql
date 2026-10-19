-- 013 — Visitantes frequentes (salvos) por empresa: sugestão de nome ao registrar visita, reaproveitar dados, editar/remover.
-- ADITIVA: cria tabela + função nova e substitui (CREATE OR REPLACE) as funções LGPD da 010 para incluir a tabela nova.
-- Nada existente é apagado. Aplicar depois de backup (scripts/backup/dump.mjs). Rollback: 013_saved_visitors_rollback.sql.
BEGIN;
CREATE TABLE IF NOT EXISTS public.kac_saved_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kac_organizations(id) ON DELETE CASCADE,
  modulo text NOT NULL CHECK (modulo IN ('empresarial','residencial','clinica')),
  nome text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 3 AND 120),
  nome_norm text GENERATED ALWAYS AS (lower(btrim(nome))) STORED,
  tipo text CHECK (tipo IS NULL OR char_length(tipo) <= 40),
  placa text CHECK (placa IS NULL OR char_length(placa) <= 20),
  cor text CHECK (cor IS NULL OR char_length(cor) <= 40),
  marca text CHECK (marca IS NULL OR char_length(marca) <= 60),
  unidade text CHECK (unidade IS NULL OR char_length(unidade) <= 120),
  observacao text CHECK (observacao IS NULL OR char_length(observacao) <= 300),
  visits_count integer NOT NULL DEFAULT 0 CHECK (visits_count >= 0),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kac_saved_visitors_unique UNIQUE (organization_id, modulo, nome_norm)
);
-- Sugestão: prefixo/trecho do nome dentro da empresa+módulo; listagem pelos mais recentes; expurgo por last_seen_at.
CREATE INDEX IF NOT EXISTS kac_saved_visitors_org_recent_idx ON public.kac_saved_visitors (organization_id, modulo, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS kac_saved_visitors_last_seen_idx ON public.kac_saved_visitors (last_seen_at);
DROP TRIGGER IF EXISTS trg_kac_touch_saved_visitor ON public.kac_saved_visitors;
CREATE TRIGGER trg_kac_touch_saved_visitor BEFORE UPDATE ON public.kac_saved_visitors FOR EACH ROW EXECUTE FUNCTION public.kac_touch_updated_at();

-- Isolamento por empresa (RLS). O app acessa só pelo servidor (service_role), que filtra pela org da sessão;
-- as policies valem para qualquer acesso direto com JWT de usuário, e os GRANTs de anon/authenticated ficam revogados (como na 006).
ALTER TABLE public.kac_saved_visitors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kac_saved_read ON public.kac_saved_visitors;
CREATE POLICY kac_saved_read ON public.kac_saved_visitors FOR SELECT TO authenticated USING (public.kac_is_member(organization_id));
DROP POLICY IF EXISTS kac_saved_write ON public.kac_saved_visitors;  -- (versão inicial: FOR ALL; trocada por uma policy por ação, sem duplicar o SELECT)
DROP POLICY IF EXISTS kac_saved_insert ON public.kac_saved_visitors;
CREATE POLICY kac_saved_insert ON public.kac_saved_visitors FOR INSERT TO authenticated WITH CHECK (public.kac_is_member(organization_id, ARRAY['owner','admin','operator']));
DROP POLICY IF EXISTS kac_saved_update ON public.kac_saved_visitors;
CREATE POLICY kac_saved_update ON public.kac_saved_visitors FOR UPDATE TO authenticated
  USING (public.kac_is_member(organization_id, ARRAY['owner','admin','operator'])) WITH CHECK (public.kac_is_member(organization_id, ARRAY['owner','admin','operator']));
DROP POLICY IF EXISTS kac_saved_delete ON public.kac_saved_visitors;
CREATE POLICY kac_saved_delete ON public.kac_saved_visitors FOR DELETE TO authenticated USING (public.kac_is_member(organization_id, ARRAY['owner','admin','operator']));
REVOKE ALL ON public.kac_saved_visitors FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kac_saved_visitors TO service_role;

-- Ao registrar uma visita: cria ou atualiza o visitante salvo (conta a visita e atualiza "visto por último").
-- Campos vazios não apagam o que já estava salvo; observação só muda pela edição.
CREATE OR REPLACE FUNCTION public.kac_saved_visitor_touch(p_org uuid, p_modulo text, p_nome text, p_tipo text DEFAULT NULL,
  p_placa text DEFAULT NULL, p_cor text DEFAULT NULL, p_marca text DEFAULT NULL, p_unidade text DEFAULT NULL, p_actor text DEFAULT NULL)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  INSERT INTO public.kac_saved_visitors AS s (organization_id, modulo, nome, tipo, placa, cor, marca, unidade, visits_count, last_seen_at, created_by)
  VALUES (p_org, p_modulo, btrim(p_nome), NULLIF(btrim(p_tipo),''), NULLIF(upper(btrim(p_placa)),''), NULLIF(btrim(p_cor),''),
          NULLIF(btrim(p_marca),''), NULLIF(btrim(p_unidade),''), 1, now(), left(p_actor, 80))
  ON CONFLICT (organization_id, modulo, nome_norm) DO UPDATE SET
    visits_count = s.visits_count + 1, last_seen_at = now(),
    tipo = COALESCE(EXCLUDED.tipo, s.tipo), placa = COALESCE(EXCLUDED.placa, s.placa), cor = COALESCE(EXCLUDED.cor, s.cor),
    marca = COALESCE(EXCLUDED.marca, s.marca), unidade = COALESCE(EXCLUDED.unidade, s.unidade)
  RETURNING id;
$$;
REVOKE ALL ON FUNCTION public.kac_saved_visitor_touch(uuid,text,text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kac_saved_visitor_touch(uuid,text,text,text,text,text,text,text,text) TO service_role;

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
