-- Do not let legacy triggers issue a certificate or pass-email while a certification attempt is pending integrity review.

CREATE OR REPLACE FUNCTION public.generate_certificate_after_exam()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz quizzes%ROWTYPE;
  v_user users%ROWTYPE;
  v_credential_id TEXT;
  v_expiry_date DATE;
  v_existing_cert UUID;
BEGIN
  IF NEW.passed IS NOT TRUE OR NEW.completed_at IS NULL THEN RETURN NEW; END IF;
  IF NEW.exam_type = 'certification' AND COALESCE(NEW.integrity_review_status, 'not_required') = 'pending' THEN
    INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
    VALUES (NEW.id, 'certificate_held_for_integrity_review', jsonb_build_object('risk_score', NEW.integrity_risk_score));
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing_cert FROM public.user_certifications WHERE quiz_attempt_id = NEW.id;
  IF v_existing_cert IS NOT NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_quiz FROM public.quizzes WHERE id = NEW.quiz_id;
  SELECT * INTO v_user FROM public.users WHERE id = NEW.user_id;
  IF v_quiz.id IS NULL OR v_user.id IS NULL THEN RETURN NEW; END IF;

  v_credential_id := public.generate_credential_id(v_quiz.certification_type);
  v_expiry_date := CURRENT_DATE + INTERVAL '3 years';
  INSERT INTO public.user_certifications (user_id, certification_type, credential_id, quiz_attempt_id, issued_date, expiry_date, status, certificate_url, created_by)
  VALUES (NEW.user_id, v_quiz.certification_type, v_credential_id, NEW.id, CURRENT_DATE, v_expiry_date, 'active', NULL, NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_exam_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz RECORD;
  v_certification RECORD;
BEGIN
  SELECT * INTO v_quiz FROM public.quizzes WHERE id = NEW.quiz_id;
  CASE NEW.status
    WHEN 'passed' THEN
      IF NEW.exam_type = 'certification' AND COALESCE(NEW.integrity_review_status, 'not_required') = 'pending' THEN
        INSERT INTO public.exam_activity_log (attempt_id, event_type, event_data)
        VALUES (NEW.id, 'pass_email_held_for_integrity_review', '{}'::jsonb);
        RETURN NEW;
      END IF;
      SELECT * INTO v_certification FROM public.user_certifications WHERE quiz_attempt_id = NEW.id ORDER BY issued_date DESC LIMIT 1;
      PERFORM public.send_exam_email(NEW.user_id, 'exam_passed', jsonb_build_object(
        'certification_type', COALESCE(v_quiz.certification_type::text, 'Certification'),
        'score', COALESCE(NEW.score::text, '0'),
        'passing_score', COALESCE(v_quiz.passing_score_percentage::text, '70'),
        'certification_id', COALESCE(v_certification.id::text, NEW.id::text)
      ));
    WHEN 'failed' THEN
      PERFORM public.send_exam_email(NEW.user_id, 'exam_failed', jsonb_build_object(
        'certification_type', COALESCE(v_quiz.certification_type::text, 'Certification'),
        'score', COALESCE(NEW.score::text, '0'),
        'passing_score', COALESCE(v_quiz.passing_score_percentage::text, '70'),
        'retake_wait_days', '30'
      ));
    ELSE
      NULL;
  END CASE;
  RETURN NEW;
END;
$$;
