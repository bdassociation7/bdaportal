-- Migration: Prevent Duplicate Program ID Submissions
-- Date: 2026-01-06
-- Description: Adds unique constraint to prevent users from submitting the same Program ID multiple times
--              and getting re-credited. Users can only use each Program ID once for approved/pending entries.

-- ============================================================================
-- 1. Clean up existing duplicate entries
-- ============================================================================

-- Mark duplicate entries as rejected (keeping only the first approved/pending entry per user+program)
WITH duplicates AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, program_id
            ORDER BY
                CASE status
                    WHEN 'approved' THEN 1
                    WHEN 'pending' THEN 2
                    ELSE 3
                END,
                created_at ASC
        ) as rn
    FROM public.pdc_entries
    WHERE program_id IS NOT NULL
      AND status IN ('approved', 'pending')
)
UPDATE public.pdc_entries
SET
    status = 'rejected',
    rejection_reason = 'Duplicate submission - system cleanup for constraint enforcement',
    reviewed_at = NOW()
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- ============================================================================
-- 2. Add unique index to prevent duplicate submissions
-- ============================================================================

-- Create a partial unique index that prevents duplicate (user_id, program_id) combinations
-- for approved and pending entries. Rejected entries are excluded so users can resubmit.
CREATE UNIQUE INDEX idx_pdc_entries_user_program_unique
ON public.pdc_entries(user_id, program_id)
WHERE status IN ('approved', 'pending') AND program_id IS NOT NULL;

COMMENT ON INDEX idx_pdc_entries_user_program_unique IS
    'Ensures each user can only submit a specific Program ID once (for approved/pending entries). Rejected entries are excluded to allow resubmission.';

-- ============================================================================
-- 3. Update auto-approve function to check for duplicates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_pdc_with_auto_approve(
    p_user_id UUID,
    p_certification_type certification_type,
    p_program_id VARCHAR(50),
    p_activity_type pdc_activity_type,
    p_activity_title TEXT,
    p_activity_title_ar TEXT DEFAULT NULL,
    p_activity_description TEXT DEFAULT NULL,
    p_credits_claimed INTEGER DEFAULT NULL,
    p_activity_date DATE DEFAULT CURRENT_DATE,
    p_certificate_url TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    entry_id UUID,
    final_status TEXT,
    credits_approved INTEGER,
    auto_approved BOOLEAN,
    program_name TEXT,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_program RECORD;
    v_entry_id UUID;
    v_credits INTEGER;
    v_status pdc_status;
    v_auto_approved BOOLEAN := false;
    v_existing_entry RECORD;
BEGIN
    -- Check for duplicate Program ID submission
    IF p_program_id IS NOT NULL AND p_program_id != '' THEN
        SELECT id, status, program_id
        INTO v_existing_entry
        FROM public.pdc_entries
        WHERE user_id = p_user_id
          AND program_id = p_program_id
          AND status IN ('approved', 'pending')
        LIMIT 1;

        IF v_existing_entry.id IS NOT NULL THEN
            -- User already has an approved or pending entry for this program
            RETURN QUERY SELECT
                v_existing_entry.id,
                'duplicate'::TEXT,
                NULL::INTEGER,
                false,
                NULL::TEXT,
                'You have already submitted this Program ID. Each program can only be used once for PDC credits.'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Validate program ID
    SELECT
        pp.program_id,
        pp.program_name,
        pp.max_pdc_credits,
        pp.is_active,
        (CURRENT_DATE BETWEEN pp.valid_from AND pp.valid_until) as is_valid_date
    INTO v_program
    FROM public.pdp_programs pp
    WHERE pp.program_id = p_program_id;

    -- Determine credits and status
    IF v_program.program_id IS NOT NULL
       AND v_program.is_active = true
       AND v_program.is_valid_date = true THEN
        -- Valid program: auto-approve with program's max credits
        v_credits := COALESCE(p_credits_claimed, v_program.max_pdc_credits);
        -- Ensure credits don't exceed program maximum
        IF v_credits > v_program.max_pdc_credits THEN
            v_credits := v_program.max_pdc_credits;
        END IF;
        v_status := 'approved';
        v_auto_approved := true;
    ELSE
        -- Invalid or no program: pending review
        v_credits := COALESCE(p_credits_claimed, 1);
        v_status := 'pending';
        v_auto_approved := false;
    END IF;

    -- Insert PDC entry
    INSERT INTO public.pdc_entries (
        user_id,
        certification_type,
        program_id,
        activity_type,
        activity_title,
        activity_title_ar,
        activity_description,
        credits_claimed,
        credits_approved,
        activity_date,
        certificate_url,
        notes,
        status,
        reviewed_by,
        reviewed_at
    ) VALUES (
        p_user_id,
        p_certification_type,
        p_program_id,
        p_activity_type,
        p_activity_title,
        p_activity_title_ar,
        p_activity_description,
        v_credits,
        CASE WHEN v_auto_approved THEN v_credits ELSE NULL END,
        p_activity_date,
        p_certificate_url,
        p_notes,
        v_status,
        CASE WHEN v_auto_approved THEN p_user_id ELSE NULL END, -- Self-approved
        CASE WHEN v_auto_approved THEN NOW() ELSE NULL END
    )
    RETURNING id INTO v_entry_id;

    -- Return result
    RETURN QUERY SELECT
        v_entry_id,
        v_status::TEXT,
        CASE WHEN v_auto_approved THEN v_credits ELSE NULL::INTEGER END,
        v_auto_approved,
        v_program.program_name,
        CASE
            WHEN v_auto_approved THEN 'PDC entry auto-approved based on valid Program ID'
            WHEN v_program.program_id IS NULL THEN 'Program ID not found - entry pending admin review'
            WHEN v_program.is_active = false THEN 'Program is inactive - entry pending admin review'
            WHEN v_program.is_valid_date = false THEN 'Program validity period expired - entry pending admin review'
            ELSE 'Entry pending admin review'
        END;
END;
$$;

COMMENT ON FUNCTION public.submit_pdc_with_auto_approve IS
    'Submit PDC entry with automatic approval when valid Program ID is provided. Prevents duplicate Program ID submissions per user.';

-- ============================================================================
-- 4. Create helper function to check if program was already used
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_program_already_used(
    p_user_id UUID,
    p_program_id VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.pdc_entries
        WHERE user_id = p_user_id
          AND program_id = p_program_id
          AND status IN ('approved', 'pending')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_program_already_used(UUID, VARCHAR) TO authenticated;

COMMENT ON FUNCTION public.check_program_already_used IS
    'Check if a user has already used a specific Program ID for approved or pending PDC entries.';

-- ============================================================================
-- 5. Success Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Duplicate Program ID prevention implemented successfully';
    RAISE NOTICE '📝 Unique constraint: idx_pdc_entries_user_program_unique';
    RAISE NOTICE '📝 Updated function: submit_pdc_with_auto_approve()';
    RAISE NOTICE '📝 New function: check_program_already_used()';
    RAISE NOTICE '';
    RAISE NOTICE 'Users can now only submit each Program ID once for PDC credits.';
END $$;
