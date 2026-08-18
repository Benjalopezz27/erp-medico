/**
 * Normalizes an email address by trimming leading/trailing whitespace
 * and converting all characters to lowercase.
 *
 * @param email - The raw email input
 * @returns The sanitized, normalized email string
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) {
    return '';
  }
  return email.trim().toLowerCase();
}
