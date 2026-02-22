-- Migration: Backfill download_url for existing admin_granted_books
-- Date: 2026-01-12
-- Description: Update existing granted books to include download_url from membership_benefit_books

-- ============================================================================
-- Backfill download_url for existing grants
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
    RAISE NOTICE '✅ Backfilled download_url for % existing granted books', v_updated_count;
END $$;
