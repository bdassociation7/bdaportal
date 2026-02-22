// Resend API client

import type { ResendResponse } from './types.ts';

const RESEND_API_URL = 'https://api.resend.com/emails';

export interface SendEmailParams {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  reply_to?: string;
}

export async function sendEmail(
  apiKey: string,
  params: SendEmailParams
): Promise<ResendResponse> {
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      error: {
        message: data.message || 'Unknown error',
        name: data.name || 'api_error',
      },
    };
  }

  return { id: data.id };
}
