-- Migration: Mock Exam Random Selection by Certification Type & Language
-- Date: 2026-02-04
-- Description: Adds certification_type and exam_language to mock_exam_products
--              Updates grant function to randomly select exams from filtered pool

-- =============================================================================
-- STEP 1: ADD COLUMNS TO mock_exam_products
-- =============================================================================

-- Add certification_type column
ALTER TABLE public.mock_exam_products
ADD COLUMN IF NOT EXISTS certification_type certification_type_enum;

-- Add exam_language column
ALTER TABLE public.mock_exam_products
ADD COLUMN IF NOT EXISTS exam_language exam_language;

-- Add selection_mode to control behavior
-- 'random' = system randomly selects from pool
-- 'user_picks' = user chooses (current behavior)
-- 'specific' = admin pre-defines specific exams
-- DEFAULT 'user_picks' to preserve existing behavior for products without cert_type/language
ALTER TABLE public.mock_exam_products
ADD COLUMN IF NOT EXISTS selection_mode TEXT NOT NULL DEFAULT 'user_picks'
CHECK (selection_mode IN ('random', 'user_picks', 'specific'));

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_mock_exam_products_cert_lang
ON public.mock_exam_products(certification_type, exam_language);

COMMENT ON COLUMN public.mock_exam_products.certification_type IS 'CP or SCP - filters which mock exams can be granted';
COMMENT ON COLUMN public.mock_exam_products.exam_language IS 'en or ar - filters which mock exams can be granted';
COMMENT ON COLUMN public.mock_exam_products.selection_mode IS 'random=system picks, user_picks=user chooses, specific=admin pre-defines';

-- =============================================================================
-- STEP 2: UPDATE grant_mock_exam_access() FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.grant_mock_exam_access(
    p_user_id UUID,
    p_woocommerce_order_id INTEGER,
    p_woocommerce_product_id INTEGER,
    p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    v_product RECORD;
    v_grant_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_total_exams INTEGER;
    v_granted_count INTEGER := 0;
    v_exam RECORD;
    v_existing_access_count INTEGER;
BEGIN
    -- 1. Find the mock exam product
    SELECT * INTO v_product
    FROM public.mock_exam_products
    WHERE woocommerce_product_id = p_woocommerce_product_id
    AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Mock exam product not found or inactive',
            'woocommerce_product_id', p_woocommerce_product_id
        );
    END IF;

    -- 2. Check idempotency - prevent duplicate grants for same order
    IF EXISTS (
        SELECT 1 FROM public.mock_exam_access_grants
        WHERE user_id = p_user_id
        AND woocommerce_order_id = p_woocommerce_order_id
        AND mock_exam_product_id = v_product.id
    ) THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Access already granted for this order',
            'duplicate', true
        );
    END IF;

    -- 3. Calculate expiration and total exams
    IF v_product.validity_months IS NOT NULL THEN
        v_expires_at := NOW() + (v_product.validity_months || ' months')::INTERVAL;
    ELSE
        v_expires_at := NULL; -- Lifetime access
    END IF;

    v_total_exams := p_quantity * v_product.exams_count;

    -- 4. Create the access grant record first
    INSERT INTO public.mock_exam_access_grants (
        user_id,
        mock_exam_product_id,
        woocommerce_order_id,
        exams_granted,
        exams_remaining,
        expires_at,
        status
    ) VALUES (
        p_user_id,
        v_product.id,
        p_woocommerce_order_id,
        0, -- Will update after granting
        0, -- Will update based on selection_mode
        v_expires_at,
        'active'
    )
    RETURNING id INTO v_grant_id;

    -- 5. Handle different selection modes
    CASE v_product.selection_mode
        -- =====================================================================
        -- RANDOM SELECTION (NEW) - System picks randomly from filtered pool
        -- =====================================================================
        WHEN 'random' THEN
            -- Validate that certification_type and exam_language are set
            IF v_product.certification_type IS NULL OR v_product.exam_language IS NULL THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Product configured for random selection but missing certification_type or exam_language',
                    'product_id', v_product.id
                );
            END IF;

            -- Randomly select exams from the filtered pool
            -- Exclude exams user already has access to
            FOR v_exam IN (
                SELECT me.id, me.title
                FROM public.mock_exams me
                WHERE me.is_active = true
                AND me.is_premium = true
                AND me.category = LOWER(v_product.certification_type::TEXT)  -- 'cp' or 'scp'
                AND me.language = v_product.exam_language  -- 'en' or 'ar'
                -- Exclude exams user already has access to
                AND NOT EXISTS (
                    SELECT 1 FROM public.mock_exam_premium_access pa
                    WHERE pa.user_id = p_user_id
                    AND pa.mock_exam_id = me.id
                    AND (pa.expires_at IS NULL OR pa.expires_at > NOW())
                )
                ORDER BY RANDOM()
                LIMIT v_total_exams
            )
            LOOP
                -- Grant access to this exam
                INSERT INTO public.mock_exam_premium_access (
                    user_id,
                    mock_exam_id,
                    woocommerce_order_id,
                    granted_at,
                    expires_at,
                    attempts_allowed,
                    attempts_used
                ) VALUES (
                    p_user_id,
                    v_exam.id,
                    p_woocommerce_order_id,
                    NOW(),
                    v_expires_at,
                    1,  -- Single attempt per exam
                    0
                )
                ON CONFLICT (user_id, mock_exam_id) DO UPDATE SET
                    -- If somehow exists, just update expiration and reset attempts
                    expires_at = GREATEST(mock_exam_premium_access.expires_at, EXCLUDED.expires_at),
                    attempts_allowed = mock_exam_premium_access.attempts_allowed + 1;

                v_granted_count := v_granted_count + 1;
            END LOOP;

            -- Update grant record with actual count
            UPDATE public.mock_exam_access_grants
            SET exams_granted = v_granted_count,
                exams_remaining = 0  -- Random mode doesn't use remaining
            WHERE id = v_grant_id;

            -- Check if we got fewer exams than requested
            IF v_granted_count < v_total_exams THEN
                RETURN jsonb_build_object(
                    'success', true,
                    'warning', format('Only %s exams available in pool (requested %s)', v_granted_count, v_total_exams),
                    'grant_id', v_grant_id,
                    'exams_granted', v_granted_count,
                    'exams_requested', v_total_exams,
                    'certification_type', v_product.certification_type,
                    'exam_language', v_product.exam_language
                );
            END IF;

        -- =====================================================================
        -- SPECIFIC SELECTION - Admin pre-defined specific exam IDs
        -- =====================================================================
        WHEN 'specific' THEN
            IF v_product.specific_exam_ids IS NULL OR array_length(v_product.specific_exam_ids, 1) IS NULL THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Product configured for specific selection but no exam IDs defined',
                    'product_id', v_product.id
                );
            END IF;

            -- Grant access to each specific exam
            FOR v_exam IN (
                SELECT me.id
                FROM public.mock_exams me
                WHERE me.id = ANY(v_product.specific_exam_ids)
                AND me.is_active = true
            )
            LOOP
                INSERT INTO public.mock_exam_premium_access (
                    user_id,
                    mock_exam_id,
                    woocommerce_order_id,
                    granted_at,
                    expires_at,
                    attempts_allowed,
                    attempts_used
                ) VALUES (
                    p_user_id,
                    v_exam.id,
                    p_woocommerce_order_id,
                    NOW(),
                    v_expires_at,
                    p_quantity,  -- Quantity = attempts for specific mode
                    0
                )
                ON CONFLICT (user_id, mock_exam_id) DO UPDATE SET
                    expires_at = GREATEST(mock_exam_premium_access.expires_at, EXCLUDED.expires_at),
                    attempts_allowed = mock_exam_premium_access.attempts_allowed + p_quantity;

                v_granted_count := v_granted_count + 1;
            END LOOP;

            UPDATE public.mock_exam_access_grants
            SET exams_granted = v_granted_count,
                exams_remaining = 0
            WHERE id = v_grant_id;

        -- =====================================================================
        -- USER PICKS - User chooses which exams to use credits on
        -- =====================================================================
        WHEN 'user_picks' THEN
            -- Don't grant specific exams yet, just set remaining credits
            UPDATE public.mock_exam_access_grants
            SET exams_granted = 0,
                exams_remaining = v_total_exams
            WHERE id = v_grant_id;

            RETURN jsonb_build_object(
                'success', true,
                'message', 'Credits granted - user can pick exams',
                'grant_id', v_grant_id,
                'exams_remaining', v_total_exams,
                'expires_at', v_expires_at
            );

        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', format('Unknown selection_mode: %s', v_product.selection_mode)
            );
    END CASE;

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'grant_id', v_grant_id,
        'exams_granted', v_granted_count,
        'expires_at', v_expires_at,
        'selection_mode', v_product.selection_mode
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.grant_mock_exam_access(UUID, INTEGER, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_mock_exam_access(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.grant_mock_exam_access IS
'Grants mock exam access based on WooCommerce purchase.
Supports three modes:
- random: System randomly selects from pool filtered by certification_type + exam_language
- specific: Admin pre-defines which exam IDs are granted
- user_picks: User gets credits to choose their own exams';

-- =============================================================================
-- STEP 3: HELPER FUNCTION TO CHECK AVAILABLE POOL SIZE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_mock_exam_pool_count(
    p_certification_type certification_type_enum,
    p_exam_language exam_language,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total_in_pool INTEGER,
    available_for_user INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER
         FROM public.mock_exams me
         WHERE me.is_active = true
         AND me.is_premium = true
         AND me.category = LOWER(p_certification_type::TEXT)
         AND me.language = p_exam_language
        ) AS total_in_pool,
        (SELECT COUNT(*)::INTEGER
         FROM public.mock_exams me
         WHERE me.is_active = true
         AND me.is_premium = true
         AND me.category = LOWER(p_certification_type::TEXT)
         AND me.language = p_exam_language
         AND (p_user_id IS NULL OR NOT EXISTS (
             SELECT 1 FROM public.mock_exam_premium_access pa
             WHERE pa.user_id = p_user_id
             AND pa.mock_exam_id = me.id
             AND (pa.expires_at IS NULL OR pa.expires_at > NOW())
         ))
        ) AS available_for_user;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_mock_exam_pool_count(certification_type_enum, exam_language, UUID) TO authenticated;

COMMENT ON FUNCTION public.get_mock_exam_pool_count IS
'Returns count of mock exams in pool for given certification type and language.
If user_id provided, also returns count excluding exams user already has access to.';
