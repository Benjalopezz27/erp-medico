import Decimal from 'decimal.js';
import { SupplierInvoiceCostStatus } from '@erp/shared-types';

export interface SupplierInvoiceCostEvaluation {
  costDifferenceUnitNet: string;
  costVariationPercentage: string | null;
  costStatus: SupplierInvoiceCostStatus;
  costObserved: boolean;
}

export function evaluateSupplierInvoiceCost(input: {
  provisionalCostUnitNet: string;
  realCostUnitNet: string;
  tolerancePercentage: string;
}): SupplierInvoiceCostEvaluation {
  const provisional = new Decimal(input.provisionalCostUnitNet);
  const real = new Decimal(input.realCostUnitNet);
  const tolerance = new Decimal(input.tolerancePercentage);
  const difference = real
    .minus(provisional)
    .toDecimalPlaces(4, Decimal.ROUND_HALF_UP);

  if (provisional.isZero()) {
    const unchanged = real.isZero();
    return {
      costDifferenceUnitNet: difference.toFixed(4),
      costVariationPercentage: unchanged ? '0.0000' : null,
      costStatus: unchanged
        ? SupplierInvoiceCostStatus.ZERO_BASELINE_UNCHANGED
        : SupplierInvoiceCostStatus.ZERO_BASELINE_INCREASE,
      costObserved: !unchanged,
    };
  }

  const percentage = difference
    .abs()
    .dividedBy(provisional)
    .times(100)
    .toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
  const observed = percentage.gt(tolerance);
  return {
    costDifferenceUnitNet: difference.toFixed(4),
    costVariationPercentage: percentage.toFixed(4),
    costStatus: observed
      ? SupplierInvoiceCostStatus.EXCEEDS_TOLERANCE
      : SupplierInvoiceCostStatus.WITHIN_TOLERANCE,
    costObserved: observed,
  };
}
