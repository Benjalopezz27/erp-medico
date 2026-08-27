import { BadRequestException } from '@nestjs/common';
import { SupplierInvoiceErrorCode } from '@erp/shared-types';

export function normalizeSupplierInvoiceNumber(raw: string): string {
  if (!raw || typeof raw !== 'string' || /[\x00-\x1F\x7F]/.test(raw)) {
    throw new BadRequestException({
      code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_NUMBER,
      message: 'El número de factura es obligatorio y debe ser válido.',
    });
  }

  const normalized = raw
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*([-/])\s*/g, '$1');

  if (
    normalized.length === 0 ||
    normalized.length > 50 ||
    !/^[A-Z0-9\s\-_/.]+$/.test(normalized)
  ) {
    throw new BadRequestException({
      code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_NUMBER,
      message:
        'El número de factura contiene caracteres inválidos o supera los 50 caracteres.',
    });
  }

  return normalized;
}
