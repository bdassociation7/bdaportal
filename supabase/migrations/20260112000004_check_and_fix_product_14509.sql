-- Check product 14509 and fix the granted book

-- Check if product 14509 exists in membership_benefit_books
DO $$
DECLARE
    v_product_name TEXT;
    v_download_url TEXT;
    v_exists BOOLEAN;
BEGIN
    -- Check membership_benefit_books
    SELECT
        product_name,
        download_url,
        TRUE
    INTO v_product_name, v_download_url, v_exists
    FROM public.membership_benefit_books
    WHERE woocommerce_product_id = 14509
      AND is_active = true
    LIMIT 1;

    IF v_exists THEN
        RAISE NOTICE '✅ Product 14509 found: %', v_product_name;
        IF v_download_url IS NOT NULL THEN
            RAISE NOTICE '✅ Download URL exists: %', v_download_url;

            -- Update the granted book with this download URL
            UPDATE public.admin_granted_books
            SET download_url = v_download_url,
                updated_at = NOW()
            WHERE product_id = 14509
              AND download_url IS NULL;

            RAISE NOTICE '✅ Updated granted book with download URL';
        ELSE
            RAISE NOTICE '⚠️  Product exists but NO download URL configured';
            RAISE NOTICE '📝 Action needed: Go to /admin/membership-benefit-books and add download URL for product 14509';
        END IF;
    ELSE
        RAISE NOTICE '❌ Product 14509 NOT found in membership_benefit_books';
        RAISE NOTICE '📝 Action needed: Go to /admin/membership-benefit-books and configure product 14509 first';
    END IF;
END $$;

-- Show current status of granted book
SELECT
    id,
    product_id,
    product_name,
    download_url IS NOT NULL as has_download_url,
    download_url,
    granted_at
FROM public.admin_granted_books
WHERE product_id = 14509
  AND revoked_at IS NULL;
