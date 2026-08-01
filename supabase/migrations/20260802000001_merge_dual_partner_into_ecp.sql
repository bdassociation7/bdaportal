-- Migration: Merge dual_partner role into ecp
-- ECP now includes PDP Standard access (up to 5 programs)
-- dual_partner is no longer a separate role

-- 1. Update all existing dual_partner users to ecp role
UPDATE public.users
SET role = 'ecp',
    updated_at = NOW()
WHERE role = 'dual_partner';

-- 2. Update partners table: dual_partner → ecp
UPDATE public.partners
SET partner_type = 'ecp',
    updated_at = NOW()
WHERE partner_type = 'dual_partner';

-- 3. Update activate_partnership function to never assign dual_partner
-- ECP buying PDP or PDP buying ECP → always stays ecp (not dual_partner)
CREATE OR REPLACE FUNCTION public.activate_partnership(
  p_user_id UUID,
  p_partnership_type VARCHAR,
  p_woocommerce_order_id INTEGER DEFAULT NULL,
  p_woocommerce_product_id INTEGER DEFAULT NULL,
  p_duration_months INTEGER DEFAULT 12,
  p_max_programs INTEGER DEFAULT 5,
  p_admin_user_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- Determine new role:
  -- ECP buying anything → stays ecp
  -- PDP buying ECP → becomes ecp (ECP includes PDP standard)
  -- PDP buying PDP → stays pdp
  -- Anyone buying ECP → ecp
  IF p_partnership_type = 'ecp' THEN
    v_new_role := 'ecp';
  ELSE
    -- buying pdp
    IF v_previous_role IN ('ecp') THEN
      -- ECP already has PDP standard included, just renew/add PDP license
      v_new_role := 'ecp';
    ELSE
      v_new_role := 'pdp';
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

  -- Renew existing license
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

    -- Update role
    UPDATE public.users
    SET role       = v_new_role::public.user_role,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Update partner_type (never dual_partner)
    UPDATE public.partners
    SET partner_type = CASE
          WHEN v_new_role = 'ecp' THEN 'ecp'
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

  -- Upgrade user role
  UPDATE public.users
  SET role       = v_new_role::public.user_role,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Update or create partners record (never dual_partner)
  UPDATE public.partners
  SET partner_type = CASE
        WHEN v_new_role = 'ecp' THEN 'ecp'
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
    CASE WHEN v_new_role = 'ecp' THEN 'ecp' ELSE p_partnership_type END,
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
$$;
