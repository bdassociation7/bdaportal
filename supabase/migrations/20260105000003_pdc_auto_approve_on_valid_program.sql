-- Migration: PDC Auto-Approve on Valid Program ID
-- Date: 2026-01-05
-- Description: Creates function to auto-approve PDC entries when valid Program ID is provided
--              Eliminates need for admin review when learner enters valid PDP Program ID

-- ============================================================================
-- 1. Create function to submit PDC with auto-approval
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
BEGIN
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.submit_pdc_with_auto_approve(
    UUID, certification_type, VARCHAR, pdc_activity_type, TEXT, TEXT, TEXT, INTEGER, DATE, TEXT, TEXT
) TO authenticated;

COMMENT ON FUNCTION public.submit_pdc_with_auto_approve IS
    'Submit PDC entry with automatic approval when valid Program ID is provided. Returns entry details and approval status.';

-- ============================================================================
-- 2. Create function to get program details for auto-fill
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_pdp_program_details(p_program_id VARCHAR(50))
RETURNS TABLE (
    is_valid BOOLEAN,
    program_id VARCHAR(50),
    program_name TEXT,
    program_name_ar TEXT,
    max_pdc_credits INTEGER,
    activity_type TEXT,
    provider_name TEXT,
    valid_until DATE,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (pp.is_active = true AND CURRENT_DATE BETWEEN pp.valid_from AND pp.valid_until) as is_valid,
        pp.program_id,
        pp.program_name,
        pp.program_name_ar,
        pp.max_pdc_credits,
        pp.activity_type::TEXT,
        pp.provider_name,
        pp.valid_until,
        CASE
            WHEN pp.program_id IS NULL THEN 'Program not found'
            WHEN pp.is_active = false THEN 'Program is inactive'
            WHEN CURRENT_DATE < pp.valid_from THEN 'Program has not started yet'
            WHEN CURRENT_DATE > pp.valid_until THEN 'Program validity has expired'
            ELSE 'Valid program'
        END as message
    FROM public.pdp_programs pp
    WHERE pp.program_id = p_program_id;

    -- Return not found result if no rows
    IF NOT FOUND THEN
        RETURN QUERY SELECT
            false::BOOLEAN,
            NULL::VARCHAR(50),
            NULL::TEXT,
            NULL::TEXT,
            NULL::INTEGER,
            NULL::TEXT,
            NULL::TEXT,
            NULL::DATE,
            'Program not found'::TEXT;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pdp_program_details(VARCHAR) TO authenticated;

COMMENT ON FUNCTION public.get_pdp_program_details IS
    'Get detailed information about a PDP program by ID. Used for auto-filling PDC submission forms.';

-- ============================================================================
-- 3. Success Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ PDC Auto-Approve functions created successfully';
    RAISE NOTICE '📝 submit_pdc_with_auto_approve() - Auto-approves when valid program ID is provided';
    RAISE NOTICE '📝 get_pdp_program_details() - Returns program details for form auto-fill';
END $$;
