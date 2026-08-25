const VALID_CUIT_PREFIXES = new Set(['20', '23', '24', '27', '30', '33', '34']);
const ALLOWED_CHARS_REGEX = /^[0-9\s.-]+$/;

/**
 * Validates raw input format and normalizes to an 11-digit canonical string.
 * Returns null if input contains illegal characters or does not have exactly 11 digits.
 */
export function sanitizeCuit(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!ALLOWED_CHARS_REGEX.test(trimmed)) return null;

  const digits = trimmed.replace(/[\s.-]/g, '');
  return digits.length === 11 ? digits : null;
}

/**
 * Normalizes CUIT for search queries (extracts only digits tolerantly).
 */
export function normalizeCuitForSearch(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/\D/g, '').trim();
}

/**
 * Validates a CUIT using prefix checks and the official Modulo 11 check-digit algorithm.
 */
export function isValidCuit(raw: string | null | undefined): boolean {
  const cuit = sanitizeCuit(raw);
  if (!cuit) return false;

  const prefix = cuit.slice(0, 2);
  if (!VALID_CUIT_PREFIXES.has(prefix)) return false;

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cuit[i], 10) * weights[i];
  }

  const mod = sum % 11;
  const calculated = 11 - mod;
  let expectedVerifier: number;

  if (calculated === 11) {
    expectedVerifier = 0;
  } else if (calculated === 10) {
    return false; // Mod 11 residue 1 requires prefix mutation (AFIP assigns prefix 23); impossible for single-digit 10
  } else {
    expectedVerifier = calculated;
  }

  return parseInt(cuit[10], 10) === expectedVerifier;
}

/**
 * Formats an 11-digit CUIT into standard presentation: XX-XXXXXXXX-X
 */
export function formatCuit(raw: string | null | undefined): string {
  const cuit =
    sanitizeCuit(raw) ??
    (normalizeCuitForSearch(raw).length === 11 ? normalizeCuitForSearch(raw) : null);
  if (!cuit) return raw?.trim() ?? '';
  return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
}
