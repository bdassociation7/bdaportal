/**
 * Base Email Template
 *
 * Provides consistent branding and styling for all BDA emails
 * Uses inline CSS for maximum email client compatibility
 */

export interface BaseTemplateProps {
  previewText?: string;
  children: string;
}

// BDA Brand Colors
const COLORS = {
  primary: '#1e40af', // Blue 800
  primaryDark: '#1e3a8a', // Blue 900
  secondary: '#059669', // Emerald 600
  text: '#1f2937', // Gray 800
  textLight: '#6b7280', // Gray 500
  background: '#f9fafb', // Gray 50
  white: '#ffffff',
  border: '#e5e7eb', // Gray 200
};

/**
 * Generate the base HTML email template
 */
export function baseTemplate({ previewText, children }: BaseTemplateProps): string {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>The Business Development Association (BDA®)</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      background-color: ${COLORS.background};
    }
    /* Button styles */
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: ${COLORS.primary};
      color: ${COLORS.white} !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
    }
    .button:hover {
      background-color: ${COLORS.primaryDark};
    }
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 16px !important;
      }
      .content {
        padding: 24px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${previewText ? `
  <!-- Preview text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${previewText}
    ${'&nbsp;'.repeat(100)}
  </div>
  ` : ''}

  <!-- Wrapper table -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Main container -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width: 600px; background-color: ${COLORS.white}; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header with logo -->
          <tr>
            <td align="center" style="padding: 32px 40px; background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); border-radius: 12px 12px 0 0;">
              <img src="https://portal.bda-global.org/bda-email-logo.png" alt="The Business Development Association (BDA®)" width="220" style="max-width: 220px; height: auto;" />
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 40px; color: ${COLORS.text}; font-size: 16px; line-height: 1.6;">
              ${children}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: ${COLORS.background}; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: ${COLORS.textLight};">
                The Business Development Association (BDA&reg;)
              </p>
              <p style="margin: 0 0 12px 0; font-size: 12px; color: ${COLORS.textLight};">
                <a href="https://bda-global.org" style="color: ${COLORS.primary}; text-decoration: none;">Website</a> &nbsp;|&nbsp;
                <a href="https://portal.bda-global.org" style="color: ${COLORS.primary}; text-decoration: none;">Portal</a> &nbsp;|&nbsp;
                <a href="mailto:info@bda-global.org" style="color: ${COLORS.primary}; text-decoration: none;">Contact Us</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: ${COLORS.textLight};">
                &copy; ${new Date().getFullYear()} The Business Development Association (BDA&reg;). All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Generate a plain text version of the email
 */
export function baseTextTemplate(content: string): string {
  return `
${content}

---
The Business Development Association (BDA®)
Website: https://bda-global.org
Portal: https://portal.bda-global.org
Contact: info@bda-global.org

© ${new Date().getFullYear()} The Business Development Association (BDA®). All rights reserved.
`.trim();
}

/**
 * Create a styled button HTML
 */
export function button(text: string, url: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
  <tr>
    <td align="center">
      <a href="${url}" class="button" style="display: inline-block; padding: 14px 32px; background-color: ${COLORS.primary}; color: ${COLORS.white}; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        ${text}
      </a>
    </td>
  </tr>
</table>
`.trim();
}

/**
 * Create an info box
 */
export function infoBox(title: string, items: { label: string; value: string }[]): string {
  const itemsHtml = items
    .map(item => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid ${COLORS.border};">
          <strong style="color: ${COLORS.textLight};">${item.label}:</strong>
        </td>
        <td style="padding: 8px 0 8px 16px; border-bottom: 1px solid ${COLORS.border}; text-align: right;">
          ${item.value}
        </td>
      </tr>
    `)
    .join('');

  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background}; border-radius: 8px; margin: 24px 0;">
  <tr>
    <td style="padding: 20px;">
      <h3 style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.primary};">${title}</h3>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${itemsHtml}
      </table>
    </td>
  </tr>
</table>
`.trim();
}

export const BRAND_COLORS = COLORS;
