-- Migration: Add Admin Booking Management RLS Policies
-- Date: 2026-01-20
-- Description: Adds missing RLS policies for admin exam booking management:
--   - Admins can UPDATE exam_bookings (reschedule, cancel, change status)
--   - Admins can manage ecp_vouchers (restore voucher on cancellation)
--   - Admins can INSERT into email_queue (send notifications)

-- ============================================================================
-- 1. exam_bookings - Add admin UPDATE policy
-- ============================================================================

-- Check if policy exists before creating (avoid duplicates)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'exam_bookings'
        AND policyname = 'Admins can update all bookings'
    ) THEN
        CREATE POLICY "Admins can update all bookings"
            ON public.exam_bookings
            FOR UPDATE
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
    END IF;
END $$;

-- ============================================================================
-- 2. ecp_vouchers - Add admin policies
-- ============================================================================

-- Admin SELECT policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'ecp_vouchers'
        AND policyname = 'Admins can view all ecp vouchers'
    ) THEN
        CREATE POLICY "Admins can view all ecp vouchers"
            ON public.ecp_vouchers
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE id = auth.uid()
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;
END $$;

-- Admin UPDATE policy (for restoring vouchers)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'ecp_vouchers'
        AND policyname = 'Admins can update ecp vouchers'
    ) THEN
        CREATE POLICY "Admins can update ecp vouchers"
            ON public.ecp_vouchers
            FOR UPDATE
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
    END IF;
END $$;

-- ============================================================================
-- 3. email_queue - Add admin INSERT policy
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'email_queue'
        AND policyname = 'Admins can insert into email queue'
    ) THEN
        CREATE POLICY "Admins can insert into email queue"
            ON public.email_queue
            FOR INSERT
            TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.users
                    WHERE id = auth.uid()
                    AND role IN ('admin', 'super_admin')
                )
            );
    END IF;
END $$;

-- ============================================================================
-- 4. exam_vouchers - Verify admin policy exists (should already have ALL policy)
-- ============================================================================

-- The exam_vouchers table should already have "Admins can manage all vouchers" policy
-- from the original voucher system migration. If not, add it:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'exam_vouchers'
        AND policyname = 'Admins can manage all vouchers'
    ) THEN
        CREATE POLICY "Admins can manage all vouchers"
            ON public.exam_vouchers
            FOR ALL
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
    END IF;
END $$;

-- ============================================================================
-- 5. Success Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Admin booking management RLS policies created successfully';
    RAISE NOTICE 'Admins can now:';
    RAISE NOTICE '  - Update exam_bookings (reschedule, cancel, change status)';
    RAISE NOTICE '  - View and update ecp_vouchers (restore vouchers)';
    RAISE NOTICE '  - Insert into email_queue (send notifications)';
END $$;
