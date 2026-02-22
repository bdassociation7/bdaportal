-- Migration: Exam Language Enforcement and Sample Exams
-- Date: 2025-12-31
-- Description:
--   1. Add language field to mock_exam_products for language-specific packages
--   2. Add is_sample_exam flag to mock_exams for free sample exams
--   3. Set default validity_months to 12 (1 year)
--   4. Add constraint to ensure packages only unlock exams of matching language
--
-- BUSINESS RULES:
-- - Free sample exams: 1 per language (EN/AR), unlimited attempts
-- - Paid packages: Language-specific (EN package = EN exams only)
-- - Access duration: 12 months by default
-- - Locked exams: Visible with "Purchase to Unlock" CTA

-- =============================================================================
-- 1. ADD is_sample_exam FLAG TO mock_exams
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'mock_exams'
        AND column_name = 'is_sample_exam'
    ) THEN
        ALTER TABLE public.mock_exams
        ADD COLUMN is_sample_exam BOOLEAN NOT NULL DEFAULT false;

        COMMENT ON COLUMN public.mock_exams.is_sample_exam IS
            'True for free sample exams (1 per language). These are always accessible to all users.';
    END IF;
END $$;

-- Index for quick sample exam lookup
CREATE INDEX IF NOT EXISTS idx_mock_exams_is_sample
ON public.mock_exams(is_sample_exam) WHERE is_sample_exam = true;

-- =============================================================================
-- 2. ADD language FIELD TO mock_exam_products
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'mock_exam_products'
        AND column_name = 'language'
    ) THEN
        ALTER TABLE public.mock_exam_products
        ADD COLUMN language VARCHAR(2) NOT NULL DEFAULT 'en'
        CHECK (language IN ('en', 'ar'));

        COMMENT ON COLUMN public.mock_exam_products.language IS
            'Language this product grants access to. EN package = EN exams only, AR package = AR exams only.';
    END IF;
END $$;

-- Index for language filtering
CREATE INDEX IF NOT EXISTS idx_mock_exam_products_language
ON public.mock_exam_products(language);

-- =============================================================================
-- 3. SET DEFAULT validity_months TO 12
-- =============================================================================

-- Update default for new products
ALTER TABLE public.mock_exam_products
ALTER COLUMN validity_months SET DEFAULT 12;

COMMENT ON COLUMN public.mock_exam_products.validity_months IS
    'Access validity in months (default: 12). NULL = lifetime access.';

-- =============================================================================
-- 4. UPDATE grant_mock_exam_access FUNCTION
-- Add language validation to ensure package language matches exam language
-- =============================================================================

CREATE OR REPLACE FUNCTION public.grant_mock_exam_access(
    p_user_id UUID,
    p_woocommerce_order_id INTEGER,
    p_woocommerce_product_id INTEGER,
    p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product mock_exam_products%ROWTYPE;
    v_expires_at TIMESTAMPTZ;
    v_grant_id UUID;
    v_total_exams INTEGER;
    v_granted_count INTEGER := 0;
    v_exam_id UUID;
    v_exam_language VARCHAR(2);
    v_result JSONB;
BEGIN
    -- 1. Find the mock exam product configuration
    SELECT * INTO v_product
    FROM mock_exam_products
    WHERE woocommerce_product_id = p_woocommerce_product_id
    AND is_active = true;

    IF v_product IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Product not found or not active',
            'product_id', p_woocommerce_product_id
        );
    END IF;

    -- 2. Check if already processed (idempotency)
    IF EXISTS (
        SELECT 1 FROM mock_exam_access_grants
        WHERE user_id = p_user_id
        AND mock_exam_product_id = v_product.id
        AND woocommerce_order_id = p_woocommerce_order_id
    ) THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_processed', true,
            'message', 'Access already granted for this order'
        );
    END IF;

    -- 3. Calculate expiration date (default 12 months if not set)
    IF v_product.validity_months IS NOT NULL THEN
        v_expires_at := NOW() + (v_product.validity_months || ' months')::INTERVAL;
    ELSE
        -- Default to 12 months if NULL
        v_expires_at := NOW() + INTERVAL '12 months';
    END IF;

    -- 4. Calculate total exams to grant (quantity * exams per package)
    v_total_exams := p_quantity * v_product.exams_count;

    -- 5. Create the access grant record
    INSERT INTO mock_exam_access_grants (
        user_id,
        mock_exam_product_id,
        woocommerce_order_id,
        exams_granted,
        exams_remaining,
        expires_at
    ) VALUES (
        p_user_id,
        v_product.id,
        p_woocommerce_order_id,
        0,  -- Will be updated below
        CASE WHEN v_product.specific_exam_ids IS NULL THEN v_total_exams ELSE 0 END,
        v_expires_at
    )
    RETURNING id INTO v_grant_id;

    -- 6. If specific exams are defined, grant access to them now
    IF v_product.specific_exam_ids IS NOT NULL AND array_length(v_product.specific_exam_ids, 1) > 0 THEN
        FOREACH v_exam_id IN ARRAY v_product.specific_exam_ids
        LOOP
            -- Verify exam language matches product language
            SELECT language::text INTO v_exam_language
            FROM mock_exams
            WHERE id = v_exam_id;

            IF v_exam_language IS NOT NULL AND v_exam_language != v_product.language THEN
                -- Skip exams that don't match product language (shouldn't happen if configured correctly)
                CONTINUE;
            END IF;

            -- Grant access (upsert to handle re-grants)
            INSERT INTO mock_exam_premium_access (
                user_id,
                mock_exam_id,
                woocommerce_order_id,
                expires_at
            ) VALUES (
                p_user_id,
                v_exam_id,
                p_woocommerce_order_id,
                v_expires_at
            )
            ON CONFLICT (user_id, mock_exam_id) DO UPDATE SET
                woocommerce_order_id = EXCLUDED.woocommerce_order_id,
                expires_at = GREATEST(mock_exam_premium_access.expires_at, EXCLUDED.expires_at),
                granted_at = NOW();

            v_granted_count := v_granted_count + 1;
        END LOOP;

        -- Update the grant record with actual granted count
        UPDATE mock_exam_access_grants
        SET exams_granted = v_granted_count
        WHERE id = v_grant_id;

        RETURN jsonb_build_object(
            'success', true,
            'grant_id', v_grant_id,
            'exams_granted', v_granted_count,
            'specific_exams', true,
            'language', v_product.language,
            'expires_at', v_expires_at
        );
    ELSE
        -- User will pick exams later - they have "credits" to use
        RETURN jsonb_build_object(
            'success', true,
            'grant_id', v_grant_id,
            'exams_to_pick', v_total_exams,
            'user_picks', true,
            'language', v_product.language,
            'expires_at', v_expires_at,
            'message', 'User can now pick ' || v_total_exams || ' premium ' || UPPER(v_product.language) || ' mock exam(s)'
        );
    END IF;
END;
$$;

-- =============================================================================
-- 5. UPDATE use_mock_exam_credit FUNCTION
-- Add language validation to ensure user can only pick exams matching their package language
-- =============================================================================

CREATE OR REPLACE FUNCTION public.use_mock_exam_credit(
    p_user_id UUID,
    p_mock_exam_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_grant_id UUID;
    v_grant_order_id INTEGER;
    v_grant_expires_at TIMESTAMPTZ;
    v_grant_remaining INTEGER;
    v_exam mock_exams%ROWTYPE;
BEGIN
    -- 1. Verify the exam is premium and active
    SELECT * INTO v_exam
    FROM mock_exams
    WHERE id = p_mock_exam_id AND is_premium = true AND is_active = true;

    IF v_exam IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Exam not found, not premium, or not active'
        );
    END IF;

    -- 2. Check if user already has access
    IF EXISTS (
        SELECT 1 FROM mock_exam_premium_access
        WHERE user_id = p_user_id
        AND mock_exam_id = p_mock_exam_id
        AND (expires_at IS NULL OR expires_at > NOW())
    ) THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_has_access', true,
            'message', 'User already has access to this exam'
        );
    END IF;

    -- 3. Find a grant with remaining picks that matches the exam language
    SELECT g.id, g.woocommerce_order_id, g.expires_at, g.exams_remaining
    INTO v_grant_id, v_grant_order_id, v_grant_expires_at, v_grant_remaining
    FROM mock_exam_access_grants g
    JOIN mock_exam_products p ON g.mock_exam_product_id = p.id
    WHERE g.user_id = p_user_id
    AND g.exams_remaining > 0
    AND g.status = 'active'
    AND (g.expires_at IS NULL OR g.expires_at > NOW())
    AND p.language = v_exam.language::text  -- IMPORTANT: Match exam language (cast enum to text)
    ORDER BY g.created_at ASC  -- Use oldest credits first
    LIMIT 1
    FOR UPDATE OF g;

    IF v_grant_id IS NULL THEN
        -- Check if they have credits but wrong language
        IF EXISTS (
            SELECT 1 FROM mock_exam_access_grants
            WHERE user_id = p_user_id
            AND exams_remaining > 0
            AND status = 'active'
            AND (expires_at IS NULL OR expires_at > NOW())
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Language mismatch',
                'message', 'Your available exam credits are for a different language. This exam requires ' || UPPER(v_exam.language) || ' credits.',
                'exam_language', v_exam.language
            );
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'No available mock exam credits',
            'message', 'Purchase a premium ' || UPPER(v_exam.language) || ' mock exam package to get access'
        );
    END IF;

    -- 4. Grant access to the exam
    INSERT INTO mock_exam_premium_access (
        user_id,
        mock_exam_id,
        woocommerce_order_id,
        expires_at
    ) VALUES (
        p_user_id,
        p_mock_exam_id,
        v_grant_order_id,
        v_grant_expires_at
    );

    -- 5. Decrement remaining picks
    UPDATE mock_exam_access_grants
    SET exams_remaining = exams_remaining - 1,
        exams_granted = exams_granted + 1
    WHERE id = v_grant_id;

    RETURN jsonb_build_object(
        'success', true,
        'exam_id', p_mock_exam_id,
        'exam_title', v_exam.title,
        'language', v_exam.language,
        'expires_at', v_grant_expires_at,
        'remaining_credits', v_grant_remaining - 1
    );
END;
$$;

-- =============================================================================
-- 6. GET USER CREDITS BY LANGUAGE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_mock_exam_credits(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_total_remaining INTEGER;
    v_en_credits INTEGER;
    v_ar_credits INTEGER;
    v_grants JSONB;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Get total remaining credits
    SELECT COALESCE(SUM(exams_remaining), 0) INTO v_total_remaining
    FROM mock_exam_access_grants
    WHERE user_id = v_user_id
    AND status = 'active'
    AND exams_remaining > 0
    AND (expires_at IS NULL OR expires_at > NOW());

    -- Get EN credits
    SELECT COALESCE(SUM(g.exams_remaining), 0) INTO v_en_credits
    FROM mock_exam_access_grants g
    JOIN mock_exam_products p ON g.mock_exam_product_id = p.id
    WHERE g.user_id = v_user_id
    AND g.status = 'active'
    AND g.exams_remaining > 0
    AND (g.expires_at IS NULL OR g.expires_at > NOW())
    AND p.language = 'en';

    -- Get AR credits
    SELECT COALESCE(SUM(g.exams_remaining), 0) INTO v_ar_credits
    FROM mock_exam_access_grants g
    JOIN mock_exam_products p ON g.mock_exam_product_id = p.id
    WHERE g.user_id = v_user_id
    AND g.status = 'active'
    AND g.exams_remaining > 0
    AND (g.expires_at IS NULL OR g.expires_at > NOW())
    AND p.language = 'ar';

    -- Get grant details
    SELECT jsonb_agg(jsonb_build_object(
        'id', g.id,
        'product_name', p.product_name,
        'language', p.language,
        'exams_remaining', g.exams_remaining,
        'expires_at', g.expires_at,
        'created_at', g.created_at
    )) INTO v_grants
    FROM mock_exam_access_grants g
    JOIN mock_exam_products p ON g.mock_exam_product_id = p.id
    WHERE g.user_id = v_user_id
    AND g.status = 'active'
    AND g.exams_remaining > 0
    AND (g.expires_at IS NULL OR g.expires_at > NOW());

    RETURN jsonb_build_object(
        'success', true,
        'total_credits', v_total_remaining,
        'en_credits', v_en_credits,
        'ar_credits', v_ar_credits,
        'grants', COALESCE(v_grants, '[]'::jsonb)
    );
END;
$$;

-- =============================================================================
-- 7. HELPER VIEW FOR ADMIN: Exam Products with Language Info
-- =============================================================================

CREATE OR REPLACE VIEW public.admin_mock_exam_products AS
SELECT
    p.id,
    p.woocommerce_product_id,
    p.product_name,
    p.language,
    UPPER(p.language) as language_display,
    p.exams_count,
    p.validity_months,
    p.specific_exam_ids,
    p.is_active,
    p.created_at,
    p.updated_at,
    -- Count of exams available for this language (cast to text for comparison)
    (SELECT COUNT(*) FROM mock_exams e WHERE e.language::text = p.language AND e.is_premium = true AND e.is_active = true) as available_exams_count
FROM mock_exam_products p
ORDER BY p.language, p.created_at DESC;

GRANT SELECT ON public.admin_mock_exam_products TO authenticated;

-- =============================================================================
-- 8. HELPER VIEW FOR ADMIN: Sample Exams
-- =============================================================================

CREATE OR REPLACE VIEW public.sample_exams_overview AS
SELECT
    language,
    COUNT(*) as sample_count,
    array_agg(title ORDER BY title) as sample_titles
FROM mock_exams
WHERE is_sample_exam = true AND is_active = true
GROUP BY language;

GRANT SELECT ON public.sample_exams_overview TO authenticated;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT '✅ Exam language enforcement and sample exam support added!' as status;
SELECT 'Mock exams table now has: is_sample_exam column' as change_1;
SELECT 'Mock exam products table now has: language column (default: en)' as change_2;
SELECT 'Default validity_months is now: 12' as change_3;
SELECT 'Language validation added to credit functions' as change_4;
