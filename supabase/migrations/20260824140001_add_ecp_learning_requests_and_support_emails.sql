-- ECP Orders & Requests
-- Adds a distinct request record for Learning System seats and separate support email templates
-- for BDA-CP/BDA-SCP exam voucher requests and Learning System access requests.

CREATE TABLE IF NOT EXISTS public.ecp_learning_system_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  request_number VARCHAR(50) UNIQUE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 5000),
  status voucher_request_status NOT NULL DEFAULT 'pending',
  invoice_reference VARCHAR(100),
  payment_reference VARCHAR(100),
  paid_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecp_learning_system_requests_partner
  ON public.ecp_learning_system_requests(partner_id);
CREATE INDEX IF NOT EXISTS idx_ecp_learning_system_requests_status
  ON public.ecp_learning_system_requests(status);
CREATE INDEX IF NOT EXISTS idx_ecp_learning_system_requests_number
  ON public.ecp_learning_system_requests(request_number);

CREATE OR REPLACE FUNCTION public.generate_learning_system_request_number()
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  v_year VARCHAR(4) := to_char(now(), 'YYYY');
  v_sequence INTEGER;
BEGIN
  SELECT COUNT(*) + 1
  INTO v_sequence
  FROM public.ecp_learning_system_requests
  WHERE request_number LIKE 'LSR-' || v_year || '-%';

  RETURN 'LSR-' || v_year || '-' || lpad(v_sequence::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_learning_system_request_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := public.generate_learning_system_request_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_learning_system_request_number
  ON public.ecp_learning_system_requests;
CREATE TRIGGER trigger_set_learning_system_request_number
  BEFORE INSERT ON public.ecp_learning_system_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_learning_system_request_number();

DROP TRIGGER IF EXISTS update_ecp_learning_system_requests_updated_at
  ON public.ecp_learning_system_requests;
CREATE TRIGGER update_ecp_learning_system_requests_updated_at
  BEFORE UPDATE ON public.ecp_learning_system_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ecp_learning_system_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ECP partners can view their learning requests"
  ON public.ecp_learning_system_requests;
CREATE POLICY "ECP partners can view their learning requests"
  ON public.ecp_learning_system_requests
  FOR SELECT TO authenticated
  USING (
    partner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "ECP partners can create learning requests"
  ON public.ecp_learning_system_requests;
CREATE POLICY "ECP partners can create learning requests"
  ON public.ecp_learning_system_requests
  FOR INSERT TO authenticated
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "ECP partners can update their pending learning requests"
  ON public.ecp_learning_system_requests;
CREATE POLICY "ECP partners can update their pending learning requests"
  ON public.ecp_learning_system_requests
  FOR UPDATE TO authenticated
  USING (partner_id = auth.uid() AND status = 'pending')
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all learning requests"
  ON public.ecp_learning_system_requests;
CREATE POLICY "Admins can manage all learning requests"
  ON public.ecp_learning_system_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

INSERT INTO public.email_templates (
  template_key,
  name,
  category,
  subject,
  html_body,
  text_body,
  variables,
  is_active
)
VALUES
(
  'ecp_exam_voucher_request_support',
  'ECP Exam Voucher Request — Support Notification',
  'partner',
  'New BDA Exam Voucher Request — {{request_number}}',
  $html$
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f0f6ff;font-family:Arial,Helvetica,sans-serif;color:#0d1f4e;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f0f6ff;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #dbeafe;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:30px 34px;background:linear-gradient(135deg,#0f91e0 0%,#1c4a8b 56%,#0d1f4e 100%);">
            <p style="margin:0 0 8px;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Business Development Association</p>
            <h1 style="margin:0;color:#ffffff;font-size:27px;line-height:1.25;">New Exam Voucher Request</h1>
          </td></tr>
          <tr><td style="padding:34px;">
            <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#334155;">An ECP partner has submitted a new invoice request for exam vouchers.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f8fbff;border:1px solid #dbeafe;border-radius:10px;overflow:hidden;">
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;width:42%;">Request reference</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;font-weight:700;">{{request_number}}</td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;">Partner</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;font-weight:700;">{{partner_name}}</td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;">Partner email</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;">{{partner_email}}</td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;">Product</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;font-weight:700;">{{product_label}}</td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;">Quantity</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;font-weight:700;">{{quantity}}</td></tr>
              <tr><td style="padding:12px 16px;color:#64748b;">Submitted</td><td style="padding:12px 16px;">{{requested_at}}</td></tr>
            </table>
            <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#475569;">Please prepare and send the appropriate invoice to the partner. No vouchers are created until payment is confirmed and the request is fulfilled.</p>
          </td></tr>
          <tr><td style="padding:20px 34px;background:#0d1f4e;color:#dbeafe;font-size:12px;">Business Development Association (BDA) — Partner Operations</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
$html$,
  'New BDA Exam Voucher Request\n\nReference: {{request_number}}\nPartner: {{partner_name}}\nEmail: {{partner_email}}\nProduct: {{product_label}}\nQuantity: {{quantity}}\nSubmitted: {{requested_at}}\n\nPlease prepare and send the invoice. No vouchers are created until payment is confirmed.',
  '["request_number", "partner_name", "partner_email", "product_label", "quantity", "requested_at"]'::jsonb,
  true
),
(
  'ecp_learning_system_request_support',
  'ECP Learning System Request — Support Notification',
  'partner',
  'New Learning System Access Request — {{request_number}}',
  $html$
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f0f6ff;font-family:Arial,Helvetica,sans-serif;color:#0d1f4e;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f0f6ff;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #dbeafe;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:30px 34px;background:linear-gradient(135deg,#0f91e0 0%,#1c4a8b 56%,#0d1f4e 100%);">
            <p style="margin:0 0 8px;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Business Development Association</p>
            <h1 style="margin:0;color:#ffffff;font-size:27px;line-height:1.25;">New Learning System Request</h1>
          </td></tr>
          <tr><td style="padding:34px;">
            <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#334155;">An ECP partner has requested Learning System seats for their trainees.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f8fbff;border:1px solid #dbeafe;border-radius:10px;overflow:hidden;">
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;width:42%;">Request reference</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;font-weight:700;">{{request_number}}</td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;">Partner</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;font-weight:700;">{{partner_name}}</td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;">Partner email</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;">{{partner_email}}</td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;">Product</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;font-weight:700;">Learning System Access</td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;">Seats requested</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;font-weight:700;">{{quantity}}</td></tr>
              <tr><td style="padding:12px 16px;color:#64748b;">Submitted</td><td style="padding:12px 16px;">{{requested_at}}</td></tr>
            </table>
            <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#475569;">Please prepare and send the appropriate invoice to the partner. Seats are not allocated until payment is confirmed and the request is fulfilled.</p>
          </td></tr>
          <tr><td style="padding:20px 34px;background:#0d1f4e;color:#dbeafe;font-size:12px;">Business Development Association (BDA) — Partner Operations</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
$html$,
  'New Learning System Access Request\n\nReference: {{request_number}}\nPartner: {{partner_name}}\nEmail: {{partner_email}}\nProduct: Learning System Access\nSeats requested: {{quantity}}\nSubmitted: {{requested_at}}\n\nPlease prepare and send the invoice. Seats are not allocated until payment is confirmed.',
  '["request_number", "partner_name", "partner_email", "quantity", "requested_at"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  subject = EXCLUDED.subject,
  html_body = EXCLUDED.html_body,
  text_body = EXCLUDED.text_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = now();
