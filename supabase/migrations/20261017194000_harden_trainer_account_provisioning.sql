-- Harden the ECP trainer account lifecycle.
--
-- Invariants introduced here:
--   * An ECP/PDP partner principal may never be used as a trainer account.
--   * A trainer account may be linked to one trainer register record only.
--   * Invite acceptance is bound to the authenticated user and one usable token.
--   * Existing historical records are retained and are not rewritten by this migration.

-- The invitation fields existed in production before they were represented in
-- source control. Keep the migration safe for fresh/staging projects as well.
ALTER TABLE public.ecp_trainers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_status TEXT NOT NULL DEFAULT 'not_invited',
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.trainer_invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.ecp_trainers(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ecp_trainers_one_account_per_trainer
  ON public.ecp_trainers (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trainer_invite_tokens_usable
  ON public.trainer_invite_tokens (trainer_id, expires_at)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ecp_trainers_email_normalized
  ON public.ecp_trainers (lower(btrim(email)));

-- Server-side and SECURITY DEFINER callers use the token through the acceptance
-- function. Browser clients never need direct access to an invitation token.
ALTER TABLE public.trainer_invite_tokens ENABLE ROW LEVEL SECURITY;

-- Treat both the account role and a partner/licence record as a partner
-- principal. This protects against legacy rows where one representation drifted.
CREATE OR REPLACE FUNCTION public.is_partner_principal(
  p_user_id UUID,
  p_email TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE (
        (p_user_id IS NOT NULL AND u.id = p_user_id)
        OR (p_email IS NOT NULL AND lower(btrim(u.email)) = lower(btrim(p_email)))
      )
      AND (
        u.role::text IN ('ecp', 'pdp', 'dual_partner', 'ecp_partner', 'pdp_partner')
        OR EXISTS (
          SELECT 1
          FROM public.partners p
          WHERE p.id = u.id
            AND p.partner_type IN ('ecp', 'pdp', 'dual_partner')
        )
        OR EXISTS (SELECT 1 FROM public.ecp_licenses el WHERE el.partner_id = u.id)
        OR EXISTS (SELECT 1 FROM public.pdp_licenses pl WHERE pl.partner_id = u.id)
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.partners p
    WHERE p_email IS NOT NULL
      AND lower(btrim(p.contact_email)) = lower(btrim(p_email))
      AND p.partner_type IN ('ecp', 'pdp', 'dual_partner')
  );
$$;

REVOKE ALL ON FUNCTION public.is_partner_principal(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_partner_principal(UUID, TEXT) TO service_role;

-- Prevent a newly entered trainer email (or an email change) from colliding
-- with a partner account. Unrelated updates of a historical conflicting row are
-- deliberately allowed, so this migration does not invalidate legacy data.
CREATE OR REPLACE FUNCTION public.reject_ecp_trainer_partner_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.email := lower(btrim(NEW.email));

  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND lower(btrim(OLD.email)) IS NOT DISTINCT FROM NEW.email THEN
    RETURN NEW;
  END IF;

  IF public.is_partner_principal(NULL, NEW.email) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'A trainer cannot use an ECP or PDP partner account email',
      DETAIL = 'Use a separate individual trainer email address.',
      HINT = 'A partner account and a trainer account must remain separate.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_ecp_trainer_partner_email() FROM PUBLIC;

DROP TRIGGER IF EXISTS ecp_trainers_reject_partner_email ON public.ecp_trainers;
CREATE TRIGGER ecp_trainers_reject_partner_email
BEFORE INSERT OR UPDATE OF email ON public.ecp_trainers
FOR EACH ROW
EXECUTE FUNCTION public.reject_ecp_trainer_partner_email();

-- Prevent the reverse future error: turning a trainer-email account into a
-- partner account. Existing rows are untouched unless their role or email is
-- actually changed.
CREATE OR REPLACE FUNCTION public.reject_partner_role_with_trainer_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.role IS NOT DISTINCT FROM OLD.role
     AND lower(btrim(NEW.email)) IS NOT DISTINCT FROM lower(btrim(OLD.email)) THEN
    RETURN NEW;
  END IF;

  IF NEW.role::text IN ('ecp', 'pdp', 'dual_partner', 'ecp_partner', 'pdp_partner')
     AND EXISTS (
       SELECT 1
       FROM public.ecp_trainers et
       WHERE lower(btrim(et.email)) = lower(btrim(NEW.email))
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'A trainer email cannot be converted into a partner account',
      DETAIL = 'Resolve the trainer and partner email collision first.',
      HINT = 'Use separate accounts for partner administration and trainer access.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_partner_role_with_trainer_email() FROM PUBLIC;

DROP TRIGGER IF EXISTS users_reject_partner_role_with_trainer_email ON public.users;
CREATE TRIGGER users_reject_partner_role_with_trainer_email
BEFORE INSERT OR UPDATE OF role, email ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.reject_partner_role_with_trainer_email();

-- Keep the existing RPC signature for browser compatibility, but bind it to the
-- authenticated principal and lock the invitation before performing any change.
CREATE OR REPLACE FUNCTION public.accept_trainer_invite(
  p_token TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite public.trainer_invite_tokens%ROWTYPE;
  v_trainer public.ecp_trainers%ROWTYPE;
  v_user_email TEXT;
  v_user_role TEXT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation must be accepted by the authenticated account'
    );
  END IF;

  SELECT * INTO v_invite
  FROM public.trainer_invite_tokens
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > NOW()
  FOR UPDATE;

  IF v_invite.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite token');
  END IF;

  SELECT * INTO v_trainer
  FROM public.ecp_trainers
  WHERE id = v_invite.trainer_id
  FOR UPDATE;

  IF v_trainer.id IS NULL
     OR v_trainer.partner_id IS DISTINCT FROM v_invite.partner_id
     OR lower(btrim(v_trainer.email)) IS DISTINCT FROM lower(btrim(v_invite.email))
     OR v_trainer.is_active IS NOT TRUE
     OR v_trainer.status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This trainer invitation is no longer eligible for activation');
  END IF;

  SELECT lower(btrim(u.email)), u.role::text
  INTO v_user_email, v_user_role
  FROM public.users u
  WHERE u.id = p_user_id
  FOR UPDATE;

  IF v_user_email IS NULL OR v_user_email IS DISTINCT FROM lower(btrim(v_invite.email)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation must be activated using the invited email address');
  END IF;

  IF public.is_partner_principal(p_user_id, v_user_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A partner account cannot be activated as a trainer. Use a separate individual trainer account.'
    );
  END IF;

  IF v_user_role NOT IN ('individual', 'trainer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'The invitation requires an individual trainer account');
  END IF;

  IF v_trainer.user_id IS NOT NULL AND v_trainer.user_id IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'This trainer record is already linked to another account');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.ecp_trainers other
    WHERE other.user_id = p_user_id
      AND other.id <> v_trainer.id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This account is already linked to a different trainer record');
  END IF;

  UPDATE public.users
  SET role = 'trainer'::public.user_role,
      updated_at = NOW()
  WHERE id = p_user_id;

  UPDATE public.ecp_trainers
  SET user_id = p_user_id,
      invite_status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = v_trainer.id;

  -- A later invite invalidates earlier ones; after acceptance every remaining
  -- unused token for this trainer becomes unusable in the same transaction.
  UPDATE public.trainer_invite_tokens
  SET used_at = NOW()
  WHERE trainer_id = v_trainer.id
    AND used_at IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'trainer_id', v_trainer.id,
    'partner_id', v_trainer.partner_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_trainer_invite(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_trainer_invite(TEXT, UUID) TO authenticated;
