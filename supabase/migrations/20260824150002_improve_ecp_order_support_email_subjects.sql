-- Make ECP order notifications immediately recognisable to BDA Support.
-- Inbox categorisation is controlled by the receiving mailbox, but clear action-oriented subjects
-- and a Reply-To address improve operational handling and response quality.

UPDATE public.email_templates
SET subject = 'Action required — New BDA Exam Voucher Request — {{request_number}}',
    updated_at = now()
WHERE template_key = 'ecp_exam_voucher_request_support';

UPDATE public.email_templates
SET subject = 'Action required — New Learning System Access Request — {{request_number}}',
    updated_at = now()
WHERE template_key = 'ecp_learning_system_request_support';
