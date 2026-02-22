// Email system types

export interface EmailRequest {
  type: string;                    // Template key (e.g., 'membership_activated')
  to: string;                      // Recipient email
  user_id?: string;                // Optional user ID for logging
  data: Record<string, unknown>;   // Template variables
}

export interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  category: string;
  subject: string;
  html_body: string;
  text_body?: string;
  variables?: string[];
  is_active: boolean;
}

export interface EmailLog {
  id?: string;
  email_type: string;
  recipient_email: string;
  recipient_user_id?: string;
  subject: string;
  status: 'pending' | 'queued' | 'sent' | 'failed' | 'bounced';
  resend_id?: string;
  error_message?: string;
  template_data?: Record<string, unknown>;
  created_at?: string;
  sent_at?: string;
}

export interface ResendResponse {
  id?: string;
  error?: {
    message: string;
    name: string;
  };
}
