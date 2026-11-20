-- A Certified Trainer registration determines the portal role independently
-- of invite acceptance, signup, recovery or profile-completion entry points.
-- Auth remains responsible for email verification, passwords and sessions.
-- No existing accounts are bulk rewritten by this migration.

CREATE OR REPLACE FUNCTION public.registered_trainer_for_account(
  p_user_id UUID,
  p_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_ids UUID[];
BEGIN
  -- Never trust a self-edited public profile email or user metadata alone.
  IF p_user_id IS NULL OR p_email IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM auth.users au
       WHERE au.id = p_user_id
         AND lower(btrim(au.email)) = lower(btrim(p_email))
     )
     OR public.is_partner_principal(p_user_id, p_email) THEN
    RETURN NULL;
  END IF;

  SELECT array_agg(candidate.id) INTO v_ids
  FROM (
    SELECT et.id
    FROM public.ecp_trainers et
    JOIN public.partners p ON p.id = et.partner_id
    WHERE lower(btrim(et.email)) = lower(btrim(p_email))
      AND et.is_active IS TRUE
      AND et.status = 'approved'
      AND p.partner_type IN ('ecp', 'dual_partner')
      AND (et.user_id IS NULL OR et.user_id = p_user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.ecp_trainers other
        WHERE other.user_id = p_user_id AND other.id <> et.id
      )
    ORDER BY et.id
    LIMIT 2
  ) candidate;

  -- Ambiguous historical duplicates must not silently take over an account.
  IF cardinality(v_ids) = 1 THEN
    RETURN v_ids[1];
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.registered_trainer_for_account(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registered_trainer_for_account(UUID, TEXT) TO service_role;

-- Only the trusted invitation service may inspect whether setup is required.
-- Return a boolean, never a password hash or other authentication secrets.
CREATE OR REPLACE FUNCTION public.trainer_account_requires_password(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, pg_temp
AS $$
  SELECT COALESCE((SELECT COALESCE(au.encrypted_password, '') = ''
                  FROM auth.users au WHERE au.id = p_user_id), TRUE);
$$;
REVOKE ALL ON FUNCTION public.trainer_account_requires_password(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trainer_account_requires_password(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_registered_trainer_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Preserve protected partner, administrative and all other account roles.
  IF NEW.role::text IN ('individual', 'trainer')
     AND public.registered_trainer_for_account(NEW.id, NEW.email) IS NOT NULL THEN
    NEW.role := 'trainer'::public.user_role;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_registered_trainer_role() FROM PUBLIC;

-- Alphabetical trigger order places this before the sensitive-field guard.
DROP TRIGGER IF EXISTS aa_users_registered_trainer_role ON public.users;
CREATE TRIGGER aa_users_registered_trainer_role
BEFORE INSERT OR UPDATE OF role, email ON public.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_registered_trainer_role();

-- Retain the existing protected-field checks. The sole new permitted role
-- transition is the database-validated Individual -> registered Trainer one.
-- No JWT, role claim or user session is fabricated by this internal transition.
CREATE OR REPLACE FUNCTION public.prevent_sensitive_user_field_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() AND (auth.jwt() ->> 'role') != 'service_role' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND NOT (
         OLD.role::text = 'individual'
         AND NEW.role::text = 'trainer'
         AND public.registered_trainer_for_account(NEW.id, NEW.email) IS NOT NULL
       ) THEN
      RAISE EXCEPTION 'Permission denied: cannot change user role directly. Contact admin.';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Permission denied: cannot change email directly.';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Permission denied: cannot change account status directly.';
    END IF;
    IF NEW.wp_user_id IS DISTINCT FROM OLD.wp_user_id THEN
      RAISE EXCEPTION 'Permission denied: cannot change WordPress user ID directly.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_registered_trainer_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_trainer_id UUID;
BEGIN
  IF NEW.role::text <> 'trainer' THEN
    RETURN NEW;
  END IF;
  v_trainer_id := public.registered_trainer_for_account(NEW.id, NEW.email);
  IF v_trainer_id IS NOT NULL THEN
    UPDATE public.ecp_trainers
    SET user_id = NEW.id, updated_at = NOW()
    WHERE id = v_trainer_id
      AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.link_registered_trainer_profile() FROM PUBLIC;
DROP TRIGGER IF EXISTS users_link_registered_trainer ON public.users;
CREATE TRIGGER users_link_registered_trainer
AFTER INSERT OR UPDATE OF role, email ON public.users
FOR EACH ROW EXECUTE FUNCTION public.link_registered_trainer_profile();

CREATE OR REPLACE FUNCTION public.bind_existing_registered_trainer_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_trainer_id UUID;
BEGIN
  IF NEW.is_active IS NOT TRUE OR NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT u.* INTO v_user
  FROM public.users u
  JOIN auth.users au ON au.id = u.id
  WHERE lower(btrim(u.email)) = lower(btrim(NEW.email))
    AND lower(btrim(au.email)) = lower(btrim(NEW.email))
  LIMIT 1;

  IF v_user.id IS NULL OR v_user.role::text NOT IN ('individual', 'trainer') THEN
    RETURN NEW;
  END IF;
  v_trainer_id := public.registered_trainer_for_account(v_user.id, v_user.email);
  IF v_trainer_id IS DISTINCT FROM NEW.id THEN
    RETURN NEW;
  END IF;

  -- The guarded update also handles an existing candidate being registered
  -- by an authenticated ECP partner, without changing any protected fields.
  IF v_user.role::text = 'individual' THEN
    UPDATE public.users
    SET role = 'trainer'::public.user_role, updated_at = NOW()
    WHERE id = v_user.id AND role::text = 'individual';
  END IF;

  -- Already-trainer profiles do not need an unnecessary role update.
  UPDATE public.ecp_trainers
  SET user_id = v_user.id, updated_at = NOW()
  WHERE id = NEW.id AND user_id IS NULL;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.bind_existing_registered_trainer_account() FROM PUBLIC;
DROP TRIGGER IF EXISTS ecp_trainers_bind_existing_account ON public.ecp_trainers;
CREATE TRIGGER ecp_trainers_bind_existing_account
AFTER INSERT OR UPDATE OF email, status, is_active, user_id ON public.ecp_trainers
FOR EACH ROW EXECUTE FUNCTION public.bind_existing_registered_trainer_account();

COMMENT ON FUNCTION public.registered_trainer_for_account(UUID, TEXT) IS
  'Authoritative canonical Auth-email lookup for a unique active approved ECP trainer registration; excludes every partner principal.';
COMMENT ON TRIGGER aa_users_registered_trainer_role ON public.users IS
  'A registered trainer remains a trainer regardless of invitation, signup, password recovery or profile-completion path.';
