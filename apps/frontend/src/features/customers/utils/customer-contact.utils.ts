export function buildMailtoUrl(email: string | null | undefined): string | null {
  const normalized = email?.trim();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return `mailto:${encodeURIComponent(normalized)}`;
}

export function buildTelUrl(phone: string | null | undefined): string | null {
  const normalized = phone?.trim();
  if (!normalized || !/^[+0-9\s().-]+$/.test(normalized)) return null;
  const digits = normalized.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 15) return null;
  return `tel:${normalized.startsWith('+') ? '+' : ''}${digits}`;
}
