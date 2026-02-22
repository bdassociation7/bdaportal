-- Migration: Add Admin Function to Grant Book Credits
-- Date: 2026-01-09
-- Description: Creates an RPC function that admins can call to grant credits to all active members

-- ============================================================================
-- Function: Grant credits to all active memberships (Admin only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_grant_all_book_credits()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_membership RECORD;
    v_granted_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
    v_book_groups_count INTEGER;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Unauthorized: Admin access required'
        );
    END IF;

    -- Check if any books are configured
    SELECT COUNT(DISTINCT book_product_group)
    INTO v_book_groups_count
    FROM public.membership_benefit_books
    WHERE is_active = true
    AND book_product_group IS NOT NULL;

    IF v_book_groups_count = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No books configured. Please configure books in membership_benefit_books table first.'
        );
    END IF;

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

    RETURN json_build_object(
        'success', true,
        'granted', v_granted_count,
        'skipped', v_skipped_count,
        'book_groups', v_book_groups_count
    );
END;
$$;

-- Grant execute permission to authenticated users (function checks admin role internally)
GRANT EXECUTE ON FUNCTION public.admin_grant_all_book_credits() TO authenticated;

COMMENT ON FUNCTION public.admin_grant_all_book_credits() IS
    'Admin-only function to grant book credits to all active memberships. Checks for configured books first.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Admin function created: admin_grant_all_book_credits()';
    RAISE NOTICE '🔐 Only admins can execute this function';
    RAISE NOTICE '📝 Call from admin UI to grant credits to all active members';
END $$;
