-- Migration: Add certificate generation request system
-- Date: 2026-01-03
-- Description: Allows requesting certificate PDF generation on-the-fly

-- Add generation status column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_certifications' AND column_name = 'certificate_generation_status'
  ) THEN
    ALTER TABLE user_certifications
    ADD COLUMN certificate_generation_status TEXT DEFAULT 'pending'
    CHECK (certificate_generation_status IN ('pending', 'generating', 'completed', 'failed'));
  END IF;
END $$;

-- Function to request certificate generation
CREATE OR REPLACE FUNCTION request_certificate_generation(p_credential_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cert RECORD;
  v_result JSON;
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

  -- If already has URL, return it
  IF v_cert.certificate_url IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'status', 'ready',
      'certificate_url', v_cert.certificate_url
    );
  END IF;

  -- If already generating, return status
  IF v_cert.certificate_generation_status = 'generating' THEN
    RETURN json_build_object(
      'success', true,
      'status', 'generating',
      'message', 'Certificate is being generated. Please wait...'
    );
  END IF;

  -- Mark as needing generation
  UPDATE user_certifications
  SET certificate_generation_status = 'pending',
      updated_at = NOW()
  WHERE id = v_cert.id;

  RETURN json_build_object(
    'success', true,
    'status', 'queued',
    'message', 'Certificate generation requested. Please check back shortly.'
  );
END;
$$;

-- Function to get certificates pending generation
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
  WHERE uc.certificate_url IS NULL
    AND uc.status = 'active'
    AND (uc.certificate_generation_status IS NULL OR uc.certificate_generation_status IN ('pending', 'failed'))
  ORDER BY uc.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to mark certificate as generating
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
    AND certificate_url IS NULL;

  RETURN FOUND;
END;
$$;

-- Function to mark certificate generation complete
CREATE OR REPLACE FUNCTION mark_certificate_generated(
  p_credential_id TEXT,
  p_certificate_url TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_certifications
  SET certificate_url = p_certificate_url,
      certificate_generation_status = 'completed',
      updated_at = NOW()
  WHERE credential_id = p_credential_id;

  RETURN FOUND;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION request_certificate_generation TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_certificate_generations TO service_role;
GRANT EXECUTE ON FUNCTION mark_certificate_generating TO service_role;
GRANT EXECUTE ON FUNCTION mark_certificate_generated TO service_role;

SELECT '✅ Certificate generation request system added' as status;
