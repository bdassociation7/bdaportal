-- Fix: create_exam_voucher_from_purchase used 'unused' which is not a valid voucher_status enum value
-- The correct value is 'available' (enum was changed in Dec 2025 migration)
-- Also fix: exam_language was incorrectly set to 'en' for Arabic exam products
-- Also fix: woocommerce_order_id parameter type changed from TEXT to INTEGER to match column type

-- Fix 1: Correct exam_language for Arabic exam products
UPDATE public.certification_products
SET exam_language = 'ar'
WHERE woocommerce_product_name ILIKE '%Arabic%'
AND exam_language = 'en';

-- Fix 2: Recreate create_exam_voucher_from_purchase with correct enum value and parameter type
CREATE OR REPLACE FUNCTION public.create_exam_voucher_from_purchase(
    p_user_id UUID,
    p_woocommerce_order_id INTEGER,
    p_certification_product_id UUID,
    p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE(
    voucher_id UUID,
    voucher_code TEXT,
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    v_product RECORD;
    v_voucher_code TEXT;
    v_voucher_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_existing_count INTEGER;
    v_vouchers_needed INTEGER;
    v_created_count INTEGER := 0;
    i INTEGER;
BEGIN
    -- Get product configuration
    SELECT * INTO v_product
    FROM public.certification_products
    WHERE id = p_certification_product_id
    AND is_active = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            NULL::UUID,
            NULL::TEXT,
            false,
            'Certification product not found or inactive'::TEXT;
        RETURN;
    END IF;

    -- Check how many vouchers already exist for this order + product combination
    SELECT COUNT(*) INTO v_existing_count
    FROM public.exam_vouchers
    WHERE woocommerce_order_id = p_woocommerce_order_id
    AND certification_product_id = p_certification_product_id
    AND user_id = p_user_id;

    -- Calculate how many vouchers we need to create
    -- (quantity purchased * vouchers_per_purchase) - already created
    v_vouchers_needed := (p_quantity * v_product.vouchers_per_purchase) - v_existing_count;

    IF v_vouchers_needed <= 0 THEN
        RETURN QUERY SELECT
            NULL::UUID,
            NULL::TEXT,
            true,
            format('Vouchers already exist for this order (existing: %s)', v_existing_count)::TEXT;
        RETURN;
    END IF;

    -- Calculate expiration date
    v_expires_at := NOW() + (v_product.voucher_validity_months || ' months')::INTERVAL;

    -- Create the required number of vouchers
    FOR i IN 1..v_vouchers_needed LOOP
        -- Generate unique voucher code
        v_voucher_code := public.generate_voucher_code(v_product.certification_type, v_product.exam_language);

        -- Insert voucher with correct status value 'available' (not 'unused' which is invalid)
        INSERT INTO public.exam_vouchers (
            code,
            user_id,
            certification_type,
            exam_language,
            quiz_id,
            woocommerce_order_id,
            certification_product_id,
            purchased_at,
            status,
            expires_at,
            admin_notes
        ) VALUES (
            v_voucher_code,
            p_user_id,
            v_product.certification_type,
            v_product.exam_language,
            v_product.quiz_id,
            p_woocommerce_order_id,
            p_certification_product_id,
            NOW(),
            'available',
            v_expires_at,
            format('Auto-generated from WooCommerce order #%s', p_woocommerce_order_id::TEXT)
        )
        RETURNING id INTO v_voucher_id;

        v_created_count := v_created_count + 1;

        RETURN QUERY SELECT
            v_voucher_id,
            v_voucher_code,
            true,
            NULL::TEXT;
    END LOOP;

    -- Safety check
    IF v_created_count = 0 THEN
        RETURN QUERY SELECT
            NULL::UUID,
            NULL::TEXT,
            false,
            'No vouchers were created'::TEXT;
    END IF;

    RETURN;
END;
$func$;

COMMENT ON FUNCTION public.create_exam_voucher_from_purchase IS 
'Creates exam vouchers from WooCommerce purchases. Fixed 2026-04-17: changed status from unused to available, fixed exam_language for Arabic products, fixed parameter type from TEXT to INTEGER.';
