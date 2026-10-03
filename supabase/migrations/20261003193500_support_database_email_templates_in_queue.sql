-- Allow the queue to resolve both legacy inline templates and maintained
-- email_templates rows. The queue worker already renders database templates;
-- resolving the subject here keeps the enqueue path aligned with that worker.

CREATE OR REPLACE FUNCTION public.queue_email(
    p_recipient_email TEXT,
    p_recipient_name TEXT DEFAULT NULL,
    p_template_name TEXT DEFAULT NULL,
    p_template_data JSONB DEFAULT NULL,
    p_priority INTEGER DEFAULT 5,
    p_scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    p_related_entity_type TEXT DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email_id UUID;
    v_subject TEXT;
    v_template RECORD;
BEGIN
    IF p_template_data IS NOT NULL AND p_template_data ? 'html_body' THEN
        v_subject := COALESCE(p_template_data->>'subject', 'BDA Portal Notification');
    ELSE
        -- Prefer maintained database templates. They are also the source used
        -- by the send-emails queue worker for non-builtin template names.
        SELECT et.subject
        INTO v_subject
        FROM public.email_templates AS et
        WHERE et.template_key = p_template_name
          AND et.is_active = TRUE;

        -- Fall back to the historical built-in templates that remain in the
        -- get_email_template() function for existing application flows.
        IF NOT FOUND THEN
            SELECT *
            INTO v_template
            FROM public.get_email_template(p_template_name);

            IF NOT FOUND THEN
                RAISE invalid_parameter_value
                    USING MESSAGE = 'Invalid template name: ' || COALESCE(p_template_name, 'NULL');
            END IF;

            v_subject := v_template.subject;
        END IF;
    END IF;

    INSERT INTO public.email_queue (
        recipient_email,
        recipient_name,
        subject,
        template_name,
        template_data,
        priority,
        scheduled_for,
        related_entity_type,
        related_entity_id
    )
    VALUES (
        p_recipient_email,
        p_recipient_name,
        v_subject,
        COALESCE(p_template_name, 'custom'),
        COALESCE(p_template_data, '{}'::JSONB),
        p_priority,
        p_scheduled_for,
        p_related_entity_type,
        p_related_entity_id
    )
    RETURNING id INTO v_email_id;

    RETURN v_email_id;
END;
$$;

COMMENT ON FUNCTION public.queue_email(TEXT, TEXT, TEXT, JSONB, INTEGER, TIMESTAMPTZ, TEXT, UUID)
IS 'Queues BDA email and resolves either maintained database templates or legacy built-in templates.';
