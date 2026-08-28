import Decimal from 'decimal.js';
import type { MarkupValidationResult } from '../types/markups.types';

const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/;

export function normalizeMarkupPercentage(rawValue: string): MarkupValidationResult {
  const value = rawValue.trim();
  if (!value) return { success: false, message: 'Ingrese un porcentaje de markup.' };
  if (!DECIMAL_PATTERN.test(value)) {
    return {
      success: false,
      message: 'Use un número decimal entre 0 y 1000, con hasta 4 decimales y punto decimal.',
    };
  }
  const decimal = new Decimal(value);
  if (!decimal.isFinite() || decimal.lt(0) || decimal.gt(1000)) {
    return { success: false, message: 'El markup debe estar entre 0 y 1000%.' };
  }
  return { success: true, value: decimal.toFixed(4) };
}

export function markupExample(percentage: string): string {
  return new Decimal(100)
    .times(new Decimal(1).plus(new Decimal(percentage).dividedBy(100)))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toFixed(2);
}
