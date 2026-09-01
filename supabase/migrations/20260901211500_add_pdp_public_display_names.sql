-- ============================================================================
-- PDP PROGRAMME PUBLIC DISPLAY NAMES
-- ============================================================================
-- Separates the public-directory title from the original BDA accreditation
-- record. The public name can be refined by the provider without changing the
-- original programme name, ID, slug, or detail-page title.
-- ============================================================================

ALTER TABLE public.pdp_programs
  ADD COLUMN IF NOT EXISTS public_display_name TEXT,
  ADD COLUMN IF NOT EXISTS public_display_name_ar TEXT;

COMMENT ON COLUMN public.pdp_programs.public_display_name
IS 'Optional title shown only in the public programmes directory. Does not change the approved programme name, ID, slug, or detail page.';

COMMENT ON COLUMN public.pdp_programs.public_display_name_ar
IS 'Optional Arabic title shown only in the public programmes directory. Does not change the approved programme name, ID, slug, or detail page.';

CREATE OR REPLACE FUNCTION public.enforce_pdp_program_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Once a programme is approved, its accreditation identity is immutable for
  -- every role. Providers may still update the separate public display names.
  IF OLD.status = 'approved'
     AND (
       NEW.program_name IS DISTINCT FROM OLD.program_name
       OR NEW.program_name_ar IS DISTINCT FROM OLD.program_name_ar
       OR NEW.program_id IS DISTINCT FROM OLD.program_id
       OR NEW.slug IS DISTINCT FROM OLD.slug
     ) THEN
    RAISE EXCEPTION 'Approved programme accreditation identity cannot be changed';
  END IF;

  NEW.public_display_name := NULLIF(BTRIM(NEW.public_display_name), '');
  NEW.public_display_name_ar := NULLIF(BTRIM(NEW.public_display_name_ar), '');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_pdp_program_identity ON public.pdp_programs;
CREATE TRIGGER enforce_pdp_program_identity
BEFORE UPDATE ON public.pdp_programs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_pdp_program_identity();

-- Keep the partner programme detail RPC compatible with the new fields. The
-- existing output order is retained; the two new values are appended.
CREATE OR REPLACE VIEW public.pdp_programs_with_enrollments AS
SELECT
  pp.id,
  pp.program_id,
  pp.program_name,
  pp.program_name_ar,
  pp.description,
  pp.description_ar,
  pp.provider_id,
  pp.provider_name,
  pp.max_pdc_credits,
  pp.activity_type,
  pp.bock_domain,
  pp.valid_from,
  pp.valid_until,
  pp.is_active,
  pp.created_by,
  pp.created_at,
  pp.updated_at,
  pp.status,
  pp.learning_outcomes,
  pp.duration_hours,
  pp.delivery_mode,
  pp.target_audience,
  pp.prerequisites,
  pp.review_notes,
  pp.reviewed_by,
  pp.reviewed_at,
  pp.country,
  pp.country_code,
  pp.delivery_language,
  pp.agenda_url,
  pp.brochure_url,
  pp.key_topics,
  pp.edited_by_admin,
  pp.admin_edited_at,
  pp.removed_by_admin,
  COALESCE(enrollment_stats.enrollment_count, 0::bigint) AS enrollment_count,
  COALESCE(enrollment_stats.total_pdcs, 0::bigint) AS total_pdcs,
  COALESCE(enrollment_stats.approved_pdcs, 0::bigint) AS approved_pdcs,
  pp.public_display_name,
  pp.public_display_name_ar
FROM public.pdp_programs pp
LEFT JOIN (
  SELECT
    pdc_entries.program_id,
    count(DISTINCT pdc_entries.user_id) AS enrollment_count,
    count(*) AS total_pdcs,
    count(*) FILTER (WHERE pdc_entries.status = 'approved'::public.pdc_status) AS approved_pdcs
  FROM public.pdc_entries
  WHERE pdc_entries.program_id IS NOT NULL
  GROUP BY pdc_entries.program_id
) enrollment_stats ON pp.program_id::text = enrollment_stats.program_id::text;
