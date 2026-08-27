import { describe, expect, it } from 'vitest';
import { GoodsReceiptErrorCode } from '../types/purchase-orders.types';
import { parseGoodsReceiptApiError } from './goods-receipt.errors';

describe('parseGoodsReceiptApiError', () => {
  it('distinguishes duplicate delivery notes from concurrency conflicts', () => {
    expect(
      parseGoodsReceiptApiError({
        response: {
          status: 409,
          data: { code: GoodsReceiptErrorCode.GOODS_RECEIPT_DUPLICATE_DELIVERY_NOTE },
        },
      }).kind,
    ).toBe('DUPLICATE_DELIVERY_NOTE');

    expect(
      parseGoodsReceiptApiError({
        response: {
          status: 409,
          data: { code: GoodsReceiptErrorCode.GOODS_RECEIPT_EXCEEDS_PENDING },
        },
      }).kind,
    ).toBe('CONCURRENCY');
  });

  it('returns actionable validation and request-id fallbacks', () => {
    const validation = parseGoodsReceiptApiError({
      response: {
        status: 400,
        data: { code: GoodsReceiptErrorCode.GOODS_RECEIPT_BASE_QUANTITY_NOT_REPRESENTABLE },
      },
    });
    expect(validation.kind).toBe('VALIDATION');
    expect(validation.message).toMatch(/representable/i);

    const unknown = parseGoodsReceiptApiError({
      response: { status: 500, data: { requestId: 'req-123' } },
    });
    expect(unknown.message).toContain('req-123');
  });
});
