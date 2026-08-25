-- ECP partner entitlements and order request identifiers.
-- ECP access is role-based and therefore ends automatically if the account is no longer an ECP.

CREATE OR REPLACE FUNCTION public.generate_voucher_request_number()
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  v_candidate VARCHAR(50);
BEGIN
  LOOP
    v_candidate := 'VQR-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.ecp_voucher_requests
      WHERE request_number = v_candidate
    );
  END LOOP;

  RETURN v_candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_learning_system_request_number()
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  v_candidate VARCHAR(50);
BEGIN
  LOOP
    v_candidate := 'LSR-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.ecp_learning_system_requests
      WHERE request_number = v_candidate
    );
  END LOOP;

  RETURN v_candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_learning_system_access(
  p_user_id UUID,
  p_language TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access public.user_curriculum_access%ROWTYPE;
  v_is_ecp BOOLEAN := false;
BEGIN
  SELECT role = 'ecp'
  INTO v_is_ecp
  FROM public.users
  WHERE id = p_user_id;

  IF COALESCE(v_is_ecp, false) THEN
    RETURN jsonb_build_object(
      'has_access', true,
      'language', upper(p_language),
      'includes_curriculum', true,
      'includes_question_bank', true,
      'includes_flashcards', true,
      'certification_type', 'CP',
      'ecp_access', true
    );
  END IF;

  SELECT * INTO v_access
  FROM public.user_curriculum_access
  WHERE user_id = p_user_id
    AND language = upper(p_language)
    AND is_active = true
    AND expires_at > NOW();

  IF v_access.id IS NULL THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'no_active_access'
    );
  END IF;

  RETURN jsonb_build_object(
    'has_access', true,
    'access_id', v_access.id,
    'language', v_access.language,
    'expires_at', v_access.expires_at,
    'includes_curriculum', COALESCE(v_access.includes_curriculum, true),
    'includes_question_bank', COALESCE(v_access.includes_question_bank, true),
    'includes_flashcards', COALESCE(v_access.includes_flashcards, true),
    'certification_type', 'CP'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_learning_system_accesses(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accesses JSONB;
  v_is_ecp BOOLEAN := false;
BEGIN
  SELECT role = 'ecp'
  INTO v_is_ecp
  FROM public.users
  WHERE id = p_user_id;

  IF COALESCE(v_is_ecp, false) THEN
    v_accesses := jsonb_build_array(
      jsonb_build_object(
        'id', 'ecp-en-' || p_user_id::text,
        'language', 'EN',
        'expires_at', NULL,
        'is_active', true,
        'includes_curriculum', true,
        'includes_question_bank', true,
        'includes_flashcards', true,
        'purchased_at', NULL,
        'certification_type', 'CP',
        'ecp_access', true
      ),
      jsonb_build_object(
        'id', 'ecp-ar-' || p_user_id::text,
        'language', 'AR',
        'expires_at', NULL,
        'is_active', true,
        'includes_curriculum', true,
        'includes_question_bank', true,
        'includes_flashcards', true,
        'purchased_at', NULL,
        'certification_type', 'CP',
        'ecp_access', true
      )
    );

    RETURN jsonb_build_object(
      'accesses', v_accesses,
      'has_en', true,
      'has_ar', true,
      'ecp_access', true
    );
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'language', language,
      'expires_at', expires_at,
      'is_active', is_active AND expires_at > NOW(),
      'includes_curriculum', COALESCE(includes_curriculum, true),
      'includes_question_bank', COALESCE(includes_question_bank, true),
      'includes_flashcards', COALESCE(includes_flashcards, true),
      'purchased_at', purchased_at,
      'certification_type', 'CP'
    )
  )
  INTO v_accesses
  FROM public.user_curriculum_access
  WHERE user_id = p_user_id
    AND is_active = true
    AND expires_at > NOW();

  IF v_accesses IS NULL THEN
    v_accesses := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'accesses', v_accesses,
    'has_en', EXISTS (
      SELECT 1
      FROM public.user_curriculum_access
      WHERE user_id = p_user_id
        AND language = 'EN'
        AND is_active = true
        AND expires_at > NOW()
    ),
    'has_ar', EXISTS (
      SELECT 1
      FROM public.user_curriculum_access
      WHERE user_id = p_user_id
        AND language = 'AR'
        AND is_active = true
        AND expires_at > NOW()
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_learning_system_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_learning_system_accesses(UUID) TO authenticated;
