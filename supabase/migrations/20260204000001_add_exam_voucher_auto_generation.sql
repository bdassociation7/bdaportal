-- Migration: Add Exam Voucher Auto-Generation from WooCommerce Purchases
-- Date: 2026-02-04
-- Description: Adds exam_language to certification_products and creates RPC function for voucher creation

-- =============================================================================
-- ADD EXAM LANGUAGE TO CERTIFICATION_PRODUCTS
-- =============================================================================

-- Add exam_language column to certification_products for EN/AR product variants
ALTER TABLE public.certification_products
ADD COLUMN IF NOT EXISTS exam_language exam_language NOT NULL DEFAULT 'en';

-- Add index for language filtering
CREATE INDEX IF NOT EXISTS idx_certification_products_language
ON public.certification_products(exam_language);

-- Add composite index for webhook lookup (product_id + active + language)
CREATE INDEX IF NOT EXISTS idx_certification_products_webhook_lookup
ON public.certification_products(woocommerce_product_id, is_active, exam_language);

COMMENT ON COLUMN public.certification_products.exam_language IS 'Language for the exam voucher: en (English) or ar (Arabic)';

-- =============================================================================
-- RPC FUNCTION: create_exam_voucher_from_purchase
-- Creates exam voucher(s) from WooCommerce purchase
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_exam_voucher_from_purchase(
    p_user_id UUID,
    p_certification_product_id UUID,
    p_woocommerce_order_id INTEGER,
    p_woocommerce_product_id INTEGER,
    p_quantity INTEGER DEFAULT 1
)
RETURNS TABLE (
    voucher_id UUID,
    voucher_code TEXT,
    success BOOLEAN,
    error_message TEXT
) AS $$
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

        -- Insert voucher
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
            'unused',
            v_expires_at,
            format('Auto-generated from WooCommerce order #%s', p_woocommerce_order_id)
        )
        RETURNING id INTO v_voucher_id;

        v_created_count := v_created_count + 1;

        RETURN QUERY SELECT
            v_voucher_id,
            v_voucher_code,
            true,
            NULL::TEXT;
    END LOOP;

    -- If no vouchers were created in the loop (shouldn't happen but safety check)
    IF v_created_count = 0 THEN
        RETURN QUERY SELECT
            NULL::UUID,
            NULL::TEXT,
            false,
            'No vouchers were created'::TEXT;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_exam_voucher_from_purchase(UUID, UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_exam_voucher_from_purchase(UUID, UUID, INTEGER, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION public.create_exam_voucher_from_purchase IS
'Creates exam voucher(s) from a WooCommerce purchase. Handles duplicate prevention and quantity-based voucher generation.';

-- =============================================================================
-- VOUCHER ACTIVATION LOG TABLE (for audit trail)
-- =============================================================================

-- Add voucher_activation_logs if not exists (similar to membership_activation_logs)
CREATE TABLE IF NOT EXISTS public.voucher_activation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    voucher_id UUID REFERENCES public.exam_vouchers(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    triggered_by TEXT NOT NULL DEFAULT 'webhook',
    woocommerce_order_id INTEGER,
    woocommerce_product_id INTEGER,
    certification_product_id UUID,
    error_message TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for voucher_activation_logs
CREATE INDEX IF NOT EXISTS idx_voucher_activation_logs_user ON public.voucher_activation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_voucher_activation_logs_voucher ON public.voucher_activation_logs(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_activation_logs_order ON public.voucher_activation_logs(woocommerce_order_id);
CREATE INDEX IF NOT EXISTS idx_voucher_activation_logs_created ON public.voucher_activation_logs(created_at);

-- RLS for voucher_activation_logs
ALTER TABLE public.voucher_activation_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view voucher activation logs"
ON public.voucher_activation_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Service role can insert logs (for webhooks)
CREATE POLICY "Service role can insert voucher activation logs"
ON public.voucher_activation_logs FOR INSERT
TO authenticated
WITH CHECK (true);

COMMENT ON TABLE public.voucher_activation_logs IS 'Audit log for exam voucher activations from WooCommerce purchases';
