-- Supabase can grant EXECUTE to anon/authenticated through default privileges.
-- Revoke those explicit grants as well as PUBLIC for the internal helpers.
REVOKE ALL ON FUNCTION public.registered_trainer_for_account(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trainer_account_requires_password(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_registered_trainer_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_registered_trainer_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bind_existing_registered_trainer_account() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registered_trainer_for_account(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.trainer_account_requires_password(UUID) TO service_role;
