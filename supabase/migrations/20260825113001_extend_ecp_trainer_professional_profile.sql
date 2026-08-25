-- Extend the ECP trainer record with a structured professional profile.
-- Additive only: existing trainers remain valid and no historical data is changed.

ALTER TABLE public.ecp_trainers
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS organisation TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS professional_experience_years SMALLINT,
  ADD COLUMN IF NOT EXISTS training_experience_years SMALLINT,
  ADD COLUMN IF NOT EXISTS expertise_areas TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS delivery_languages TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.ecp_trainers
  DROP CONSTRAINT IF EXISTS ecp_trainers_professional_experience_years_check,
  ADD CONSTRAINT ecp_trainers_professional_experience_years_check
    CHECK (professional_experience_years IS NULL OR professional_experience_years BETWEEN 0 AND 70),
  DROP CONSTRAINT IF EXISTS ecp_trainers_training_experience_years_check,
  ADD CONSTRAINT ecp_trainers_training_experience_years_check
    CHECK (training_experience_years IS NULL OR training_experience_years BETWEEN 0 AND 70);

COMMENT ON COLUMN public.ecp_trainers.job_title IS 'Trainer job title or professional role.';
COMMENT ON COLUMN public.ecp_trainers.organisation IS 'Trainer employer, consultancy, or independent practice.';
COMMENT ON COLUMN public.ecp_trainers.country_code IS 'Trainer primary professional country, stored as ISO 3166-1 alpha-2 code.';
COMMENT ON COLUMN public.ecp_trainers.professional_experience_years IS 'Years of relevant professional experience.';
COMMENT ON COLUMN public.ecp_trainers.training_experience_years IS 'Years of training, facilitation, or teaching experience.';
COMMENT ON COLUMN public.ecp_trainers.expertise_areas IS 'Trainer subject-matter expertise areas.';
COMMENT ON COLUMN public.ecp_trainers.delivery_languages IS 'Languages in which the trainer can deliver programmes.';
