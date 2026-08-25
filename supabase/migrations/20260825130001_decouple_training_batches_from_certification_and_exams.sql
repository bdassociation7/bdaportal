-- Training batches are operational delivery records for the unified BDA curriculum.
-- Certification decisions and exam scheduling remain separate candidate-level workflows.
-- Preserve the historical classification under an explicitly legacy column only.

ALTER TABLE public.ecp_training_batches
  RENAME COLUMN certification_type TO legacy_certification_type;

ALTER TABLE public.ecp_training_batches
  ALTER COLUMN legacy_certification_type DROP NOT NULL;

DROP INDEX IF EXISTS public.idx_ecp_batches_cert_type;
ALTER TABLE public.ecp_training_batches
  DROP CONSTRAINT IF EXISTS valid_exam_date,
  DROP CONSTRAINT IF EXISTS valid_training_dates;

ALTER TABLE public.ecp_training_batches
  DROP COLUMN IF EXISTS exam_date,
  ALTER COLUMN training_start_date DROP NOT NULL,
  ALTER COLUMN training_end_date DROP NOT NULL;

ALTER TABLE public.ecp_training_batches
  ADD CONSTRAINT valid_training_dates
  CHECK (
    training_start_date IS NULL
    OR training_end_date IS NULL
    OR training_end_date >= training_start_date
  );

ALTER TABLE public.ecp_training_batches
  ADD COLUMN IF NOT EXISTS delivery_platform TEXT;

COMMENT ON COLUMN public.ecp_training_batches.legacy_certification_type
  IS 'Historical pre-2026 batch classification retained for reporting only. New unified training batches do not use certification type.';
COMMENT ON COLUMN public.ecp_training_batches.delivery_platform
  IS 'Optional operational delivery platform or joining information for online or hybrid training.';

DROP FUNCTION IF EXISTS public.generate_batch_code(UUID, certification_type);

CREATE OR REPLACE FUNCTION public.generate_batch_code(p_partner_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_partner_code TEXT;
  v_sequence INTEGER;
  v_year TEXT;
BEGIN
  SELECT UPPER(SUBSTRING(COALESCE(company_name, 'ECP') FROM 1 FOR 3))
  INTO v_partner_code
  FROM public.users
  WHERE id = p_partner_id;

  v_year := TO_CHAR(NOW(), 'YY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(batch_code FROM LENGTH(batch_code) - 2) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM public.ecp_training_batches
  WHERE partner_id = p_partner_id
    AND batch_code LIKE v_partner_code || '-TRN-' || v_year || '-%';

  RETURN v_partner_code || '-TRN-' || v_year || '-' || LPAD(v_sequence::TEXT, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_batch_code(UUID) TO authenticated;
