/**
 * error-handler.ts
 * Centralised error message sanitiser for the BDA Portal.
 *
 * Technical database / network error messages must NEVER be shown to end-users.
 * This utility maps raw errors to user-friendly messages.
 */

/** Keywords that indicate a raw technical/DB error that should be hidden */
const TECHNICAL_ERROR_PATTERNS = [
  'violates',
  'constraint',
  'null value',
  'foreign key',
  'duplicate key',
  'relation "',
  'column "',
  'syntax error',
  'permission denied',
  'schema cache',
  'could not find the function',
  'PGRST',
  'pg_',
  'ERROR:',
  'FATAL:',
];

/**
 * Returns a user-friendly error message.
 * If the raw message contains technical DB/network details, a generic fallback is returned.
 *
 * @param error - The caught error (unknown type)
 * @param fallback - Fallback message shown when the error is technical (default: generic)
 */
export function getUserFriendlyError(
  error: unknown,
  fallback = 'Something went wrong. Please try again or contact support.'
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : '';

  if (!raw) return fallback;

  const isTechnical = TECHNICAL_ERROR_PATTERNS.some((pattern) =>
    raw.toLowerCase().includes(pattern.toLowerCase())
  );

  if (isTechnical) return fallback;

  return raw;
}

/**
 * Extracts a user-friendly error from a Supabase RPC / query error object.
 * Supabase errors have a `.message` field that may contain raw DB messages.
 */
export function getSupabaseErrorMessage(
  error: { message?: string; details?: string; hint?: string } | null,
  fallback = 'Something went wrong. Please try again or contact support.'
): string {
  if (!error) return fallback;
  return getUserFriendlyError(error.message || '', fallback);
}
