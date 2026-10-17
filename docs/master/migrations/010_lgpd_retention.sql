-- 010 — LGPD: retenção/expurgo + histórico apagado junto com a visita + exportação/exclusão por titular.
-- Aplicar SOMENTE com aprovação, depois de backup (scripts/backup/dump.mjs). Rollback: 010_lgpd_retention_rollback.sql.
BEGIN;
-- Retenção por empresa (meses de visitas/histórico/auditoria). Padrão 12 (aviso de privacidade). Limites 1..60.
ALTER TABLE public.kac_organizations ADD COLUMN IF NOT EXISTS retention_months smallint NOT NULL DEFAULT 12;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='kac_org_retention_chk') THEN
  ALTER TABLE public.kac_organizations ADD CONSTRAINT kac_org_retention_chk CHECK (retention_months BETWEEN 1 AND 60); END IF; END $$;

-- Histórico: apagar a visita apaga o histórico dela (FK ON DELETE CASCADE). A exclusão continua registrada em kac_audit_log (visit.delete, só o id).
DELETE FROM public.kac_visit_history h WHERE NOT EXISTS (SELECT 1 FROM public.komodo_acessos a WHERE a.id = h.visit_id);
CREATE OR REPLACE FUNCTION public.kac_track_visit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.kac_visit_history(visit_id, organization_id, action, new_data, new_hora, new_status, actor_user_id)
    VALUES (NEW.id, NEW.organization_id, 'created', NEW.data, NEW.hora, NEW.status, public.kac_actor());
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.data IS DISTINCT FROM OLD.data OR NEW.hora IS DISTINCT FROM OLD.hora THEN
      INSERT INTO public.kac_visit_history(visit_id, organization_id, action, old_data, new_data, old_hora, new_hora, actor_user_id)
      VALUES (NEW.id, NEW.organization_id, 'rescheduled', OLD.data, NEW.data, OLD.hora, NEW.hora, public.kac_actor());
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.kac_visit_history(visit_id, organization_id, action, old_status, new_status, actor_user_id)
      VALUES (NEW.id, NEW.organization_id, 'status_changed', OLD.status, NEW.status, public.kac_actor());
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    RETURN OLD; -- sem linha de histórico: o histórico da visita some junto (cascade)
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_kac_track_visit ON public.komodo_acessos;
CREATE TRIGGER trg_kac_track_visit AFTER INSERT OR UPDATE OR DELETE ON public.komodo_acessos FOR EACH ROW EXECUTE FUNCTION public.kac_track_visit();
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='kac_visit_history_visit_fk') THEN
  ALTER TABLE public.kac_visit_history ADD CONSTRAINT kac_visit_history_visit_fk FOREIGN KEY (visit_id) REFERENCES public.komodo_acessos(id) ON DELETE CASCADE; END IF; END $$;

-- Expurgo diário (chamado pelo GitHub Actions com service_role). Visitas: data (ou created_at) mais antiga que a retenção da empresa.
-- Sessões vencidas há mais de 1 dia; tentativas de login com mais de 1 dia; auditoria além da retenção; limites de taxa vencidos.
CREATE OR REPLACE FUNCTION public.kac_purge_expired(p_now timestamptz DEFAULT now()) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v int; a int; s int; l int;
BEGIN
  DELETE FROM public.komodo_acessos x USING public.kac_organizations o
   WHERE x.organization_id = o.id AND COALESCE(x.data::timestamptz, x.created_at, p_now) < p_now - make_interval(months => o.retention_months);
  GET DIAGNOSTICS v = ROW_COUNT;
  DELETE FROM public.kac_audit_log x USING public.kac_organizations o
   WHERE x.organization_id = o.id AND x.created_at < p_now - make_interval(months => o.retention_months);
  GET DIAGNOSTICS a = ROW_COUNT;
  DELETE FROM public.komodo_web_sessions WHERE expires_at < p_now - interval '1 day'; GET DIAGNOSTICS s = ROW_COUNT;
  DELETE FROM public.komodo_login_attempts WHERE created_at < p_now - interval '1 day'; GET DIAGNOSTICS l = ROW_COUNT;
  IF to_regclass('public.kac_rate_hits') IS NOT NULL THEN EXECUTE 'DELETE FROM public.kac_rate_hits WHERE expires_at < $1' USING p_now; END IF;
  INSERT INTO public.kac_audit_log(organization_id, actor_user_id, action, entity, meta)
  VALUES (NULL, 'system:purge', 'lgpd.purge', 'system', jsonb_build_object('visits', v, 'audit', a, 'sessions', s, 'attempts', l));
  RETURN jsonb_build_object('visits', v, 'audit', a, 'sessions', s, 'attempts', l);
END $$;

-- Titular (pessoa visitante): exportar e apagar os dados de UMA pessoa dentro de UMA empresa (pedido LGPD art. 18).
-- Busca por nome exato (sem diferenciar maiúsculas) ou placa exata. Só service_role (a API exige owner/admin + aal2).
CREATE OR REPLACE FUNCTION public.kac_subject_export(p_org uuid, p_nome text, p_placa text DEFAULT NULL) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT jsonb_build_object('visits', COALESCE(jsonb_agg(to_jsonb(x) - 'organization_id' ORDER BY x.data, x.hora), '[]'::jsonb),
    'history', COALESCE((SELECT jsonb_agg(to_jsonb(h) - 'organization_id' ORDER BY h.id) FROM public.kac_visit_history h WHERE h.organization_id = p_org AND h.visit_id IN (
       SELECT id FROM public.komodo_acessos y WHERE y.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(y.nome) = lower(p_nome)) OR (p_placa IS NOT NULL AND upper(y.placa) = upper(p_placa))))), '[]'::jsonb))
  FROM public.komodo_acessos x
  WHERE x.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(x.nome) = lower(p_nome)) OR (p_placa IS NOT NULL AND upper(x.placa) = upper(p_placa)));
$$;
CREATE OR REPLACE FUNCTION public.kac_subject_delete(p_org uuid, p_nome text, p_placa text DEFAULT NULL, p_actor text DEFAULT NULL) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE n int;
BEGIN
  DELETE FROM public.komodo_acessos x WHERE x.organization_id = p_org AND ((p_nome IS NOT NULL AND lower(x.nome) = lower(p_nome)) OR (p_placa IS NOT NULL AND upper(x.placa) = upper(p_placa)));
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO public.kac_audit_log(organization_id, actor_user_id, action, entity, meta) VALUES (p_org, left(p_actor, 80), 'lgpd.subject_delete', 'visit', jsonb_build_object('count', n));
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.kac_purge_expired(timestamptz), public.kac_subject_export(uuid,text,text), public.kac_subject_delete(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kac_purge_expired(timestamptz), public.kac_subject_export(uuid,text,text), public.kac_subject_delete(uuid,text,text,text) TO service_role;
COMMIT;
