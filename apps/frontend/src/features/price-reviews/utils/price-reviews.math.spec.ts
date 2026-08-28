import { describe, expect, it } from 'vitest';
import {
  calculateCostVariation,
  formatPriceReviewDate,
  formatPriceReviewMoney,
  normalizeCustomPrice,
} from './price-reviews.math';

describe('price review math', () => {
  it('formats authoritative decimal strings for Argentina', () => {
    expect(formatPriceReviewMoney('1250.5')).toBe('$ 1.250,50');
    expect(formatPriceReviewMoney('invalid')).toBe('—');
  });

  it('calculates positive, negative and zero-base variations without floating point errors', () => {
    expect(calculateCostVariation('100', '112')).toEqual({
      label: '+12,00 %',
      direction: 'up',
    });
    expect(calculateCostVariation('100', '90').direction).toBe('down');
    expect(calculateCostVariation('0', '10')).toEqual({
      label: 'Nuevo costo',
      direction: 'up',
    });
  });

  it('normalizes comma input and rejects non-positive or over-precise custom prices', () => {
    expect(normalizeCustomPrice(' 165,5 ')).toEqual({ success: true, value: '165.50' });
    expect(normalizeCustomPrice('0').success).toBe(false);
    expect(normalizeCustomPrice('10.999').success).toBe(false);
  });

  it('formats invoice calendar dates without shifting them to the previous Argentine day', () => {
    expect(formatPriceReviewDate('2026-08-28')).toBe('28/08/2026');
  });
});
