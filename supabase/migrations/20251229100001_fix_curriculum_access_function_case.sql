-- Migration: Fix certification_type case in curriculum access functions
-- Date: 2025-12-29
-- Issue: certification_type enum is UPPERCASE (CP, SCP) but functions use LOWER()

-- Drop existing function
DROP FUNCTION IF EXISTS public.admin_grant_curriculum_access(TEXT, TEXT, TEXT, INTEGER);

-- Recreate with UPPER() for certification_type
CREATE OR REPLACE FUNCTION public.admin_grant_curriculum_access(
    p_user_email TEXT,
    p_certification_type TEXT,
    p_exam_language TEXT DEFAULT 'en',
    p_duration_months INTEGER DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_result JSONB;
    v_cert_type certification_type;
    v_exam_lang exam_language;
BEGIN
    -- Find user by email (case-insensitive)
    SELECT id INTO v_user_id
    FROM public.users
    WHERE LOWER(email) = LOWER(p_user_email);

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found with email: ' || p_user_email
        );
    END IF;

    -- Cast text to certification_type enum (UPPERCASE for CP/SCP)
    v_cert_type := UPPER(p_certification_type)::certification_type;

    -- Cast text to exam_language enum (lowercase for en/ar)
    v_exam_lang := LOWER(p_exam_language)::exam_language;

    -- Calculate expiry date
    v_expires_at := NOW() + (p_duration_months || ' months')::INTERVAL;

    -- Upsert the access record
    INSERT INTO public.user_curriculum_access (
        user_id,
        certification_type,
        exam_language,
        language,
        purchased_at,
        expires_at,
        is_active,
        last_checked_at,
        source,
        includes_question_bank,
        includes_flashcards,
        includes_curriculum
    ) VALUES (
        v_user_id,
        v_cert_type,
        v_exam_lang,
        UPPER(p_exam_language),
        NOW(),
        v_expires_at,
        TRUE,
        NOW(),
        'admin_grant',
        TRUE,
        TRUE,
        TRUE
    )
    ON CONFLICT (user_id, certification_type, exam_language)
    DO UPDATE SET
        expires_at = EXCLUDED.expires_at,
        is_active = TRUE,
        last_checked_at = NOW()
    RETURNING jsonb_build_object(
        'id', id,
        'user_id', user_id,
        'certification_type', certification_type,
        'exam_language', exam_language,
        'purchased_at', purchased_at,
        'expires_at', expires_at,
        'is_active', is_active
    ) INTO v_result;

    RETURN jsonb_build_object(
        'success', true,
        'access', v_result,
        'email', p_user_email
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_grant_curriculum_access TO authenticated;

-- Also fix auto_grant_curriculum_access function
DROP FUNCTION IF EXISTS public.auto_grant_curriculum_access(UUID, TEXT, INTEGER, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);

CREATE OR REPLACE FUNCTION public.auto_grant_curriculum_access(
    p_user_id UUID,
    p_certification_type TEXT,
    p_woocommerce_order_id INTEGER DEFAULT NULL,
    p_woocommerce_product_id INTEGER DEFAULT NULL,
    p_purchased_at TIMESTAMPTZ DEFAULT NOW(),
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_exam_language TEXT DEFAULT 'en'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expires_at TIMESTAMPTZ;
    v_result JSONB;
    v_cert_type certification_type;
    v_exam_lang exam_language;
BEGIN
    -- Cast text to certification_type enum (UPPERCASE for CP/SCP)
    v_cert_type := UPPER(p_certification_type)::certification_type;

    -- Cast text to exam_language enum (lowercase for en/ar)
    v_exam_lang := LOWER(p_exam_language)::exam_language;

    -- Calculate expiry date (1 year from purchase if not provided)
    v_expires_at := COALESCE(p_expires_at, p_purchased_at + INTERVAL '1 year');

    -- Upsert the access record
    INSERT INTO public.user_curriculum_access (
        user_id,
        certification_type,
        exam_language,
        language,
        woocommerce_order_id,
        woocommerce_product_id,
        purchased_at,
        expires_at,
        is_active,
        last_checked_at,
        source,
        includes_question_bank,
        includes_flashcards,
        includes_curriculum
    ) VALUES (
        p_user_id,
        v_cert_type,
        v_exam_lang,
        UPPER(p_exam_language),
        p_woocommerce_order_id,
        p_woocommerce_product_id,
        p_purchased_at,
        v_expires_at,
        TRUE,
        NOW(),
        'store_purchase',
        TRUE,
        TRUE,
        TRUE
    )
    ON CONFLICT (user_id, certification_type, exam_language)
    DO UPDATE SET
        woocommerce_order_id = COALESCE(EXCLUDED.woocommerce_order_id, user_curriculum_access.woocommerce_order_id),
        woocommerce_product_id = COALESCE(EXCLUDED.woocommerce_product_id, user_curriculum_access.woocommerce_product_id),
        purchased_at = EXCLUDED.purchased_at,
        expires_at = EXCLUDED.expires_at,
        is_active = TRUE,
        last_checked_at = NOW()
    RETURNING jsonb_build_object(
        'id', id,
        'user_id', user_id,
        'certification_type', certification_type,
        'exam_language', exam_language,
        'purchased_at', purchased_at,
        'expires_at', expires_at,
        'is_active', is_active
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.auto_grant_curriculum_access TO authenticated;
