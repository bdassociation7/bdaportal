-- =============================================================================
-- Update PDP Program ID Format
-- Changes from: PDP-{CountryCode}-{Year}-{Sequence} (e.g., PDP-XX-2025-0001)
-- Changes to: ID-{RandomAlphanumeric} (e.g., ID-A7X9B2K)
-- =============================================================================

-- Drop existing function versions
DROP FUNCTION IF EXISTS generate_pdp_program_id(UUID);
DROP FUNCTION IF EXISTS generate_pdp_program_id(UUID, VARCHAR);

-- Create new function with random alphanumeric ID generation
CREATE OR REPLACE FUNCTION generate_pdp_program_id(p_provider_id UUID DEFAULT NULL, p_country_code VARCHAR DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluded 0,O,1,I to avoid confusion
  v_result TEXT;
  v_exists BOOLEAN;
  v_attempts INTEGER := 0;
  v_max_attempts INTEGER := 100;
BEGIN
  -- Generate unique ID with format ID-XXXXXXX (7 random alphanumeric characters)
  LOOP
    v_attempts := v_attempts + 1;

    -- Generate random 7-character string
    v_result := 'ID-';
    FOR i IN 1..7 LOOP
      v_result := v_result || SUBSTR(v_chars, FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER, 1);
    END LOOP;

    -- Check if this ID already exists
    SELECT EXISTS(
      SELECT 1 FROM public.pdp_programs WHERE program_id = v_result
    ) INTO v_exists;

    -- Exit loop if unique or max attempts reached
    IF NOT v_exists OR v_attempts >= v_max_attempts THEN
      EXIT;
    END IF;
  END LOOP;

  -- If still not unique after max attempts, append timestamp
  IF v_exists THEN
    v_result := 'ID-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 7));
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_pdp_program_id(UUID, VARCHAR) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION generate_pdp_program_id(UUID, VARCHAR) IS
'Generates a unique program ID in format ID-XXXXXXX where X is an alphanumeric character.
The parameters are kept for backward compatibility but are no longer used.';
