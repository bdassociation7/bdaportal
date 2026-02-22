-- =============================================================================
-- Schedule certification expiry cron job (pg_cron must be enabled)
-- =============================================================================
-- Runs daily at 7:00 AM UTC to check certification expiry
-- - 60-day warning
-- - 30-day warning
-- - 7-day warning
-- - Auto-expire and notify
-- =============================================================================

SELECT cron.schedule(
    'check-certification-expiry',
    '0 7 * * *',  -- Run at 7:00 AM UTC daily
    'SELECT public.check_certification_expiry_and_notify()'
);

-- Verify the job was scheduled
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'check-certification-expiry';
