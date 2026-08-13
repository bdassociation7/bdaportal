-- Prevent duplicate processing when a bulk email insert occurs.
-- Replaces the per-row trigger with a statement-level trigger and adds a queue sweep.

CREATE OR REPLACE FUNCTION public.trigger_process_email_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edge_url TEXT;
  v_anon_key TEXT;
BEGIN
  SELECT value INTO v_edge_url FROM public.system_config WHERE key = 'edge_function_base_url';
  SELECT value INTO v_anon_key FROM public.system_config WHERE key = 'supabase_anon_key';

  IF v_edge_url IS NULL OR v_edge_url = '' OR v_anon_key IS NULL OR v_anon_key = '' THEN
    RETURN NULL;
  END IF;

  -- One asynchronous dispatch per INSERT statement. The Edge Function claims up to 50 queued emails.
  PERFORM net.http_post(
    url := v_edge_url || '/send-emails',
    body := jsonb_build_object('limit', 50, 'triggered_by', 'db_statement_trigger')::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key,
      'apikey', v_anon_key
    )::jsonb
  );

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[Email Queue] Failed to trigger processing: %', SQLERRM;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_email_queue_processor ON public.email_queue;
CREATE TRIGGER trigger_email_queue_processor
AFTER INSERT ON public.email_queue
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_process_email_queue();

DO $$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'bda_email_queue_sweep';

  PERFORM cron.schedule(
    'bda_email_queue_sweep',
    '*/10 * * * *',
    'SELECT public.process_pending_emails(50);'
  );
END;
$$;

COMMENT ON FUNCTION public.trigger_process_email_queue() IS
  'Triggers one email dispatch per queue insert statement to avoid duplicate sends for bulk campaigns.';
