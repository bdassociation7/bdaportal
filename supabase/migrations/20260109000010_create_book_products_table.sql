-- Create book_products table to explicitly define which WooCommerce products are books
-- This prevents membership products, learning system products, etc. from appearing in My Books

CREATE TABLE IF NOT EXISTS public.book_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    woocommerce_product_id INTEGER UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    language VARCHAR(10), -- 'en', 'ar', etc.
    format VARCHAR(20), -- 'pdf', 'epub', 'mobi'
    category VARCHAR(100), -- 'bock', 'glossary', 'study-guide', etc.
    cover_image_url TEXT,
    description TEXT,
    pages INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT book_products_language_check CHECK (language IN ('en', 'ar') OR language IS NULL),
    CONSTRAINT book_products_format_check CHECK (format IN ('pdf', 'epub', 'mobi') OR format IS NULL)
);

-- Create indexes
CREATE INDEX idx_book_products_woo_product_id ON public.book_products(woocommerce_product_id);
CREATE INDEX idx_book_products_language ON public.book_products(language) WHERE language IS NOT NULL;
CREATE INDEX idx_book_products_is_active ON public.book_products(is_active);
CREATE INDEX idx_book_products_category ON public.book_products(category) WHERE category IS NOT NULL;

-- Enable RLS
ALTER TABLE public.book_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone authenticated can view active book products
CREATE POLICY "Authenticated users can view active book products"
ON public.book_products FOR SELECT
TO authenticated
USING (is_active = true);

-- Only admins can insert/update/delete book products
CREATE POLICY "Admins can manage book products"
ON public.book_products FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Update timestamp trigger
CREATE TRIGGER update_book_products_updated_at
    BEFORE UPDATE ON public.book_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.book_products IS 'Defines which WooCommerce products are books (vs memberships, learning system, etc.). Used to filter My Books display.';
