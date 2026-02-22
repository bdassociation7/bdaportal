-- Force sync granted book 14509 with whatever is in membership_benefit_books

DO $$
DECLARE
    v_download_url TEXT;
    v_updated INTEGER;
BEGIN
    -- Get download URL from membership_benefit_books (any entry, even if NULL)
    SELECT download_url INTO v_download_url
    FROM public.membership_benefit_books
    WHERE woocommerce_product_id = 14509
    ORDER BY updated_at DESC
    LIMIT 1;

    -- Update granted book
    UPDATE public.admin_granted_books
    SET download_url = COALESCE(v_download_url, download_url),
        updated_at = NOW()
    WHERE product_id = 14509
      AND revoked_at IS NULL;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    IF v_download_url IS NOT NULL AND v_download_url != '' THEN
        RAISE NOTICE '✅ SUCCESS! Granted book updated with download URL: %', v_download_url;
        RAISE NOTICE '📊 Updated % rows', v_updated;
    ELSIF v_download_url = '' THEN
        RAISE NOTICE '⚠️  Download URL is empty string. Please check /admin/membership-benefit-books';
    ELSE
        RAISE NOTICE '⚠️  Download URL is NULL. Please check /admin/membership-benefit-books';
        RAISE NOTICE '📝 Make sure you clicked Save after adding the URL';
    END IF;
END $$;

-- Show final status
DO $$
DECLARE
    v_has_url BOOLEAN;
    v_url TEXT;
BEGIN
    SELECT
        download_url IS NOT NULL AND download_url != '',
        download_url
    INTO v_has_url, v_url
    FROM public.admin_granted_books
    WHERE product_id = 14509
      AND revoked_at IS NULL
    LIMIT 1;

    IF v_has_url THEN
        RAISE NOTICE '✅ FINAL STATUS: Granted book has download URL';
        RAISE NOTICE '🔗 URL: %', v_url;
    ELSE
        RAISE NOTICE '❌ FINAL STATUS: Granted book still has no download URL';
    END IF;
END $$;
