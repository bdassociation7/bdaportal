-- Schedule membership expiry cron job (pg_cron must be enabled)
SELECT cron.schedule(
    'check-membership-expiry',
    '0 8 * * *',
    'SELECT public.check_membership_expiry_and_notify()'
);

-- Verify the job was scheduled
SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'check-membership-expiry';
