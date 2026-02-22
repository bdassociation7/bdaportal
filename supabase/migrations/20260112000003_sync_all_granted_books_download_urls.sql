-- Migration: One-time sync of download URLs for all granted books
-- Date: 2026-01-12
-- Description: Updates all existing granted books with download URLs from membership_benefit_books

-- ============================================================================
-- Sync download URLs for all granted books
-- ============================================================================

DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE public.admin_granted_books agb
    SET download_url = (
        SELECT mbb.download_url
        FROM public.membership_benefit_books mbb
        WHERE mbb.woocommerce_product_id = agb.product_id
          AND mbb.download_url IS NOT NULL
          AND mbb.is_active = true
        LIMIT 1
    ),
    updated_at = NOW()
    WHERE agb.download_url IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.membership_benefit_books mbb
        WHERE mbb.woocommerce_product_id = agb.product_id
          AND mbb.download_url IS NOT NULL
          AND mbb.is_active = true
    );

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count > 0 THEN
        RAISE NOTICE '✅ Synced download_url for % granted books', v_updated_count;
    ELSE
        RAISE NOTICE 'ℹ️  No granted books needed download_url updates';
    END IF;
END $$;

-- Show current status
DO $$
DECLARE
    v_total_count INTEGER;
    v_with_url_count INTEGER;
    v_without_url_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_count FROM public.admin_granted_books WHERE revoked_at IS NULL;
    SELECT COUNT(*) INTO v_with_url_count FROM public.admin_granted_books WHERE revoked_at IS NULL AND download_url IS NOT NULL;
    SELECT COUNT(*) INTO v_without_url_count FROM public.admin_granted_books WHERE revoked_at IS NULL AND download_url IS NULL;

    RAISE NOTICE '📊 Status: % total granted books, % with download URLs, % without', v_total_count, v_with_url_count, v_without_url_count;
END $$;
