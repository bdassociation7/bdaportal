-- Migration: Sync User Book Credits on Login
-- Date: 2026-01-09
-- Description: Creates a function to sync book credits for a user on login
--              Auto-healing mechanism that grants missing credits

-- ============================================================================
-- Function: Sync book credits for the logged-in user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_user_book_credits()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_membership RECORD;
    v_granted_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
    v_no_membership BOOLEAN := true;
BEGIN
    -- Get the authenticated user's ID
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;

    -- Loop through all active memberships for this user
    FOR v_membership IN
        SELECT
            id,
            user_id,
            membership_type,
            expiry_date
        FROM public.user_memberships
        WHERE user_id = v_user_id
        AND status = 'active'
    LOOP
        v_no_membership := false;

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

        -- Check if there are books configured for this membership type
        IF NOT EXISTS (
            SELECT 1 FROM public.membership_benefit_books
            WHERE membership_type = v_membership.membership_type
            AND is_active = true
            AND book_product_group IS NOT NULL
        ) THEN
            -- No books configured, skip
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;

        -- Grant book credits for this membership
        PERFORM public.grant_membership_book_credit(
            v_membership.user_id,
            v_membership.id,
            v_membership.membership_type,
            v_membership.expiry_date
        );

        v_granted_count := v_granted_count + 1;
    END LOOP;

    -- Return summary
    RETURN json_build_object(
        'success', true,
        'granted', v_granted_count,
        'skipped', v_skipped_count,
        'has_membership', NOT v_no_membership
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail login if credit sync fails
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'granted', 0,
            'skipped', 0
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.sync_user_book_credits() TO authenticated;

COMMENT ON FUNCTION public.sync_user_book_credits() IS
    'Auto-sync book credits for the logged-in user. Checks active memberships and grants missing credits. Called on login for self-healing.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Login sync function created: sync_user_book_credits()';
    RAISE NOTICE '🔄 Auto-heals missing book credits on user login';
    RAISE NOTICE '✨ Transparent to users, no admin intervention needed';
END $$;
