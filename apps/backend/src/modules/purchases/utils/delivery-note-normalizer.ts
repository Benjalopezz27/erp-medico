import { BadRequestException } from '@nestjs/common';
import { GoodsReceiptErrorCode } from '@erp/shared-types';

/**
 * Normalizes a supplier delivery note number for consistent comparison and unique constraint enforcement.
 *
 * Rules:
 * 1. Rejects null/undefined/empty string.
 * 2. Rejects control characters.
 * 3. Applies Unicode NFKC normalization.
 * 4. Trims leading/trailing whitespace.
 * 5. Converts to uppercase.
 * 6. Collapses contiguous whitespace into a single space.
 * 7. Standardizes delimiter spacing: "0001 - 1234" -> "0001-1234".
 * 8. Validates allowed character set: alphanumeric, spaces, hyphens, slashes, dots.
 */
export function normalizeDeliveryNoteNumber(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    throw new BadRequestException({
      code: GoodsReceiptErrorCode.GOODS_RECEIPT_DELIVERY_NOTE_REQUIRED,
      message: 'El número de remito es obligatorio.',
    });
  }

  // Reject control characters (0x00 to 0x1F and 0x7F)
  if (/[\x00-\x1F\x7F]/.test(raw)) {
    throw new BadRequestException({
      code: GoodsReceiptErrorCode.GOODS_RECEIPT_DELIVERY_NOTE_REQUIRED,
      message:
        'El número de remito contiene caracteres de control no permitidos.',
    });
  }

  const normalized = raw
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*([-/])\s*/g, '$1');

  if (normalized.length === 0) {
    throw new BadRequestException({
      code: GoodsReceiptErrorCode.GOODS_RECEIPT_DELIVERY_NOTE_REQUIRED,
      message: 'El número de remito no puede estar vacío.',
    });
  }

  if (normalized.length > 50) {
    throw new BadRequestException({
      code: GoodsReceiptErrorCode.GOODS_RECEIPT_DELIVERY_NOTE_REQUIRED,
      message: 'El número de remito no puede superar los 50 caracteres.',
    });
  }

  // Allowed: alphanumeric, space, hyphen, slash, dot
  if (!/^[A-Z0-9\s\-_/.]+$/.test(normalized)) {
    throw new BadRequestException({
      code: GoodsReceiptErrorCode.GOODS_RECEIPT_DELIVERY_NOTE_REQUIRED,
      message: 'El número de remito contiene caracteres inválidos.',
    });
  }

  return normalized;
}
