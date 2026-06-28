-- ============================================================
-- PDP Tier System Migration
-- Adds tier column to pdp_licenses and updates activate_partnership
-- to automatically set tier based on product mapping
-- ============================================================

-- 1. Add tier column to pdp_licenses
ALTER TABLE public.pdp_licenses
  ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'standard'
    CHECK (tier IN ('standard', 'advanced', 'premium'));

-- 2. Backfill existing licenses based on max_programs
UPDATE public.pdp_licenses
SET tier = CASE
  WHEN max_programs >= 12 THEN 'premium'
  WHEN max_programs >= 8  THEN 'advanced'
  ELSE 'standard'
END
WHERE tier IS NULL OR tier = 'standard';

-- 3. Add tier to partnership_product_mapping (already exists, just confirm)
-- No change needed — tier column already exists in partnership_product_mapping

-- 4. Update activate_partnership to accept and store tier
CREATE OR REPLACE FUNCTION public.activate_partnership(
  p_user_id              uuid,
  p_partnership_type     character varying,
  p_woocommerce_order_id integer  DEFAULT NULL,
  p_woocommerce_product_id integer DEFAULT NULL,
  p_duration_months      integer  DEFAULT 12,
  p_max_programs         integer  DEFAULT 5,
  p_tier                 varchar  DEFAULT 'standard',
  p_admin_user_id        uuid     DEFAULT NULL,
  p_notes                text     DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_record       RECORD;
  v_existing_license_id UUID;
  v_license_id        UUID;
  v_license_number    VARCHAR(50);
  v_partner_code      VARCHAR(20);
  v_country_code      VARCHAR(2);
  v_previous_role     VARCHAR(50);
  v_new_role          VARCHAR(50);
  v_expiry_date       DATE;
  v_resolved_tier     VARCHAR(20);
BEGIN
  -- Resolve tier from max_programs if not explicitly provided
  v_resolved_tier := CASE
    WHEN p_tier IS NOT NULL AND p_tier != 'standard' THEN p_tier
    WHEN p_max_programs >= 12 THEN 'premium'
    WHEN p_max_programs >= 8  THEN 'advanced'
    ELSE 'standard'
  END;

  -- Fetch user
  SELECT * INTO v_user_record
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_record IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  v_previous_role := v_user_record.role;
  v_country_code  := COALESCE(SUBSTRING(v_user_record.country_code FROM 1 FOR 2), 'XX');
  v_expiry_date   := CURRENT_DATE + (p_duration_months || ' months')::INTERVAL;

  -- Determine new role (dual_partner logic)
  IF p_partnership_type = 'pdp' THEN
    IF v_previous_role IN ('ecp', 'dual_partner') THEN
      v_new_role := 'dual_partner';
    ELSE
      v_new_role := 'pdp';
    END IF;
  ELSE
    IF v_previous_role IN ('pdp', 'dual_partner') THEN
      v_new_role := 'dual_partner';
    ELSE
      v_new_role := 'ecp';
    END IF;
  END IF;

  -- Check for existing license
  IF p_partnership_type = 'pdp' THEN
    SELECT id INTO v_existing_license_id
    FROM public.pdp_licenses
    WHERE partner_id = p_user_id;
  ELSE
    SELECT id INTO v_existing_license_id
    FROM public.ecp_licenses
    WHERE partner_id = p_user_id;
  END IF;

  -- Renew / upgrade existing license
  IF v_existing_license_id IS NOT NULL THEN
    IF p_partnership_type = 'pdp' THEN
      UPDATE public.pdp_licenses
      SET expiry_date               = GREATEST(expiry_date, CURRENT_DATE) + (p_duration_months || ' months')::INTERVAL,
          status                    = 'active',
          program_submission_enabled = true,
          -- Always upgrade max_programs (never downgrade)
          max_programs              = GREATEST(max_programs, p_max_programs),
          -- Upgrade tier if new tier is higher
          tier                      = CASE
            WHEN v_resolved_tier = 'premium' THEN 'premium'
            WHEN v_resolved_tier = 'advanced' AND tier = 'standard' THEN 'advanced'
            ELSE tier
          END,
          updated_at                = NOW()
      WHERE id = v_existing_license_id
      RETURNING id INTO v_license_id;
    ELSE
      UPDATE public.ecp_licenses
      SET expiry_date = GREATEST(expiry_date, CURRENT_DATE) + (p_duration_months || ' months')::INTERVAL,
          status      = 'active',
          updated_at  = NOW()
      WHERE id = v_existing_license_id
      RETURNING id INTO v_license_id;
    END IF;

    -- Update role in case it needs upgrading to dual_partner
    UPDATE public.users
    SET role       = v_new_role::public.user_role,
        updated_at = NOW()
    WHERE id = p_user_id;

    UPDATE public.partners
    SET partner_type = CASE
          WHEN v_new_role = 'dual_partner' THEN 'dual_partner'
          ELSE partner_type
        END,
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.partnership_activation_logs (
      user_id, partnership_type, license_id, action, triggered_by,
      woocommerce_order_id, woocommerce_product_id,
      previous_role, new_role, notes
    ) VALUES (
      p_user_id, p_partnership_type, v_license_id, 'renewed',
      CASE WHEN p_admin_user_id IS NOT NULL THEN 'admin' ELSE 'webhook' END,
      p_woocommerce_order_id, p_woocommerce_product_id,
      v_previous_role, v_new_role, p_notes
    );

    RETURN v_license_id;
  END IF;

  -- Create new license
  v_partner_code   := public.generate_partner_code(p_partnership_type, v_country_code);
  v_license_number := 'LIC-' || v_partner_code || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  IF p_partnership_type = 'pdp' THEN
    INSERT INTO public.pdp_licenses (
      partner_id, license_number, partner_code, status,
      issue_date, expiry_date, max_programs, programs_used,
      program_submission_enabled, tier, admin_notes
    ) VALUES (
      p_user_id, v_license_number, v_partner_code, 'active',
      CURRENT_DATE, v_expiry_date, p_max_programs, 0, true,
      v_resolved_tier, p_notes
    )
    RETURNING id INTO v_license_id;

    INSERT INTO public.pdp_partner_profiles (
      partner_id, organization_name, primary_contact_name,
      primary_contact_email, primary_contact_phone, country, timezone
    ) VALUES (
      p_user_id,
      COALESCE(v_user_record.organization, v_user_record.company_name,
               v_user_record.first_name || ' ' || v_user_record.last_name),
      COALESCE(v_user_record.first_name || ' ' || v_user_record.last_name, ''),
      v_user_record.email,
      v_user_record.phone,
      v_user_record.country_code,
      COALESCE(v_user_record.timezone, 'UTC')
    )
    ON CONFLICT (partner_id) DO NOTHING;

  ELSE -- ECP
    INSERT INTO public.ecp_licenses (
      partner_id, license_number, partner_code, status,
      issue_date, expiry_date, territories, programs, notes
    ) VALUES (
      p_user_id, v_license_number, v_partner_code, 'active',
      CURRENT_DATE, v_expiry_date,
      ARRAY[UPPER(COALESCE(v_user_record.country_code, 'XX'))],
      ARRAY['CP']::certification_type[],
      p_notes
    )
    RETURNING id INTO v_license_id;
  END IF;

  -- Upgrade user role
  UPDATE public.users
  SET role       = v_new_role::public.user_role,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Update or create partners record
  UPDATE public.partners
  SET partner_type = CASE
        WHEN v_new_role = 'dual_partner' THEN 'dual_partner'
        ELSE p_partnership_type
      END,
      updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO public.partners (
    id, partner_type, company_name, contact_person,
    contact_email, contact_phone, country, is_active
  )
  SELECT
    p_user_id,
    p_partnership_type,
    COALESCE(v_user_record.company_name, v_user_record.first_name || ' ' || v_user_record.last_name),
    COALESCE(v_user_record.first_name || ' ' || v_user_record.last_name, ''),
    v_user_record.email,
    v_user_record.phone,
    v_user_record.country_code,
    true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.partners WHERE id = p_user_id
  );

  -- Audit log
  INSERT INTO public.partnership_activation_logs (
    user_id, partnership_type, license_id, action, triggered_by,
    woocommerce_order_id, woocommerce_product_id,
    previous_role, new_role, notes
  ) VALUES (
    p_user_id, p_partnership_type, v_license_id, 'activated',
    CASE WHEN p_admin_user_id IS NOT NULL THEN 'admin' ELSE 'webhook' END,
    p_woocommerce_order_id, p_woocommerce_product_id,
    v_previous_role, v_new_role, p_notes
  );

  RETURN v_license_id;
END;
$function$;

-- 5. Update can_pdp_submit_program to also return tier
CREATE OR REPLACE FUNCTION public.can_pdp_submit_program(p_partner_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_license RECORD;
  v_programs_count INTEGER;
BEGIN
  -- Get license
  SELECT * INTO v_license
  FROM public.pdp_licenses
  WHERE partner_id = p_partner_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'can_submit', false,
      'reason', 'No active license found',
      'max_programs', 0,
      'programs_used', 0,
      'remaining_slots', 0,
      'tier', null
    );
  END IF;

  -- Check if submission is enabled
  IF NOT v_license.program_submission_enabled THEN
    RETURN json_build_object(
      'can_submit', false,
      'reason', 'Program submission is temporarily disabled by BDA',
      'max_programs', v_license.max_programs,
      'programs_used', v_license.programs_used,
      'remaining_slots', v_license.max_programs - v_license.programs_used,
      'tier', v_license.tier
    );
  END IF;

  -- Check license status
  IF v_license.status NOT IN ('active', 'expiring_soon') THEN
    RETURN json_build_object(
      'can_submit', false,
      'reason', 'License is not active (status: ' || v_license.status || ')',
      'max_programs', v_license.max_programs,
      'programs_used', v_license.programs_used,
      'remaining_slots', v_license.max_programs - v_license.programs_used,
      'tier', v_license.tier
    );
  END IF;

  -- Count actual programs
  SELECT COUNT(*) INTO v_programs_count
  FROM public.pdp_programs
  WHERE provider_id = p_partner_id
    AND status NOT IN ('rejected', 'expired')
    AND removed_by_admin = false;

  -- Update programs_used if different
  IF v_programs_count != v_license.programs_used THEN
    UPDATE public.pdp_licenses SET programs_used = v_programs_count WHERE id = v_license.id;
    v_license.programs_used := v_programs_count;
  END IF;

  -- Check slot availability
  IF v_license.programs_used >= v_license.max_programs THEN
    RETURN json_build_object(
      'can_submit', false,
      'reason', 'Your program capacity is full. Upgrade your partnership plan to add more programs.',
      'max_programs', v_license.max_programs,
      'programs_used', v_license.programs_used,
      'remaining_slots', 0,
      'tier', v_license.tier
    );
  END IF;

  RETURN json_build_object(
    'can_submit', true,
    'reason', null,
    'max_programs', v_license.max_programs,
    'programs_used', v_license.programs_used,
    'remaining_slots', v_license.max_programs - v_license.programs_used,
    'tier', v_license.tier
  );
END;
$function$;

-- 6. Update get_pdp_license_info to return tier (if function exists)
CREATE OR REPLACE FUNCTION public.get_pdp_license_info(p_partner_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_license RECORD;
BEGIN
  SELECT * INTO v_license
  FROM public.pdp_licenses
  WHERE partner_id = p_partner_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN row_to_json(v_license);
END;
$function$;
