-- ============================================================================
-- Fix exam governance functions
--
-- Fixes:
-- 1. scheduled_time → scheduled_start_time (correct column name)
-- 2. exam_sessions → quiz_attempts (correct table)
-- 3. profiles → users (correct table)
-- 4. app_settings → system_config (correct table)
-- 5. Remove email_logs inserts (table doesn't exist)
-- ============================================================================

-- Create email_logs table if it doesn't exist (needed by send-email edge function)
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_type TEXT,
    recipient_email TEXT,
    recipient_user_id UUID,
    subject TEXT,
    status TEXT DEFAULT 'pending',
    resend_id TEXT,
    template_data JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create exam_reminder_notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.exam_reminder_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    reminder_type TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(booking_id, reminder_type)
);

-- ============================================================================
-- Fix send_exam_governance_email: app_settings → system_config, resolve user email
-- ============================================================================
CREATE OR REPLACE FUNCTION public.send_exam_governance_email(
    p_user_id UUID,
    p_template_key TEXT,
    p_variables JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_edge_function_url TEXT;
    v_anon_key TEXT;
    v_user_email TEXT;
BEGIN
    -- Get Edge Function URL from system_config
    SELECT value INTO v_edge_function_url
    FROM public.system_config
    WHERE key = 'edge_function_base_url';

    IF v_edge_function_url IS NULL THEN
        v_edge_function_url := 'https://dfsbzsxuursvqwnzruqt.supabase.co/functions/v1';
    END IF;

    -- Get anon key for authorization
    SELECT value INTO v_anon_key
    FROM public.system_config
    WHERE key = 'supabase_anon_key';

    -- Look up user email
    SELECT email INTO v_user_email
    FROM public.users
    WHERE id = p_user_id;

    IF v_user_email IS NULL THEN
        RAISE WARNING 'send_exam_governance_email: user % not found', p_user_id;
        RETURN;
    END IF;

    -- Call Edge Function with the correct payload format
    PERFORM net.http_post(
        url := v_edge_function_url || '/send-email',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || COALESCE(v_anon_key, current_setting('app.settings.service_role_key', true))
        ),
        body := jsonb_build_object(
            'type', p_template_key,
            'to', v_user_email,
            'user_id', p_user_id,
            'data', p_variables
        )
    );
END;
$$;

-- ============================================================================
-- Fix process_exam_no_shows: all column/table references
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_exam_no_shows()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_user RECORD;
    v_no_show_count INTEGER;
    v_remaining_attempts INTEGER;
    v_portal_url TEXT := 'https://portal.bda-global.org';
BEGIN
    FOR v_booking IN
        SELECT
            eb.id AS booking_id,
            eb.user_id,
            eb.voucher_id,
            eb.scheduled_start_time,
            eb.timezone,
            ev.certification_type AS exam_type,
            ev.code AS voucher_code,
            COALESCE(ev.no_show_count, 0) AS no_show_count
        FROM public.exam_bookings eb
        LEFT JOIN public.exam_vouchers ev ON eb.voucher_id = ev.id
        WHERE eb.status IN ('scheduled', 'rescheduled')
        AND eb.scheduled_start_time < (NOW() - INTERVAL '30 minutes')
        -- No exam attempt was started for this booking
        AND NOT EXISTS (
            SELECT 1 FROM public.quiz_attempts qa
            WHERE qa.user_id = eb.user_id
            AND qa.quiz_id = eb.quiz_id
            AND qa.created_at >= eb.created_at
            AND qa.status IN ('in_progress', 'completed', 'submitted')
        )
    LOOP
        -- Get user details
        SELECT first_name, last_name, email INTO v_user
        FROM public.users
        WHERE id = v_booking.user_id;

        -- Calculate new no-show count
        v_no_show_count := v_booking.no_show_count + 1;
        v_remaining_attempts := GREATEST(0, 2 - v_no_show_count);

        -- Update booking status to no_show
        UPDATE public.exam_bookings
        SET status = 'no_show',
            updated_at = NOW()
        WHERE id = v_booking.booking_id;

        -- Update voucher no_show_count (if voucher exists)
        IF v_booking.voucher_id IS NOT NULL THEN
            UPDATE public.exam_vouchers
            SET no_show_count = v_no_show_count,
                updated_at = NOW()
            WHERE id = v_booking.voucher_id;
        END IF;

        -- Send exam missed notification
        IF v_user.email IS NOT NULL THEN
            PERFORM public.send_exam_governance_email(
                v_booking.user_id,
                'exam_missed',
                jsonb_build_object(
                    'first_name', COALESCE(v_user.first_name, 'Candidate'),
                    'exam_type', COALESCE(v_booking.exam_type, 'Certification'),
                    'exam_date', TO_CHAR(v_booking.scheduled_start_time AT TIME ZONE COALESCE(v_booking.timezone, 'UTC'), 'Month DD, YYYY'),
                    'exam_time', TO_CHAR(v_booking.scheduled_start_time AT TIME ZONE COALESCE(v_booking.timezone, 'UTC'), 'HH12:MI AM'),
                    'timezone', COALESCE(v_booking.timezone, 'UTC'),
                    'booking_id', v_booking.booking_id,
                    'remaining_attempts', v_remaining_attempts,
                    'portal_url', v_portal_url
                )
            );
        END IF;

        -- If second no-show, forfeit the voucher
        IF v_no_show_count >= 2 AND v_booking.voucher_id IS NOT NULL THEN
            UPDATE public.exam_vouchers
            SET status = 'revoked',
                updated_at = NOW()
            WHERE id = v_booking.voucher_id;

            IF v_user.email IS NOT NULL THEN
                PERFORM public.send_exam_governance_email(
                    v_booking.user_id,
                    'exam_voucher_forfeited',
                    jsonb_build_object(
                        'first_name', COALESCE(v_user.first_name, 'Candidate'),
                        'exam_type', COALESCE(v_booking.exam_type, 'Certification'),
                        'voucher_code', v_booking.voucher_code,
                        'portal_url', v_portal_url
                    )
                );
            END IF;
        END IF;

        -- Log the no-show processing
        INSERT INTO public.email_logs (email_type, recipient_email, recipient_user_id, status, template_data)
        VALUES (
            'exam_no_show_processed',
            v_user.email,
            v_booking.user_id,
            'processed',
            jsonb_build_object(
                'booking_id', v_booking.booking_id,
                'voucher_id', v_booking.voucher_id,
                'no_show_count', v_no_show_count,
                'voucher_forfeited', v_no_show_count >= 2
            )
        );
    END LOOP;
END;
$$;

-- ============================================================================
-- Fix send_exam_hour_reminders: all column/table references
-- ============================================================================
CREATE OR REPLACE FUNCTION public.send_exam_hour_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_user RECORD;
    v_portal_url TEXT := 'https://portal.bda-global.org';
BEGIN
    -- 6-hour reminders
    FOR v_booking IN
        SELECT
            eb.id AS booking_id,
            eb.user_id,
            eb.scheduled_start_time,
            eb.timezone,
            ev.certification_type AS exam_type
        FROM public.exam_bookings eb
        LEFT JOIN public.exam_vouchers ev ON eb.voucher_id = ev.id
        WHERE eb.status IN ('scheduled', 'rescheduled')
        AND eb.scheduled_start_time BETWEEN (NOW() + INTERVAL '5 hours 30 minutes')
                                        AND (NOW() + INTERVAL '6 hours 30 minutes')
        AND NOT EXISTS (
            SELECT 1 FROM public.exam_reminder_notifications ern
            WHERE ern.booking_id = eb.id AND ern.reminder_type = '6_hour'
        )
    LOOP
        SELECT first_name INTO v_user
        FROM public.users
        WHERE id = v_booking.user_id;

        PERFORM public.send_exam_governance_email(
            v_booking.user_id,
            'exam_reminder_6_hours',
            jsonb_build_object(
                'first_name', COALESCE(v_user.first_name, 'Candidate'),
                'exam_type', COALESCE(v_booking.exam_type, 'Certification'),
                'exam_date', TO_CHAR(v_booking.scheduled_start_time AT TIME ZONE COALESCE(v_booking.timezone, 'UTC'), 'Month DD, YYYY'),
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

    -- 1-hour reminders
    FOR v_booking IN
        SELECT
            eb.id AS booking_id,
            eb.user_id,
            eb.scheduled_start_time,
            eb.timezone,
            ev.certification_type AS exam_type
        FROM public.exam_bookings eb
        LEFT JOIN public.exam_vouchers ev ON eb.voucher_id = ev.id
        WHERE eb.status IN ('scheduled', 'rescheduled')
        AND eb.scheduled_start_time BETWEEN (NOW() + INTERVAL '30 minutes')
                                        AND (NOW() + INTERVAL '1 hour 30 minutes')
        AND NOT EXISTS (
            SELECT 1 FROM public.exam_reminder_notifications ern
            WHERE ern.booking_id = eb.id AND ern.reminder_type = '1_hour'
        )
    LOOP
        SELECT first_name INTO v_user
        FROM public.users
        WHERE id = v_booking.user_id;

        PERFORM public.send_exam_governance_email(
            v_booking.user_id,
            'exam_reminder_1_hour',
            jsonb_build_object(
                'first_name', COALESCE(v_user.first_name, 'Candidate'),
                'exam_type', COALESCE(v_booking.exam_type, 'Certification'),
                'exam_date', TO_CHAR(v_booking.scheduled_start_time AT TIME ZONE COALESCE(v_booking.timezone, 'UTC'), 'Month DD, YYYY'),
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

-- ============================================================================
-- Fix on_exam_rescheduled_after_noshow trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_exam_rescheduled_after_noshow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_voucher RECORD;
    v_user RECORD;
    v_portal_url TEXT := 'https://portal.bda-global.org';
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.status IN ('scheduled', 'rescheduled') AND OLD.status = 'no_show')
       OR (TG_OP = 'INSERT' AND NEW.status = 'scheduled') THEN

        SELECT ev.*, ev.no_show_count INTO v_voucher
        FROM public.exam_vouchers ev
        WHERE ev.id = NEW.voucher_id;

        IF v_voucher IS NOT NULL AND COALESCE(v_voucher.no_show_count, 0) >= 1 THEN
            SELECT first_name INTO v_user
            FROM public.users
            WHERE id = NEW.user_id;

            PERFORM public.send_exam_governance_email(
                NEW.user_id,
                'exam_last_reschedule_warning',
                jsonb_build_object(
                    'first_name', COALESCE(v_user.first_name, 'Candidate'),
                    'exam_type', COALESCE(v_voucher.certification_type, 'Certification'),
                    'exam_date', TO_CHAR(NEW.scheduled_start_time AT TIME ZONE COALESCE(NEW.timezone, 'UTC'), 'Month DD, YYYY'),
                    'exam_time', TO_CHAR(NEW.scheduled_start_time AT TIME ZONE COALESCE(NEW.timezone, 'UTC'), 'HH12:MI AM'),
                    'timezone', COALESCE(NEW.timezone, 'UTC'),
                    'booking_id', NEW.id,
                    'portal_url', v_portal_url
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_exam_rescheduled_warning ON public.exam_bookings;
CREATE TRIGGER trigger_exam_rescheduled_warning
    AFTER INSERT OR UPDATE ON public.exam_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.on_exam_rescheduled_after_noshow();

-- ============================================================================
-- Ensure cron jobs are scheduled (requires pg_cron extension)
-- ============================================================================
DO $$
BEGIN
    -- Only create cron jobs if pg_cron is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Daily exam reminders (3-day + day-of)
        PERFORM cron.schedule(
            'check-exam-reminders',
            '0 6 * * *',
            'SELECT public.check_exam_reminders_and_notify()'
        );

        -- Hourly: hour-based reminders + no-show processing
        PERFORM cron.schedule(
            'exam-hour-reminders-and-noshow',
            '0 * * * *',
            'SELECT public.send_exam_hour_reminders(); SELECT public.process_exam_no_shows();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Could not create cron jobs: %', SQLERRM;
END;
$$;
