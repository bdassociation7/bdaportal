-- After adding download URL to membership_benefit_books, sync it to granted book

DO $$
DECLARE
    v_download_url TEXT;
BEGIN
    -- Get the download URL from membership_benefit_books
    SELECT download_url INTO v_download_url
    FROM public.membership_benefit_books
    WHERE woocommerce_product_id = 14509
      AND download_url IS NOT NULL
      AND is_active = true
    LIMIT 1;

    IF v_download_url IS NOT NULL THEN
        -- Update the granted book
        UPDATE public.admin_granted_books
        SET download_url = v_download_url,
            updated_at = NOW()
        WHERE product_id = 14509
          AND revoked_at IS NULL;

        RAISE NOTICE '✅ Granted book updated with download URL: %', v_download_url;
    ELSE
        RAISE NOTICE '⚠️  Still no download URL found. Please add it in /admin/membership-benefit-books first';
    END IF;
END $$;
