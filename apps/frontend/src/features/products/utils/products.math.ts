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

function toPositiveDecimal(value: number | string | null | undefined): Decimal | null {
  if (value === null || value === undefined || value === '') return null;
  try {
    const parsed = new Decimal(value);
    return parsed.isNaN() || parsed.isNegative() ? null : parsed;
  } catch {
    return null;
  }
}

function vatDivisor(ivaPercentage: number | string | null | undefined): Decimal {
  return new Decimal(1).plus(new Decimal(ivaPercentage ?? 0).dividedBy(100));
}

/**
 * Derives the net price from the final (VAT-included) price.
 * Formula: final / (1 + iva / 100); `ivaPercentage` null means no VAT (net = final).
 * Uses Decimal with ROUND_HALF_UP to 2 decimal places.
 */
export function calculateNetFromFinal(
  finalPrice: number | string | null | undefined,
  ivaPercentage?: number | string | null,
): number {
  const final = toPositiveDecimal(finalPrice);
  if (!final) return 0;
  return final
    .dividedBy(vatDivisor(ivaPercentage))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
}

/**
 * Derives the final (VAT-included) price from the net price.
 * Formula: net * (1 + iva / 100); `ivaPercentage` null means no VAT (final = net).
 * Uses Decimal with ROUND_HALF_UP to 2 decimal places.
 */
export function calculateFinalFromNet(
  netPrice: number | string | null | undefined,
  ivaPercentage?: number | string | null,
): number {
  const net = toPositiveDecimal(netPrice);
  if (!net) return 0;
  return net.times(vatDivisor(ivaPercentage)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
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
