-- Repair BDA exam reminder and no-show processing.
--
-- Principles:
--   * A reminder failure must never prevent no-show processing.
--   * No-show detection uses the actual attempt-start timestamp and valid statuses.
--   * Governance messages enter email_queue, which provides retry state, rather
--     than making an untracked direct HTTP call from PostgreSQL.
--   * Historic bookings left pending by the broken process are closed without
--     penalties; they are not retroactively treated as candidate no-shows.

CREATE OR REPLACE FUNCTION public.send_exam_governance_email(
    p_user_id UUID,
    p_template_key TEXT,
    p_variables JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user RECORD;
    v_booking_id UUID;
    v_template_data JSONB;
BEGIN
    SELECT id, email, first_name, last_name
    INTO v_user
    FROM public.users
    WHERE id = p_user_id;

    IF v_user.email IS NULL THEN
        RAISE WARNING 'send_exam_governance_email: user % has no email address', p_user_id;
        RETURN;
    END IF;

    BEGIN
        v_booking_id := NULLIF(p_variables->>'booking_id', '')::UUID;
    EXCEPTION
        WHEN invalid_text_representation THEN
            v_booking_id := NULL;
    END;

    v_template_data := COALESCE(p_variables, '{}'::JSONB) || jsonb_build_object(
        'first_name', COALESCE(v_user.first_name, 'Candidate'),
        'last_name', COALESCE(v_user.last_name, ''),
        'email', v_user.email,
        'portal_url', 'https://portal.bda-global.org'
    );

    PERFORM public.queue_email(
        p_recipient_email => v_user.email,
        p_recipient_name => NULLIF(trim(concat_ws(' ', v_user.first_name, v_user.last_name)), ''),
        p_template_name => p_template_key,
        p_template_data => v_template_data,
        p_priority => 2,
        p_scheduled_for => NOW(),
        p_related_entity_type => CASE WHEN v_booking_id IS NULL THEN 'exam_governance' ELSE 'exam_booking' END,
        p_related_entity_id => v_booking_id
    );
END;
$$;

COMMENT ON FUNCTION public.send_exam_governance_email(UUID, TEXT, JSONB)
IS 'Queues BDA exam governance emails through email_queue so retry and delivery state are recorded.';

CREATE OR REPLACE FUNCTION public.send_exam_hour_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking RECORD;
    v_exam_label TEXT;
    v_portal_url TEXT := 'https://portal.bda-global.org';
BEGIN
    -- Six-hour reminders. Each successful queue insertion is paired with an
    -- idempotent reminder record in the same transaction.
    FOR v_booking IN
        SELECT
            eb.id AS booking_id,
            eb.user_id,
            eb.scheduled_start_time,
            eb.timezone,
            COALESCE(ev.certification_type::TEXT, q.certification_type::TEXT) AS certification_type
        FROM public.exam_bookings AS eb
        JOIN public.quizzes AS q ON q.id = eb.quiz_id
        LEFT JOIN public.exam_vouchers AS ev ON ev.id = eb.voucher_id
        WHERE eb.status IN ('scheduled', 'rescheduled')
          AND eb.scheduled_start_time BETWEEN (NOW() + INTERVAL '5 hours 30 minutes')
                                          AND (NOW() + INTERVAL '6 hours 30 minutes')
          AND NOT EXISTS (
              SELECT 1
              FROM public.exam_reminder_notifications AS ern
              WHERE ern.booking_id = eb.id
                AND ern.reminder_type = '6_hour'
          )
    LOOP
        v_exam_label := CASE UPPER(COALESCE(v_booking.certification_type, ''))
            WHEN 'CP' THEN 'BDA-CP'
            WHEN 'SCP' THEN 'BDA-SCP'
            ELSE 'BDA certification'
        END;

        PERFORM public.send_exam_governance_email(
            v_booking.user_id,
            'exam_reminder_6_hours',
            jsonb_build_object(
                'exam_type', v_exam_label,
                'exam_date', TO_CHAR(v_booking.scheduled_start_time AT TIME ZONE COALESCE(v_booking.timezone, 'UTC'), 'FMMonth DD, YYYY'),
                'exam_time', TO_CHAR(v_booking.scheduled_start_time AT TIME ZONE COALESCE(v_booking.timezone, 'UTC'), 'HH12:MI AM'),
                'timezone', COALESCE(v_booking.timezone, 'UTC'),
                'booking_id', v_booking.booking_id,
                'portal_url', v_portal_url
            )
        );

        INSERT INTO public.exam_reminder_notifications (booking_id, reminder_type)
        VALUES (v_booking.booking_id, '6_hour')
        ON CONFLICT (booking_id, reminder_type) DO NOTHING;
    END LOOP;

    -- One-hour reminders.
    FOR v_booking IN
        SELECT
            eb.id AS booking_id,
            eb.user_id,
            eb.scheduled_start_time,
            eb.timezone,
            COALESCE(ev.certification_type::TEXT, q.certification_type::TEXT) AS certification_type
        FROM public.exam_bookings AS eb
        JOIN public.quizzes AS q ON q.id = eb.quiz_id
        LEFT JOIN public.exam_vouchers AS ev ON ev.id = eb.voucher_id
        WHERE eb.status IN ('scheduled', 'rescheduled')
          AND eb.scheduled_start_time BETWEEN (NOW() + INTERVAL '30 minutes')
                                          AND (NOW() + INTERVAL '1 hour 30 minutes')
          AND NOT EXISTS (
              SELECT 1
              FROM public.exam_reminder_notifications AS ern
              WHERE ern.booking_id = eb.id
                AND ern.reminder_type = '1_hour'
          )
    LOOP
        v_exam_label := CASE UPPER(COALESCE(v_booking.certification_type, ''))
            WHEN 'CP' THEN 'BDA-CP'
            WHEN 'SCP' THEN 'BDA-SCP'
            ELSE 'BDA certification'
        END;

        PERFORM public.send_exam_governance_email(
            v_booking.user_id,
            'exam_reminder_1_hour',
            jsonb_build_object(
                'exam_type', v_exam_label,
                'exam_date', TO_CHAR(v_booking.scheduled_start_time AT TIME ZONE COALESCE(v_booking.timezone, 'UTC'), 'FMMonth DD, YYYY'),
                'exam_time', TO_CHAR(v_booking.scheduled_start_time AT TIME ZONE COALESCE(v_booking.timezone, 'UTC'), 'HH12:MI AM'),
                'timezone', COALESCE(v_booking.timezone, 'UTC'),
                'booking_id', v_booking.booking_id,
                'portal_url', v_portal_url
            )
        );

        INSERT INTO public.exam_reminder_notifications (booking_id, reminder_type)
        VALUES (v_booking.booking_id, '1_hour')
        ON CONFLICT (booking_id, reminder_type) DO NOTHING;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_exam_no_shows()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking RECORD;
    v_no_show_count INTEGER;
    v_remaining_reschedules INTEGER;
    v_exam_label TEXT;
    v_portal_url TEXT := 'https://portal.bda-global.org';
BEGIN
    FOR v_booking IN
        SELECT
            eb.id AS booking_id,
            eb.user_id,
            eb.voucher_id,
            eb.scheduled_start_time,
            eb.timezone,
            eb.booking_notes,
            COALESCE(ev.no_show_count, 0) AS no_show_count,
            ev.code AS voucher_code,
            COALESCE(ev.certification_type::TEXT, q.certification_type::TEXT) AS certification_type
        FROM public.exam_bookings AS eb
        JOIN public.quizzes AS q ON q.id = eb.quiz_id
        LEFT JOIN public.exam_vouchers AS ev ON ev.id = eb.voucher_id
        WHERE eb.status IN ('scheduled', 'rescheduled')
          AND eb.scheduled_start_time < (NOW() - INTERVAL '30 minutes')
          AND NOT EXISTS (
              SELECT 1
              FROM public.quiz_attempts AS qa
              WHERE qa.user_id = eb.user_id
                AND qa.quiz_id = eb.quiz_id
                AND qa.started_at >= eb.created_at
                AND qa.status::TEXT IN ('in_progress', 'paused', 'submitted', 'scored', 'passed', 'failed')
          )
        FOR UPDATE OF eb SKIP LOCKED
    LOOP
        v_no_show_count := v_booking.no_show_count + 1;
        v_remaining_reschedules := GREATEST(0, 2 - v_no_show_count);
        v_exam_label := CASE UPPER(COALESCE(v_booking.certification_type, ''))
            WHEN 'CP' THEN 'BDA-CP'
            WHEN 'SCP' THEN 'BDA-SCP'
            ELSE 'BDA certification'
        END;

        UPDATE public.exam_bookings
        SET
            status = 'no_show',
            booking_notes = concat_ws(
                E'\n',
                NULLIF(v_booking.booking_notes, ''),
                format(
                    '[%s] System: marked as no-show after no exam attempt was started within the post-start grace period.',
                    to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI "UTC"')
                )
            ),
            updated_at = NOW()
        WHERE id = v_booking.booking_id;

        IF v_booking.voucher_id IS NOT NULL THEN
            UPDATE public.exam_vouchers
            SET
                no_show_count = v_no_show_count,
                status = CASE WHEN v_no_show_count >= 2 THEN 'revoked' ELSE status END,
                updated_at = NOW()
            WHERE id = v_booking.voucher_id;
        END IF;

        PERFORM public.send_exam_governance_email(
            v_booking.user_id,
            CASE WHEN v_no_show_count >= 2 THEN 'exam_voucher_forfeited' ELSE 'exam_missed' END,
            CASE WHEN v_no_show_count >= 2 THEN
                jsonb_build_object(
                    'exam_type', v_exam_label,
                    'voucher_code', v_booking.voucher_code,
                    'booking_id', v_booking.booking_id,
                    'portal_url', v_portal_url
                )
            ELSE
                jsonb_build_object(
                    'exam_type', v_exam_label,
                    'exam_date', TO_CHAR(v_booking.scheduled_start_time AT TIME ZONE COALESCE(v_booking.timezone, 'UTC'), 'FMMonth DD, YYYY'),
                    'exam_time', TO_CHAR(v_booking.scheduled_start_time AT TIME ZONE COALESCE(v_booking.timezone, 'UTC'), 'HH12:MI AM'),
                    'timezone', COALESCE(v_booking.timezone, 'UTC'),
                    'booking_id', v_booking.booking_id,
                    'remaining_attempts', v_remaining_reschedules,
                    'portal_url', v_portal_url
                )
            END
        );
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_exam_governance_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    BEGIN
        PERFORM public.send_exam_hour_reminders();
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Exam reminder processing failed: %', SQLERRM;
    END;

    BEGIN
        PERFORM public.process_exam_no_shows();
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Exam no-show processing failed: %', SQLERRM;
    END;
END;
$$;

COMMENT ON FUNCTION public.run_exam_governance_jobs()
IS 'Runs exam reminders and no-show processing independently so a reminder error cannot block voucher lifecycle updates.';

-- Close historical records that remained pending while the old processor was
-- broken. Preserve vouchers and do not add a no-show count or candidate email.
UPDATE public.exam_bookings AS eb
SET
    status = 'expired',
    booking_notes = concat_ws(
        E'\n',
        NULLIF(eb.booking_notes, ''),
        format(
            '[%s] System reconciliation: expired without a no-show penalty because legacy no-show processing was unavailable.',
            to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI "UTC"')
        )
    ),
    updated_at = NOW()
WHERE eb.status IN ('scheduled', 'rescheduled')
  AND eb.scheduled_start_time < (NOW() - INTERVAL '30 minutes')
  AND NOT EXISTS (
      SELECT 1
      FROM public.quiz_attempts AS qa
      WHERE qa.user_id = eb.user_id
        AND qa.quiz_id = eb.quiz_id
        AND qa.started_at >= eb.created_at
  );

-- Replace the previously coupled cron command with the fault-isolated runner.
SELECT cron.alter_job(
    job_id => jobid,
    command => 'SELECT public.run_exam_governance_jobs();'
)
FROM cron.job
WHERE jobname = 'exam-hour-reminders-and-noshow';
