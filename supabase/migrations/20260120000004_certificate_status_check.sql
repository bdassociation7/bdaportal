-- Migration: Add certificate status check function
-- Date: 2026-01-20
-- Description: Function to check certificate generation status for polling

CREATE OR REPLACE FUNCTION get_certificate_status(p_credential_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cert RECORD;
BEGIN
  SELECT
    credential_id,
    certificate_url,
    certificate_generation_status
  INTO v_cert
  FROM user_certifications
  WHERE credential_id = p_credential_id;

  IF v_cert.credential_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status', 'not_found',
      'error', 'Certificate not found'
    );
  END IF;

  -- If completed and has URL
  IF v_cert.certificate_generation_status = 'completed' AND v_cert.certificate_url IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'status', 'completed',
      'certificate_url', v_cert.certificate_url
    );
  END IF;

  -- If failed
  IF v_cert.certificate_generation_status = 'failed' THEN
    RETURN json_build_object(
      'success', false,
      'status', 'failed',
      'error', 'Certificate generation failed. Please try again.'
    );
  END IF;

  -- Still generating or pending
  RETURN json_build_object(
    'success', true,
    'status', COALESCE(v_cert.certificate_generation_status, 'pending')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_certificate_status TO authenticated;

SELECT '✅ Certificate status check function added' as status;
