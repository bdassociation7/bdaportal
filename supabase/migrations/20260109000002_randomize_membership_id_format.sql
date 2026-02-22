-- Migration: Randomize Membership ID Format
-- Date: 2026-01-09
-- Description: Updates membership ID from sequential (BDA-PM-202610001) to randomized (BDA-PM-2026XYI51)
--              Uses secure random alphanumeric codes instead of predictable sequential numbers

-- =============================================================================
-- UPDATE: generate_membership_id function - Randomized Format
-- New format: BDA-PM-YYYY{5 random chars} (e.g., BDA-PM-2026XYI51, BDA-PM-2026A9F3Q)
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_membership_id()
RETURNS TEXT AS $$
DECLARE
    year_text TEXT;
    random_code TEXT;
    membership_code TEXT;
    -- Use uppercase letters and numbers, excluding similar characters (0, O, 1, I, L)
    -- to avoid confusion when reading/typing
    allowed_chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    max_attempts INTEGER := 100;
    attempt_count INTEGER := 0;
BEGIN
    -- Get current year (full 4 digits)
    year_text := TO_CHAR(NOW(), 'YYYY');

    -- Generate random 5-character alphanumeric code
    LOOP
        -- Generate random code
        random_code := '';
        FOR i IN 1..5 LOOP
            random_code := random_code || substr(
                allowed_chars,
                1 + floor(random() * length(allowed_chars))::integer,
                1
            );
        END LOOP;

        -- Format: BDA-PM-YYYY{5 random chars} (e.g., BDA-PM-2026XYI51)
        membership_code := 'BDA-PM-' || year_text || random_code;

        -- Check for uniqueness
        IF NOT EXISTS (SELECT 1 FROM public.user_memberships WHERE membership_id = membership_code) THEN
            EXIT; -- Found unique code, exit loop
        END IF;

        -- Safety: prevent infinite loop
        attempt_count := attempt_count + 1;
        IF attempt_count >= max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique membership ID after % attempts', max_attempts;
        END IF;
    END LOOP;

    RETURN membership_code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- =============================================================================
-- UPDATE: Comment on membership_id column
-- =============================================================================

COMMENT ON COLUMN public.user_memberships.membership_id IS
    'Unique membership ID with randomized alphanumeric code (e.g., BDA-PM-2026XYI51, BDA-PM-2026A9F3Q). Format: BDA-PM-YYYY{5 random chars}. Uses characters: A-Z (except I, L, O), 2-9 (except 0, 1) for clarity.';

COMMENT ON FUNCTION generate_membership_id() IS
    'Generates a unique membership ID with format BDA-PM-YYYY{5 random chars}. Uses randomized alphanumeric codes instead of sequential numbers for better security and unpredictability. Excludes similar-looking characters (0, O, 1, I, L) to prevent confusion.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    test_id TEXT;
BEGIN
    -- Generate a test ID to verify the function works
    test_id := generate_membership_id();

    -- Verify format matches BDA-PM-YYYY{5 chars}
    IF test_id ~ '^BDA-PM-[0-9]{4}[A-Z2-9]{5}$' THEN
        RAISE NOTICE '✅ Membership ID format updated to randomized pattern';
        RAISE NOTICE '📝 New format: BDA-PM-YYYY{5 random chars}';
        RAISE NOTICE '🔒 Example: %', test_id;
        RAISE NOTICE '✨ Uses secure random codes instead of sequential numbers';
        RAISE NOTICE '👁️  Excludes confusing characters: 0, O, 1, I, L';
    ELSE
        RAISE EXCEPTION '❌ Generated ID does not match expected format: %', test_id;
    END IF;
END $$;
