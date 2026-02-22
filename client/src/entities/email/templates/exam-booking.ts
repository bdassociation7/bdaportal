/**
 * Exam Booking Confirmation Email Template
 *
 * Sent when a user successfully books an exam
 */

import { baseTemplate, baseTextTemplate, button, infoBox } from './base-template';

export interface ExamBookingData {
  firstName: string;
  examTitle: string;
  examDate: string;
  examTime: string;
  timezone: string;
  duration: string;
  confirmationCode: string;
  dashboardUrl: string;
  preparationTips?: string[];
}

export function examBookingHtml(data: ExamBookingData): string {
  const {
    firstName,
    examTitle,
    examDate,
    examTime,
    timezone,
    duration,
    confirmationCode,
    dashboardUrl,
    preparationTips = [
      'Ensure a stable internet connection',
      'Use a quiet, well-lit environment',
      'Have your ID ready for verification',
      'Close all unnecessary applications',
      'Complete any required system checks beforehand',
    ],
  } = data;

  const content = `
    <h1 style="margin: 0 0 24px 0; font-size: 24px; color: #1f2937;">
      Exam Booking Confirmed!
    </h1>

    <p style="margin: 0 0 16px 0;">
      Dear ${firstName},
    </p>

    <p style="margin: 0 0 24px 0;">
      Your exam has been successfully scheduled. Please review the details below and save this email for reference.
    </p>

    ${infoBox('Exam Details', [
      { label: 'Exam', value: examTitle },
      { label: 'Date', value: examDate },
      { label: 'Time', value: `${examTime} (${timezone})` },
      { label: 'Duration', value: duration },
      { label: 'Confirmation Code', value: `<strong style="color: #059669;">${confirmationCode}</strong>` },
    ])}

    ${button('View in Dashboard', dashboardUrl)}

    <h3 style="margin: 32px 0 16px 0; font-size: 18px; color: #1e40af;">
      Preparation Tips
    </h3>

    <ul style="margin: 0 0 24px 0; padding-left: 20px;">
      ${preparationTips.map(tip => `<li style="margin-bottom: 8px;">${tip}</li>`).join('')}
    </ul>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>Important:</strong> Please arrive 15 minutes before your scheduled time to complete the check-in process.
      </p>
    </div>

    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      Need to reschedule? Contact us at least 48 hours before your exam at <a href="mailto:exams@bda-global.org" style="color: #1e40af;">exams@bda-global.org</a>.
    </p>
  `;

  return baseTemplate({
    previewText: `Your ${examTitle} exam is confirmed for ${examDate} at ${examTime}`,
    children: content,
  });
}

export function examBookingText(data: ExamBookingData): string {
  const { firstName, examTitle, examDate, examTime, timezone, duration, confirmationCode, dashboardUrl } = data;

  const content = `
Exam Booking Confirmed!

Dear ${firstName},

Your exam has been successfully scheduled.

EXAM DETAILS
------------
Exam: ${examTitle}
Date: ${examDate}
Time: ${examTime} (${timezone})
Duration: ${duration}
Confirmation Code: ${confirmationCode}

View in Dashboard: ${dashboardUrl}

PREPARATION TIPS
----------------
• Ensure a stable internet connection
• Use a quiet, well-lit environment
• Have your ID ready for verification
• Close all unnecessary applications
• Complete any required system checks beforehand

IMPORTANT: Please arrive 15 minutes before your scheduled time.

Need to reschedule? Contact exams@bda-global.org at least 48 hours before your exam.
`.trim();

  return baseTextTemplate(content);
}

export function getExamBookingSubject(examTitle: string, confirmationCode: string): string {
  return `Exam Confirmed: ${examTitle} [${confirmationCode}]`;
}
