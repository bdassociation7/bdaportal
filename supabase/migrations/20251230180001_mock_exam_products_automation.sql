-- Migration: Mock Exam Products Automation System
-- Date: 2025-12-30
-- Description: Auto-activate premium mock exam access when WooCommerce orders are completed
--
-- BUSINESS LOGIC:
-- - Premium Mock Exams are sold in packages (1 mock / 2 mocks / 3 mocks)
-- - When a package is purchased, the system auto-grants access to X premium mock exams
-- - Access can be granted to specific exams or "any X premium exams" (user picks)
-- - This eliminates the need for manual admin intervention

-- =============================================================================
-- TABLE: mock_exam_products
-- Maps WooCommerce products to mock exam access grants
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.mock_exam_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- WooCommerce product info
    woocommerce_product_id INTEGER NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,

    -- Access configuration
    exams_count INTEGER NOT NULL DEFAULT 1 CHECK (exams_count > 0),  -- How many exams this package grants access to
    specific_exam_ids UUID[] DEFAULT NULL,  -- If set, grants access to these specific exams. If NULL, user can pick any premium exams

    -- Validity
    validity_months INTEGER DEFAULT NULL,  -- NULL = lifetime access

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- =============================================================================
-- TABLE: mock_exam_access_grants
-- Tracks granted access from purchases (for audit and to track remaining picks)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.mock_exam_access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User and purchase info
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    mock_exam_product_id UUID NOT NULL REFERENCES public.mock_exam_products(id) ON DELETE CASCADE,
    woocommerce_order_id INTEGER NOT NULL,

    -- Access tracking
    exams_granted INTEGER NOT NULL DEFAULT 0,  -- How many exams were actually granted
    exams_remaining INTEGER NOT NULL DEFAULT 0,  -- For "pick any" packages, how many picks remaining

    -- Validity inherited from product at time of purchase
    expires_at TIMESTAMPTZ,  -- NULL = lifetime

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate processing of same order+product
    UNIQUE(user_id, mock_exam_product_id, woocommerce_order_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_mock_exam_products_wc_product ON public.mock_exam_products(woocommerce_product_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_products_active ON public.mock_exam_products(is_active);
CREATE INDEX IF NOT EXISTS idx_mock_exam_access_grants_user ON public.mock_exam_access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_access_grants_order ON public.mock_exam_access_grants(woocommerce_order_id);

-- =============================================================================
-- FUNCTION: grant_mock_exam_access
-- Called when a WooCommerce order is completed to grant mock exam access
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

    -- 3. Calculate expiration date
    IF v_product.validity_months IS NOT NULL THEN
        v_expires_at := NOW() + (v_product.validity_months || ' months')::INTERVAL;
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
            'expires_at', v_expires_at
        );
    ELSE
        -- User will pick exams later - they have "credits" to use
        RETURN jsonb_build_object(
            'success', true,
            'grant_id', v_grant_id,
            'exams_to_pick', v_total_exams,
            'user_picks', true,
            'expires_at', v_expires_at,
            'message', 'User can now pick ' || v_total_exams || ' premium mock exam(s)'
        );
    END IF;
END;
$$;

-- =============================================================================
-- FUNCTION: use_mock_exam_credit
-- Called when user picks a premium exam to use their credit
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
    v_grant mock_exam_access_grants%ROWTYPE;
    v_exam mock_exams%ROWTYPE;
BEGIN
    -- 1. Verify the exam is premium
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

    -- 3. Find a grant with remaining picks
    SELECT * INTO v_grant
    FROM mock_exam_access_grants
    WHERE user_id = p_user_id
    AND exams_remaining > 0
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at ASC  -- Use oldest credits first
    LIMIT 1
    FOR UPDATE;

    IF v_grant IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No available mock exam credits',
            'message', 'Purchase a premium mock exam package to get access'
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
        v_grant.woocommerce_order_id,
        v_grant.expires_at
    );

    -- 5. Decrement remaining picks
    UPDATE mock_exam_access_grants
    SET exams_remaining = exams_remaining - 1,
        exams_granted = exams_granted + 1
    WHERE id = v_grant.id;

    RETURN jsonb_build_object(
        'success', true,
        'exam_id', p_mock_exam_id,
        'exam_title', v_exam.title,
        'expires_at', v_grant.expires_at,
        'remaining_credits', v_grant.exams_remaining - 1
    );
END;
$$;

-- =============================================================================
-- FUNCTION: get_user_mock_exam_credits
-- Get user's available mock exam credits (picks remaining)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_mock_exam_credits(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_total_remaining INTEGER;
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

    -- Get grant details
    SELECT jsonb_agg(jsonb_build_object(
        'id', g.id,
        'product_name', p.product_name,
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
        'grants', COALESCE(v_grants, '[]'::jsonb)
    );
END;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.mock_exam_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_access_grants ENABLE ROW LEVEL SECURITY;

-- Mock exam products: Admins can manage, everyone can view active
CREATE POLICY "Anyone can view active mock exam products"
ON public.mock_exam_products FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage mock exam products"
ON public.mock_exam_products FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Mock exam access grants: Users can view their own, admins can view all
CREATE POLICY "Users can view their own access grants"
ON public.mock_exam_access_grants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all access grants"
ON public.mock_exam_access_grants FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Admins can manage access grants"
ON public.mock_exam_access_grants FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- =============================================================================
-- TRIGGER: Update updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_mock_exam_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mock_exam_products_updated_at
    BEFORE UPDATE ON public.mock_exam_products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_mock_exam_products_updated_at();

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.grant_mock_exam_access TO service_role;
GRANT EXECUTE ON FUNCTION public.use_mock_exam_credit TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_mock_exam_credits TO authenticated;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.mock_exam_products IS 'Maps WooCommerce products to mock exam access packages (1 mock, 2 mocks, 3 mocks)';
COMMENT ON TABLE public.mock_exam_access_grants IS 'Tracks granted access from WooCommerce purchases, including remaining picks';
COMMENT ON FUNCTION public.grant_mock_exam_access IS 'Called by WooCommerce webhook to grant mock exam access on purchase';
COMMENT ON FUNCTION public.use_mock_exam_credit IS 'Called when user picks a premium mock exam to use their credit';
COMMENT ON FUNCTION public.get_user_mock_exam_credits IS 'Get user''s available mock exam credits (picks remaining)';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

SELECT '✅ Mock exam products automation system created!' as status;
