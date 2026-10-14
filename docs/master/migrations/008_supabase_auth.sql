-- 008_supabase_auth (PROPOSTA — NÃO APLICADA). Vínculo usuário ↔ Supabase Auth + convites atômicos.
-- Não altera senhas nem sessões atuais: o login por senha continua funcionando (sem lockout).
BEGIN;
ALTER TABLE public.komodo_tbl_usuarios ADD COLUMN IF NOT EXISTS auth_user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS uq_komodo_usuarios_auth_user ON public.komodo_tbl_usuarios(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.kac_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.kac_organizations(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 254),
  role text NOT NULL CHECK (role IN ('admin','operator','viewer')),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  created_by text REFERENCES public.komodo_tbl_usuarios(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz, accepted_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kac_invites_org ON public.kac_invites(organization_id, created_at DESC);

-- Aceite atômico: trava o convite (FOR UPDATE), valida e-mail/expiração/uso, cria ou reutiliza o usuário e a membership.
CREATE OR REPLACE FUNCTION public.kac_accept_invite(p_token_hash text, p_auth_user_id uuid, p_email text, p_new_user_id text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE inv public.kac_invites%ROWTYPE; uid text; existing_role text;
BEGIN
  SELECT * INTO inv FROM public.kac_invites WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('status','invalid'); END IF;
  IF inv.accepted_at IS NOT NULL THEN RETURN json_build_object('status','used'); END IF;
  IF inv.expires_at <= now() THEN RETURN json_build_object('status','expired'); END IF;
  IF lower(p_email) <> inv.email THEN RETURN json_build_object('status','email_mismatch'); END IF;
  SELECT id INTO uid FROM public.komodo_tbl_usuarios WHERE auth_user_id = p_auth_user_id;
  IF uid IS NULL THEN
    -- Usuário legado com o mesmo e-mail e sem vínculo: vincula (o e-mail já foi verificado pelo Supabase Auth e o convite prova o acesso).
    UPDATE public.komodo_tbl_usuarios SET auth_user_id = p_auth_user_id WHERE lower(email) = inv.email AND auth_user_id IS NULL RETURNING id INTO uid;
  END IF;
  IF uid IS NULL THEN
    -- Sem senha local (salt/hash vazios): login por senha impossível; só Supabase Auth.
    INSERT INTO public.komodo_tbl_usuarios(id, email, salt, hash, papel, auth_user_id)
    VALUES (p_new_user_id, inv.email, '', '', CASE WHEN inv.role = 'admin' THEN 'admin' ELSE 'operador' END, p_auth_user_id) RETURNING id INTO uid;
  END IF;
  SELECT role INTO existing_role FROM public.kac_memberships WHERE organization_id = inv.organization_id AND user_id = uid;
  UPDATE public.kac_invites SET accepted_at = now(), accepted_by = uid WHERE id = inv.id;
  IF existing_role IS NOT NULL THEN
    RETURN json_build_object('status','already_member','organization_id',inv.organization_id,'role',existing_role);
  END IF;
  INSERT INTO public.kac_memberships(organization_id, user_id, role) VALUES (inv.organization_id, uid, inv.role);
  INSERT INTO public.kac_audit_log(organization_id, actor_user_id, action, entity, entity_id, meta)
  VALUES (inv.organization_id, uid, 'invite.accept', 'invite', inv.email, json_build_object('role', inv.role)::jsonb);
  RETURN json_build_object('status','accepted','organization_id',inv.organization_id,'role',inv.role);
END $$;
REVOKE ALL ON FUNCTION public.kac_accept_invite(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
ALTER TABLE public.kac_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.kac_invites FROM anon, authenticated;
COMMIT;
