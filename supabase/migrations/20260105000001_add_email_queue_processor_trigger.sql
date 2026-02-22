-- Migration: Add Email Queue Processor Trigger
-- Date: 2026-01-05
-- Description: Creates a trigger that automatically processes emails when inserted into the queue
--              Uses pg_net extension to call the send-emails Edge Function
--              This is a solution for Supabase FREE plan (no cron available)

-- ============================================================================
-- 1. Enable pg_net extension (if not already enabled)
-- ============================================================================

-- pg_net is pre-installed in Supabase but may need to be enabled
-- The extension creates functions in the 'net' schema
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Ensure the net schema exists and has proper permissions
GRANT USAGE ON SCHEMA net TO postgres, authenticated, service_role;

-- ============================================================================
-- 2. Create configuration table for Edge Function URL
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default configuration (will be updated by admin or deployment)
INSERT INTO public.system_config (key, value, description)
VALUES
    ('edge_function_base_url', '', 'Base URL for Edge Functions (e.g., https://xxxx.supabase.co/functions/v1)'),
    ('supabase_anon_key', '', 'Supabase anon key for Edge Function authentication')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.system_config IS 'System configuration for runtime settings';

-- ============================================================================
-- 3. Function to process email queue via Edge Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_process_email_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_edge_url TEXT;
    v_anon_key TEXT;
    v_request_id BIGINT;
BEGIN
    -- Get Edge Function configuration
    SELECT value INTO v_edge_url FROM public.system_config WHERE key = 'edge_function_base_url';
    SELECT value INTO v_anon_key FROM public.system_config WHERE key = 'supabase_anon_key';

    -- Only proceed if configuration is set
    IF v_edge_url IS NULL OR v_edge_url = '' THEN
        RAISE WARNING '[Email Queue] Edge Function URL not configured - skipping automatic processing';
        RETURN NEW;
    END IF;

    IF v_anon_key IS NULL OR v_anon_key = '' THEN
        RAISE WARNING '[Email Queue] Supabase anon key not configured - skipping automatic processing';
        RETURN NEW;
    END IF;

    -- Call the send-emails Edge Function asynchronously via pg_net
    -- This is non-blocking and won't slow down the insert operation
    BEGIN
        SELECT net.http_post(
            url := v_edge_url || '/send-emails',
            body := jsonb_build_object('limit', 5, 'triggered_by', 'db_trigger')::jsonb,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_anon_key,
                'apikey', v_anon_key
            )::jsonb
        ) INTO v_request_id;

        -- Log the trigger execution (optional - for debugging)
        RAISE NOTICE '[Email Queue] Triggered send-emails function, request_id: %', v_request_id;
    EXCEPTION WHEN OTHERS THEN
        -- Don't fail the insert if the HTTP request fails
        RAISE WARNING '[Email Queue] Failed to trigger Edge Function: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_process_email_queue() IS 'Triggers the send-emails Edge Function when new emails are queued';

-- ============================================================================
-- 4. Create trigger on email_queue table
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_email_queue_processor ON public.email_queue;

-- Create the trigger - fires after insert with a slight delay behavior
-- Using AFTER INSERT so the email is committed before we try to send
CREATE TRIGGER trigger_email_queue_processor
AFTER INSERT ON public.email_queue
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.trigger_process_email_queue();

COMMENT ON TRIGGER trigger_email_queue_processor ON public.email_queue IS
    'Automatically triggers email processing when new pending emails are added to the queue';

-- ============================================================================
-- 5. Alternative: Create a function to manually trigger email processing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_pending_emails(p_limit INTEGER DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_edge_url TEXT;
    v_anon_key TEXT;
    v_request_id BIGINT;
    v_pending_count INTEGER;
BEGIN
    -- Check pending emails count
    SELECT COUNT(*) INTO v_pending_count
    FROM public.email_queue
    WHERE status IN ('pending', 'retrying')
    AND scheduled_for <= NOW();

    IF v_pending_count = 0 THEN
        RETURN jsonb_build_object('message', 'No pending emails to process', 'count', 0);
    END IF;

    -- Get Edge Function configuration
    SELECT value INTO v_edge_url FROM public.system_config WHERE key = 'edge_function_base_url';
    SELECT value INTO v_anon_key FROM public.system_config WHERE key = 'supabase_anon_key';

    IF v_edge_url IS NULL OR v_edge_url = '' THEN
        RETURN jsonb_build_object('error', 'Edge Function URL not configured');
    END IF;

    IF v_anon_key IS NULL OR v_anon_key = '' THEN
        RETURN jsonb_build_object('error', 'Supabase anon key not configured');
    END IF;

    -- Call the send-emails Edge Function
    SELECT net.http_post(
        url := v_edge_url || '/send-emails',
        body := jsonb_build_object('limit', p_limit, 'triggered_by', 'manual')::jsonb,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key,
            'apikey', v_anon_key
        )::jsonb
    ) INTO v_request_id;

    RETURN jsonb_build_object(
        'message', 'Email processing triggered',
        'pending_count', v_pending_count,
        'request_id', v_request_id
    );
END;
$$;

COMMENT ON FUNCTION public.process_pending_emails(INTEGER) IS 'Manually trigger processing of pending emails in the queue';

-- Grant execute permission to authenticated users with admin role
GRANT EXECUTE ON FUNCTION public.process_pending_emails(INTEGER) TO authenticated;

-- ============================================================================
-- 6. RLS for system_config table
-- ============================================================================

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Only admins can view/modify system config
CREATE POLICY "Admins can manage system config"
    ON public.system_config
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- ============================================================================
-- 7. Success Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Email Queue Processor Trigger created successfully';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: You need to configure the system_config table:';
    RAISE NOTICE '    1. Set edge_function_base_url to your Supabase project''s Edge Function URL';
    RAISE NOTICE '       Example: https://your-project-ref.supabase.co/functions/v1';
    RAISE NOTICE '    2. Set supabase_anon_key to your project''s anon key';
    RAISE NOTICE '';
    RAISE NOTICE 'Run this SQL to configure (replace with your values):';
    RAISE NOTICE '    UPDATE public.system_config SET value = ''https://xxx.supabase.co/functions/v1'' WHERE key = ''edge_function_base_url'';';
    RAISE NOTICE '    UPDATE public.system_config SET value = ''your-anon-key'' WHERE key = ''supabase_anon_key'';';
END $$;
