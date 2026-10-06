import Decimal from 'decimal.js';

/**
 * Calculates item subtotal net: orderedQty * expectedCostUnitNet
 * Returns a Decimal rounded to 4 decimal places using ROUND_HALF_UP.
 */
export function calculateItemSubtotal(
  orderedQty: string | number | Decimal | null | undefined,
  costUnitNet: string | number | Decimal | null | undefined,
): Decimal {
  try {
    const qty = new Decimal(orderedQty ?? 0);
    const cost = new Decimal(costUnitNet ?? 0);
    if (qty.isNaN() || cost.isNaN()) return new Decimal(0);
    return qty.times(cost).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
  } catch {
    return new Decimal(0);
  }
}

/**
 * Calculates base unit quantity: orderedQty * conversionFactorToBase
 * Returns a Decimal rounded to 4 decimal places using ROUND_HALF_UP.
 */
export function calculateItemBaseQty(
  orderedQty: string | number | Decimal | null | undefined,
  conversionFactorToBase: string | number | Decimal | null | undefined,
): Decimal {
  try {
    const qty = new Decimal(orderedQty ?? 0);
    const factor = new Decimal(conversionFactorToBase ?? 1);
    if (qty.isNaN() || factor.isNaN()) return new Decimal(0);
    return qty.times(factor).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
  } catch {
    return new Decimal(0);
  }
}

/**
 * Calculates sum of all line item subtotals.
 * Returns a Decimal rounded to 4 decimal places using ROUND_HALF_UP.
 */
export function calculateOrderTotalNet(
  items: Array<{
    orderedQty?: string | number | Decimal | null;
    expectedCostUnitNet?: string | number | Decimal | null;
  }>,
): Decimal {
  if (!items || items.length === 0) return new Decimal(0);

  return items
    .reduce((acc, item) => {
      return acc.plus(calculateItemSubtotal(item.orderedQty, item.expectedCostUnitNet));
    }, new Decimal(0))
    .toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
}

/**
 * Formats quantity values cleanly removing trailing zeroes up to 4 decimal places.
 */
export function formatQuantity(value: string | number | Decimal | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  try {
    const d = value instanceof Decimal ? value : new Decimal(value);
    if (d.isNaN()) return '0';
    return d.toFixed(4).replace(/\.?0+$/, '');
  } catch {
    return '0';
  }
}
