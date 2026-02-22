-- Migration: Fix Booking Email Trigger
-- Date: 2026-01-20
-- Description: Fix trigger to work without timeslot_id (direct time scheduling)

-- ============================================================================
-- Update trigger function to handle direct time scheduling (no timeslot)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_booking_confirmation_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_quiz RECORD;
    v_template_data JSONB;
    v_duration TEXT;
    v_duration_minutes INTEGER;
BEGIN
    -- Only send for new bookings with 'scheduled' status
    IF TG_OP = 'INSERT' AND NEW.status = 'scheduled' THEN

        -- Get user details
        SELECT email, first_name, last_name
        INTO v_user
        FROM public.users
        WHERE id = NEW.user_id;

        IF NOT FOUND THEN
            RAISE WARNING 'User not found for booking %', NEW.id;
            RETURN NEW;
        END IF;

        -- Get quiz details
        SELECT title, time_limit_minutes
        INTO v_quiz
        FROM public.quizzes
        WHERE id = NEW.quiz_id;

        -- Calculate duration: priority order
        -- 1. Quiz time_limit_minutes
        -- 2. Calculate from booking scheduled times
        -- 3. Default to 120 minutes
        IF v_quiz.time_limit_minutes IS NOT NULL THEN
            v_duration_minutes := v_quiz.time_limit_minutes;
        ELSIF NEW.scheduled_start_time IS NOT NULL AND NEW.scheduled_end_time IS NOT NULL THEN
            v_duration_minutes := EXTRACT(EPOCH FROM (NEW.scheduled_end_time - NEW.scheduled_start_time)) / 60;
        ELSE
            v_duration_minutes := 120; -- Default 2 hours
        END IF;

        v_duration := v_duration_minutes || ' minutes';

        -- Prepare template data
        v_template_data := jsonb_build_object(
            'candidate_name', COALESCE(v_user.first_name || ' ' || v_user.last_name, v_user.email),
            'firstName', COALESCE(v_user.first_name, 'Candidate'),
            'confirmation_code', NEW.confirmation_code,
            'exam_date', to_char(NEW.scheduled_start_time AT TIME ZONE COALESCE(NEW.timezone, 'UTC'), 'Day, Month DD, YYYY'),
            'exam_time', to_char(NEW.scheduled_start_time AT TIME ZONE COALESCE(NEW.timezone, 'UTC'), 'HH12:MI AM') || ' - ' ||
                         to_char(NEW.scheduled_end_time AT TIME ZONE COALESCE(NEW.timezone, 'UTC'), 'HH12:MI AM'),
            'timezone', COALESCE(NEW.timezone, 'UTC'),
            'duration', v_duration,
            'exam_title', COALESCE(v_quiz.title, 'BDA Certification Exam'),
            'dashboard_url', 'https://portal.bda-global.org/individual/dashboard'
        );

        -- Queue the confirmation email
        PERFORM public.queue_email(
            p_recipient_email := v_user.email,
            p_recipient_name := COALESCE(v_user.first_name || ' ' || v_user.last_name, v_user.email),
            p_template_name := 'booking_confirmation',
            p_template_data := v_template_data,
            p_priority := 3, -- High priority
            p_related_entity_type := 'exam_booking',
            p_related_entity_id := NEW.id
        );

        -- Mark confirmation as queued
        NEW.confirmation_email_sent := TRUE;
        NEW.confirmation_sent_at := NOW();

    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed booking email trigger to work without timeslot_id';
    RAISE NOTICE '📧 Email now calculates duration from booking times directly';
END $$;
