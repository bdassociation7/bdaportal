-- ECP includes the PDP Standard allowance: up to five active programs.
-- PDP licenses are reserved for expanded capacity above the included five-program allowance.

CREATE OR REPLACE FUNCTION public.can_pdp_submit_program(p_partner_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_license RECORD;
  v_programs_count integer;
  v_max_programs integer;
  v_tier text;
BEGIN
  SELECT role INTO v_role
  FROM public.users
  WHERE id = p_partner_id;

  SELECT COUNT(*) INTO v_programs_count
  FROM public.pdp_programs
  WHERE provider_id = p_partner_id
    AND status NOT IN ('rejected', 'expired')
    AND removed_by_admin = false;

  -- ECP, PDP, and legacy dual partners receive five PDP Standard slots by role.
  IF v_role IN ('ecp', 'pdp', 'dual_partner') THEN
    SELECT * INTO v_license
    FROM public.pdp_licenses
    WHERE partner_id = p_partner_id;

    -- A valid licence above five slots is an explicit administrator-approved upgrade.
    IF FOUND
      AND v_license.status IN ('active', 'expiring_soon')
      AND v_license.program_submission_enabled = true
      AND v_license.max_programs > 5 THEN
      v_max_programs := v_license.max_programs;
      v_tier := COALESCE(v_license.tier::text, 'PDP Upgrade');
    ELSE
      v_max_programs := 5;
      v_tier := 'PDP Standard included with partnership';
    END IF;

    IF v_programs_count >= v_max_programs THEN
      RETURN json_build_object(
        'can_submit', false,
        'reason', 'Your PDP Standard allowance of ' || v_max_programs || ' programs has been reached. Contact BDA administration to request a partnership upgrade.',
        'max_programs', v_max_programs,
        'programs_used', v_programs_count,
        'remaining_slots', 0,
        'tier', v_tier
      );
    END IF;

    RETURN json_build_object(
      'can_submit', true,
      'reason', null,
      'max_programs', v_max_programs,
      'programs_used', v_programs_count,
      'remaining_slots', v_max_programs - v_programs_count,
      'tier', v_tier
    );
  END IF;

  -- Preserve the existing licence-driven logic for any non-partner role.
  SELECT * INTO v_license
  FROM public.pdp_licenses
  WHERE partner_id = p_partner_id;

  IF NOT FOUND THEN
    RETURN json_build_object('can_submit', false, 'reason', 'No active license found', 'max_programs', 0, 'programs_used', 0, 'remaining_slots', 0, 'tier', null);
  END IF;

  IF NOT v_license.program_submission_enabled THEN
    RETURN json_build_object('can_submit', false, 'reason', 'Program submission is temporarily disabled by BDA', 'max_programs', v_license.max_programs, 'programs_used', v_programs_count, 'remaining_slots', GREATEST(v_license.max_programs - v_programs_count, 0), 'tier', v_license.tier);
  END IF;

  IF v_license.status NOT IN ('active', 'expiring_soon') THEN
    RETURN json_build_object('can_submit', false, 'reason', 'License is not active (status: ' || v_license.status || ')', 'max_programs', v_license.max_programs, 'programs_used', v_programs_count, 'remaining_slots', GREATEST(v_license.max_programs - v_programs_count, 0), 'tier', v_license.tier);
  END IF;

  IF v_programs_count >= v_license.max_programs THEN
    RETURN json_build_object('can_submit', false, 'reason', 'Your program capacity is full. Upgrade your partnership plan to add more programs.', 'max_programs', v_license.max_programs, 'programs_used', v_programs_count, 'remaining_slots', 0, 'tier', v_license.tier);
  END IF;

  RETURN json_build_object('can_submit', true, 'reason', null, 'max_programs', v_license.max_programs, 'programs_used', v_programs_count, 'remaining_slots', v_license.max_programs - v_programs_count, 'tier', v_license.tier);
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_pdp_program_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access json;
BEGIN
  -- New program records must respect the included or upgraded capacity.
  IF TG_OP = 'INSERT' THEN
    v_access := public.can_pdp_submit_program(NEW.provider_id);
    IF COALESCE((v_access ->> 'can_submit')::boolean, false) = false THEN
      RAISE EXCEPTION '%', COALESCE(v_access ->> 'reason', 'PDP program submission is not available.');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_pdp_program_capacity ON public.pdp_programs;

CREATE TRIGGER enforce_pdp_program_capacity
BEFORE INSERT ON public.pdp_programs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_pdp_program_capacity();

-- ECP partners may operate only their own PDP programs.
DROP POLICY IF EXISTS ecp_partners_manage_own_programs ON public.pdp_programs;

CREATE POLICY ecp_partners_manage_own_programs
ON public.pdp_programs
FOR ALL
TO authenticated
USING (
  provider_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ecp'
  )
)
WITH CHECK (
  provider_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ecp'
  )
);
