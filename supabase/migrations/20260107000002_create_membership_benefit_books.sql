-- Migration: Membership Benefit Books System
-- Date: 2026-01-07
-- Description: Map WooCommerce book products to membership types for auto-granting access
--
-- BUSINESS LOGIC:
-- - Books (like BDA BoCK) can be membership benefits
-- - When a user has an active membership, they automatically get access to mapped books
-- - Books appear in My Books section without purchase
-- - Access is tied to membership expiry

-- =============================================================================
-- TABLE: membership_benefit_books
-- Maps WooCommerce book products to membership types
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.membership_benefit_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- WooCommerce product info
    woocommerce_product_id INTEGER NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),

    -- Membership mapping
    membership_type membership_type NOT NULL,  -- 'basic' or 'professional'

    -- Book metadata (cached from WooCommerce for performance)
    cover_image_url TEXT,
    download_url TEXT,  -- Direct download URL or WooCommerce download endpoint
    format VARCHAR(20),  -- pdf, epub, mobi
    description TEXT,
    pages INTEGER,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

    -- Ensure unique mapping (one product can only be mapped to one membership type)
    UNIQUE(woocommerce_product_id, membership_type)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_membership_benefit_books_wc_product
    ON public.membership_benefit_books(woocommerce_product_id);

CREATE INDEX IF NOT EXISTS idx_membership_benefit_books_membership_type
    ON public.membership_benefit_books(membership_type);

CREATE INDEX IF NOT EXISTS idx_membership_benefit_books_active
    ON public.membership_benefit_books(is_active);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.membership_benefit_books ENABLE ROW LEVEL SECURITY;

-- Admins can manage all benefit books
CREATE POLICY "Admins can manage benefit books"
    ON public.membership_benefit_books
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- All authenticated users can view active benefit books
CREATE POLICY "Users can view active benefit books"
    ON public.membership_benefit_books
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- =============================================================================
-- TRIGGER: Update updated_at timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION update_membership_benefit_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS membership_benefit_books_updated_at ON public.membership_benefit_books;
CREATE TRIGGER membership_benefit_books_updated_at
    BEFORE UPDATE ON public.membership_benefit_books
    FOR EACH ROW
    EXECUTE FUNCTION update_membership_benefit_books_updated_at();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.membership_benefit_books IS 'Maps WooCommerce book products to membership types for auto-granting access';
COMMENT ON COLUMN public.membership_benefit_books.woocommerce_product_id IS 'WooCommerce product ID for the book';
COMMENT ON COLUMN public.membership_benefit_books.membership_type IS 'Which membership type gets this book (basic or professional)';
COMMENT ON COLUMN public.membership_benefit_books.download_url IS 'Direct download URL or path to book file';
