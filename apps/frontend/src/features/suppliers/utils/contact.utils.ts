/**
 * Checks if a string has a valid email address structure.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Builds a safe mailto: URL or returns null if the email is absent or invalid.
 */
export function buildMailtoUrl(email: string | null | undefined): string | null {
  if (!isValidEmail(email)) return null;
  return `mailto:${encodeURIComponent(email!.trim())}`;
}

/**
 * Builds a safe https://wa.me/ URL for international numbers (10 to 15 digits) or returns null.
 */
export function buildWhatsappUrl(whatsapp: string | null | undefined): string | null {
  if (!whatsapp || typeof whatsapp !== 'string') return null;
  const digits = whatsapp.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}
