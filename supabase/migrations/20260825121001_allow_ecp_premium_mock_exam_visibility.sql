-- ECP partners receive all premium mock exams as a role-based partnership benefit.
-- The existing service and exam-attempt RPCs already honour role = 'ecp'; this policy
-- aligns row visibility so premium rows are present in the ECP catalogue as well.

DROP POLICY IF EXISTS "Users can view accessible mock exams" ON public.mock_exams;

CREATE POLICY "Users can view accessible mock exams"
ON public.mock_exams FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    -- Free exams are always visible.
    is_premium = false
    OR
    -- ECP partners receive all active premium exams as part of their partnership.
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND role = 'ecp'
    )
    OR
    -- Individually purchased or granted premium access.
    EXISTS (
      SELECT 1
      FROM public.mock_exam_premium_access
      WHERE mock_exam_id = public.mock_exams.id
        AND user_id = auth.uid()
        AND (expires_at IS NULL OR expires_at > NOW())
    )
    OR
    -- Administrative access.
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  )
);
