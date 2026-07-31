-- Migration: Fix user_has_bock_access to include direct WooCommerce purchases
-- Date: 2026-07-31
-- Description:
--   Previously, user_has_bock_access() only checked:
--     1. admin_granted_books
--     2. user_redeemed_books (membership credits already redeemed)
--
--   It did NOT check user_book_credits from direct WooCommerce purchases.
--   This caused a duplicate credit to be created when a user who already
--   bought the BoCK directly later received a professional membership.
--
--   Fix: Also check user_book_credits with source_type = 'woocommerce_order'
--   so that if the user already owns the BoCK (any source), no new credit
--   is granted when a membership is activated.
--
--   Normal flow is unchanged:
--     - Membership only (no prior BoCK purchase) → credit is granted → user
--       chooses language from the credit.
--     - Direct WooCommerce purchase → book appears directly in the correct
--       language, no credit needed.
--     - Admin grants book directly → no credit needed.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_bock_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Check admin_granted_books for any BoCK book
    IF EXISTS (
        SELECT 1
        FROM public.admin_granted_books agb
        JOIN public.book_products bp ON bp.woocommerce_product_id = agb.product_id
        WHERE agb.user_id = p_user_id
          AND agb.revoked_at IS NULL
          AND bp.category = 'bock'
          AND (agb.access_until IS NULL OR agb.access_until >= CURRENT_DATE)
    ) THEN
        RETURN TRUE;
    END IF;

    -- 2. Check user_redeemed_books for any BoCK redeemed from a membership credit
    IF EXISTS (
        SELECT 1
        FROM public.user_redeemed_books
        WHERE user_id = p_user_id
          AND book_product_group = 'bda-bock'
          AND (access_until IS NULL OR access_until >= CURRENT_DATE)
    ) THEN
        RETURN TRUE;
    END IF;

    -- 3. Check user_book_credits from a direct WooCommerce purchase
    --    (source_type = 'woocommerce_order' means the user bought the BoCK directly)
    --    We check both redeemed and unredeemed credits here because a direct
    --    purchase always grants access regardless of redemption state.
    IF EXISTS (
        SELECT 1
        FROM public.user_book_credits
        WHERE user_id = p_user_id
          AND book_product_group = 'bda-bock'
          AND source_type = 'woocommerce_order'
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- Grant execute permission (same as before)
GRANT EXECUTE ON FUNCTION public.user_has_bock_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_bock_access(UUID) TO service_role;

-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration: fix user_has_bock_access';
    RAISE NOTICE '  Added check for direct WooCommerce BoCK purchase';
    RAISE NOTICE '  (user_book_credits with source_type = woocommerce_order)';
    RAISE NOTICE '  No duplicate credits will be created when a user who';
    RAISE NOTICE '  already bought the BoCK directly gets a membership.';
    RAISE NOTICE '============================================';
END $$;
