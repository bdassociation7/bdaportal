-- =============================================================================
-- Partnership Product Mapping & Auto-Activation System
-- Date: 2025-12-30
-- Description: Maps WooCommerce products to partnerships (PDP/ECP) and provides
--              automatic activation when purchased from the store
-- =============================================================================

-- =============================================================================
-- TABLE: partnership_product_mapping
-- Maps WooCommerce product IDs to partnership types
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.partnership_product_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WooCommerce product info
  woocommerce_product_id INTEGER NOT NULL UNIQUE,
  product_name VARCHAR(255) NOT NULL,

  -- Partnership type
  partnership_type VARCHAR(10) NOT NULL CHECK (partnership_type IN ('pdp', 'ecp')),

  -- License configuration
  license_duration_months INTEGER NOT NULL DEFAULT 12,
  max_programs INTEGER DEFAULT 5, -- For PDP only

  -- Pricing tier (for future use)
  tier VARCHAR(50) DEFAULT 'standard',

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partnership_mapping_product ON public.partnership_product_mapping(woocommerce_product_id);
CREATE INDEX IF NOT EXISTS idx_partnership_mapping_type ON public.partnership_product_mapping(partnership_type);
CREATE INDEX IF NOT EXISTS idx_partnership_mapping_active ON public.partnership_product_mapping(is_active);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_partnership_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_partnership_mapping_updated_at ON public.partnership_product_mapping;
CREATE TRIGGER set_partnership_mapping_updated_at
  BEFORE UPDATE ON public.partnership_product_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_partnership_mapping_updated_at();

-- Enable RLS
ALTER TABLE public.partnership_product_mapping ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage product mappings
DROP POLICY IF EXISTS partnership_mapping_admin_all ON public.partnership_product_mapping;
CREATE POLICY partnership_mapping_admin_all ON public.partnership_product_mapping
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- =============================================================================
-- TABLE: partnership_activation_logs
-- Logs all partnership activations for audit and troubleshooting
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.partnership_activation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES public.users(id),
  partnership_type VARCHAR(10) NOT NULL,
  license_id UUID,

  action VARCHAR(50) NOT NULL, -- 'activated', 'upgraded', 'renewed', 'failed'
  triggered_by VARCHAR(50) NOT NULL DEFAULT 'webhook', -- 'webhook', 'admin', 'system'

  woocommerce_order_id INTEGER,
  woocommerce_product_id INTEGER,

  previous_role VARCHAR(50),
  new_role VARCHAR(50),

  error_message TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partnership_logs_user ON public.partnership_activation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_partnership_logs_order ON public.partnership_activation_logs(woocommerce_order_id);
CREATE INDEX IF NOT EXISTS idx_partnership_logs_created ON public.partnership_activation_logs(created_at);

-- Enable RLS
ALTER TABLE public.partnership_activation_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
DROP POLICY IF EXISTS partnership_logs_admin_view ON public.partnership_activation_logs;
CREATE POLICY partnership_logs_admin_view ON public.partnership_activation_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- =============================================================================
-- FUNCTION: generate_partner_code
-- Generates unique partner code like PDP-EG-001 or ECP-US-001
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_partner_code(
  p_partnership_type VARCHAR(10),
  p_country_code VARCHAR(2)
)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_sequence INTEGER;
  v_partner_code VARCHAR(20);
BEGIN
  -- Determine prefix
  v_prefix := UPPER(p_partnership_type);

  -- Get next sequence for this type and country
  IF p_partnership_type = 'pdp' THEN
    SELECT COALESCE(MAX(
      CAST(SPLIT_PART(partner_code, '-', 3) AS INTEGER)
    ), 0) + 1 INTO v_sequence
    FROM public.pdp_licenses
    WHERE partner_code LIKE v_prefix || '-' || UPPER(COALESCE(p_country_code, 'XX')) || '-%';
  ELSE
    SELECT COALESCE(MAX(
      CAST(SPLIT_PART(partner_code, '-', 3) AS INTEGER)
    ), 0) + 1 INTO v_sequence
    FROM public.ecp_licenses
    WHERE partner_code LIKE v_prefix || '-' || UPPER(COALESCE(p_country_code, 'XX')) || '-%';
  END IF;

  -- Generate code
  v_partner_code := v_prefix || '-' || UPPER(COALESCE(p_country_code, 'XX')) || '-' || LPAD(v_sequence::TEXT, 3, '0');

  RETURN v_partner_code;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: activate_partnership
-- Main function to activate a partnership purchase
-- - Upgrades user role to pdp or ecp
-- - Creates license record
-- - Creates partner profile
-- - Returns license ID
-- =============================================================================

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
  v_user_record RECORD;
  v_existing_license_id UUID;
  v_license_id UUID;
  v_license_number VARCHAR(50);
  v_partner_code VARCHAR(20);
  v_country_code VARCHAR(2);
  v_previous_role VARCHAR(50);
  v_new_role VARCHAR(50);
  v_expiry_date DATE;
BEGIN
  -- Get user info
  SELECT * INTO v_user_record
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_record IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  v_previous_role := v_user_record.role;
  v_country_code := COALESCE(SUBSTRING(v_user_record.country_code FROM 1 FOR 2), 'XX');
  v_expiry_date := CURRENT_DATE + (p_duration_months || ' months')::INTERVAL;

  -- Check for existing license
  IF p_partnership_type = 'pdp' THEN
    SELECT id INTO v_existing_license_id
    FROM public.pdp_licenses
    WHERE partner_id = p_user_id;

    v_new_role := 'pdp';
  ELSE
    SELECT id INTO v_existing_license_id
    FROM public.ecp_licenses
    WHERE partner_id = p_user_id;

    v_new_role := 'ecp';
  END IF;

  -- If user already has a license, extend it
  IF v_existing_license_id IS NOT NULL THEN
    IF p_partnership_type = 'pdp' THEN
      UPDATE public.pdp_licenses
      SET expiry_date = GREATEST(expiry_date, CURRENT_DATE) + (p_duration_months || ' months')::INTERVAL,
          status = 'active',
          program_submission_enabled = true,
          max_programs = GREATEST(max_programs, p_max_programs),
          updated_at = NOW()
      WHERE id = v_existing_license_id
      RETURNING id INTO v_license_id;
    ELSE
      UPDATE public.ecp_licenses
      SET expiry_date = GREATEST(expiry_date, CURRENT_DATE) + (p_duration_months || ' months')::INTERVAL,
          status = 'active',
          updated_at = NOW()
      WHERE id = v_existing_license_id
      RETURNING id INTO v_license_id;
    END IF;

    -- Log renewal
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

  -- Generate unique license number and partner code
  v_partner_code := public.generate_partner_code(p_partnership_type, v_country_code);
  v_license_number := 'LIC-' || v_partner_code || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- Create new license
  IF p_partnership_type = 'pdp' THEN
    INSERT INTO public.pdp_licenses (
      partner_id,
      license_number,
      partner_code,
      status,
      issue_date,
      expiry_date,
      max_programs,
      programs_used,
      program_submission_enabled,
      admin_notes
    ) VALUES (
      p_user_id,
      v_license_number,
      v_partner_code,
      'active',
      CURRENT_DATE,
      v_expiry_date,
      p_max_programs,
      0,
      true,
      p_notes
    )
    RETURNING id INTO v_license_id;

    -- Create PDP partner profile if it doesn't exist
    INSERT INTO public.pdp_partner_profiles (
      partner_id,
      organization_name,
      primary_contact_name,
      primary_contact_email,
      primary_contact_phone,
      country,
      timezone
    ) VALUES (
      p_user_id,
      COALESCE(v_user_record.organization, v_user_record.company_name, v_user_record.first_name || ' ' || v_user_record.last_name),
      COALESCE(v_user_record.first_name || ' ' || v_user_record.last_name, ''),
      v_user_record.email,
      v_user_record.phone,
      v_user_record.country_code,
      COALESCE(v_user_record.timezone, 'UTC')
    )
    ON CONFLICT (partner_id) DO NOTHING;

  ELSE -- ECP
    INSERT INTO public.ecp_licenses (
      partner_id,
      license_number,
      partner_code,
      status,
      issue_date,
      expiry_date,
      territories,
      programs,
      notes
    ) VALUES (
      p_user_id,
      v_license_number,
      v_partner_code,
      'active',
      CURRENT_DATE,
      v_expiry_date,
      ARRAY[UPPER(COALESCE(v_user_record.country_code, 'XX'))],
      ARRAY['CP']::certification_type[],
      p_notes
    )
    RETURNING id INTO v_license_id;
  END IF;

  -- Upgrade user role
  UPDATE public.users
  SET role = v_new_role,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Log activation
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

-- Grant execute permission to service role only (for webhook)
REVOKE ALL ON FUNCTION public.activate_partnership FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_partnership TO service_role;

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON TABLE public.partnership_product_mapping IS 'Maps WooCommerce product IDs to partnership types (PDP/ECP) for automatic activation';
COMMENT ON TABLE public.partnership_activation_logs IS 'Audit log for all partnership activations, upgrades, and renewals';
COMMENT ON FUNCTION public.activate_partnership IS 'Activates or renews a partnership for a user, creating license and upgrading role';
COMMENT ON FUNCTION public.generate_partner_code IS 'Generates unique partner code like PDP-EG-001';
