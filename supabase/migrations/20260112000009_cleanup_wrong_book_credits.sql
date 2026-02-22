-- Clean up incorrect book credits and re-grant correct ones
-- Issue: Professional membership users received Glossary credits instead of BDA BoCK credits
-- Root cause: Old membership_benefit_books had wrong book_product_group values

-- ============================================================================
-- 1. Find and store users with wrong credits
-- ============================================================================

CREATE TEMP TABLE users_to_fix AS
SELECT DISTINCT
    ubc.user_id,
    ubc.source_id as membership_id,
    um.membership_type,
    um.expiry_date
FROM public.user_book_credits ubc
JOIN public.user_memberships um ON um.id::TEXT = ubc.source_id
WHERE ubc.is_redeemed = false
  AND ubc.source_type = 'membership'
  AND ubc.book_product_group != 'bda-bock'  -- Wrong book group
  AND um.membership_type = 'professional'
  AND um.status = 'active';

-- ============================================================================
-- 2. Delete wrong credits
-- ============================================================================

DO $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_book_credits
    WHERE is_redeemed = false
      AND source_type = 'membership'
      AND book_product_group != 'bda-bock'
      AND user_id IN (SELECT user_id FROM users_to_fix);

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RAISE NOTICE '🗑️  Deleted % incorrect book credits', v_deleted_count;
END $$;

-- ============================================================================
-- 3. Re-grant correct BDA BoCK credits
-- ============================================================================

DO $$
DECLARE
    v_user RECORD;
    v_credit_id UUID;
    v_granted_count INTEGER := 0;
BEGIN
    FOR v_user IN SELECT * FROM users_to_fix
    LOOP
        -- Check if they already have a bda-bock credit for this membership
        IF NOT EXISTS (
            SELECT 1 FROM public.user_book_credits
            WHERE user_id = v_user.user_id
              AND source_type = 'membership'
              AND source_id = v_user.membership_id
              AND book_product_group = 'bda-bock'
        ) THEN
            -- Grant correct BDA BoCK credit
            INSERT INTO public.user_book_credits (
                user_id,
                source_type,
                source_id,
                book_product_group,
                book_product_group_name,
                available_languages,
                valid_from,
                valid_until
            ) VALUES (
                v_user.user_id,
                'membership',
                v_user.membership_id,
                'bda-bock',
                'BDA BoCK™',
                ARRAY['en', 'ar'],
                CURRENT_DATE,
                v_user.expiry_date
            )
            RETURNING id INTO v_credit_id;

            v_granted_count := v_granted_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '✅ Granted % correct BDA BoCK credits', v_granted_count;
END $$;

-- ============================================================================
-- 4. Verify the fix
-- ============================================================================

DO $$
DECLARE
    v_correct_count INTEGER;
    v_wrong_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_correct_count
    FROM public.user_book_credits ubc
    JOIN public.user_memberships um ON um.id::TEXT = ubc.source_id
    WHERE ubc.is_redeemed = false
      AND ubc.source_type = 'membership'
      AND ubc.book_product_group = 'bda-bock'
      AND um.membership_type = 'professional'
      AND um.status = 'active';

    SELECT COUNT(*) INTO v_wrong_count
    FROM public.user_book_credits ubc
    JOIN public.user_memberships um ON um.id::TEXT = ubc.source_id
    WHERE ubc.is_redeemed = false
      AND ubc.source_type = 'membership'
      AND ubc.book_product_group != 'bda-bock'
      AND um.membership_type = 'professional'
      AND um.status = 'active';

    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICATION ===';
    RAISE NOTICE '✅ Correct (bda-bock) credits: %', v_correct_count;
    RAISE NOTICE '❌ Wrong credits remaining: %', v_wrong_count;

    IF v_wrong_count = 0 THEN
        RAISE NOTICE '🎉 All professional membership credits are now correct!';
    ELSE
        RAISE WARNING '⚠️  Still found % wrong credits - manual review needed', v_wrong_count;
    END IF;
END $$;

-- ============================================================================
-- 5. Summary
-- ============================================================================

SELECT
    COUNT(*) as total_unredeemed_credits,
    COUNT(*) FILTER (WHERE book_product_group = 'bda-bock') as correct_bock_credits,
    COUNT(*) FILTER (WHERE book_product_group != 'bda-bock') as wrong_credits
FROM public.user_book_credits
WHERE is_redeemed = false
  AND source_type = 'membership';
