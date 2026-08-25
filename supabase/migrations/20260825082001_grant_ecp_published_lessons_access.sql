-- ECP partners need the same role-based read access to published lessons
-- as they have to published curriculum modules.

DROP POLICY IF EXISTS "curriculum_lessons_read" ON public.curriculum_lessons;

CREATE POLICY "curriculum_lessons_read"
ON public.curriculum_lessons
FOR SELECT
TO authenticated
USING (
  (
    is_published = true
    AND EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'ecp'
    )
  )
  OR (
    is_published = true
    AND EXISTS (
      SELECT 1
      FROM public.curriculum_modules m
      JOIN public.user_curriculum_access a
        ON a.certification_type = m.certification_type
      WHERE m.id = curriculum_lessons.module_id
        AND a.user_id = auth.uid()
        AND a.is_active = true
        AND a.expires_at > NOW()
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
  )
);
