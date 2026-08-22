import Decimal from 'decimal.js';

/**
 * Calculates the suggested selling price net from cost and markup percentage.
 * Formula: costNet * (1 + markupPercentage / 100)
 * Uses Decimal with ROUND_HALF_UP to 2 decimal places.
 */
export function calculateSuggestedPrice(
  costNet: number | string | null | undefined,
  markupPercentage?: number | string | null | undefined,
): number {
  if (costNet === null || costNet === undefined || costNet === '') {
    return 0;
  }

  let cost: Decimal;
  try {
    cost = new Decimal(costNet);
  } catch {
    return 0;
  }

  if (cost.isNaN() || cost.lessThanOrEqualTo(0)) {
    return 0;
  }

  if (markupPercentage === null || markupPercentage === undefined || markupPercentage === '') {
    return cost.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  let markup: Decimal;
  try {
    markup = new Decimal(markupPercentage);
  } catch {
    return cost.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  if (markup.isNaN() || markup.lessThanOrEqualTo(0)) {
    return cost.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  const multiplier = new Decimal(1).plus(markup.dividedBy(100));
  return cost.times(multiplier).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Formats a numeric value as ARS currency ($ 1.234,56).
 */
export function formatCurrency(value?: number | string | null): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    return '—';
  }

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats a general decimal number with specified decimal places.
 */
export function formatDecimal(value?: number | string | null, decimals = 2): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    return '—';
  }

  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}
