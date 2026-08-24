-- Keep voucher request notifications concise and operational, with a plain-text alternative.
-- This aligns the voucher message with the Learning System request flow.

UPDATE public.email_templates
SET
  subject = 'BDA Partner Order — Exam Vouchers | {{request_number}}',
  html_body = $html$
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f0f6ff;font-family:Arial,Helvetica,sans-serif;color:#0d1f4e;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f0f6ff;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #dbeafe;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:30px 34px;background:linear-gradient(135deg,#0f91e0 0%,#1c4a8b 56%,#0d1f4e 100%);">
            <p style="margin:0 0 8px;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Business Development Association</p>
            <h1 style="margin:0;color:#ffffff;font-size:27px;line-height:1.25;">Partner Order: Exam Vouchers</h1>
          </td></tr>
          <tr><td style="padding:34px;">
            <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#334155;">An ECP partner has submitted an order request. Please prepare the invoice and reply directly to the partner if further information is required.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f8fbff;border:1px solid #dbeafe;border-radius:10px;overflow:hidden;">
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;width:42%;">Reference</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;font-weight:700;">{{request_number}}</td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;">Partner</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;font-weight:700;">{{partner_name}}</td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;">Partner email</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;">{{partner_email}}</td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;">Order</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;font-weight:700;">{{product_label}}</td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;color:#64748b;">Quantity</td><td style="padding:12px 16px;border-bottom:1px solid #dbeafe;font-weight:700;">{{quantity}}</td></tr>
              <tr><td style="padding:12px 16px;color:#64748b;">Submitted</td><td style="padding:12px 16px;">{{requested_at}}</td></tr>
            </table>
            <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#475569;">No vouchers are created until payment is confirmed and the order is fulfilled.</p>
          </td></tr>
          <tr><td style="padding:20px 34px;background:#0d1f4e;color:#dbeafe;font-size:12px;">Business Development Association (BDA) — Partner Operations</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
$html$,
  text_body = 'BDA Partner Order — Exam Vouchers\n\nReference: {{request_number}}\nPartner: {{partner_name}}\nPartner email: {{partner_email}}\nOrder: {{product_label}}\nQuantity: {{quantity}}\nSubmitted: {{requested_at}}\n\nPlease prepare the invoice. No vouchers are created until payment is confirmed and the order is fulfilled.',
  updated_at = now()
WHERE template_key = 'ecp_exam_voucher_request_support';
