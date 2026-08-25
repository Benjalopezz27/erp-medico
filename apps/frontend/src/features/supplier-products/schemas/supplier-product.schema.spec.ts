import { describe, it, expect } from 'vitest';
import { supplierProductFormSchema } from './supplier-product.schema';

describe('supplierProductFormSchema', () => {
  const validPayload = {
    productId: '123e4567-e89b-12d3-a456-426614174000',
    baseUnitId: '123e4567-e89b-12d3-a456-426614174001',
    supplierExternalCode: 'MED-99',
    supplierDescription: 'Caja x 10',
    purchaseUnitId: '123e4567-e89b-12d3-a456-426614174002',
    conversionFactorToBase: 10,
    usualCostNet: 150.5,
    isPrimarySupplier: true,
  };

  it('validates a complete valid payload', () => {
    const result = supplierProductFormSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('validates minimal valid payload with null cost and description', () => {
    const minimal = {
      productId: '123e4567-e89b-12d3-a456-426614174000',
      supplierExternalCode: 'MED-99',
      purchaseUnitId: '123e4567-e89b-12d3-a456-426614174002',
      conversionFactorToBase: 5.5,
      isPrimarySupplier: false,
    };
    const result = supplierProductFormSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('enforces conversionFactorToBase = 1 when purchaseUnitId matches baseUnitId', () => {
    const matchingUnit = {
      ...validPayload,
      purchaseUnitId: validPayload.baseUnitId,
      conversionFactorToBase: 2,
    };
    const result = supplierProductFormSchema.safeParse(matchingUnit);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('factor debe ser exactamente 1');
    }
  });

  it('allows conversionFactorToBase = 1 when purchaseUnitId matches baseUnitId', () => {
    const matchingUnit = {
      ...validPayload,
      purchaseUnitId: validPayload.baseUnitId,
      conversionFactorToBase: 1,
    };
    const result = supplierProductFormSchema.safeParse(matchingUnit);
    expect(result.success).toBe(true);
  });

  it('rejects empty or whitespace-only external code', () => {
    const emptyCode = {
      ...validPayload,
      supplierExternalCode: '   ',
    };
    const result = supplierProductFormSchema.safeParse(emptyCode);
    expect(result.success).toBe(false);
  });

  it('rejects negative conversion factor or >4 decimal places', () => {
    const invalidFactor = {
      ...validPayload,
      conversionFactorToBase: -5,
    };
    const result = supplierProductFormSchema.safeParse(invalidFactor);
    expect(result.success).toBe(false);

    const precisionExcess = {
      ...validPayload,
      conversionFactorToBase: 1.12345,
    };
    const precResult = supplierProductFormSchema.safeParse(precisionExcess);
    expect(precResult.success).toBe(false);
  });

  it('rejects negative usual cost', () => {
    const negativeCost = {
      ...validPayload,
      usualCostNet: -10,
    };
    const result = supplierProductFormSchema.safeParse(negativeCost);
    expect(result.success).toBe(false);
  });
});
