import { describe, expect, it } from 'vitest';
import { StockMovementType } from '@erp/shared-types';
import { stockAdjustmentSchema } from './stock-adjustment.schema';

describe('stockAdjustmentSchema', () => {
  const validPayload = {
    productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    movementType: StockMovementType.AJUSTE_ENTRADA,
    quantityBase: 10.5,
    reason: 'Ajuste de inventario',
    documentReference: 'ACTA-001',
  };

  it('validates a correct payload', () => {
    const result = stockAdjustmentSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantityBase).toBe(10.5);
      expect(result.data.documentReference).toBe('ACTA-001');
    }
  });

  it('transforms empty documentReference to undefined', () => {
    const result = stockAdjustmentSchema.safeParse({
      ...validPayload,
      documentReference: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documentReference).toBeUndefined();
    }
  });

  it('rejects invalid product UUID', () => {
    const result = stockAdjustmentSchema.safeParse({
      ...validPayload,
      productId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unsupported movement types', () => {
    const result = stockAdjustmentSchema.safeParse({
      ...validPayload,
      movementType: StockMovementType.ENTRADA_COMPRA,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive quantity', () => {
    const resZero = stockAdjustmentSchema.safeParse({
      ...validPayload,
      quantityBase: 0,
    });
    expect(resZero.success).toBe(false);

    const resNeg = stockAdjustmentSchema.safeParse({
      ...validPayload,
      quantityBase: -5,
    });
    expect(resNeg.success).toBe(false);
  });

  it('rejects quantity with more than 2 decimal places', () => {
    const result = stockAdjustmentSchema.safeParse({
      ...validPayload,
      quantityBase: 10.123,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty or whitespace reason', () => {
    const resEmpty = stockAdjustmentSchema.safeParse({
      ...validPayload,
      reason: '',
    });
    expect(resEmpty.success).toBe(false);

    const resWhitespace = stockAdjustmentSchema.safeParse({
      ...validPayload,
      reason: '   ',
    });
    expect(resWhitespace.success).toBe(false);
  });

  it('rejects reason exceeding 500 characters', () => {
    const result = stockAdjustmentSchema.safeParse({
      ...validPayload,
      reason: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
