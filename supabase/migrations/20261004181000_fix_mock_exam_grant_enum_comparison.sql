-- Repair the random Mock Exams grant path.
-- mock_exams.category and mock_exams.language are enum types, while the
-- product mapping values are text / a separate enum. Compare text forms so
-- the grant function can select the configured exam pool reliably.
DO $$
DECLARE
  function_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.grant_mock_exam_access(uuid, integer, integer, integer)'::regprocedure
  )
  INTO function_definition;

  IF function_definition IS NULL THEN
    RAISE EXCEPTION 'grant_mock_exam_access function was not found';
  END IF;

  function_definition := replace(
    function_definition,
    'AND me.category = LOWER(v_product.certification_type::TEXT)',
    'AND me.category::TEXT = LOWER(v_product.certification_type::TEXT)'
  );
  function_definition := replace(
    function_definition,
    'AND me.language = v_product.exam_language',
    'AND me.language::TEXT = v_product.exam_language::TEXT'
  );

  IF position('me.category::TEXT = LOWER(v_product.certification_type::TEXT)' IN function_definition) = 0
     OR position('me.language::TEXT = v_product.exam_language::TEXT' IN function_definition) = 0 THEN
    RAISE EXCEPTION 'Expected Mock Exams enum comparisons were not found';
  END IF;

  EXECUTE function_definition;
END;
$$;
