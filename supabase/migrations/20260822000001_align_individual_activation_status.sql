-- Align legacy individual profile status with the streamlined account activation requirements.
-- Professional fields remain optional and are not considered in this activation status.
UPDATE public.users
SET profile_completed = true,
    updated_at = NOW()
WHERE role = 'individual'
  AND COALESCE(TRIM(first_name), '') <> ''
  AND COALESCE(TRIM(last_name), '') <> ''
  AND COALESCE(TRIM(email), '') <> ''
  AND COALESCE(TRIM(phone), '') <> ''
  AND COALESCE(TRIM(country_code), '') <> ''
  AND COALESCE(profile_completed, false) = false;
