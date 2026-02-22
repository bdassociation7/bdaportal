/**
 * Exam Reminder Email Templates
 *
 * Sent 48 hours and 24 hours before scheduled exams
 */

import { baseTemplate, baseTextTemplate, button, infoBox } from './base-template';

export interface ExamReminderData {
  firstName: string;
  examTitle: string;
  examDate: string;
  examTime: string;
  timezone: string;
  confirmationCode: string;
  duration: string;
  dashboardUrl: string;
  hoursUntilExam: 24 | 48;
}

export function examReminderHtml(data: ExamReminderData): string {
  const {
    firstName,
    examTitle,
    examDate,
    examTime,
    timezone,
    confirmationCode,
    duration,
    dashboardUrl,
    hoursUntilExam,
  } = data;

  const urgencyText = hoursUntilExam === 24 ? 'tomorrow' : 'in 2 days';
  const urgencyColor = hoursUntilExam === 24 ? '#dc2626' : '#ea580c'; // red-600 or orange-600

  const content = `
    <h1 style="margin: 0 0 24px 0; font-size: 24px; color: #1f2937;">
      Your Exam is ${urgencyText.charAt(0).toUpperCase() + urgencyText.slice(1)}!
    </h1>

    <p style="margin: 0 0 16px 0;">
      Hi ${firstName},
    </p>

    <p style="margin: 0 0 24px 0;">
      This is a friendly reminder that your <strong>${examTitle}</strong> exam is scheduled ${urgencyText}. Please make sure you're prepared and have everything ready.
    </p>

    ${infoBox('Exam Details', [
      { label: 'Exam', value: examTitle },
      { label: 'Date', value: examDate },
      { label: 'Time', value: `${examTime} (${timezone})` },
      { label: 'Duration', value: duration },
      { label: 'Confirmation Code', value: `<strong>${confirmationCode}</strong>` },
    ])}

    ${button('Go to Dashboard', dashboardUrl)}

    <div style="background-color: #fef3c7; border-left: 4px solid ${urgencyColor}; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400e;">
        <strong>Before Your Exam:</strong>
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #92400e;">
        <li>Test your internet connection</li>
        <li>Ensure your webcam and microphone work properly</li>
        <li>Find a quiet, well-lit room</li>
        <li>Have a valid government-issued ID ready</li>
        <li>Close all unnecessary applications</li>
      </ul>
    </div>

    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      Need to reschedule? Please contact us at least 24 hours before your exam at <a href="mailto:exams@bda-global.org" style="color: #1e40af;">exams@bda-global.org</a>.
    </p>
  `;

  return baseTemplate({
    previewText: `Reminder: Your ${examTitle} exam is ${urgencyText} at ${examTime}`,
    children: content,
  });
}

export function examReminderText(data: ExamReminderData): string {
  const {
    firstName,
    examTitle,
    examDate,
    examTime,
    timezone,
    confirmationCode,
    duration,
    dashboardUrl,
    hoursUntilExam,
  } = data;

  const urgencyText = hoursUntilExam === 24 ? 'tomorrow' : 'in 2 days';

  const content = `
YOUR EXAM IS ${urgencyText.toUpperCase()}!

Hi ${firstName},

This is a friendly reminder that your ${examTitle} exam is scheduled ${urgencyText}.

EXAM DETAILS
------------
Exam: ${examTitle}
Date: ${examDate}
Time: ${examTime} (${timezone})
Duration: ${duration}
Confirmation Code: ${confirmationCode}

Dashboard: ${dashboardUrl}

BEFORE YOUR EXAM:
- Test your internet connection
- Ensure your webcam and microphone work properly
- Find a quiet, well-lit room
- Have a valid government-issued ID ready
- Close all unnecessary applications

Need to reschedule? Please contact us at least 24 hours before your exam at exams@bda-global.org.
`.trim();

  return baseTextTemplate(content);
}

export function getExamReminderSubject(hoursUntilExam: 24 | 48, examTitle: string): string {
  if (hoursUntilExam === 24) {
    return `⚠️ Tomorrow: Your ${examTitle} Exam`;
  }
  return `Reminder: Your ${examTitle} Exam in 2 Days`;
}
