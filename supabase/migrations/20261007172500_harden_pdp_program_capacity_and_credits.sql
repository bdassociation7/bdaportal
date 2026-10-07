-- ============================================================================
-- PDP PROGRAMME CAPACITY AND ACCREDITATION CREDIT GOVERNANCE
-- ============================================================================
-- Keep the licence slot counter derived from programme records, enforce the
-- purchased programme capacity at the database boundary, and preserve approved
-- programme duration / PDC values as accreditation facts.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.pdp_program_consumes_slot(
  p_status TEXT,
  p_removed_by_admin BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_status NOT IN ('rejected', 'expired')
     AND COALESCE(p_removed_by_admin, false) = false;
$$;

CREATE OR REPLACE FUNCTION public.sync_pdp_license_programs_used(
  p_partner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_programs_used INTEGER;
BEGIN
  IF p_partner_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_programs_used
  FROM public.pdp_programs
  WHERE provider_id = p_partner_id
    AND public.pdp_program_consumes_slot(status::TEXT, removed_by_admin);

  UPDATE public.pdp_licenses
  SET programs_used = v_programs_used
  WHERE partner_id = p_partner_id
    AND programs_used IS DISTINCT FROM v_programs_used;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_pdp_program_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_license public.pdp_licenses%ROWTYPE;
  v_existing_count INTEGER;
  v_new_consumes BOOLEAN;
  v_old_consumes BOOLEAN := false;
  v_requires_capacity_check BOOLEAN := false;
BEGIN
  v_new_consumes := public.pdp_program_consumes_slot(NEW.status::TEXT, NEW.removed_by_admin);

  IF TG_OP = 'INSERT' THEN
    v_requires_capacity_check := v_new_consumes;
  ELSE
    v_old_consumes := public.pdp_program_consumes_slot(OLD.status::TEXT, OLD.removed_by_admin);
    v_requires_capacity_check := v_new_consumes
      AND (NOT v_old_consumes OR NEW.provider_id IS DISTINCT FROM OLD.provider_id);
  END IF;

  IF v_requires_capacity_check THEN
    SELECT *
    INTO v_license
    FROM public.pdp_licenses
    WHERE partner_id = NEW.provider_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'An active PDP licence is required before a programme can be created';
    END IF;

    IF v_license.status NOT IN ('active', 'expiring_soon')
       OR NOT v_license.program_submission_enabled THEN
      RAISE EXCEPTION 'This PDP licence is not currently permitted to submit programmes';
    END IF;

    SELECT COUNT(*)::INTEGER
    INTO v_existing_count
    FROM public.pdp_programs
    WHERE provider_id = NEW.provider_id
      AND (TG_OP = 'INSERT' OR id <> NEW.id)
      AND public.pdp_program_consumes_slot(status::TEXT, removed_by_admin);

    IF v_existing_count >= v_license.max_programs THEN
      RAISE EXCEPTION 'PDP programme capacity is full (% of % programmes used)',
        v_existing_count, v_license.max_programs;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.maintain_pdp_license_programs_used()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_pdp_license_programs_used(OLD.provider_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN
    PERFORM public.sync_pdp_license_programs_used(OLD.provider_id);
  END IF;

  PERFORM public.sync_pdp_license_programs_used(NEW.provider_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_pdp_program_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- An approved programme is an accreditation record. Its identity, duration,
  -- and PDC value are fixed; public display names remain independently editable.
  IF OLD.status = 'approved'
     AND (
       NEW.program_name IS DISTINCT FROM OLD.program_name
       OR NEW.program_name_ar IS DISTINCT FROM OLD.program_name_ar
       OR NEW.program_id IS DISTINCT FROM OLD.program_id
       OR NEW.slug IS DISTINCT FROM OLD.slug
       OR NEW.duration_hours IS DISTINCT FROM OLD.duration_hours
       OR NEW.max_pdc_credits IS DISTINCT FROM OLD.max_pdc_credits
     ) THEN
    RAISE EXCEPTION 'Approved programme identity, duration, and PDC credits cannot be changed';
  END IF;

  NEW.public_display_name := NULLIF(BTRIM(NEW.public_display_name), '');
  NEW.public_display_name_ar := NULLIF(BTRIM(NEW.public_display_name_ar), '');

  RETURN NEW;
END;
$$;

-- Replace the historical increment/decrement trigger. A derived counter is
-- resilient to imports, status changes, and soft removals; the legacy trigger
-- must not run beside it or it would adjust the reconciled value afterwards.
DROP TRIGGER IF EXISTS trigger_update_pdp_license_programs_used ON public.pdp_programs;

DROP TRIGGER IF EXISTS enforce_pdp_program_capacity ON public.pdp_programs;
CREATE TRIGGER enforce_pdp_program_capacity
BEFORE INSERT OR UPDATE OF provider_id, status, removed_by_admin ON public.pdp_programs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_pdp_program_capacity();

DROP TRIGGER IF EXISTS maintain_pdp_license_programs_used ON public.pdp_programs;
CREATE TRIGGER maintain_pdp_license_programs_used
AFTER INSERT OR DELETE OR UPDATE OF provider_id, status, removed_by_admin ON public.pdp_programs
FOR EACH ROW
EXECUTE FUNCTION public.maintain_pdp_license_programs_used();

-- Reconcile the displayed counter for every active licence from the canonical
-- programme table. This corrects legacy counters without changing programmes.
UPDATE public.pdp_licenses AS license
SET programs_used = counts.programs_used
FROM (
  SELECT
    license_inner.partner_id,
    COUNT(programme.id)::INTEGER AS programs_used
  FROM public.pdp_licenses AS license_inner
  LEFT JOIN public.pdp_programs AS programme
    ON programme.provider_id = license_inner.partner_id
   AND public.pdp_program_consumes_slot(programme.status::TEXT, programme.removed_by_admin)
  GROUP BY license_inner.partner_id
) AS counts
WHERE license.partner_id = counts.partner_id
  AND license.programs_used IS DISTINCT FROM counts.programs_used;

-- Keep the partner-facing licence view self-healing even if legacy imports add
-- programme data outside the normal application flow.
CREATE OR REPLACE FUNCTION public.get_pdp_license_info(p_partner_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  PERFORM public.sync_pdp_license_programs_used(p_partner_id);

  SELECT json_build_object(
    'license', row_to_json(l),
    'terms', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM public.pdp_license_terms AS t
      WHERE t.license_id = l.id
    ), '[]'::JSON),
    'documents', COALESCE((
      SELECT json_agg(row_to_json(d))
      FROM public.pdp_license_documents AS d
      WHERE d.license_id = l.id
    ), '[]'::JSON),
    'pending_requests', COALESCE((
      SELECT json_agg(row_to_json(r))
      FROM public.pdp_license_requests AS r
      WHERE r.license_id = l.id
        AND r.status IN ('pending', 'under_review')
    ), '[]'::JSON)
  )
  INTO v_result
  FROM public.pdp_licenses AS l
  WHERE l.partner_id = p_partner_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pdp_license_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_pdp_submit_program(UUID) TO authenticated;

COMMENT ON FUNCTION public.sync_pdp_license_programs_used(UUID)
IS 'Synchronises the PDP licence programme counter from canonical programme records.';
COMMENT ON FUNCTION public.enforce_pdp_program_capacity()
IS 'Prevents PDP programme creation or reactivation above the purchased licence capacity.';
