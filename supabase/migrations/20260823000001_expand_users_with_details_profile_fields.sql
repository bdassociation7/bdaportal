-- Keep the legacy column order intact, then append editable profile fields.
-- PostgreSQL requires CREATE OR REPLACE VIEW to preserve existing view column names
-- and their order. The settings screen reloads this view after a browser refresh.
CREATE OR REPLACE VIEW public.users_with_details AS
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  u.is_active,
  u.profile_completed,
  u.created_at,
  u.last_login_at,
  CASE
    WHEN u.role = 'individual' THEN 'Individual Member'
    WHEN u.role = 'ecp' THEN 'ECP Professional'
    WHEN u.role = 'pdp' THEN 'PDP Professional'
    WHEN u.role = 'admin' THEN 'Administrator'
    WHEN u.role = 'super_admin' THEN 'Super Administrator'
    ELSE 'Unknown'
  END AS role_display_name,
  u.phone,
  u.country_code,
  u.date_of_birth,
  u.job_title,
  u.organization,
  u.industry,
  u.experience_years,
  u.updated_at,
  u.preferred_language,
  u.timezone,
  u.notifications_enabled,
  u.company_name,
  u.wp_user_id,
  u.wp_sync_status,
  u.wp_last_sync,
  u.signup_type,
  u.created_from,
  u.national_id_number,
  u.passport_number,
  u.nationality,
  u.identity_verified,
  u.identity_verified_at,
  u.identity_verified_by
FROM public.users AS u;

ALTER VIEW public.users_with_details SET (security_invoker = true);
GRANT SELECT ON public.users_with_details TO authenticated;
