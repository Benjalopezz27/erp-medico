import { CustomerDocumentType, formatCuit } from '@erp/shared-types';

export function formatDni(value: string | null | undefined): string {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (!/^\d{7,8}$/.test(digits)) return value?.trim() ?? '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatCustomerDocument(
  type: CustomerDocumentType,
  value: string | null | undefined,
): string {
  return type === CustomerDocumentType.CUIT ? formatCuit(value) : formatDni(value);
}
