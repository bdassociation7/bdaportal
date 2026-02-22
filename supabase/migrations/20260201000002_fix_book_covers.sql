-- ============================================================================
-- Migration: Fix Book Cover Images
-- Date: 2026-02-01
-- Description: Fix redeem_book_credit to use correct columns and ensure
--              cover images are properly populated
-- ============================================================================

-- ============================================================================
-- 1. Fix redeem_book_credit function to use direct columns (not metadata JSONB)
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

    -- Create redeemed book record using DIRECT COLUMNS (not metadata JSONB)
    INSERT INTO public.user_redeemed_books (
        user_id,
        credit_id,
        product_id,
        product_name,
        language,
        book_product_group,
        access_from,
        access_until,
        cover_image_url,
        download_url,
        format,
        description,
        pages
    ) VALUES (
        v_user_id,
        p_credit_id,
        v_book.woocommerce_product_id,
        v_book.product_name,
        p_language,
        v_credit.book_product_group,
        CURRENT_DATE,
        v_credit.valid_until,
        v_book.cover_image_url,
        v_book.download_url,
        v_book.format,
        v_book.description,
        v_book.pages
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
-- 2. Update existing redeemed books that might have NULL cover_image_url
-- ============================================================================

UPDATE public.user_redeemed_books urb
SET
    cover_image_url = mbb.cover_image_url,
    download_url = COALESCE(urb.download_url, mbb.download_url),
    format = COALESCE(urb.format, mbb.format),
    description = COALESCE(urb.description, mbb.description),
    pages = COALESCE(urb.pages, mbb.pages)
FROM public.membership_benefit_books mbb
WHERE urb.product_id = mbb.woocommerce_product_id
AND mbb.is_active = TRUE
AND (urb.cover_image_url IS NULL OR urb.cover_image_url = '');

-- ============================================================================
-- 3. Update existing admin_granted_books that might have NULL cover_image_url
-- ============================================================================

UPDATE public.admin_granted_books agb
SET
    cover_image_url = COALESCE(bp.cover_image_url, mbb.cover_image_url),
    download_url = COALESCE(agb.download_url, mbb.download_url),
    format = COALESCE(agb.format, bp.format),
    description = COALESCE(agb.description, bp.description),
    pages = COALESCE(agb.pages, bp.pages)
FROM public.book_products bp
LEFT JOIN public.membership_benefit_books mbb
    ON bp.woocommerce_product_id = mbb.woocommerce_product_id
    AND mbb.is_active = TRUE
WHERE agb.product_id = bp.woocommerce_product_id
AND bp.is_active = TRUE
AND (agb.cover_image_url IS NULL OR agb.cover_image_url = '');

-- ============================================================================
-- 4. Sync cover_image_url from membership_benefit_books to book_products
-- ============================================================================

UPDATE public.book_products bp
SET cover_image_url = mbb.cover_image_url
FROM public.membership_benefit_books mbb
WHERE bp.woocommerce_product_id = mbb.woocommerce_product_id
AND mbb.is_active = TRUE
AND mbb.cover_image_url IS NOT NULL
AND (bp.cover_image_url IS NULL OR bp.cover_image_url = '');

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Book covers fix completed';
    RAISE NOTICE '  1. Fixed redeem_book_credit to use direct columns';
    RAISE NOTICE '  2. Updated redeemed books with cover images';
    RAISE NOTICE '  3. Updated admin granted books with cover images';
    RAISE NOTICE '  4. Synced cover images to book_products';
    RAISE NOTICE '============================================';
END $$;
