-- =============================================================================
-- Migration: Add Individual Access to ECP Vouchers
-- =============================================================================
-- Problem: When ECP partners assign vouchers to individuals via assigned_to_email,
-- the individuals cannot see these vouchers due to missing RLS policy.
--
-- Solution: Add RLS policy allowing individuals to view vouchers assigned to their email.
-- =============================================================================

-- Add RLS policy for individuals to view vouchers assigned to their email
CREATE POLICY "Individuals can view vouchers assigned to their email"
  ON public.ecp_vouchers FOR SELECT
  TO authenticated
  USING (
    -- Match assigned_to_email (case-insensitive) with current user's email
    LOWER(assigned_to_email) = LOWER((SELECT email FROM public.users WHERE id = auth.uid()))
  );

-- Also add an index on assigned_to_email for performance (if not exists)
-- Note: Index already exists from original migration (idx_ecp_vouchers_assigned_email)
-- but let's add a lowercase version for case-insensitive lookups
CREATE INDEX IF NOT EXISTS idx_ecp_vouchers_assigned_email_lower
  ON public.ecp_vouchers(LOWER(assigned_to_email));

COMMENT ON POLICY "Individuals can view vouchers assigned to their email" ON public.ecp_vouchers IS
'Allows individuals to view vouchers that ECP partners have assigned to their email address';
