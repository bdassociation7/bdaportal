-- Migration: Fix grant_book_access to include download_url
-- Date: 2026-01-12
-- Description: Update RPC function to copy download_url from book_products when granting access

-- ============================================================================
-- Update RPC function: grant_book_access
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
        bp.*,
        (
            SELECT mbb.download_url
            FROM public.membership_benefit_books mbb
            WHERE mbb.woocommerce_product_id = bp.woocommerce_product_id
              AND mbb.download_url IS NOT NULL
              AND mbb.is_active = true
            LIMIT 1
        ) AS download_url
    INTO v_book
    FROM public.book_products bp
    WHERE bp.woocommerce_product_id = p_product_id
    AND bp.is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book product not found or inactive. Product ID: %', p_product_id;
    END IF;

    -- Check if already granted (and not revoked)
    IF EXISTS (
        SELECT 1 FROM public.admin_granted_books
        WHERE user_id = p_user_id
        AND product_id = p_product_id
        AND revoked_at IS NULL
    ) THEN
        RAISE EXCEPTION 'User already has admin-granted access to this book';
    END IF;

    -- Grant access (NOW INCLUDING download_url)
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
        v_book.download_url
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
-- Success message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed grant_book_access to include download_url';
END $$;
