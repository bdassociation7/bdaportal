-- Migration: Update certificate generation to always regenerate
-- Date: 2026-01-20
-- Description: Modifies request_certificate_generation to always queue for regeneration
--              instead of returning existing certificate URL

-- Update the function to always regenerate
CREATE OR REPLACE FUNCTION request_certificate_generation(p_credential_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cert RECORD;
BEGIN
  -- Get certification
  SELECT id, credential_id, certificate_url, certificate_generation_status
  INTO v_cert
  FROM user_certifications
  WHERE credential_id = p_credential_id;

  IF v_cert.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Certificate not found',
      'status', 'not_found'
    );
  END IF;

  -- If already generating, return status (prevent duplicate generation requests)
  IF v_cert.certificate_generation_status = 'generating' THEN
    RETURN json_build_object(
      'success', true,
      'status', 'generating',
      'message', 'Certificate is being generated. Please wait...'
    );
  END IF;

  -- Always queue for regeneration (clear existing URL and mark as pending)
  UPDATE user_certifications
  SET certificate_url = NULL,
      certificate_generation_status = 'pending',
      updated_at = NOW()
  WHERE id = v_cert.id;

  RETURN json_build_object(
    'success', true,
    'status', 'queued',
    'message', 'Certificate generation requested. Please check back shortly.'
  );
END;
$$;

-- Also update get_pending_certificate_generations to include certificates
-- that have URL but are marked pending (for regeneration)
CREATE OR REPLACE FUNCTION get_pending_certificate_generations(p_limit INT DEFAULT 10)
RETURNS TABLE (
  credential_id TEXT,
  user_id UUID,
  certification_type TEXT,
  user_full_name TEXT,
  issued_date DATE,
  expiry_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.credential_id,
    uc.user_id,
    uc.certification_type::TEXT,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_full_name,
    uc.issued_date,
    uc.expiry_date
  FROM user_certifications uc
  JOIN users u ON u.id = uc.user_id
  WHERE uc.status = 'active'
    AND (uc.certificate_generation_status IS NULL OR uc.certificate_generation_status IN ('pending', 'failed'))
  ORDER BY uc.updated_at DESC
  LIMIT p_limit;
END;
$$;

-- Update mark_certificate_generating to work with regeneration
CREATE OR REPLACE FUNCTION mark_certificate_generating(p_credential_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_certifications
  SET certificate_generation_status = 'generating',
      updated_at = NOW()
  WHERE credential_id = p_credential_id
    AND certificate_generation_status IN ('pending', 'failed');

  RETURN FOUND;
END;
$$;

SELECT '✅ Certificate generation updated to always regenerate' as status;
