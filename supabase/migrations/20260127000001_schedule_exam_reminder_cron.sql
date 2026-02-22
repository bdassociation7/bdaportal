-- =============================================================================
-- Schedule exam reminder cron job (pg_cron must be enabled)
-- =============================================================================
-- Runs daily at 6:00 AM UTC to send exam reminders
-- - 3-day reminders for exams 3 days away
-- - Day-of reminders for exams happening today
-- =============================================================================

SELECT cron.schedule(
    'check-exam-reminders',
    '0 6 * * *',  -- Run at 6:00 AM UTC daily
    'SELECT public.check_exam_reminders_and_notify()'
);

-- Verify the job was scheduled
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'check-exam-reminders';
