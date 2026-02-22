-- Add default PDP and ECP product mappings for WooCommerce
-- Product IDs from bda-global.org store

INSERT INTO public.partnership_product_mapping (woocommerce_product_id, product_name, partnership_type, license_duration_months, max_programs, tier, is_active)
VALUES
  (14528, 'Professional Development Provider (PDP)', 'pdp', 12, 5, 'standard', true),
  (14522, 'Endorsed Certification Partner (ECP)', 'ecp', 12, NULL, 'standard', true)
ON CONFLICT (woocommerce_product_id) DO UPDATE SET
  product_name = EXCLUDED.product_name,
  partnership_type = EXCLUDED.partnership_type,
  license_duration_months = EXCLUDED.license_duration_months,
  max_programs = EXCLUDED.max_programs,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
