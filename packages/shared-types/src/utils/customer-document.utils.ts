import { CustomerDocumentType } from '../enums/customers.enum';
import { TaxCondition } from '../enums/financial.enum';
import { isValidCuit, sanitizeCuit } from './cuit.utils';

const ALLOWED_DOCUMENT_CHARS = /^[0-9\s.-]+$/;

export function sanitizeDni(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!ALLOWED_DOCUMENT_CHARS.test(trimmed)) return null;
  const digits = trimmed.replace(/[\s.-]/g, '');
  if (!/^\d{7,8}$/.test(digits) || /^0+$/.test(digits)) return null;
  return digits;
}

export function sanitizeCustomerDocument(
  type: CustomerDocumentType,
  raw: string | null | undefined,
): string | null {
  if (type === CustomerDocumentType.DNI) return sanitizeDni(raw);
  if (type === CustomerDocumentType.CUIT) {
    const normalized = sanitizeCuit(raw);
    return normalized && isValidCuit(normalized) ? normalized : null;
  }
  return null;
}

export function isValidCustomerDocument(
  type: CustomerDocumentType,
  raw: string | null | undefined,
): boolean {
  return sanitizeCustomerDocument(type, raw) !== null;
}

export function isCustomerTaxConditionCompatible(
  type: CustomerDocumentType,
  condition: TaxCondition,
): boolean {
  return type === CustomerDocumentType.CUIT || condition === TaxCondition.CONSUMIDOR_FINAL;
}

export function normalizeCustomerDocumentForSearch(raw: string | null | undefined): string {
  return typeof raw === 'string' ? raw.replace(/\D/g, '') : '';
}
