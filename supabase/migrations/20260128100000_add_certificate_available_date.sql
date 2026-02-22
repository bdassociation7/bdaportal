-- ============================================================================
-- ADD: 14-Day Certificate Download Delay
-- ============================================================================
-- After passing exam, candidate is certified immediately (for verification),
-- but the digital certificate PDF is NOT available for download until 14 days
-- after the exam/issued date.
-- ============================================================================

-- 1. Add certificate_available_date column to user_certifications
ALTER TABLE public.user_certifications
ADD COLUMN IF NOT EXISTS certificate_available_date DATE;

-- 2. Backfill existing records: set certificate_available_date = issued_date + 14 days
UPDATE public.user_certifications
SET certificate_available_date = issued_date + INTERVAL '14 days'
WHERE certificate_available_date IS NULL;

-- 3. Set default for new rows
ALTER TABLE public.user_certifications
ALTER COLUMN certificate_available_date SET DEFAULT (CURRENT_DATE + INTERVAL '14 days');

-- 4. Update score_certification_exam() to include certificate_available_date
-- We need to re-create the function with the new column included in the INSERT
CREATE OR REPLACE FUNCTION public.score_certification_exam(
    p_attempt_id UUID
)
RETURNS public.quiz_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attempt public.quiz_attempts;
    v_quiz RECORD;
    v_total_questions INTEGER;
    v_correct_answers INTEGER;
    v_score NUMERIC;
    v_passed BOOLEAN;
BEGIN
    -- Get attempt
    SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = p_attempt_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
    END IF;

    -- Get quiz info
    SELECT q.id, q.passing_score, q.certification_type
    INTO v_quiz
    FROM public.quizzes q
    WHERE q.id = v_attempt.quiz_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quiz not found for attempt: %', p_attempt_id;
    END IF;

    -- Count total questions
    SELECT COUNT(*) INTO v_total_questions
    FROM public.quiz_attempt_answers
    WHERE attempt_id = p_attempt_id;

    -- Count correct answers
    SELECT COUNT(*) INTO v_correct_answers
    FROM public.quiz_attempt_answers
    WHERE attempt_id = p_attempt_id AND is_correct = true;

    -- Calculate score
    IF v_total_questions > 0 THEN
        v_score := ROUND((v_correct_answers::NUMERIC / v_total_questions::NUMERIC) * 100, 2);
    ELSE
        v_score := 0;
    END IF;

    -- Determine if passed
    v_passed := v_score >= COALESCE(v_quiz.passing_score, 70);

    -- Update attempt with score
    UPDATE public.quiz_attempts
    SET score = v_score,
        status = CASE WHEN v_passed THEN 'passed' ELSE 'failed' END,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_attempt_id;

    -- Transition state
    IF v_passed THEN
        PERFORM public.transition_exam_state(p_attempt_id, 'passed');
    ELSE
        PERFORM public.transition_exam_state(p_attempt_id, 'failed');
    END IF;

    -- Get updated attempt
    SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = p_attempt_id;

    -- If passed, create certification with 14-day download delay
    IF v_passed THEN
        INSERT INTO public.user_certifications (
            user_id,
            certification_type,
            quiz_attempt_id,
            issued_date,
            expiry_date,
            certificate_available_date,
            status
        ) VALUES (
            v_attempt.user_id,
            v_quiz.certification_type,
            p_attempt_id,
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '3 years',
            CURRENT_DATE + INTERVAL '14 days',
            'active'
        )
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN v_attempt;
END;
$$;

-- 5. Update get_user_certificates() to return certificate_available_date
DROP FUNCTION IF EXISTS get_user_certificates(UUID);

CREATE OR REPLACE FUNCTION get_user_certificates(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    credential_id TEXT,
    certification_type TEXT,
    status TEXT,
    issued_date DATE,
    expiry_date DATE,
    certificate_url TEXT,
    certificate_available_date DATE,
    exam_title TEXT,
    exam_score INTEGER,
    is_expiring_soon BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        uc.id,
        uc.credential_id,
        uc.certification_type::TEXT,
        uc.status,
        uc.issued_date,
        uc.expiry_date,
        uc.certificate_url,
        uc.certificate_available_date,
        q.title as exam_title,
        qa.score as exam_score,
        (uc.expiry_date - CURRENT_DATE) <= 60 AND (uc.expiry_date - CURRENT_DATE) > 0 as is_expiring_soon
    FROM user_certifications uc
    LEFT JOIN quiz_attempts qa ON qa.id = uc.quiz_attempt_id
    LEFT JOIN quizzes q ON q.id = qa.quiz_id
    WHERE uc.user_id = p_user_id
    ORDER BY uc.issued_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_certificates(UUID) TO authenticated;
COMMENT ON FUNCTION get_user_certificates(UUID) IS 'Get all certificates for a user including availability date';

-- 6. Add comment
COMMENT ON COLUMN public.user_certifications.certificate_available_date
IS 'Date when the digital certificate PDF becomes available for download (14 days after issued_date)';

SELECT '✅ Added certificate_available_date column with 14-day delay logic' as status;
