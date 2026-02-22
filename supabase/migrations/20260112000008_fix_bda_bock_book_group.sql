-- Fix BDA BoCK membership benefit books to have correct book_product_group
-- This makes them show up as book credits where users can choose language

-- Update BDA BoCK entries to have proper book_product_group
UPDATE public.membership_benefit_books
SET
    book_product_group = 'bda-bock',
    language = 'ar',
    updated_at = NOW()
WHERE woocommerce_product_id = 14509  -- BDA BoCK AR
  AND book_product_group IS NULL;

UPDATE public.membership_benefit_books
SET
    book_product_group = 'bda-bock',
    language = 'en',
    updated_at = NOW()
WHERE woocommerce_product_id = 14954  -- BDA BoCK EN
  AND book_product_group IS NULL;

-- Verify the update
DO $$
DECLARE
    v_ar_count INTEGER;
    v_en_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_ar_count
    FROM public.membership_benefit_books
    WHERE woocommerce_product_id = 14509
      AND book_product_group = 'bda-bock'
      AND language = 'ar';

    SELECT COUNT(*) INTO v_en_count
    FROM public.membership_benefit_books
    WHERE woocommerce_product_id = 14954
      AND book_product_group = 'bda-bock'
      AND language = 'en';

    IF v_ar_count > 0 AND v_en_count > 0 THEN
        RAISE NOTICE '✅ BDA BoCK books updated successfully';
        RAISE NOTICE '   - Arabic version: % entries', v_ar_count;
        RAISE NOTICE '   - English version: % entries', v_en_count;
    ELSE
        RAISE WARNING '⚠️  Some BDA BoCK entries may not have been updated';
        RAISE NOTICE '   - Arabic entries: %', v_ar_count;
        RAISE NOTICE '   - English entries: %', v_en_count;
    END IF;
END $$;

-- Show current BDA BoCK configuration
SELECT
    id,
    membership_type,
    product_name,
    woocommerce_product_id,
    book_product_group,
    language,
    is_active
FROM public.membership_benefit_books
WHERE woocommerce_product_id IN (14509, 14954)
ORDER BY woocommerce_product_id;
