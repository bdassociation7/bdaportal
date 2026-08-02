-- Migration: Add Professional Development path for Recertification
-- Adds submission_path column to pdc_entries to distinguish between:
-- 1. 'pdp_partner' - BDA Authorized PDP Partner (requires program_id, auto-approved if valid)
-- 2. 'professional_development' - General Continuing Education (auto-approved on submission)

-- Step 1: Add submission_path column
ALTER TABLE public.pdc_entries
ADD COLUMN IF NOT EXISTS submission_path TEXT NOT NULL DEFAULT 'pdp_partner'
CHECK (submission_path IN ('pdp_partner', 'professional_development'));

-- Step 2: Update existing entries to have correct path
UPDATE public.pdc_entries
SET submission_path = CASE
  WHEN program_id IS NOT NULL AND program_id != '' THEN 'pdp_partner'
  ELSE 'professional_development'
END;

-- Step 3: Replace submit_pdc_with_auto_approve to support both paths
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
    p_notes TEXT,
    p_submission_path TEXT DEFAULT 'pdp_partner'
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
    v_path TEXT;
BEGIN
    -- Normalize submission path
    v_path := COALESCE(p_submission_path, 'pdp_partner');

    -- Check for duplicate program ID (only for PDP partner path)
    IF v_path = 'pdp_partner' AND p_program_id IS NOT NULL AND p_program_id != '' THEN
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

    -- Determine auto-approve and final credits based on submission path
    IF v_path = 'pdp_partner' THEN
        -- PDP Partner path: validate program_id
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
            -- PDP path but no program_id → pending review
            v_final_credits := p_credits_claimed;
            v_auto_approve := false;
        END IF;
    ELSIF v_path = 'professional_development' THEN
        -- Professional Development path: auto-approve immediately
        -- User provides their own credits (hours/PDCs)
        v_final_credits := p_credits_claimed;
        v_auto_approve := true;
        v_program_name := NULL;
    ELSE
        v_final_credits := p_credits_claimed;
        v_auto_approve := false;
    END IF;

    -- Calculate credit split between current cycle and carry-over
    IF v_remaining_capacity >= v_final_credits THEN
        v_credits_to_apply := v_final_credits;
        v_credits_to_reserve := 0;
    ELSE
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
        reviewed_at,
        submission_path
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
        CASE WHEN v_path = 'pdp_partner' THEN p_program_id ELSE NULL END,
        p_notes,
        CASE WHEN v_auto_approve THEN 'approved' ELSE 'pending' END,
        CASE WHEN v_auto_approve THEN NOW() ELSE NULL END,
        v_path
    )
    RETURNING id INTO v_entry_id;

    -- Build message
    DECLARE
        v_message TEXT;
    BEGIN
        IF v_auto_approve THEN
            IF v_credits_to_reserve > 0 THEN
                v_message := format(
                    'PDC entry auto-approved! %s credits applied to current cycle. %s credits reserved for next recertification cycle.',
                    v_credits_to_apply,
                    v_credits_to_reserve
                );
            ELSE
                v_message := CASE
                    WHEN v_path = 'professional_development'
                    THEN 'Professional Development activity recorded and credits approved automatically.'
                    ELSE 'PDC entry auto-approved! All credits applied to current recertification cycle.'
                END;
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

-- Step 4: Grant execute permission
GRANT EXECUTE ON FUNCTION public.submit_pdc_with_auto_approve TO authenticated;
