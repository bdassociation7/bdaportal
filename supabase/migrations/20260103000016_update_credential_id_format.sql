-- Migration: Update credential ID format
-- Date: 2026-01-03
-- Description: Change credential ID format from CP-202X-XXXX to BDA-CP-202X-XXXXXX
--              New format: BDA-{LEVEL}-{YEAR}-{RANDOM_6_CHARS}
--              Examples: BDA-CP-2026-A7K2M9, BDA-SCP-2026-B3X8P1

-- Helper function to generate random alphanumeric string
CREATE OR REPLACE FUNCTION generate_random_credential_suffix(length INTEGER DEFAULT 6)
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes confusing chars: I, O, 0, 1
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update the main credential ID generation function
CREATE OR REPLACE FUNCTION generate_credential_id(cert_type certification_type)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    year TEXT;
    random_suffix TEXT;
    credential TEXT;
    max_attempts INTEGER := 100;
    attempt INTEGER := 0;
BEGIN
    -- Get prefix based on type (now includes BDA-)
    prefix := CASE
        WHEN cert_type = 'CP' THEN 'BDA-CP'
        WHEN cert_type = 'SCP' THEN 'BDA-SCP'
        ELSE 'BDA-CERT'
    END;

    -- Get current year
    year := TO_CHAR(NOW(), 'YYYY');

    -- Generate unique credential ID with random suffix
    LOOP
        attempt := attempt + 1;

        -- Generate random 6-character alphanumeric suffix
        random_suffix := generate_random_credential_suffix(6);

        -- Format: BDA-CP-2026-A7K2M9
        credential := prefix || '-' || year || '-' || random_suffix;

        -- Check uniqueness
        IF NOT EXISTS (
            SELECT 1 FROM public.user_certifications WHERE credential_id = credential
        ) THEN
            EXIT; -- Unique ID found
        END IF;

        -- Safety check to prevent infinite loop
        IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique credential ID after % attempts', max_attempts;
        END IF;
    END LOOP;

    RETURN credential;
END;
$$ LANGUAGE plpgsql;

-- Update comments
COMMENT ON FUNCTION generate_credential_id IS 'Generates unique credential ID in format BDA-{LEVEL}-{YEAR}-{RANDOM}. Examples: BDA-CP-2026-A7K2M9, BDA-SCP-2026-B3X8P1';
COMMENT ON FUNCTION generate_random_credential_suffix IS 'Generates random alphanumeric string for credential IDs, excluding confusing characters (I, O, 0, 1)';

-- Update table comment
COMMENT ON COLUMN public.user_certifications.credential_id IS 'Unique credential ID (e.g., BDA-CP-2026-A7K2M9, BDA-SCP-2026-B3X8P1)';

SELECT '✅ Credential ID format updated to BDA-{LEVEL}-{YEAR}-{RANDOM_6_CHARS}' as status;
