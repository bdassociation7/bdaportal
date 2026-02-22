// Simple template renderer using {{variable}} syntax

export function renderTemplate(
  template: string,
  data: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    if (value === undefined || value === null) {
      console.warn(`Template variable "${key}" not found in data`);
      return match; // Keep original if not found
    }
    return String(value);
  });
}

// Render both subject and body
export function renderEmailContent(
  subject: string,
  htmlBody: string,
  textBody: string | undefined,
  data: Record<string, unknown>
): { subject: string; html: string; text?: string } {
  return {
    subject: renderTemplate(subject, data),
    html: renderTemplate(htmlBody, data),
    text: textBody ? renderTemplate(textBody, data) : undefined,
  };
}
