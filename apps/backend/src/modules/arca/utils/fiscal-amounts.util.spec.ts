import { ProductTaxTreatment } from '@erp/shared-types';
import {
  buildFiscalAmounts,
  validateFiscalAmounts,
} from './fiscal-amounts.util';

describe('fiscal amounts', () => {
  it('separates taxable, exempt and non-taxed lines and groups VAT rates', () => {
    const result = buildFiscalAmounts([
      {
        taxTreatment: ProductTaxTreatment.GRAVADO,
        subtotalNet: '100.00',
        ivaPercentage: '21',
        ivaAmount: '21.00',
      },
      {
        taxTreatment: ProductTaxTreatment.GRAVADO,
        subtotalNet: '50.00',
        ivaPercentage: '10.5',
        ivaAmount: '5.25',
      },
      {
        taxTreatment: ProductTaxTreatment.EXENTO,
        subtotalNet: '20.00',
        ivaPercentage: null,
        ivaAmount: '0.00',
      },
      {
        taxTreatment: ProductTaxTreatment.NO_GRAVADO,
        subtotalNet: '10.00',
        ivaPercentage: null,
        ivaAmount: '0.00',
      },
    ]);

    expect(result).toEqual({
      taxableNetAmount: 150,
      exemptAmount: 20,
      nonTaxedAmount: 10,
      ivaAmount: 26.25,
      totalAmount: 206.25,
      ivaBreakdown: [
        { arcaRateId: 4, percentage: 10.5, taxableBase: 50, amount: 5.25 },
        { arcaRateId: 5, percentage: 21, taxableBase: 100, amount: 21 },
      ],
    });
    expect(() => validateFiscalAmounts(result)).not.toThrow();
  });

  it('rejects inconsistent fiscal totals', () => {
    expect(() =>
      validateFiscalAmounts({
        taxableNetAmount: 100,
        exemptAmount: 0,
        nonTaxedAmount: 0,
        ivaAmount: 21,
        totalAmount: 120,
        ivaBreakdown: [
          { arcaRateId: 5, percentage: 21, taxableBase: 100, amount: 21 },
        ],
      }),
    ).toThrow(/total fiscal/);
  });

  it('rejects an ARCA rate id that does not match its percentage', () => {
    expect(() =>
      validateFiscalAmounts({
        taxableNetAmount: 100,
        exemptAmount: 0,
        nonTaxedAmount: 0,
        ivaAmount: 21,
        totalAmount: 121,
        ivaBreakdown: [
          { arcaRateId: 4, percentage: 21, taxableBase: 100, amount: 21 },
        ],
      }),
    ).toThrow(/identificador ARCA/);
  });
});
