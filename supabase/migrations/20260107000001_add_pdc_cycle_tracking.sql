-- Migration: Add PDC Recertification Cycle Tracking and Carry-Over Logic
-- Description: Implements proper cycle management with 60-PDC limit and carry-over to next cycle

-- Step 1: Add cycle tracking fields to pdc_entries
ALTER TABLE public.pdc_entries
ADD COLUMN IF NOT EXISTS certification_id UUID REFERENCES public.user_certifications(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS credits_applied_current INTEGER DEFAULT 0 CHECK (credits_applied_current >= 0),
ADD COLUMN IF NOT EXISTS credits_reserved_next INTEGER DEFAULT 0 CHECK (credits_reserved_next >= 0);

-- Step 2: Add comments to explain the new fields
COMMENT ON COLUMN public.pdc_entries.certification_id IS 'Links PDC to specific certification period/cycle';
COMMENT ON COLUMN public.pdc_entries.credits_applied_current IS 'Credits applied to current recertification cycle (max 60 total per cycle)';
COMMENT ON COLUMN public.pdc_entries.credits_reserved_next IS 'Credits reserved/carried over to next recertification cycle';

-- Step 3: Backfill existing PDC entries with certification_id and credits_applied_current
-- Match PDCs to user's certification based on submission date and cert validity period
UPDATE public.pdc_entries pe
SET
    certification_id = (
        SELECT uc.id
        FROM public.user_certifications uc
        WHERE uc.user_id = pe.user_id
        AND uc.certification_type = pe.certification_type
        AND pe.created_at >= uc.issued_date
        AND pe.created_at <= uc.expiry_date
        AND uc.status = 'active'
        ORDER BY uc.issued_date DESC
        LIMIT 1
    ),
    credits_applied_current = CASE
        WHEN pe.status = 'approved' THEN COALESCE(pe.credits_approved, 0)
        ELSE 0
    END,
    credits_reserved_next = 0
WHERE pe.certification_id IS NULL;

-- Step 4: Create function to calculate current cycle PDC totals for a certification
CREATE OR REPLACE FUNCTION public.get_cycle_pdc_totals(p_certification_id UUID)
RETURNS TABLE (
    current_cycle_credits INTEGER,
    reserved_next_cycle_credits INTEGER,
    total_entries INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(credits_applied_current), 0)::INTEGER AS current_cycle_credits,
        COALESCE(SUM(credits_reserved_next), 0)::INTEGER AS reserved_next_cycle_credits,
        COUNT(*)::INTEGER AS total_entries
    FROM public.pdc_entries
    WHERE certification_id = p_certification_id
    AND status = 'approved';
END;
$$;

-- Step 5: Create function to apply carry-over credits when certification renews
CREATE OR REPLACE FUNCTION public.apply_pdc_carry_over(
    p_old_certification_id UUID,
    p_new_certification_id UUID
)
RETURNS TABLE (
    credits_transferred INTEGER,
    entries_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_total_reserved INTEGER;
    v_entry_record RECORD;
BEGIN
    -- Get user_id from old certification
    SELECT user_id INTO v_user_id
    FROM public.user_certifications
    WHERE id = p_old_certification_id;

    -- Calculate total reserved credits
    SELECT COALESCE(SUM(credits_reserved_next), 0) INTO v_total_reserved
    FROM public.pdc_entries
    WHERE certification_id = p_old_certification_id
    AND status = 'approved';

    -- If there are reserved credits, create carry-over entries for new certification
    IF v_total_reserved > 0 THEN
        -- Create a single consolidated carry-over entry
        INSERT INTO public.pdc_entries (
            user_id,
            certification_type,
            certification_id,
            activity_type,
            activity_title,
            activity_title_ar,
            activity_description,
            credits_claimed,
            credits_approved,
            credits_applied_current,
            credits_reserved_next,
            activity_date,
            status,
            reviewed_at,
            created_at,
            updated_at
        )
        SELECT
            v_user_id,
            uc.certification_type,
            p_new_certification_id,
            'other'::public.pdc_activity_type,
            'Carry-over from previous recertification cycle',
            'ترحيل من دورة إعادة الاعتماد السابقة',
            'Credits carried over from previous certification period (exceeded 60-credit limit)',
            v_total_reserved,
            v_total_reserved,
            v_total_reserved, -- All carried-over credits become current in new cycle
            0, -- No further carry-over
            CURRENT_DATE,
            'approved',
            NOW(),
            NOW(),
            NOW()
        FROM public.user_certifications uc
        WHERE uc.id = p_new_certification_id;

        RETURN QUERY SELECT v_total_reserved, 1::INTEGER;
    ELSE
        RETURN QUERY SELECT 0::INTEGER, 0::INTEGER;
    END IF;
END;
$$;

-- Step 6: Update the submit_pdc_with_auto_approve function to handle cycle limits and carry-over
CREATE OR REPLACE FUNCTION public.submit_pdc_with_auto_approve(
    p_user_id UUID,
    p_certification_type public.certification_type,
    p_activity_type public.pdc_activity_type,
    p_activity_title VARCHAR(255),
    p_activity_title_ar VARCHAR(255),
    p_activity_description TEXT,
    p_credits_claimed INTEGER,
    p_activity_date DATE,
    p_certificate_url TEXT,
    p_program_id VARCHAR(50),
    p_notes TEXT
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
AS $$
DECLARE
    v_entry_id UUID;
    v_is_valid BOOLEAN;
    v_program_name TEXT;
    v_max_credits INTEGER;
    v_auto_approve BOOLEAN := false;
    v_final_credits INTEGER;
    v_existing_entry RECORD;
    v_certification_id UUID;
    v_current_cycle_total INTEGER;
    v_remaining_capacity INTEGER;
    v_credits_to_apply INTEGER;
    v_credits_to_reserve INTEGER;
BEGIN
    -- Check for duplicate program ID
    IF p_program_id IS NOT NULL AND p_program_id != '' THEN
        SELECT id, status, program_id INTO v_existing_entry
        FROM public.pdc_entries
        WHERE user_id = p_user_id
        AND program_id = p_program_id
        AND status IN ('approved', 'pending')
        LIMIT 1;

        IF v_existing_entry.id IS NOT NULL THEN
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

    -- Get user's active certification for this type
    SELECT id INTO v_certification_id
    FROM public.user_certifications
    WHERE user_id = p_user_id
    AND certification_type = p_certification_type::TEXT
    AND status = 'active'
    ORDER BY issued_date DESC
    LIMIT 1;

    IF v_certification_id IS NULL THEN
        RETURN QUERY SELECT
            NULL::UUID,
            'error'::TEXT,
            NULL::INTEGER,
            false,
            NULL::TEXT,
            'No active certification found for this type. PDC submission requires an active certification.'::TEXT;
        RETURN;
    END IF;

    -- Calculate current cycle totals (max 60 PDCs per cycle)
    SELECT current_cycle_credits INTO v_current_cycle_total
    FROM public.get_cycle_pdc_totals(v_certification_id);

    v_current_cycle_total := COALESCE(v_current_cycle_total, 0);
    v_remaining_capacity := GREATEST(60 - v_current_cycle_total, 0);

    -- Validate against PDP program if provided
    IF p_program_id IS NOT NULL AND p_program_id != '' THEN
        SELECT is_valid, program_name, max_pdc_credits
        INTO v_is_valid, v_program_name, v_max_credits
        FROM public.pdp_programs
        WHERE program_id = p_program_id
        AND status = 'approved';

        IF v_is_valid THEN
            v_final_credits := v_max_credits;
            v_auto_approve := true;
        ELSE
            v_final_credits := p_credits_claimed;
            v_auto_approve := false;
        END IF;
    ELSE
        v_final_credits := p_credits_claimed;
        v_auto_approve := false;
    END IF;

    -- Calculate credit split between current cycle and carry-over
    IF v_remaining_capacity >= v_final_credits THEN
        -- All credits fit in current cycle
        v_credits_to_apply := v_final_credits;
        v_credits_to_reserve := 0;
    ELSE
        -- Split credits: some for current cycle, rest carried over
        v_credits_to_apply := v_remaining_capacity;
        v_credits_to_reserve := v_final_credits - v_remaining_capacity;
    END IF;

    -- Insert PDC entry with cycle split
    INSERT INTO public.pdc_entries (
        user_id,
        certification_type,
        certification_id,
        activity_type,
        activity_title,
        activity_title_ar,
        activity_description,
        credits_claimed,
        credits_approved,
        credits_applied_current,
        credits_reserved_next,
        activity_date,
        certificate_url,
        program_id,
        notes,
        status,
        reviewed_at
    ) VALUES (
        p_user_id,
        p_certification_type,
        v_certification_id,
        p_activity_type,
        p_activity_title,
        p_activity_title_ar,
        p_activity_description,
        p_credits_claimed,
        CASE WHEN v_auto_approve THEN v_final_credits ELSE NULL END,
        CASE WHEN v_auto_approve THEN v_credits_to_apply ELSE 0 END,
        CASE WHEN v_auto_approve THEN v_credits_to_reserve ELSE 0 END,
        p_activity_date,
        p_certificate_url,
        p_program_id,
        p_notes,
        CASE WHEN v_auto_approve THEN 'approved' ELSE 'pending' END,
        CASE WHEN v_auto_approve THEN NOW() ELSE NULL END
    )
    RETURNING id INTO v_entry_id;

    -- Build appropriate message based on credit split
    DECLARE
        v_message TEXT;
    BEGIN
        IF v_auto_approve THEN
            IF v_credits_to_reserve > 0 THEN
                v_message := format(
                    'PDC entry auto-approved! %s credits applied to current cycle. %s credits reserved for next recertification cycle (you have reached the 60-credit limit).',
                    v_credits_to_apply,
                    v_credits_to_reserve
                );
            ELSE
                v_message := 'PDC entry auto-approved! All credits applied to current recertification cycle.';
            END IF;
        ELSE
            v_message := 'PDC entry submitted and is pending admin review.';
        END IF;

        RETURN QUERY SELECT
            v_entry_id,
            CASE WHEN v_auto_approve THEN 'approved' ELSE 'pending' END,
            CASE WHEN v_auto_approve THEN v_final_credits ELSE NULL END,
            v_auto_approve,
            v_program_name,
            v_message;
    END;
END;
$$;

-- Step 7: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_cycle_pdc_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_pdc_carry_over(UUID, UUID) TO authenticated;

-- Step 8: Create index for performance
CREATE INDEX IF NOT EXISTS idx_pdc_entries_certification_id
ON public.pdc_entries(certification_id)
WHERE status = 'approved';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'PDC Recertification Cycle Tracking migration completed successfully';
    RAISE NOTICE '- Added certification_id, credits_applied_current, credits_reserved_next columns';
    RAISE NOTICE '- Created get_cycle_pdc_totals() function';
    RAISE NOTICE '- Created apply_pdc_carry_over() function';
    RAISE NOTICE '- Updated submit_pdc_with_auto_approve() to enforce 60-PDC cycle limit';
    RAISE NOTICE '- Backfilled existing entries with certification links';
END $$;
