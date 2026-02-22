-- Migration: Fix Membership ID Format
-- Date: 2026-01-03
-- Description: Updates the membership ID format to BDA-PM-YYYYNNNNN (e.g., BDA-PM-202510016)

-- =============================================================================
-- UPDATE: generate_membership_id function
-- New format: BDA-PM-YYYYNNNNN (e.g., BDA-PM-202510016)
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_membership_id()
RETURNS TEXT AS $$
DECLARE
    year_text TEXT;
    sequence_num INTEGER;
    membership_code TEXT;
BEGIN
    -- Get current year (full 4 digits)
    year_text := TO_CHAR(NOW(), 'YYYY');

    -- Get next sequence number for this year
    -- Count existing memberships with this year prefix + 10000 base
    SELECT COALESCE(
        MAX(
            CAST(
                NULLIF(REGEXP_REPLACE(membership_id, '^BDA-PM-' || year_text, ''), '')
                AS INTEGER
            )
        ),
        10000
    ) + 1
    INTO sequence_num
    FROM public.user_memberships
    WHERE membership_id LIKE 'BDA-PM-' || year_text || '%';

    -- Format: BDA-PM-YYYYNNNNN (e.g., BDA-PM-202610001)
    membership_code := 'BDA-PM-' || year_text || sequence_num::TEXT;

    -- Ensure uniqueness (fallback)
    WHILE EXISTS (SELECT 1 FROM public.user_memberships WHERE membership_id = membership_code) LOOP
        sequence_num := sequence_num + 1;
        membership_code := 'BDA-PM-' || year_text || sequence_num::TEXT;
    END LOOP;

    RETURN membership_code;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- UPDATE: Comment on membership_id column
-- =============================================================================

COMMENT ON COLUMN public.user_memberships.membership_id IS 'Unique membership ID (e.g., BDA-PM-202510016)';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT '✅ Membership ID format fixed to BDA-PM-YYYYNNNNN' as status;
