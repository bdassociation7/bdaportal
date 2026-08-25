-- ECP partners receive role-based access to published Learning System content.
-- This mirrors individual entitlement access without creating a separate licence record.

DROP POLICY IF EXISTS "curriculum_modules_read" ON public.curriculum_modules;

CREATE POLICY "curriculum_modules_read"
ON public.curriculum_modules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin', 'ecp')
  )
  OR (
    is_published = true
    AND EXISTS (
      SELECT 1
      FROM public.user_curriculum_access
      WHERE user_curriculum_access.user_id = auth.uid()
        AND user_curriculum_access.certification_type = curriculum_modules.certification_type
        AND user_curriculum_access.is_active = true
        AND user_curriculum_access.expires_at > NOW()
    )
  )
);
