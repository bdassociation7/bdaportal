-- Secure trainer invitation activation.
-- A valid invitation token may only be accepted by the authenticated user
-- whose portal email matches the invited trainer email.

CREATE OR REPLACE FUNCTION public.accept_trainer_invite(
  p_token TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.trainer_invite_tokens%ROWTYPE;
  v_user_email TEXT;
  v_partner_license public.ecp_licenses%ROWTYPE;
BEGIN
  SELECT * INTO v_invite
  FROM public.trainer_invite_tokens
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > NOW();

  IF v_invite.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite token');
  END IF;

  SELECT lower(email) INTO v_user_email
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL OR v_user_email <> lower(v_invite.email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation must be activated using the invited email address');
  END IF;

  UPDATE public.users
  SET role = 'trainer'::user_role,
      updated_at = NOW()
  WHERE id = p_user_id;

  UPDATE public.ecp_trainers
  SET user_id = p_user_id,
      invite_status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = v_invite.trainer_id;

  UPDATE public.trainer_invite_tokens
  SET used_at = NOW()
  WHERE id = v_invite.id;

  SELECT * INTO v_partner_license
  FROM public.ecp_licenses
  WHERE partner_id = v_invite.partner_id
    AND status = 'active'
  ORDER BY expiry_date DESC NULLS LAST
  LIMIT 1;

  PERFORM public.grant_ecp_partner_benefits(
    p_user_id,
    v_partner_license.expiry_date
  );

  RETURN jsonb_build_object(
    'success', true,
    'trainer_id', v_invite.trainer_id,
    'partner_id', v_invite.partner_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_trainer_invite(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_trainer_invite(TEXT, UUID) TO authenticated;
