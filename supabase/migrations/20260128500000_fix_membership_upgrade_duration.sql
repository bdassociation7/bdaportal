-- ============================================================================
-- Migration: Fix Membership Upgrade Duration
-- Description: When upgrading membership tier (e.g., Basic → Professional),
--              the new membership should start fresh from today with full duration,
--              NOT extend on top of existing expiry date.
-- ============================================================================

-- ============================================================================
-- 1. Update activate_membership function with correct upgrade logic
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_membership(
    p_user_id UUID,
    p_membership_type membership_type,
    p_woocommerce_order_id INTEGER DEFAULT NULL,
    p_woocommerce_product_id INTEGER DEFAULT NULL,
    p_duration_months INTEGER DEFAULT 12,
    p_admin_user_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_membership_id UUID;
    v_membership_code TEXT;
    v_existing_membership RECORD;
    v_start_date DATE;
    v_expiry_date DATE;
    v_triggered_by TEXT;
    v_action TEXT;
    v_is_upgrade BOOLEAN := FALSE;
BEGIN
    -- Determine trigger source
    v_triggered_by := CASE WHEN p_admin_user_id IS NOT NULL THEN 'admin' ELSE 'webhook' END;

    -- Check for existing active membership
    SELECT * INTO v_existing_membership
    FROM public.user_memberships
    WHERE user_id = p_user_id
    AND status = 'active'
    ORDER BY expiry_date DESC
    LIMIT 1;

    IF v_existing_membership.id IS NOT NULL THEN
        -- Determine if this is an upgrade (tier change) or renewal (same tier)
        v_is_upgrade := (v_existing_membership.membership_type::text != p_membership_type::text);

        IF v_is_upgrade THEN
            -- UPGRADE: Start fresh from today with full duration
            -- The old tier is being replaced, not extended
            v_start_date := CURRENT_DATE;
            v_expiry_date := CURRENT_DATE + (p_duration_months || ' months')::INTERVAL;
            v_action := 'upgraded';
        ELSE
            -- RENEWAL: Extend from current expiry date
            -- Same tier, add time to existing membership
            v_start_date := v_existing_membership.start_date;
            v_expiry_date := v_existing_membership.expiry_date + (p_duration_months || ' months')::INTERVAL;
            v_action := 'renewed';
        END IF;

        UPDATE public.user_memberships
        SET
            start_date = CASE WHEN v_is_upgrade THEN v_start_date ELSE start_date END,
            expiry_date = v_expiry_date,
            renewal_count = renewal_count + 1,
            last_renewed_at = NOW(),
            membership_type = CASE
                WHEN p_membership_type = 'professional' THEN 'professional'::membership_type
                ELSE membership_type
            END,
            woocommerce_order_id = COALESCE(p_woocommerce_order_id, woocommerce_order_id),
            updated_at = NOW()
        WHERE id = v_existing_membership.id
        RETURNING id INTO v_membership_id;

        -- Log the action with appropriate details
        INSERT INTO public.membership_activation_logs (
            membership_id, user_id, action, previous_status, new_status,
            previous_expiry_date, new_expiry_date, triggered_by, admin_user_id,
            woocommerce_order_id, notes
        ) VALUES (
            v_membership_id, p_user_id, v_action, 'active', 'active',
            v_existing_membership.expiry_date, v_expiry_date, v_triggered_by, p_admin_user_id,
            p_woocommerce_order_id,
            CASE
                WHEN v_is_upgrade
                THEN COALESCE(p_notes || ' ', '') || '[Upgraded from ' || v_existing_membership.membership_type::text || ' to ' || p_membership_type::text || '. New start date: ' || v_start_date::text || ']'
                ELSE p_notes
            END
        );
    ELSE
        -- Create new membership (no existing active membership)
        v_membership_code := generate_membership_id();
        v_start_date := CURRENT_DATE;
        v_expiry_date := CURRENT_DATE + (p_duration_months || ' months')::INTERVAL;

        INSERT INTO public.user_memberships (
            user_id, membership_type, membership_id, start_date, expiry_date,
            status, woocommerce_order_id, woocommerce_product_id, activated_by, admin_notes
        ) VALUES (
            p_user_id, p_membership_type, v_membership_code, v_start_date, v_expiry_date,
            'active', p_woocommerce_order_id, p_woocommerce_product_id, p_admin_user_id, p_notes
        ) RETURNING id INTO v_membership_id;

        -- Log activation
        INSERT INTO public.membership_activation_logs (
            membership_id, user_id, action, new_status, new_expiry_date,
            triggered_by, admin_user_id, woocommerce_order_id, notes
        ) VALUES (
            v_membership_id, p_user_id, 'activated', 'active', v_expiry_date,
            v_triggered_by, p_admin_user_id, p_woocommerce_order_id, p_notes
        );
    END IF;

    RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 2. Add comment explaining the upgrade vs renewal logic
-- ============================================================================

COMMENT ON FUNCTION activate_membership IS
'Activates or updates a user membership.

UPGRADE (tier change, e.g., Basic → Professional):
- Starts fresh from TODAY
- Expiry = TODAY + duration_months
- Old tier benefits are immediately replaced

RENEWAL (same tier):
- Extends from current expiry date
- Expiry = current_expiry + duration_months
- Stacks additional time onto existing membership

NEW MEMBERSHIP (no existing active):
- Starts from TODAY
- Expiry = TODAY + duration_months';
