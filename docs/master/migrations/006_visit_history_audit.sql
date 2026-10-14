-- 006_visit_history_audit — histórico de visita + trilha de auditoria (variante de produção).
-- Produção: sem grants para anon/authenticated (acesso só via API service_role). O histórico sobrevive à exclusão da visita (sem FK).
BEGIN;
CREATE TABLE IF NOT EXISTS public.kac_visit_history (
  id bigserial PRIMARY KEY,
  visit_id text NOT NULL,
  organization_id uuid REFERENCES public.kac_organizations(id),
  action text NOT NULL CHECK (action IN ('created','rescheduled','status_changed','deleted')),
  old_data date, new_data date, old_hora text, new_hora text, old_status smallint, new_status smallint,
  actor_user_id text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kac_visit_history_visit ON public.kac_visit_history(organization_id, visit_id, created_at);
CREATE TABLE IF NOT EXISTS public.kac_audit_log (
  id bigserial PRIMARY KEY, organization_id uuid REFERENCES public.kac_organizations(id), actor_user_id text, action text NOT NULL,
  entity text NOT NULL, entity_id text, meta jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kac_audit_org_time ON public.kac_audit_log(organization_id, created_at DESC);

-- Ator: app.user_id (sessão SQL) ou, SOMENTE quando o chamador é service_role via PostgREST, o header x-kac-actor enviado pela API.
-- Não usado em policies (um cliente authenticated não consegue se passar por outro usuário).
CREATE OR REPLACE FUNCTION public.kac_actor() RETURNS text
LANGUAGE sql STABLE SET search_path = pg_catalog, public AS $$
  SELECT COALESCE(public.kac_current_user(),
    CASE WHEN COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::json->>'role' = 'service_role'
         THEN left(NULLIF(COALESCE(NULLIF(current_setting('request.headers', true), ''), '{}')::json->>'x-kac-actor', ''), 80) END)
$$;

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
    INSERT INTO public.kac_visit_history(visit_id, organization_id, action, old_data, old_hora, old_status, actor_user_id)
    VALUES (OLD.id, OLD.organization_id, 'deleted', OLD.data, OLD.hora, OLD.status, public.kac_actor());
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.kac_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_kac_touch_visit ON public.komodo_acessos;
CREATE TRIGGER trg_kac_touch_visit BEFORE UPDATE ON public.komodo_acessos FOR EACH ROW EXECUTE FUNCTION public.kac_touch_updated_at();
DROP TRIGGER IF EXISTS trg_kac_track_visit ON public.komodo_acessos;
CREATE TRIGGER trg_kac_track_visit AFTER INSERT OR UPDATE OR DELETE ON public.komodo_acessos FOR EACH ROW EXECUTE FUNCTION public.kac_track_visit();

REVOKE ALL ON FUNCTION public.kac_actor(), public.kac_track_visit(), public.kac_touch_updated_at() FROM PUBLIC, anon, authenticated;
ALTER TABLE public.kac_visit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kac_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kac_hist_read ON public.kac_visit_history;
CREATE POLICY kac_hist_read ON public.kac_visit_history FOR SELECT TO authenticated USING (public.kac_is_member(organization_id));
DROP POLICY IF EXISTS kac_audit_read ON public.kac_audit_log;
CREATE POLICY kac_audit_read ON public.kac_audit_log FOR SELECT TO authenticated USING (public.kac_is_member(organization_id, ARRAY['owner','admin']));
REVOKE ALL ON TABLE public.kac_visit_history, public.kac_audit_log FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.kac_visit_history_id_seq, public.kac_audit_log_id_seq FROM anon, authenticated;
COMMIT;
