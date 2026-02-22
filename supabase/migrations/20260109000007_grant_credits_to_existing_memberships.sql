-- Migration: Grant Book Credits to Existing Active Memberships
-- Date: 2026-01-09
-- Description: Grants book credits to all existing active memberships
--              Run this AFTER configuring books in the membership_benefit_books table via admin UI

-- ============================================================================
-- Grant book credits to existing active memberships
-- ============================================================================

DO $$
DECLARE
    v_membership RECORD;
    v_granted_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
BEGIN
    -- Loop through all active memberships
    FOR v_membership IN
        SELECT
            um.id,
            um.user_id,
            um.membership_type,
            um.expiry_date
        FROM public.user_memberships um
        WHERE um.status = 'active'
        ORDER BY um.created_at ASC
    LOOP
        -- Check if this membership already has credits
        IF EXISTS (
            SELECT 1 FROM public.user_book_credits
            WHERE user_id = v_membership.user_id
            AND source_type = 'membership'
            AND source_id = v_membership.id::TEXT
        ) THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;

        -- Grant book credit for this membership
        PERFORM public.grant_membership_book_credit(
            v_membership.user_id,
            v_membership.id,
            v_membership.membership_type,
            v_membership.expiry_date
        );

        v_granted_count := v_granted_count + 1;
    END LOOP;

    RAISE NOTICE '✅ Book credits granted to % memberships', v_granted_count;
    RAISE NOTICE 'ℹ️  Skipped % memberships (already have credits)', v_skipped_count;

    IF v_granted_count = 0 AND v_skipped_count = 0 THEN
        RAISE NOTICE 'ℹ️  No active memberships found';
    END IF;
END $$;

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
    v_total_credits INTEGER;
    v_unredeemed_credits INTEGER;
BEGIN
    -- Count total credits
    SELECT COUNT(*) INTO v_total_credits
    FROM public.user_book_credits;

    -- Count unredeemed credits
    SELECT COUNT(*) INTO v_unredeemed_credits
    FROM public.user_book_credits
    WHERE is_redeemed = false;

    RAISE NOTICE '';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   Total book credits: %', v_total_credits;
    RAISE NOTICE '   Unredeemed credits: %', v_unredeemed_credits;
    RAISE NOTICE '   Redeemed credits: %', v_total_credits - v_unredeemed_credits;
END $$;
