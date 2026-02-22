-- Fix: Allow admin users to update other users (not just super_admin)
-- Issue: Role updates fail for admin users because only super_admin had UPDATE permissions

-- Drop any conflicting policies if they exist
DROP POLICY IF EXISTS "admins_update_all_users" ON public.users;

-- Add policy for admins to update all users
CREATE POLICY "admins_update_all_users" ON public.users
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Note: The existing policies remain:
-- - "users_update_own_profile" - Users can update their own profile
-- - "super_admins_manage_all_users" - Super admins can do everything
-- - "admins_view_all_users" - Admins can view all users
-- - This new policy adds: Admins can UPDATE all users
