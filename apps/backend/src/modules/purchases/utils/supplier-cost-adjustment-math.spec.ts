import {
  calculateSupplierCostAdjustment,
  calculateWeightedProductCost,
} from './supplier-cost-adjustment-math';

describe('supplier cost adjustment math', () => {
  it('calculates the canonical 100/30/70 scenario', () => {
    expect(
      calculateSupplierCostAdjustment({
        provisionalCostPurchaseUnitNet: '10',
        realCostPurchaseUnitNet: '11',
        conversionFactor: '1',
        onHandAllocatedQty: '70',
        consumedAllocatedQty: '30',
      }),
    ).toEqual({
      provisionalCostBaseUnitNet: '10.0000',
      realCostBaseUnitNet: '11.0000',
      costDifferenceUnitNet: '1.0000',
      stockRevaluation: '70.0000',
      cogsAdjustment: '30.0000',
    });
  });

  it('converts purchase-unit costs to base costs and preserves negative differences', () => {
    expect(
      calculateSupplierCostAdjustment({
        provisionalCostPurchaseUnitNet: '100',
        realCostPurchaseUnitNet: '90',
        conversionFactor: '10',
        onHandAllocatedQty: '6',
        consumedAllocatedQty: '4',
      }),
    ).toEqual({
      provisionalCostBaseUnitNet: '10.0000',
      realCostBaseUnitNet: '9.0000',
      costDifferenceUnitNet: '-1.0000',
      stockRevaluation: '-6.0000',
      cogsAdjustment: '-4.0000',
    });
  });

  it('returns exact zero adjustments and weighted product costs', () => {
    expect(
      calculateSupplierCostAdjustment({
        provisionalCostPurchaseUnitNet: '5',
        realCostPurchaseUnitNet: '5',
        conversionFactor: '1',
        onHandAllocatedQty: '1',
        consumedAllocatedQty: '1',
      }).stockRevaluation,
    ).toBe('0.0000');
    expect(
      calculateWeightedProductCost([
        { quantityBase: '2', realCostBaseUnitNet: '10' },
        { quantityBase: '1', realCostBaseUnitNet: '13' },
      ]),
    ).toBe('11.0000');
    expect(
      calculateWeightedProductCost([
        { quantityBase: '0', realCostBaseUnitNet: '99' },
      ]),
    ).toBeNull();
  });
});
