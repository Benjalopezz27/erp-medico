import { describe, expect, it } from 'vitest';
import { calculatePreviewLine, calculatePreviewTotals } from './sales-math.utils';
import { ProductTaxTreatment } from '@erp/shared-types';

describe('sales preview math', () => {
  it('rounds unit values and VAT half up before accumulating totals', () => {
    const line = calculatePreviewLine('100.005', 2.5, ProductTaxTreatment.GRAVADO, '10.50');
    expect(line).toEqual({
      unitPriceNet: '100.01',
      subtotalNet: '250.03',
      ivaAmount: '26.25',
      subtotalGross: '276.28',
    });
    expect(
      calculatePreviewTotals([
        { ...line, taxTreatment: ProductTaxTreatment.GRAVADO },
        {
          ...calculatePreviewLine('50', 1, ProductTaxTreatment.GRAVADO, 21),
          taxTreatment: ProductTaxTreatment.GRAVADO,
        },
      ]),
    ).toEqual({
      totalNet: '300.03',
      taxableNet: '300.03',
      exemptAmount: '0.00',
      nonTaxedAmount: '0.00',
      ivaTotal: '36.75',
      totalGross: '336.78',
    });
  });

  it('does not charge VAT to exempt or non-taxed lines', () => {
    const exempt = calculatePreviewLine('20', 1, ProductTaxTreatment.EXENTO, null);
    const nonTaxed = calculatePreviewLine('10', 1, ProductTaxTreatment.NO_GRAVADO, null);
    expect(
      calculatePreviewTotals([
        { ...exempt, taxTreatment: ProductTaxTreatment.EXENTO },
        { ...nonTaxed, taxTreatment: ProductTaxTreatment.NO_GRAVADO },
      ]),
    ).toMatchObject({
      taxableNet: '0.00',
      exemptAmount: '20.00',
      nonTaxedAmount: '10.00',
      ivaTotal: '0.00',
      totalGross: '30.00',
    });
  });
});
