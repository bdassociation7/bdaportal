-- ============================================================================
-- Migration: Fix Grant Book Access and Add Membership Start Date Support
-- Date: 2026-02-01
-- Description:
--   1. Fix grant_book_access to handle missing download_url properly
--   2. Add start_date parameter to activate_membership for admin backdating
--   3. Add BoCK duplicate prevention checks
-- ============================================================================

-- ============================================================================
-- 1. Add download_url column to book_products table (if not exists)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'book_products'
        AND column_name = 'download_url'
    ) THEN
        ALTER TABLE public.book_products ADD COLUMN download_url TEXT;
        RAISE NOTICE 'Added download_url column to book_products table';
    END IF;
END $$;

-- ============================================================================
-- 2. Fix grant_book_access function with proper download_url handling
-- ============================================================================

CREATE OR REPLACE FUNCTION public.grant_book_access(
    p_user_id UUID,
    p_product_id INTEGER,
    p_grant_reason VARCHAR(50),
    p_grant_notes TEXT DEFAULT NULL,
    p_access_until DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_book RECORD;
    v_grant_id UUID;
    v_granted_by UUID;
    v_download_url TEXT;
BEGIN
    -- Get current admin user
    v_granted_by := auth.uid();

    IF v_granted_by IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify admin permissions
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = v_granted_by
        AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can grant book access';
    END IF;

    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Get book details from book_products
    SELECT
        bp.woocommerce_product_id,
        bp.product_name,
        bp.language,
        bp.format,
        bp.category,
        bp.cover_image_url,
        bp.description,
        bp.pages
    INTO v_book
    FROM public.book_products bp
    WHERE bp.woocommerce_product_id = p_product_id
    AND bp.is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book product not found or inactive. Product ID: %', p_product_id;
    END IF;

    -- Try to get download_url from multiple sources
    -- First try book_products.download_url
    SELECT bp.download_url INTO v_download_url
    FROM public.book_products bp
    WHERE bp.woocommerce_product_id = p_product_id
    AND bp.download_url IS NOT NULL;

    -- If not found, try membership_benefit_books
    IF v_download_url IS NULL THEN
        SELECT mbb.download_url INTO v_download_url
        FROM public.membership_benefit_books mbb
        WHERE mbb.woocommerce_product_id = p_product_id
        AND mbb.download_url IS NOT NULL
        AND mbb.is_active = true
        LIMIT 1;
    END IF;

    -- Check if already granted (and not revoked) - make it idempotent
    IF EXISTS (
        SELECT 1 FROM public.admin_granted_books
        WHERE user_id = p_user_id
        AND product_id = p_product_id
        AND revoked_at IS NULL
    ) THEN
        -- Return success but indicate already granted (idempotent behavior)
        RETURN json_build_object(
            'success', true,
            'grant_id', (SELECT id FROM public.admin_granted_books WHERE user_id = p_user_id AND product_id = p_product_id AND revoked_at IS NULL),
            'message', 'User already has access to this book (no duplicate created)',
            'already_granted', true,
            'user_id', p_user_id,
            'product_id', p_product_id,
            'product_name', v_book.product_name
        );
    END IF;

    -- Grant access
    INSERT INTO public.admin_granted_books (
        user_id,
        product_id,
        product_name,
        grant_reason,
        grant_notes,
        granted_by,
        access_from,
        access_until,
        language,
        format,
        category,
        cover_image_url,
        description,
        pages,
        download_url
    ) VALUES (
        p_user_id,
        p_product_id,
        v_book.product_name,
        p_grant_reason,
        p_grant_notes,
        v_granted_by,
        CURRENT_DATE,
        p_access_until,
        v_book.language,
        v_book.format,
        v_book.category,
        v_book.cover_image_url,
        v_book.description,
        v_book.pages,
        v_download_url
    )
    RETURNING id INTO v_grant_id;

    RETURN json_build_object(
        'success', true,
        'grant_id', v_grant_id,
        'message', 'Book access granted successfully',
        'user_id', p_user_id,
        'product_id', p_product_id,
        'product_name', v_book.product_name
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- ============================================================================
-- 3. Update activate_membership to support custom start_date
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_membership(
    p_user_id UUID,
    p_membership_type membership_type,
    p_woocommerce_order_id INTEGER DEFAULT NULL,
    p_woocommerce_product_id INTEGER DEFAULT NULL,
    p_duration_months INTEGER DEFAULT 12,
    p_admin_user_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL  -- NEW: Allow custom start date for admin backdating
)
RETURNS UUID AS $$
DECLARE
    v_membership_id UUID;
    v_membership_code TEXT;
    v_existing_membership RECORD;
    v_start_date DATE;
    v_expiry_date DATE;
    v_triggered_by TEXT;
    v_action TEXT;
    v_is_upgrade BOOLEAN := FALSE;
BEGIN
    -- Determine trigger source
    v_triggered_by := CASE WHEN p_admin_user_id IS NOT NULL THEN 'admin' ELSE 'webhook' END;

    -- Set start date (use custom date if provided by admin, otherwise use today)
    v_start_date := COALESCE(p_start_date, CURRENT_DATE);

    -- Check for existing active membership
    SELECT * INTO v_existing_membership
    FROM public.user_memberships
    WHERE user_id = p_user_id
    AND status = 'active'
    ORDER BY expiry_date DESC
    LIMIT 1;

    IF v_existing_membership.id IS NOT NULL THEN
        -- Determine if this is an upgrade (tier change) or renewal (same tier)
        v_is_upgrade := (v_existing_membership.membership_type::text != p_membership_type::text);

        IF v_is_upgrade THEN
            -- UPGRADE: Start from specified date (or today) with full duration
            v_expiry_date := v_start_date + (p_duration_months || ' months')::INTERVAL;
            v_action := 'upgraded';
        ELSE
            -- RENEWAL: If custom start date provided, use it; otherwise extend from expiry
            IF p_start_date IS NOT NULL THEN
                -- Admin is backdating, use the custom start date
                v_expiry_date := v_start_date + (p_duration_months || ' months')::INTERVAL;
            ELSE
                -- Normal renewal, extend from current expiry
                v_start_date := v_existing_membership.start_date;
                v_expiry_date := v_existing_membership.expiry_date + (p_duration_months || ' months')::INTERVAL;
            END IF;
            v_action := 'renewed';
        END IF;

        UPDATE public.user_memberships
        SET
            start_date = v_start_date,
            expiry_date = v_expiry_date,
            renewal_count = renewal_count + 1,
            last_renewed_at = NOW(),
            membership_type = CASE
                WHEN p_membership_type = 'professional' THEN 'professional'::membership_type
                ELSE membership_type
            END,
            woocommerce_order_id = COALESCE(p_woocommerce_order_id, woocommerce_order_id),
            updated_at = NOW()
        WHERE id = v_existing_membership.id
        RETURNING id INTO v_membership_id;

        -- Log the action
        INSERT INTO public.membership_activation_logs (
            membership_id, user_id, action, previous_status, new_status,
            previous_expiry_date, new_expiry_date, triggered_by, admin_user_id,
            woocommerce_order_id, notes
        ) VALUES (
            v_membership_id, p_user_id, v_action, 'active', 'active',
            v_existing_membership.expiry_date, v_expiry_date, v_triggered_by, p_admin_user_id,
            p_woocommerce_order_id,
            CASE
                WHEN v_is_upgrade
                THEN COALESCE(p_notes || ' ', '') || '[Upgraded from ' || v_existing_membership.membership_type::text || ' to ' || p_membership_type::text || '. Start date: ' || v_start_date::text || ']'
                WHEN p_start_date IS NOT NULL
                THEN COALESCE(p_notes || ' ', '') || '[Backdated start: ' || v_start_date::text || ']'
                ELSE p_notes
            END
        );
    ELSE
        -- Create new membership
        v_membership_code := generate_membership_id();
        v_expiry_date := v_start_date + (p_duration_months || ' months')::INTERVAL;

        INSERT INTO public.user_memberships (
            user_id, membership_type, membership_id, start_date, expiry_date,
            status, woocommerce_order_id, woocommerce_product_id, activated_by, admin_notes
        ) VALUES (
            p_user_id, p_membership_type, v_membership_code, v_start_date, v_expiry_date,
            'active', p_woocommerce_order_id, p_woocommerce_product_id, p_admin_user_id, p_notes
        ) RETURNING id INTO v_membership_id;

        -- Log activation
        INSERT INTO public.membership_activation_logs (
            membership_id, user_id, action, new_status, new_expiry_date,
            triggered_by, admin_user_id, woocommerce_order_id, notes
        ) VALUES (
            v_membership_id, p_user_id, 'activated', 'active', v_expiry_date,
            v_triggered_by, p_admin_user_id, p_woocommerce_order_id,
            CASE
                WHEN p_start_date IS NOT NULL
                THEN COALESCE(p_notes || ' ', '') || '[Custom start date: ' || v_start_date::text || ']'
                ELSE p_notes
            END
        );
    END IF;

    RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Create function to check if user already has BoCK access (any language)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_bock_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check admin_granted_books for any BoCK book
    IF EXISTS (
        SELECT 1 FROM public.admin_granted_books agb
        JOIN public.book_products bp ON bp.woocommerce_product_id = agb.product_id
        WHERE agb.user_id = p_user_id
        AND agb.revoked_at IS NULL
        AND bp.category = 'bock'
        AND (agb.access_until IS NULL OR agb.access_until >= CURRENT_DATE)
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check user_redeemed_books for any BoCK
    IF EXISTS (
        SELECT 1 FROM public.user_redeemed_books
        WHERE user_id = p_user_id
        AND book_product_group = 'bda-bock'
        AND (access_until IS NULL OR access_until >= CURRENT_DATE)
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check membership_benefit_books for store purchases (via woocommerce_orders)
    -- This would need to check the actual orders table if it exists

    RETURN FALSE;
END;
$$;

-- ============================================================================
-- 5. Update redeem_book_credit to check for existing BoCK access
-- ============================================================================

CREATE OR REPLACE FUNCTION public.redeem_book_credit(
    p_credit_id UUID,
    p_language VARCHAR(10)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_credit RECORD;
    v_book RECORD;
    v_user_id UUID;
    v_redeemed_book_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Get credit details
    SELECT * INTO v_credit
    FROM public.user_book_credits
    WHERE id = p_credit_id
    AND user_id = v_user_id
    AND is_redeemed = FALSE
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE);

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Credit not found, already redeemed, or expired');
    END IF;

    -- Check if language is in available languages
    IF NOT (p_language = ANY(v_credit.available_languages)) THEN
        RETURN json_build_object('success', false, 'error', 'Language not available for this credit');
    END IF;

    -- Check if this is a BoCK credit and user already has BoCK access
    IF v_credit.book_product_group = 'bda-bock' THEN
        IF public.user_has_bock_access(v_user_id) THEN
            RETURN json_build_object(
                'success', false,
                'error', 'You already have BoCK access. BoCK is a single entitlement per user (either AR or EN).',
                'already_has_bock', true
            );
        END IF;
    END IF;

    -- Get book details from membership_benefit_books
    SELECT * INTO v_book
    FROM public.membership_benefit_books
    WHERE book_product_group = v_credit.book_product_group
    AND language = p_language
    AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Book not found for this language');
    END IF;

    -- Create redeemed book record
    INSERT INTO public.user_redeemed_books (
        user_id, credit_id, product_id, product_name, language,
        book_product_group, access_from, access_until,
        metadata
    ) VALUES (
        v_user_id, p_credit_id, v_book.woocommerce_product_id, v_book.product_name,
        p_language, v_credit.book_product_group, CURRENT_DATE,
        v_credit.valid_until,
        jsonb_build_object(
            'cover_image_url', v_book.cover_image_url,
            'download_url', v_book.download_url,
            'format', v_book.format,
            'description', v_book.description,
            'pages', v_book.pages
        )
    )
    RETURNING id INTO v_redeemed_book_id;

    -- Mark credit as redeemed
    UPDATE public.user_book_credits
    SET
        is_redeemed = TRUE,
        redeemed_at = NOW(),
        redeemed_language = p_language,
        redeemed_product_id = v_book.woocommerce_product_id
    WHERE id = p_credit_id;

    RETURN json_build_object(
        'success', true,
        'redeemed_book_id', v_redeemed_book_id,
        'product_name', v_book.product_name,
        'language', p_language,
        'message', 'Book credit redeemed successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 6. Update grant_membership_book_credit to skip if user already has BoCK
-- ============================================================================

CREATE OR REPLACE FUNCTION public.grant_membership_book_credit(
    p_user_id UUID,
    p_membership_type membership_type,
    p_source_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_credit_id UUID;
    v_book_groups TEXT[];
    v_book_group TEXT;
    v_languages TEXT[];
BEGIN
    -- Check if user already has BoCK access (from any source)
    IF public.user_has_bock_access(p_user_id) THEN
        RETURN json_build_object(
            'success', true,
            'message', 'User already has BoCK access. No new credit granted.',
            'already_has_bock', true,
            'credit_id', NULL
        );
    END IF;

    -- Get distinct book product groups for this membership type
    SELECT ARRAY_AGG(DISTINCT book_product_group)
    INTO v_book_groups
    FROM public.membership_benefit_books
    WHERE membership_type = p_membership_type::text
    AND book_product_group IS NOT NULL
    AND is_active = TRUE;

    IF v_book_groups IS NULL OR array_length(v_book_groups, 1) IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No book benefits configured for this membership type'
        );
    END IF;

    -- Grant a credit for each book group
    FOREACH v_book_group IN ARRAY v_book_groups
    LOOP
        -- Check if credit already exists for this book group
        IF EXISTS (
            SELECT 1 FROM public.user_book_credits
            WHERE user_id = p_user_id
            AND book_product_group = v_book_group
            AND is_redeemed = FALSE
        ) THEN
            CONTINUE; -- Skip, already has unredeemed credit
        END IF;

        -- Get available languages for this book group
        SELECT ARRAY_AGG(DISTINCT language)
        INTO v_languages
        FROM public.membership_benefit_books
        WHERE book_product_group = v_book_group
        AND membership_type = p_membership_type::text
        AND is_active = TRUE;

        -- Create the credit
        INSERT INTO public.user_book_credits (
            user_id,
            source_type,
            source_id,
            book_product_group,
            available_languages,
            valid_from,
            notes
        ) VALUES (
            p_user_id,
            'membership',
            p_source_id,
            v_book_group,
            v_languages,
            CURRENT_DATE,
            'Granted with ' || p_membership_type::text || ' membership'
        )
        RETURNING id INTO v_credit_id;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'credit_id', v_credit_id,
        'message', 'Book credit(s) granted successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 7. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.user_has_bock_access(UUID) TO authenticated;

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Migration completed successfully';
    RAISE NOTICE '  1. Fixed grant_book_access download_url handling';
    RAISE NOTICE '  2. Added start_date parameter to activate_membership';
    RAISE NOTICE '  3. Added BoCK duplicate prevention (user_has_bock_access)';
    RAISE NOTICE '  4. Updated redeem_book_credit with BoCK check';
    RAISE NOTICE '  5. Updated grant_membership_book_credit with BoCK check';
    RAISE NOTICE '============================================';
END $$;
