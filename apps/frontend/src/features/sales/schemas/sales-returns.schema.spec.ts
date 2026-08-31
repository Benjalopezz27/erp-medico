import { describe, expect, it } from 'vitest';
import { SaleReturnItemQuality } from '@erp/shared-types';
import { saleReturnSchema } from './sales-returns.schema';

const validItem = {
  saleItemId: '60000000-0000-4000-8000-000000000001',
  selected: true,
  remainingQuantity: 5,
  quantityBase: 2,
  quality: SaleReturnItemQuality.APTO,
  notes: 'Todo en orden',
};

describe('sales-returns schema validation', () => {
  it('accepts a valid return payload', () => {
    const result = saleReturnSchema.safeParse({
      reason: 'Cliente devolvió producto por cambio de receta',
      items: [validItem],
    });
    expect(result.success).toBe(true);
  });

  it('rejects if no item is selected', () => {
    const result = saleReturnSchema.safeParse({
      reason: 'Devolución válida',
      items: [{ ...validItem, selected: false }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Seleccioná al menos un ítem');
    }
  });

  it('rejects reason shorter than 3 characters or longer than 255', () => {
    const short = saleReturnSchema.safeParse({
      reason: 'ab',
      items: [validItem],
    });
    expect(short.success).toBe(false);

    const long = saleReturnSchema.safeParse({
      reason: 'a'.repeat(256),
      items: [validItem],
    });
    expect(long.success).toBe(false);
  });

  it('rejects quantity <= 0 or exceeding remaining quantity', () => {
    const zero = saleReturnSchema.safeParse({
      reason: 'Devolución válida',
      items: [{ ...validItem, quantityBase: 0 }],
    });
    expect(zero.success).toBe(false);

    const excess = saleReturnSchema.safeParse({
      reason: 'Devolución válida',
      items: [{ ...validItem, quantityBase: 6 }], // remaining is 5
    });
    expect(excess.success).toBe(false);
    if (!excess.success) {
      expect(excess.error.issues[0].message).toContain('no puede superar el remanente');
    }
  });

  it('rejects numbers with more than 2 decimal places', () => {
    const invalidDecimals = saleReturnSchema.safeParse({
      reason: 'Devolución válida',
      items: [{ ...validItem, quantityBase: 1.234 }],
    });
    expect(invalidDecimals.success).toBe(false);
  });
});
