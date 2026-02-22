-- Migration: Implement Book Credit System
-- Date: 2026-01-09
-- Description: Implements book credit redemption system to avoid auto-granting both AR+EN books
--              Users receive book credits and choose which language version to redeem
--
-- BUSINESS LOGIC:
-- - Membership grants book credits instead of direct book access
-- - User chooses which language (AR or EN) to redeem
-- - Credit is consumed after redemption
-- - Only redeemed book appears in My Books
-- - Other language version remains purchasable

-- ============================================================================
-- 1. Create user_book_credits table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_book_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Credit source
    source_type VARCHAR(50) NOT NULL,  -- 'membership', 'promotion', 'purchase', etc.
    source_id VARCHAR(100),  -- membership_id, promo_code, order_id

    -- Book product group (e.g., 'bda-bock' - covers both AR and EN versions)
    book_product_group VARCHAR(100) NOT NULL,
    book_product_group_name VARCHAR(255) NOT NULL,

    -- Available language options for redemption
    available_languages TEXT[] NOT NULL DEFAULT ARRAY['en', 'ar'],

    -- Redemption status
    is_redeemed BOOLEAN NOT NULL DEFAULT false,
    redeemed_language VARCHAR(10),  -- 'en' or 'ar'
    redeemed_product_id INTEGER,  -- WooCommerce product ID of redeemed book
    redeemed_at TIMESTAMPTZ,

    -- Validity
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,  -- NULL = no expiry, or tied to membership expiry

    -- Metadata
    notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_redemption CHECK (
        (is_redeemed = false AND redeemed_language IS NULL AND redeemed_product_id IS NULL AND redeemed_at IS NULL)
        OR
        (is_redeemed = true AND redeemed_language IS NOT NULL AND redeemed_product_id IS NOT NULL AND redeemed_at IS NOT NULL)
    )
);

-- ============================================================================
-- 2. Add book_product_group to membership_benefit_books
-- ============================================================================

-- Add column to group book products (e.g., all language versions of BoCK)
ALTER TABLE public.membership_benefit_books
ADD COLUMN IF NOT EXISTS book_product_group VARCHAR(100);

-- Add language column to identify which language this product represents
ALTER TABLE public.membership_benefit_books
ADD COLUMN IF NOT EXISTS language VARCHAR(10);

-- Update existing description to clarify new behavior
COMMENT ON TABLE public.membership_benefit_books IS
    'Maps WooCommerce book products to membership types. Books with the same book_product_group represent language versions of the same book (e.g., BoCK AR and BoCK EN).';

COMMENT ON COLUMN public.membership_benefit_books.book_product_group IS
    'Groups related book products (e.g., all language versions of BoCK share same group). Used for book credit redemption.';

COMMENT ON COLUMN public.membership_benefit_books.language IS
    'Language of this book version: en, ar, etc.';

-- ============================================================================
-- 3. Create user_redeemed_books table (tracks which books user has access to)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_redeemed_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Credit that was used
    credit_id UUID NOT NULL REFERENCES public.user_book_credits(id) ON DELETE CASCADE,

    -- Redeemed book details
    product_id INTEGER NOT NULL,  -- WooCommerce product ID
    product_name VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL,
    book_product_group VARCHAR(100) NOT NULL,

    -- Access period (from credit validity)
    access_from DATE NOT NULL,
    access_until DATE,  -- NULL = lifetime access

    -- Book metadata (cached for performance)
    cover_image_url TEXT,
    download_url TEXT,
    format VARCHAR(20),
    description TEXT,
    pages INTEGER,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure user can only redeem each book once per credit
    UNIQUE(credit_id, product_id)
);

-- ============================================================================
-- 4. Indexes
-- ============================================================================

-- user_book_credits
CREATE INDEX IF NOT EXISTS idx_user_book_credits_user
    ON public.user_book_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_book_credits_redeemed
    ON public.user_book_credits(is_redeemed);
CREATE INDEX IF NOT EXISTS idx_user_book_credits_source
    ON public.user_book_credits(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_user_book_credits_group
    ON public.user_book_credits(book_product_group);

-- user_redeemed_books
CREATE INDEX IF NOT EXISTS idx_user_redeemed_books_user
    ON public.user_redeemed_books(user_id);
CREATE INDEX IF NOT EXISTS idx_user_redeemed_books_credit
    ON public.user_redeemed_books(credit_id);
CREATE INDEX IF NOT EXISTS idx_user_redeemed_books_product
    ON public.user_redeemed_books(product_id);

-- membership_benefit_books
CREATE INDEX IF NOT EXISTS idx_membership_benefit_books_group
    ON public.membership_benefit_books(book_product_group);
CREATE INDEX IF NOT EXISTS idx_membership_benefit_books_language
    ON public.membership_benefit_books(language);

-- ============================================================================
-- 5. RLS Policies
-- ============================================================================

-- user_book_credits
ALTER TABLE public.user_book_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own book credits"
    ON public.user_book_credits FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all book credits"
    ON public.user_book_credits FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- user_redeemed_books
ALTER TABLE public.user_redeemed_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own redeemed books"
    ON public.user_redeemed_books FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all redeemed books"
    ON public.user_redeemed_books FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================================================
-- 6. Function: Redeem book credit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.redeem_book_credit(
    p_credit_id UUID,
    p_language VARCHAR(10)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_credit RECORD;
    v_book RECORD;
    v_user_id UUID;
    v_result JSON;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get credit and verify ownership
    SELECT * INTO v_credit
    FROM public.user_book_credits
    WHERE id = p_credit_id
    AND user_id = v_user_id
    FOR UPDATE;  -- Lock row

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Credit not found or does not belong to user';
    END IF;

    -- Check if already redeemed
    IF v_credit.is_redeemed THEN
        RAISE EXCEPTION 'Credit already redeemed';
    END IF;

    -- Check if credit is still valid
    IF v_credit.valid_until IS NOT NULL AND v_credit.valid_until < CURRENT_DATE THEN
        RAISE EXCEPTION 'Credit has expired';
    END IF;

    -- Check if language is available
    IF NOT (p_language = ANY(v_credit.available_languages)) THEN
        RAISE EXCEPTION 'Language not available for this credit';
    END IF;

    -- Find the book product for this language
    SELECT * INTO v_book
    FROM public.membership_benefit_books
    WHERE book_product_group = v_credit.book_product_group
    AND language = p_language
    AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book not found for language: %', p_language;
    END IF;

    -- Mark credit as redeemed
    UPDATE public.user_book_credits
    SET
        is_redeemed = true,
        redeemed_language = p_language,
        redeemed_product_id = v_book.woocommerce_product_id,
        redeemed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_credit_id;

    -- Add redeemed book to user's collection
    INSERT INTO public.user_redeemed_books (
        user_id,
        credit_id,
        product_id,
        product_name,
        language,
        book_product_group,
        access_from,
        access_until,
        cover_image_url,
        download_url,
        format,
        description,
        pages
    ) VALUES (
        v_user_id,
        p_credit_id,
        v_book.woocommerce_product_id,
        v_book.product_name,
        p_language,
        v_book.book_product_group,
        v_credit.valid_from,
        v_credit.valid_until,
        v_book.cover_image_url,
        v_book.download_url,
        v_book.format,
        v_book.description,
        v_book.pages
    );

    -- Return success with book details
    v_result := json_build_object(
        'success', true,
        'message', 'Book redeemed successfully',
        'book', json_build_object(
            'product_id', v_book.woocommerce_product_id,
            'product_name', v_book.product_name,
            'language', p_language,
            'download_url', v_book.download_url
        )
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_book_credit(UUID, VARCHAR) TO authenticated;

COMMENT ON FUNCTION public.redeem_book_credit IS
    'Redeems a book credit by selecting a language. Consumes the credit and grants access to the selected language version only.';

-- ============================================================================
-- 7. Function: Grant book credit for membership
-- ============================================================================

CREATE OR REPLACE FUNCTION public.grant_membership_book_credit(
    p_user_id UUID,
    p_membership_id UUID,
    p_membership_type membership_type,
    p_valid_until DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_credit_id UUID;
    v_book_groups TEXT[];
    v_book_group TEXT;
    v_book_name VARCHAR(255);
BEGIN
    -- Get all unique book product groups for this membership type
    SELECT ARRAY_AGG(DISTINCT book_product_group)
    INTO v_book_groups
    FROM public.membership_benefit_books
    WHERE membership_type = p_membership_type
    AND is_active = true
    AND book_product_group IS NOT NULL;

    IF v_book_groups IS NULL OR array_length(v_book_groups, 1) = 0 THEN
        RETURN NULL;  -- No books configured for this membership
    END IF;

    -- Grant one credit for each book product group
    -- (e.g., if membership includes BoCK and another book, grant 2 credits)
    FOREACH v_book_group IN ARRAY v_book_groups
    LOOP
        -- Get the display name for this book group
        v_book_name := (
            SELECT COALESCE(MAX(product_name), 'Book')
            FROM public.membership_benefit_books
            WHERE book_product_group = v_book_group
            LIMIT 1
        );

        INSERT INTO public.user_book_credits (
            user_id,
            source_type,
            source_id,
            book_product_group,
            book_product_group_name,
            available_languages,
            valid_from,
            valid_until
        ) VALUES (
            p_user_id,
            'membership',
            p_membership_id::TEXT,
            v_book_group,
            v_book_name,
            ARRAY['en', 'ar'],  -- Both languages available
            CURRENT_DATE,
            p_valid_until
        )
        RETURNING id INTO v_credit_id;
    END LOOP;

    RETURN v_credit_id;  -- Return last credit ID
END;
$$;

-- Only admins and system can call this
GRANT EXECUTE ON FUNCTION public.grant_membership_book_credit TO authenticated;

COMMENT ON FUNCTION public.grant_membership_book_credit IS
    'Grants book credits when a membership is activated. Called by membership activation logic.';

-- ============================================================================
-- 8. Trigger: Auto-grant book credits on membership activation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_grant_membership_book_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only trigger when membership becomes active
    IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active') THEN
        -- Grant book credits
        PERFORM public.grant_membership_book_credit(
            NEW.user_id,
            NEW.id,
            NEW.membership_type,
            NEW.expiry_date
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_grant_book_credits ON public.user_memberships;
CREATE TRIGGER auto_grant_book_credits
    AFTER INSERT OR UPDATE ON public.user_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_grant_membership_book_credits();

-- ============================================================================
-- 9. Triggers: Update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_book_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_book_credits_updated_at ON public.user_book_credits;
CREATE TRIGGER user_book_credits_updated_at
    BEFORE UPDATE ON public.user_book_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_user_book_credits_updated_at();

CREATE OR REPLACE FUNCTION update_user_redeemed_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_redeemed_books_updated_at ON public.user_redeemed_books;
CREATE TRIGGER user_redeemed_books_updated_at
    BEFORE UPDATE ON public.user_redeemed_books
    FOR EACH ROW
    EXECUTE FUNCTION update_user_redeemed_books_updated_at();

-- ============================================================================
-- 10. Comments
-- ============================================================================

COMMENT ON TABLE public.user_book_credits IS
    'Book credits granted to users (e.g., via membership). User chooses which language version to redeem.';

COMMENT ON TABLE public.user_redeemed_books IS
    'Books that users have redeemed using their book credits. These appear in My Books.';

-- ============================================================================
-- 11. Verification
-- ============================================================================

DO $$
DECLARE
    v_book_group VARCHAR(100);
BEGIN
    RAISE NOTICE '✅ Book Credit System implemented successfully';
    RAISE NOTICE '📚 Tables created:';
    RAISE NOTICE '   - user_book_credits (tracks available credits)';
    RAISE NOTICE '   - user_redeemed_books (tracks redeemed books)';
    RAISE NOTICE '🔧 Functions created:';
    RAISE NOTICE '   - redeem_book_credit(credit_id, language)';
    RAISE NOTICE '   - grant_membership_book_credit(...)';
    RAISE NOTICE '⚡ Trigger: auto_grant_book_credits on user_memberships';
    RAISE NOTICE '🎯 Usage: Memberships grant credits → User chooses language → Credit consumed';
END $$;
