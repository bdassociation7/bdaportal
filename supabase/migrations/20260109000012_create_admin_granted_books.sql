-- Migration: Create Admin Granted Books System
-- Date: 2026-01-09
-- Description: Allows admins to manually grant book access to users
--              (complimentary access, partnerships, refunds, corrections, etc.)

-- ============================================================================
-- 1. Create admin_granted_books table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_granted_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User receiving access
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Book details
    product_id INTEGER NOT NULL,  -- WooCommerce product ID
    product_name VARCHAR(255) NOT NULL,

    -- Access period
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    access_from DATE NOT NULL DEFAULT CURRENT_DATE,
    access_until DATE,  -- NULL = lifetime access

    -- Grant tracking
    grant_reason VARCHAR(50) NOT NULL,  -- 'complimentary', 'partnership', 'refund', 'correction', 'demo'
    grant_notes TEXT,
    granted_by UUID NOT NULL REFERENCES public.users(id),  -- Admin who granted

    -- Book metadata (cached for performance)
    language VARCHAR(10),
    format VARCHAR(20),
    category VARCHAR(100),
    cover_image_url TEXT,
    description TEXT,
    pages INTEGER,
    download_url TEXT,

    -- Audit trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.users(id),
    revoke_reason TEXT,

    -- Constraints
    CONSTRAINT admin_granted_books_unique_user_product UNIQUE(user_id, product_id),
    CONSTRAINT admin_granted_books_grant_reason_check CHECK (
        grant_reason IN ('complimentary', 'partnership', 'refund', 'correction', 'demo', 'other')
    )
);

-- ============================================================================
-- 2. Create indexes
-- ============================================================================

CREATE INDEX idx_admin_granted_books_user_id ON public.admin_granted_books(user_id);
CREATE INDEX idx_admin_granted_books_product_id ON public.admin_granted_books(product_id);
CREATE INDEX idx_admin_granted_books_granted_by ON public.admin_granted_books(granted_by);
CREATE INDEX idx_admin_granted_books_revoked ON public.admin_granted_books(revoked_at) WHERE revoked_at IS NULL;

-- ============================================================================
-- 3. Create RLS policies
-- ============================================================================

ALTER TABLE public.admin_granted_books ENABLE ROW LEVEL SECURITY;

-- Users can view their own granted books
CREATE POLICY "Users can view their own granted books"
ON public.admin_granted_books FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    AND revoked_at IS NULL
);

-- Admins can view all granted books
CREATE POLICY "Admins can view all granted books"
ON public.admin_granted_books FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Admins can grant books
CREATE POLICY "Admins can grant books"
ON public.admin_granted_books FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Admins can update granted books (mainly for revocation)
CREATE POLICY "Admins can update granted books"
ON public.admin_granted_books FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- ============================================================================
-- 4. Create RPC function: grant_book_access
-- ============================================================================

CREATE OR REPLACE FUNCTION public.grant_book_access(
    p_user_id UUID,
    p_product_id INTEGER,
    p_grant_reason VARCHAR(50),
    p_grant_notes TEXT DEFAULT NULL,
    p_access_until DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_book RECORD;
    v_grant_id UUID;
    v_granted_by UUID;
BEGIN
    -- Get current admin user
    v_granted_by := auth.uid();

    IF v_granted_by IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify admin permissions
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = v_granted_by
        AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can grant book access';
    END IF;

    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Get book details from book_products
    SELECT * INTO v_book
    FROM public.book_products
    WHERE woocommerce_product_id = p_product_id
    AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Book product not found or inactive. Product ID: %', p_product_id;
    END IF;

    -- Check if already granted (and not revoked)
    IF EXISTS (
        SELECT 1 FROM public.admin_granted_books
        WHERE user_id = p_user_id
        AND product_id = p_product_id
        AND revoked_at IS NULL
    ) THEN
        RAISE EXCEPTION 'User already has admin-granted access to this book';
    END IF;

    -- Grant access
    INSERT INTO public.admin_granted_books (
        user_id,
        product_id,
        product_name,
        grant_reason,
        grant_notes,
        granted_by,
        access_from,
        access_until,
        language,
        format,
        category,
        cover_image_url,
        description,
        pages
    ) VALUES (
        p_user_id,
        p_product_id,
        v_book.product_name,
        p_grant_reason,
        p_grant_notes,
        v_granted_by,
        CURRENT_DATE,
        p_access_until,
        v_book.language,
        v_book.format,
        v_book.category,
        v_book.cover_image_url,
        v_book.description,
        v_book.pages
    )
    RETURNING id INTO v_grant_id;

    RETURN json_build_object(
        'success', true,
        'grant_id', v_grant_id,
        'message', 'Book access granted successfully',
        'user_id', p_user_id,
        'product_id', p_product_id,
        'product_name', v_book.product_name
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- ============================================================================
-- 5. Create RPC function: revoke_book_access
-- ============================================================================

CREATE OR REPLACE FUNCTION public.revoke_book_access(
    p_grant_id UUID,
    p_revoke_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_revoked_by UUID;
    v_grant RECORD;
BEGIN
    -- Get current admin user
    v_revoked_by := auth.uid();

    IF v_revoked_by IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify admin permissions
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = v_revoked_by
        AND role IN ('admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can revoke book access';
    END IF;

    -- Get grant details
    SELECT * INTO v_grant
    FROM public.admin_granted_books
    WHERE id = p_grant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Grant not found';
    END IF;

    IF v_grant.revoked_at IS NOT NULL THEN
        RAISE EXCEPTION 'Book access already revoked';
    END IF;

    -- Revoke access
    UPDATE public.admin_granted_books
    SET
        revoked_at = NOW(),
        revoked_by = v_revoked_by,
        revoke_reason = p_revoke_reason,
        updated_at = NOW()
    WHERE id = p_grant_id;

    RETURN json_build_object(
        'success', true,
        'grant_id', p_grant_id,
        'message', 'Book access revoked successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- ============================================================================
-- 6. Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.grant_book_access(UUID, INTEGER, VARCHAR, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_book_access(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 7. Add comments
-- ============================================================================

COMMENT ON TABLE public.admin_granted_books IS
    'Books manually granted to users by admins (complimentary access, partnerships, refunds, corrections, demos). Separate from store purchases and credit redemptions.';

COMMENT ON COLUMN public.admin_granted_books.grant_reason IS
    'Reason for granting: complimentary (free gift), partnership (org agreement), refund (compensation), correction (system fix), demo (testing), other';

COMMENT ON FUNCTION public.grant_book_access IS
    'Admin RPC to manually grant book access to a user. Validates permissions, checks for duplicates, caches book metadata.';

COMMENT ON FUNCTION public.revoke_book_access IS
    'Admin RPC to revoke previously granted book access. Does not delete record, only marks as revoked for audit trail.';

-- ============================================================================
-- 8. Success message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Admin Granted Books system created';
    RAISE NOTICE '📚 Table: admin_granted_books';
    RAISE NOTICE '🔧 RPC: grant_book_access()';
    RAISE NOTICE '🔧 RPC: revoke_book_access()';
    RAISE NOTICE '🔒 RLS policies enabled';
    RAISE NOTICE '✨ Admins can now manually grant book access to users';
END $$;
