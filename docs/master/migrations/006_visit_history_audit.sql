-- 006_visit_history_audit (PROPOSTA — NÃO APLICADA). Histórico de reagendamento + trilha de auditoria.
BEGIN;
CREATE TABLE IF NOT EXISTS public.kac_visit_history (
  id bigserial PRIMARY KEY,
  visit_id text NOT NULL REFERENCES public.komodo_acessos(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.kac_organizations(id),
  action text NOT NULL CHECK (action IN ('created','rescheduled','status_changed','deleted')),
  old_data date, new_data date, old_hora text, new_hora text, old_status smallint, new_status smallint,
  actor_user_id text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kac_visit_history_visit ON public.kac_visit_history(visit_id, created_at);
CREATE TABLE IF NOT EXISTS public.kac_audit_log (
  id bigserial PRIMARY KEY, organization_id uuid, actor_user_id text, action text NOT NULL,
  entity text NOT NULL, entity_id text, meta jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kac_audit_org_time ON public.kac_audit_log(organization_id, created_at DESC);
CREATE OR REPLACE FUNCTION public.kac_track_visit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.kac_visit_history(visit_id, organization_id, action, new_data, new_hora, new_status, actor_user_id)
    VALUES (NEW.id, NEW.organization_id, 'created', NEW.data, NEW.hora, NEW.status, public.kac_current_user());
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.data IS DISTINCT FROM OLD.data OR NEW.hora IS DISTINCT FROM OLD.hora THEN
      INSERT INTO public.kac_visit_history(visit_id, organization_id, action, old_data, new_data, old_hora, new_hora, actor_user_id)
      VALUES (NEW.id, NEW.organization_id, 'rescheduled', OLD.data, NEW.data, OLD.hora, NEW.hora, public.kac_current_user());
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.kac_visit_history(visit_id, organization_id, action, old_status, new_status, actor_user_id)
      VALUES (NEW.id, NEW.organization_id, 'status_changed', OLD.status, NEW.status, public.kac_current_user());
    END IF;
  END IF;
  RETURN NEW;
END $$;
-- Histórico em AFTER (a linha já existe para a FK); updated_at em BEFORE UPDATE.
CREATE OR REPLACE FUNCTION public.kac_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_kac_touch_visit ON public.komodo_acessos;
CREATE TRIGGER trg_kac_touch_visit BEFORE UPDATE ON public.komodo_acessos FOR EACH ROW EXECUTE FUNCTION public.kac_touch_updated_at();
DROP TRIGGER IF EXISTS trg_kac_track_visit ON public.komodo_acessos;
CREATE TRIGGER trg_kac_track_visit AFTER INSERT OR UPDATE ON public.komodo_acessos FOR EACH ROW EXECUTE FUNCTION public.kac_track_visit();
ALTER TABLE public.kac_visit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kac_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kac_hist_read ON public.kac_visit_history;
CREATE POLICY kac_hist_read ON public.kac_visit_history FOR SELECT TO authenticated USING (public.kac_is_member(organization_id));
DROP POLICY IF EXISTS kac_audit_read ON public.kac_audit_log;
CREATE POLICY kac_audit_read ON public.kac_audit_log FOR SELECT TO authenticated USING (public.kac_is_member(organization_id, ARRAY['owner','admin']));
GRANT SELECT ON public.kac_visit_history, public.kac_audit_log TO authenticated;
COMMIT;
