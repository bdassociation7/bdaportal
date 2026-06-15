-- Migration: Merge exam and certification emails to reduce total email count
-- Date: 2026-06-12
-- Changes:
--   1. Remove exam_launched email (redundant - booking confirmation is enough)
--   2. Merge exam_completed into exam_passed/exam_failed (result sent directly after scoring)
--   3. Merge credential_id_generated into certification_issued (same event, one email)

-- =============================================================================
-- 1. UPDATE handle_exam_status_change:
--    - Remove 'in_progress' (exam_launched) email
--    - Remove 'submitted' (exam_completed) email
--    - Keep 'passed' and 'failed' emails as-is (they fire after scoring)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_exam_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_quiz RECORD;
    v_certification RECORD;
BEGIN
    -- Get quiz info
    SELECT * INTO v_quiz FROM public.quizzes WHERE id = NEW.quiz_id;

    -- Handle status changes
    CASE NEW.status
        WHEN 'passed' THEN
            -- Get certification info
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
            -- No email for 'in_progress' (exam_launched removed) or 'submitted' (exam_completed removed)
            NULL;
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger
DROP TRIGGER IF EXISTS on_exam_status_change ON public.quiz_attempts;
CREATE TRIGGER on_exam_status_change
    AFTER UPDATE OF status ON public.quiz_attempts
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.handle_exam_status_change();

-- =============================================================================
-- 2. UPDATE handle_certification_issued:
--    - Send ONE merged email (certification_issued) that includes credential_id
--    - Remove separate credential_id_generated email
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_certification_issued()
RETURNS TRIGGER AS $$
BEGIN
    -- Send single merged certification email (includes credential_id)
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
    -- credential_id_generated email is now merged into certification_issued above
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger
DROP TRIGGER IF EXISTS on_certification_issued ON public.user_certifications;
CREATE TRIGGER on_certification_issued
    AFTER INSERT ON public.user_certifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_certification_issued();

-- =============================================================================
-- 3. Deactivate removed/merged email templates to prevent accidental use
-- =============================================================================
UPDATE public.email_templates
SET is_active = false, updated_at = NOW()
WHERE template_key IN ('exam_launched', 'exam_completed', 'credential_id_generated');

SELECT '✅ Email merge migration applied: exam_launched removed, exam_completed removed, credential_id_generated merged into certification_issued' AS status;
