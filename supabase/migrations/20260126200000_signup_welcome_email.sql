-- Migration: Add Welcome Email to Signup Flow
-- Date: 2026-01-26
-- Description: Sends a branded welcome email when users sign up via the portal
--              Uses the existing send-email Edge Function and welcome template

-- ============================================================================
-- 1. Create function to send welcome email via Edge Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_signup_welcome_email(
    p_user_id UUID,
    p_email TEXT,
    p_first_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_edge_url TEXT;
    v_anon_key TEXT;
    v_request_id BIGINT;
    v_user_name TEXT;
BEGIN
    -- Get Edge Function configuration
    SELECT value INTO v_edge_url FROM public.system_config WHERE key = 'edge_function_base_url';
    SELECT value INTO v_anon_key FROM public.system_config WHERE key = 'supabase_anon_key';

    -- Only proceed if configuration is set
    IF v_edge_url IS NULL OR v_edge_url = '' THEN
        RAISE WARNING '[Signup Welcome Email] Edge Function URL not configured - skipping email';
        RETURN;
    END IF;

    IF v_anon_key IS NULL OR v_anon_key = '' THEN
        RAISE WARNING '[Signup Welcome Email] Supabase anon key not configured - skipping email';
        RETURN;
    END IF;

    -- Determine user name (use first name if available, otherwise email prefix)
    v_user_name := COALESCE(NULLIF(p_first_name, ''), SPLIT_PART(p_email, '@', 1));

    -- Call the send-email Edge Function asynchronously via pg_net
    BEGIN
        SELECT net.http_post(
            url := v_edge_url || '/send-email',
            body := jsonb_build_object(
                'type', 'welcome',
                'to', p_email,
                'user_id', p_user_id::TEXT,
                'data', jsonb_build_object(
                    'user_name', v_user_name,
                    'email', p_email
                )
            )::jsonb,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_anon_key,
                'apikey', v_anon_key
            )::jsonb
        ) INTO v_request_id;

        RAISE NOTICE '[Signup Welcome Email] Sent to %, request_id: %', p_email, v_request_id;
    EXCEPTION WHEN OTHERS THEN
        -- Don't fail the signup if the email fails
        RAISE WARNING '[Signup Welcome Email] Failed to send: %', SQLERRM;
    END;
END;
$$;

COMMENT ON FUNCTION public.send_signup_welcome_email(UUID, TEXT, TEXT) IS
    'Sends a branded welcome email to new users via the send-email Edge Function';

-- ============================================================================
-- 2. Update handle_new_user() to send welcome email after user sync
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_first_name TEXT;
    v_created_from TEXT;
BEGIN
    -- Extract first name and created_from for later use
    v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'firstName', '');
    v_created_from := COALESCE(NEW.raw_user_meta_data->>'created_from', 'portal');

    -- Sync user to public.users table
    INSERT INTO public.users (
        id,
        email,
        first_name,
        last_name,
        role,
        wp_user_id,
        created_from,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        v_first_name,
        COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'lastName', ''),
        COALESCE(
            (NEW.raw_user_meta_data->>'bda_role')::public.user_role,
            (NEW.raw_user_meta_data->>'role')::public.user_role,
            'individual'::public.user_role
        ),
        COALESCE((NEW.raw_user_meta_data->>'wp_user_id')::integer, NULL),
        v_created_from,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        role = COALESCE(EXCLUDED.role, public.users.role),
        wp_user_id = COALESCE(EXCLUDED.wp_user_id, public.users.wp_user_id),
        updated_at = NOW();

    -- Send welcome email for portal signups (not for bulk imports or admin-created users)
    -- bulk_import and admin_created users receive different emails
    IF v_created_from = 'portal' OR v_created_from = 'signup' THEN
        PERFORM public.send_signup_welcome_email(NEW.id, NEW.email, v_first_name);
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth.users insert
        RAISE WARNING 'Failed to sync user to public.users: % - %', SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. Recreate the trigger to ensure it's using the updated function
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 4. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.send_signup_welcome_email(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ============================================================================
-- 5. Success Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Signup Welcome Email integration completed';
    RAISE NOTICE '';
    RAISE NOTICE 'Welcome emails will now be sent automatically when users sign up via the portal.';
    RAISE NOTICE 'Emails use the branded "welcome" template from email_templates table.';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: Bulk import users receive the "bulk_import_welcome" template instead.';
END $$;
