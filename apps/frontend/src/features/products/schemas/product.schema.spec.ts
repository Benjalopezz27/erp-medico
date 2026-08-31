import { describe, it, expect } from 'vitest';
import { productFormSchema } from './product.schema';
import { ProductTaxTreatment } from '@erp/shared-types';

describe('product.schema', () => {
  const validData = {
    name: 'Ibuprofeno 400mg',
    description: 'Analgésico',
    categoryId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    baseUnitId: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    minStock: 10,
    costNet: 100,
    markupPercentage: 30,
    activePriceNet: 130,
    conversions: [
      {
        presentationUnitId: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        conversionFactor: 100,
      },
    ],
  };

  it('validates correct product payload', () => {
    const result = productFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('allows optional/null markupPercentage', () => {
    const withNullMarkup = { ...validData, markupPercentage: null };
    expect(productFormSchema.safeParse(withNullMarkup).success).toBe(true);

    const withEmptyMarkup = { ...validData, markupPercentage: '' };
    const res = productFormSchema.safeParse(withEmptyMarkup);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.markupPercentage).toBeNull();
    }
  });

  it('rejects presentation unit equal to base unit', () => {
    const invalidData = {
      ...validData,
      conversions: [
        {
          presentationUnitId: validData.baseUnitId, // duplicate with base unit
          conversionFactor: 10,
        },
      ],
    };

    const res = productFormSchema.safeParse(invalidData);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain('igual a la unidad base');
    }
  });

  it('rejects duplicate presentation units in conversions', () => {
    const invalidData = {
      ...validData,
      conversions: [
        {
          presentationUnitId: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
          conversionFactor: 10,
        },
        {
          presentationUnitId: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', // duplicate
          conversionFactor: 20,
        },
      ],
    };

    const res = productFormSchema.safeParse(invalidData);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain('unidades de presentación repetidas');
    }
  });

  it('rejects negative numbers and out of range factors', () => {
    expect(productFormSchema.safeParse({ ...validData, costNet: -10 }).success).toBe(false);

    expect(productFormSchema.safeParse({ ...validData, markupPercentage: 1500 }).success).toBe(
      false,
    );

    expect(
      productFormSchema.safeParse({
        ...validData,
        conversions: [
          { presentationUnitId: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', conversionFactor: 0 },
        ],
      }).success,
    ).toBe(false);
  });

  it('accepts controlled ARCA rates for taxable products', () => {
    for (const ivaPercentage of [0, 2.5, 5, 10.5, 21, 27]) {
      expect(
        productFormSchema.safeParse({
          ...validData,
          taxTreatment: ProductTaxTreatment.GRAVADO,
          ivaPercentage,
        }).success,
      ).toBe(true);
    }
    expect(
      productFormSchema.safeParse({
        ...validData,
        taxTreatment: ProductTaxTreatment.GRAVADO,
        ivaPercentage: 13,
      }).success,
    ).toBe(false);
  });

  it('requires a null rate for exempt and non-taxed products', () => {
    expect(
      productFormSchema.safeParse({
        ...validData,
        taxTreatment: ProductTaxTreatment.EXENTO,
        ivaPercentage: null,
      }).success,
    ).toBe(true);
    expect(
      productFormSchema.safeParse({
        ...validData,
        taxTreatment: ProductTaxTreatment.NO_GRAVADO,
        ivaPercentage: 0,
      }).success,
    ).toBe(false);
  });
});
