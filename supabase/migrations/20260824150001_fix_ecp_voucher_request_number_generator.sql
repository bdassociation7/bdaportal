-- Fix legacy voucher request numbering.
-- Previous logic extracted characters 5–10 from `VR-YYYY-000001`, which produced values
-- such as `026-00` and failed integer conversion. Extract only the trailing numeric sequence.

CREATE OR REPLACE FUNCTION public.generate_voucher_request_number()
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  v_year VARCHAR(4) := to_char(CURRENT_DATE, 'YYYY');
  v_sequence INTEGER;
BEGIN
  -- Serialise creation for the current year so concurrent requests cannot reuse a number.
  PERFORM pg_advisory_xact_lock(hashtext('ecp_voucher_request_' || v_year));

  SELECT COALESCE(
    MAX(NULLIF(substring(request_number FROM '([0-9]+)$'), '')::INTEGER),
    0
  ) + 1
  INTO v_sequence
  FROM public.ecp_voucher_requests
  WHERE request_number LIKE 'VR-' || v_year || '-%';

  RETURN 'VR-' || v_year || '-' || lpad(v_sequence::TEXT, 6, '0');
END;
$$;
