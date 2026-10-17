-- Rollback da 010. Não recria linhas apagadas pelo expurgo (para isso: restaurar o backup pré-010).
BEGIN;
DROP FUNCTION IF EXISTS public.kac_purge_expired(timestamptz);
DROP FUNCTION IF EXISTS public.kac_subject_export(uuid,text,text);
DROP FUNCTION IF EXISTS public.kac_subject_delete(uuid,text,text,text);
ALTER TABLE public.kac_visit_history DROP CONSTRAINT IF EXISTS kac_visit_history_visit_fk;
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
ALTER TABLE public.kac_organizations DROP CONSTRAINT IF EXISTS kac_org_retention_chk;
ALTER TABLE public.kac_organizations DROP COLUMN IF EXISTS retention_months;
COMMIT;
