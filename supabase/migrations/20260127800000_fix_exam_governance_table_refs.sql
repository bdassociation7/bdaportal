-- Fix Exam Governance - Use public.users instead of public.profiles
-- The original migration referenced 'profiles' but this project uses 'users'

-- Fix process_exam_no_shows function
CREATE OR REPLACE FUNCTION public.process_exam_no_shows()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_voucher RECORD;
    v_user RECORD;
    v_no_show_count INTEGER;
    v_remaining_attempts INTEGER;
    v_can_reschedule BOOLEAN;
    v_portal_url TEXT := 'https://portal.bda-global.org';
BEGIN
    -- Find all scheduled bookings where exam time has passed by more than 30 minutes
    -- and exam was never launched
    FOR v_booking IN
        SELECT
            eb.id AS booking_id,
            eb.user_id,
            eb.voucher_id,
            eb.scheduled_time,
            ev.exam_type,
            ev.code AS voucher_code,
            ev.no_show_count
        FROM public.exam_bookings eb
        JOIN public.exam_vouchers ev ON eb.voucher_id = ev.id
        WHERE eb.status = 'scheduled'
        AND eb.scheduled_time < (NOW() - INTERVAL '30 minutes')
        AND NOT EXISTS (
            SELECT 1 FROM public.exam_sessions es
            WHERE es.booking_id = eb.id
        )
    LOOP
        -- Get user details from public.users (not profiles)
        SELECT first_name, last_name, email INTO v_user
        FROM public.users
        WHERE id = v_booking.user_id;

        -- Calculate new no-show count
        v_no_show_count := COALESCE(v_booking.no_show_count, 0) + 1;
        v_remaining_attempts := GREATEST(0, 2 - v_no_show_count);
        v_can_reschedule := v_no_show_count < 2;

        -- Update booking status to no_show
        UPDATE public.exam_bookings
        SET status = 'no_show',
            updated_at = NOW()
        WHERE id = v_booking.booking_id;

        -- Update voucher no_show_count
        UPDATE public.exam_vouchers
        SET no_show_count = v_no_show_count,
            updated_at = NOW()
        WHERE id = v_booking.voucher_id;

        -- Send exam missed notification
        PERFORM public.send_exam_governance_email(
            v_booking.user_id,
            'exam_missed',
            jsonb_build_object(
                'first_name', v_user.first_name,
                'exam_type', v_booking.exam_type,
                'exam_date', TO_CHAR(v_booking.scheduled_time AT TIME ZONE 'UTC', 'Month DD, YYYY'),
                'exam_time', TO_CHAR(v_booking.scheduled_time AT TIME ZONE 'UTC', 'HH24:MI') || ' UTC',
                'booking_id', v_booking.booking_id,
                'remaining_attempts', v_remaining_attempts,
                'portal_url', v_portal_url
            )
        );

        -- If this was the second no-show, forfeit the voucher
        IF v_no_show_count >= 2 THEN
            UPDATE public.exam_vouchers
            SET status = 'revoked',
                updated_at = NOW()
            WHERE id = v_booking.voucher_id;

            -- Send voucher forfeited notification
            PERFORM public.send_exam_governance_email(
                v_booking.user_id,
                'exam_voucher_forfeited',
                jsonb_build_object(
                    'first_name', v_user.first_name,
                    'exam_type', v_booking.exam_type,
                    'voucher_code', v_booking.voucher_code,
                    'portal_url', v_portal_url
                )
            );
        END IF;

        -- Log the action
        INSERT INTO public.email_logs (user_id, template_key, status, metadata)
        VALUES (
            v_booking.user_id,
            'exam_no_show_processed',
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

-- Fix send_exam_hour_reminders function
CREATE OR REPLACE FUNCTION public.send_exam_hour_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_user RECORD;
    v_portal_url TEXT := 'https://portal.bda-global.org';
    v_reminder_type TEXT;
BEGIN
    -- Find bookings that need 6-hour reminder (between 5.5 and 6.5 hours from now)
    FOR v_booking IN
        SELECT
            eb.id AS booking_id,
            eb.user_id,
            eb.scheduled_time,
            ev.exam_type
        FROM public.exam_bookings eb
        JOIN public.exam_vouchers ev ON eb.voucher_id = ev.id
        WHERE eb.status IN ('scheduled', 'rescheduled')
        AND eb.scheduled_time BETWEEN (NOW() + INTERVAL '5 hours 30 minutes')
                                   AND (NOW() + INTERVAL '6 hours 30 minutes')
        AND NOT EXISTS (
            SELECT 1 FROM public.exam_reminder_notifications ern
            WHERE ern.booking_id = eb.id AND ern.reminder_type = '6_hour'
        )
    LOOP
        -- Get user details from public.users (not profiles)
        SELECT first_name INTO v_user
        FROM public.users
        WHERE id = v_booking.user_id;

        -- Send 6-hour reminder
        PERFORM public.send_exam_governance_email(
            v_booking.user_id,
            'exam_reminder_6_hours',
            jsonb_build_object(
                'first_name', v_user.first_name,
                'exam_type', v_booking.exam_type,
                'exam_date', TO_CHAR(v_booking.scheduled_time AT TIME ZONE 'UTC', 'Month DD, YYYY'),
                'exam_time', TO_CHAR(v_booking.scheduled_time AT TIME ZONE 'UTC', 'HH24:MI') || ' UTC',
                'booking_id', v_booking.booking_id,
                'portal_url', v_portal_url
            )
        );

        -- Mark reminder as sent
        INSERT INTO public.exam_reminder_notifications (booking_id, reminder_type)
        VALUES (v_booking.booking_id, '6_hour')
        ON CONFLICT (booking_id, reminder_type) DO NOTHING;
    END LOOP;

    -- Find bookings that need 1-hour reminder (between 30 minutes and 1.5 hours from now)
    FOR v_booking IN
        SELECT
            eb.id AS booking_id,
            eb.user_id,
            eb.scheduled_time,
            ev.exam_type
        FROM public.exam_bookings eb
        JOIN public.exam_vouchers ev ON eb.voucher_id = ev.id
        WHERE eb.status IN ('scheduled', 'rescheduled')
        AND eb.scheduled_time BETWEEN (NOW() + INTERVAL '30 minutes')
                                   AND (NOW() + INTERVAL '1 hour 30 minutes')
        AND NOT EXISTS (
            SELECT 1 FROM public.exam_reminder_notifications ern
            WHERE ern.booking_id = eb.id AND ern.reminder_type = '1_hour'
        )
    LOOP
        -- Get user details from public.users (not profiles)
        SELECT first_name INTO v_user
        FROM public.users
        WHERE id = v_booking.user_id;

        -- Send 1-hour reminder
        PERFORM public.send_exam_governance_email(
            v_booking.user_id,
            'exam_reminder_1_hour',
            jsonb_build_object(
                'first_name', v_user.first_name,
                'exam_type', v_booking.exam_type,
                'exam_date', TO_CHAR(v_booking.scheduled_time AT TIME ZONE 'UTC', 'Month DD, YYYY'),
                'exam_time', TO_CHAR(v_booking.scheduled_time AT TIME ZONE 'UTC', 'HH24:MI') || ' UTC',
                'booking_id', v_booking.booking_id,
                'portal_url', v_portal_url
            )
        );

        -- Mark reminder as sent
        INSERT INTO public.exam_reminder_notifications (booking_id, reminder_type)
        VALUES (v_booking.booking_id, '1_hour')
        ON CONFLICT (booking_id, reminder_type) DO NOTHING;
    END LOOP;
END;
$$;

-- Fix on_exam_rescheduled_after_noshow trigger function
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
    -- Only trigger on status change to 'rescheduled' or new scheduled booking
    IF (TG_OP = 'UPDATE' AND NEW.status IN ('scheduled', 'rescheduled') AND OLD.status = 'no_show')
       OR (TG_OP = 'INSERT' AND NEW.status = 'scheduled') THEN

        -- Get voucher details including no_show_count
        SELECT ev.*, ev.no_show_count INTO v_voucher
        FROM public.exam_vouchers ev
        WHERE ev.id = NEW.voucher_id;

        -- If voucher has previous no-shows, send final warning
        IF v_voucher.no_show_count >= 1 THEN
            -- Get user details from public.users (not profiles)
            SELECT first_name INTO v_user
            FROM public.users
            WHERE id = NEW.user_id;

            -- Send last reschedule warning
            PERFORM public.send_exam_governance_email(
                NEW.user_id,
                'exam_last_reschedule_warning',
                jsonb_build_object(
                    'first_name', v_user.first_name,
                    'exam_type', v_voucher.exam_type,
                    'exam_date', TO_CHAR(NEW.scheduled_time AT TIME ZONE 'UTC', 'Month DD, YYYY'),
                    'exam_time', TO_CHAR(NEW.scheduled_time AT TIME ZONE 'UTC', 'HH24:MI') || ' UTC',
                    'booking_id', NEW.id,
                    'portal_url', v_portal_url
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Verify the fix
DO $$
BEGIN
    RAISE NOTICE '✅ Fixed exam governance functions to use public.users instead of public.profiles';
END $$;
