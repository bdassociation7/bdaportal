-- =============================================================================
-- Dual Partner Support Migration
-- Date: 2026-05-17
-- Description: 
--   1. Adds 'dual_partner' to user_role enum
--   2. Updates activate_partnership function to set role = 'dual_partner'
--      when user already holds the opposite partnership type
--   3. Adds new WooCommerce product mappings (ECP Standard, PDP Advanced, PDP Premium)
--   4. Updates partnership_product_mapping CHECK constraint to allow 'dual_partner'
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add 'dual_partner' to user_role enum (safe: only adds, never removes)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'dual_partner'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'dual_partner';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add new WooCommerce product mappings
--    (skip if already inserted to make migration idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.partnership_product_mapping
  (woocommerce_product_id, product_name, partnership_type, license_duration_months, max_programs, tier)
VALUES
  -- ECP Standard  (was missing)
  (23100, 'ECP Standard',   'ecp', 12, NULL, 'standard'),
  -- PDP Advanced  (was missing)
  (23098, 'PDP Advanced',   'pdp', 12, 8,    'advanced'),
  -- PDP Premium   (was missing)
  (23099, 'PDP Premium',    'pdp', 12, 12,   'premium')
ON CONFLICT (woocommerce_product_id) DO NOTHING;

-- Update ECP Advanced tier label
UPDATE public.partnership_product_mapping
SET tier = 'advanced'
WHERE woocommerce_product_id = 14522;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Replace activate_partnership with dual-partner-aware version
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.activate_partnership(
  p_user_id UUID,
  p_partnership_type VARCHAR(10),
  p_woocommerce_order_id INTEGER DEFAULT NULL,
  p_woocommerce_product_id INTEGER DEFAULT NULL,
  p_duration_months INTEGER DEFAULT 12,
  p_max_programs INTEGER DEFAULT 5,
  p_admin_user_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
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
BEGIN
  -- ── Fetch user ──────────────────────────────────────────────────────────────
  SELECT * INTO v_user_record
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_record IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  v_previous_role := v_user_record.role;
  v_country_code  := COALESCE(SUBSTRING(v_user_record.country_code FROM 1 FOR 2), 'XX');
  v_expiry_date   := CURRENT_DATE + (p_duration_months || ' months')::INTERVAL;

  -- ── Determine new role (dual_partner logic) ─────────────────────────────────
  IF p_partnership_type = 'pdp' THEN
    -- Buying PDP: if user already has ecp or dual_partner → dual_partner
    IF v_previous_role IN ('ecp', 'dual_partner') THEN
      v_new_role := 'dual_partner';
    ELSE
      v_new_role := 'pdp';
    END IF;
  ELSE
    -- Buying ECP: if user already has pdp or dual_partner → dual_partner
    IF v_previous_role IN ('pdp', 'dual_partner') THEN
      v_new_role := 'dual_partner';
    ELSE
      v_new_role := 'ecp';
    END IF;
  END IF;

  -- ── Check for existing license ───────────────────────────────────────────────
  IF p_partnership_type = 'pdp' THEN
    SELECT id INTO v_existing_license_id
    FROM public.pdp_licenses
    WHERE partner_id = p_user_id;
  ELSE
    SELECT id INTO v_existing_license_id
    FROM public.ecp_licenses
    WHERE partner_id = p_user_id;
  END IF;

  -- ── Renew existing license ───────────────────────────────────────────────────
  IF v_existing_license_id IS NOT NULL THEN
    IF p_partnership_type = 'pdp' THEN
      UPDATE public.pdp_licenses
      SET expiry_date              = GREATEST(expiry_date, CURRENT_DATE) + (p_duration_months || ' months')::INTERVAL,
          status                   = 'active',
          program_submission_enabled = true,
          max_programs             = GREATEST(max_programs, p_max_programs),
          updated_at               = NOW()
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

    -- Update partner_type in partners table if needed
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

  -- ── Create new license ───────────────────────────────────────────────────────
  v_partner_code   := public.generate_partner_code(p_partnership_type, v_country_code);
  v_license_number := 'LIC-' || v_partner_code || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  IF p_partnership_type = 'pdp' THEN
    INSERT INTO public.pdp_licenses (
      partner_id, license_number, partner_code, status,
      issue_date, expiry_date, max_programs, programs_used,
      program_submission_enabled, admin_notes
    ) VALUES (
      p_user_id, v_license_number, v_partner_code, 'active',
      CURRENT_DATE, v_expiry_date, p_max_programs, 0, true, p_notes
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

  -- ── Upgrade user role ────────────────────────────────────────────────────────
  UPDATE public.users
  SET role       = v_new_role::public.user_role,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- ── Update or create partners record ────────────────────────────────────────
  -- If a partners row already exists (from previous ECP/PDP), update partner_type
  UPDATE public.partners
  SET partner_type = CASE
        WHEN v_new_role = 'dual_partner' THEN 'dual_partner'
        ELSE p_partnership_type
      END,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- If no partners row exists yet, create one
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

  -- ── Audit log ────────────────────────────────────────────────────────────────
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant permissions
REVOKE ALL ON FUNCTION public.activate_partnership FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_partnership TO service_role;

COMMENT ON FUNCTION public.activate_partnership IS
  'Activates or renews a partnership. Automatically upgrades role to dual_partner when user holds both ECP and PDP licences.';
