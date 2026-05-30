-- ============================================================
-- Migration: Create upgrade_requests table
-- Purpose: Allow partners to submit upgrade requests that
--          trigger email notifications to admin and can be
--          approved/rejected from the admin panel.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.upgrade_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  partner_email   TEXT NOT NULL,
  partner_name    TEXT NOT NULL,
  current_type    TEXT NOT NULL,   -- 'ecp' | 'pdp' | 'dual_partner'
  current_tier    TEXT,            -- 'standard' | 'advanced' | 'premium'
  requested_type  TEXT NOT NULL,   -- 'ecp' | 'pdp' | 'dual_partner'
  requested_tier  TEXT NOT NULL,   -- 'standard' | 'advanced' | 'premium'
  notes           TEXT,            -- optional message from partner
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES public.users(id)
);

-- RLS
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners can insert own requests" ON public.upgrade_requests;
CREATE POLICY "Partners can insert own requests"
  ON public.upgrade_requests FOR INSERT
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Partners can view own requests" ON public.upgrade_requests;
CREATE POLICY "Partners can view own requests"
  ON public.upgrade_requests FOR SELECT
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all requests" ON public.upgrade_requests;
CREATE POLICY "Admins can manage all requests"
  ON public.upgrade_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );
