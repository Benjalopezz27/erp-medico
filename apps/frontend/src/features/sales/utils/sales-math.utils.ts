import Decimal from 'decimal.js';
import type { PosPreviewTotals } from '../types/sales.types';
import { ProductTaxTreatment } from '@erp/shared-types';

const money = (value: Decimal.Value) =>
  new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export function calculatePreviewLine(
  unitPriceNet: Decimal.Value,
  quantityBase: Decimal.Value,
  taxTreatment: ProductTaxTreatment,
  ivaPercentage: Decimal.Value | null,
) {
  const unit = money(unitPriceNet);
  const subtotalNet = money(unit.times(quantityBase));
  const ivaAmount =
    taxTreatment === ProductTaxTreatment.GRAVADO
      ? money(subtotalNet.times(ivaPercentage ?? 0).dividedBy(100))
      : money(0);
  const subtotalGross = money(subtotalNet.plus(ivaAmount));

  return {
    unitPriceNet: unit.toFixed(2),
    subtotalNet: subtotalNet.toFixed(2),
    ivaAmount: ivaAmount.toFixed(2),
    subtotalGross: subtotalGross.toFixed(2),
  };
}

export function calculatePreviewTotals(
  lines: Array<{
    taxTreatment: ProductTaxTreatment;
    subtotalNet: string;
    ivaAmount: string;
    subtotalGross: string;
  }>,
): PosPreviewTotals {
  return lines.reduce<PosPreviewTotals>(
    (totals, line) => ({
      totalNet: money(new Decimal(totals.totalNet).plus(line.subtotalNet)).toFixed(2),
      taxableNet:
        line.taxTreatment === ProductTaxTreatment.GRAVADO
          ? money(new Decimal(totals.taxableNet).plus(line.subtotalNet)).toFixed(2)
          : totals.taxableNet,
      exemptAmount:
        line.taxTreatment === ProductTaxTreatment.EXENTO
          ? money(new Decimal(totals.exemptAmount).plus(line.subtotalNet)).toFixed(2)
          : totals.exemptAmount,
      nonTaxedAmount:
        line.taxTreatment === ProductTaxTreatment.NO_GRAVADO
          ? money(new Decimal(totals.nonTaxedAmount).plus(line.subtotalNet)).toFixed(2)
          : totals.nonTaxedAmount,
      ivaTotal: money(new Decimal(totals.ivaTotal).plus(line.ivaAmount)).toFixed(2),
      totalGross: money(new Decimal(totals.totalGross).plus(line.subtotalGross)).toFixed(2),
    }),
    {
      totalNet: '0.00',
      taxableNet: '0.00',
      exemptAmount: '0.00',
      nonTaxedAmount: '0.00',
      ivaTotal: '0.00',
      totalGross: '0.00',
    },
  );
}
