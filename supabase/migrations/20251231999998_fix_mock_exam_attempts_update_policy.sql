-- Fix: Allow users to update their own mock exam attempts
-- This is needed for the completeExam function to update score, passed, completed_at, etc.

-- Drop the existing admin-only update policy
DROP POLICY IF EXISTS "Admins can manage attempts" ON public.mock_exam_attempts;

-- Create new policy: Users can update their own attempts
CREATE POLICY "Users can update their own attempts"
ON public.mock_exam_attempts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can still update any attempt
CREATE POLICY "Admins can update all attempts"
ON public.mock_exam_attempts FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Also add delete policy for admins (was combined before)
CREATE POLICY "Admins can delete attempts"
ON public.mock_exam_attempts FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);
