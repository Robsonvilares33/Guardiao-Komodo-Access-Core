-- 009_onboarding — primeiro acesso: conta Supabase verificada sem empresa cria a própria organização (owner, plano Free).
-- Aditiva: 3 colunas opcionais em kac_organizations + 1 índice único parcial + 1 função SECURITY DEFINER (só service_role).
-- Não altera dados existentes. Limite: 1 organização criada por conta (índice único em created_by_auth_user).
BEGIN;
ALTER TABLE public.kac_organizations ADD COLUMN IF NOT EXISTS kind text;
ALTER TABLE public.kac_organizations ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.kac_organizations ADD COLUMN IF NOT EXISTS created_by_auth_user uuid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kac_org_kind_chk') THEN
    ALTER TABLE public.kac_organizations ADD CONSTRAINT kac_org_kind_chk CHECK (kind IS NULL OR kind IN ('condominio','predio','comercio','portaria','outro'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kac_org_cnpj_chk') THEN
    ALTER TABLE public.kac_organizations ADD CONSTRAINT kac_org_cnpj_chk CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$');
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_kac_org_created_by_auth ON public.kac_organizations(created_by_auth_user) WHERE created_by_auth_user IS NOT NULL;

-- Onboarding atômico (trava por conta): valida, cria/reaproveita usuário local sem senha, organização, membership owner, assinatura free e auditoria.
CREATE OR REPLACE FUNCTION public.kac_onboard_org(p_auth_user_id uuid, p_email text, p_new_user_id text, p_name text, p_kind text, p_cnpj text, p_timezone text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE uid text; org uuid; em text := lower(trim(p_email)); nm text := btrim(p_name);
BEGIN
  IF p_auth_user_id IS NULL OR em !~ '^[^@\s]+@[^@\s]+$' THEN RETURN json_build_object('status','invalid'); END IF;
  IF nm IS NULL OR length(nm) < 2 OR length(nm) > 120 THEN RETURN json_build_object('status','invalid_name'); END IF;
  IF p_kind NOT IN ('condominio','predio','comercio','portaria','outro') THEN RETURN json_build_object('status','invalid_kind'); END IF;
  IF p_cnpj IS NOT NULL AND p_cnpj !~ '^[0-9]{14}$' THEN RETURN json_build_object('status','invalid_cnpj'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN RETURN json_build_object('status','invalid_timezone'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('kac_onboard:' || p_auth_user_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.kac_organizations WHERE created_by_auth_user = p_auth_user_id) THEN RETURN json_build_object('status','limit_reached'); END IF;
  SELECT id INTO uid FROM public.komodo_tbl_usuarios WHERE auth_user_id = p_auth_user_id;
  IF uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.kac_memberships WHERE user_id = uid) THEN RETURN json_build_object('status','already_member'); END IF;
  IF uid IS NULL THEN
    -- E-mail já usado por um usuário existente: não cria duplicado; ele deve usar "vincular" (prova da senha atual).
    IF EXISTS (SELECT 1 FROM public.komodo_tbl_usuarios WHERE lower(email) = em) THEN RETURN json_build_object('status','email_in_use'); END IF;
    INSERT INTO public.komodo_tbl_usuarios(id, email, salt, hash, papel, auth_user_id) VALUES (p_new_user_id, em, '', '', 'admin', p_auth_user_id) RETURNING id INTO uid;
  ELSE
    UPDATE public.komodo_tbl_usuarios SET papel = 'admin' WHERE id = uid;
  END IF;
  INSERT INTO public.kac_organizations(name, timezone, kind, cnpj, created_by_auth_user) VALUES (nm, p_timezone, p_kind, p_cnpj, p_auth_user_id) RETURNING id INTO org;
  INSERT INTO public.kac_memberships(organization_id, user_id, role) VALUES (org, uid, 'owner');
  INSERT INTO public.kac_subscriptions(organization_id, plan_id, status) VALUES (org, 'free', 'active') ON CONFLICT (organization_id) DO NOTHING;
  INSERT INTO public.kac_audit_log(organization_id, actor_user_id, action, entity, entity_id, meta)
  VALUES (org, uid, 'org.create', 'organization', org::text, json_build_object('kind', p_kind, 'via', 'onboarding')::jsonb);
  RETURN json_build_object('status','created','organization_id',org,'user_id',uid);
END $$;
REVOKE ALL ON FUNCTION public.kac_onboard_org(uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kac_onboard_org(uuid, text, text, text, text, text, text) TO service_role;
COMMIT;
