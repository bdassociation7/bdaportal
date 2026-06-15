import postgres from 'https://deno.land/x/postgresjs@v3.4.4/mod.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Security: only allow service role key
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (token !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const dbUrl = Deno.env.get('SUPABASE_DB_URL')!
    const sql = postgres(dbUrl, { ssl: 'require', max: 1 })
    const results: Record<string, string> = {}

    // Update handle_exam_status_change: remove exam_launched and exam_completed emails
    await sql.unsafe(`
      CREATE OR REPLACE FUNCTION public.handle_exam_status_change()
      RETURNS TRIGGER AS $$
      DECLARE
          v_quiz RECORD;
          v_certification RECORD;
      BEGIN
          SELECT * INTO v_quiz FROM public.quizzes WHERE id = NEW.quiz_id;
          CASE NEW.status
              WHEN 'passed' THEN
                  SELECT * INTO v_certification
                  FROM public.user_certifications
                  WHERE quiz_attempt_id = NEW.id
                  ORDER BY issued_date DESC
                  LIMIT 1;
                  PERFORM public.send_exam_email(
                      NEW.user_id,
                      'exam_passed',
                      jsonb_build_object(
                          'certification_type', COALESCE(v_quiz.certification_type::text, 'Certification'),
                          'score', COALESCE(NEW.score::text, '0'),
                          'passing_score', COALESCE(v_quiz.passing_score_percentage::text, '70'),
                          'expiry_date', COALESCE(to_char(v_certification.expiry_date, 'Month DD, YYYY'),
                              to_char(CURRENT_DATE + INTERVAL '3 years', 'Month DD, YYYY')),
                          'certification_id', COALESCE(v_certification.id::text, NEW.id::text)
                      )
                  );
              WHEN 'failed' THEN
                  PERFORM public.send_exam_email(
                      NEW.user_id,
                      'exam_failed',
                      jsonb_build_object(
                          'certification_type', COALESCE(v_quiz.certification_type::text, 'Certification'),
                          'score', COALESCE(NEW.score::text, '0'),
                          'passing_score', COALESCE(v_quiz.passing_score_percentage::text, '70'),
                          'retake_wait_days', '30'
                      )
                  );
              ELSE
                  NULL;
          END CASE;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `)
    results['exam_trigger_fn'] = 'updated'

    // Update handle_certification_issued: merge credential_id_generated into it
    await sql.unsafe(`
      CREATE OR REPLACE FUNCTION public.handle_certification_issued()
      RETURNS TRIGGER AS $$
      BEGIN
          PERFORM public.send_certification_email(
              NEW.user_id,
              'certification_issued',
              jsonb_build_object(
                  'certification_type', NEW.certification_type::text,
                  'credential_id', NEW.credential_id,
                  'issued_date', to_char(NEW.issued_date, 'Month DD, YYYY'),
                  'expiry_date', to_char(NEW.expiry_date, 'Month DD, YYYY'),
                  'certification_id', NEW.id::text
              )
          );
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `)
    results['cert_trigger_fn'] = 'updated'

    await sql.end()

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
