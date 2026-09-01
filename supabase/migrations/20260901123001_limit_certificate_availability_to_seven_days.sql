-- ============================================================================
-- LIMIT CERTIFICATE DOWNLOAD AVAILABILITY TO A MAXIMUM OF SEVEN DAYS
-- ============================================================================
-- A successful candidate is certified immediately for verification. The digital
-- certificate becomes downloadable on a randomly assigned date from one to
-- seven days after approval, without exposing that internal date to candidates.
-- ============================================================================

-- New certifications receive an availability date one to seven calendar days
-- after issue/approval. All live certificate-creation paths omit this column,
-- so the table default is the single control point.
ALTER TABLE public.user_certifications
ALTER COLUMN certificate_available_date
SET DEFAULT (CURRENT_DATE + (1 + FLOOR(RANDOM() * 7))::INTEGER);

-- Only shorten certificates that are still pending. Keep certificates already
-- available untouched, while ensuring a pending record is never set before
-- today or later than seven days after its issued date.
UPDATE public.user_certifications
SET certificate_available_date = GREATEST(
  CURRENT_DATE,
  LEAST(
    issued_date + 7,
    issued_date + (1 + FLOOR(RANDOM() * 7))::INTEGER
  )
)
WHERE certificate_available_date > CURRENT_DATE
  AND certificate_available_date > issued_date + 7;

COMMENT ON COLUMN public.user_certifications.certificate_available_date
IS 'Internal date when the digital certificate PDF becomes downloadable; assigned between one and seven days after approval.';
