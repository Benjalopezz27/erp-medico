import { SupplierInvoiceCostStatus } from '@erp/shared-types';
import { evaluateSupplierInvoiceCost } from './supplier-invoice-tolerance.utils';

describe('evaluateSupplierInvoiceCost', () => {
  it.each([
    ['104', '4.0000', false],
    ['105', '5.0000', false],
    ['105.0001', '5.0001', true],
    ['95', '5.0000', false],
  ])(
    'evaluates real cost %s at the tolerance boundary',
    (real, percentage, observed) => {
      expect(
        evaluateSupplierInvoiceCost({
          provisionalCostUnitNet: '100',
          realCostUnitNet: real,
          tolerancePercentage: '5',
        }),
      ).toMatchObject({
        costVariationPercentage: percentage,
        costObserved: observed,
      });
    },
  );

  it('handles a zero provisional cost deterministically', () => {
    expect(
      evaluateSupplierInvoiceCost({
        provisionalCostUnitNet: '0',
        realCostUnitNet: '0',
        tolerancePercentage: '5',
      }).costStatus,
    ).toBe(SupplierInvoiceCostStatus.ZERO_BASELINE_UNCHANGED);
    expect(
      evaluateSupplierInvoiceCost({
        provisionalCostUnitNet: '0',
        realCostUnitNet: '1',
        tolerancePercentage: '100',
      }),
    ).toMatchObject({
      costStatus: SupplierInvoiceCostStatus.ZERO_BASELINE_INCREASE,
      costVariationPercentage: null,
      costObserved: true,
    });
  });
});
