-- Rollback de 008. Usuários criados via convite permanecem (sem senha local); remover manualmente se necessário.
BEGIN;
DROP FUNCTION IF EXISTS public.kac_accept_invite(text, uuid, text, text);
DROP TABLE IF EXISTS public.kac_invites;
DROP INDEX IF EXISTS public.uq_komodo_usuarios_auth_user;
ALTER TABLE public.komodo_tbl_usuarios DROP COLUMN IF EXISTS auth_user_id;
COMMIT;
