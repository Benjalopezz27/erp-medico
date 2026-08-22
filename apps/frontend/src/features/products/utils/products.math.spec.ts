import { describe, it, expect } from 'vitest';
import { calculateSuggestedPrice, formatCurrency, formatDecimal } from './products.math';

describe('products.math', () => {
  describe('calculateSuggestedPrice', () => {
    it('calculates suggested price with cost and markup', () => {
      // 100 * (1 + 35 / 100) = 135
      expect(calculateSuggestedPrice(100, 35)).toBe(135);

      // 1500.50 * (1 + 30 / 100) = 1950.65
      expect(calculateSuggestedPrice(1500.5, 30)).toBe(1950.65);
    });

    it('applies ROUND_HALF_UP rounding to 2 decimals', () => {
      // 10.555 * (1 + 10 / 100) = 11.6105 -> 11.61
      expect(calculateSuggestedPrice('10.555', 10)).toBe(11.61);

      // 10.5555 * (1 + 10 / 100) = 11.61105 -> 11.61
      expect(calculateSuggestedPrice('10.5555', 10)).toBe(11.61);
    });

    it('returns cost rounded to 2 decimals when markup is null, undefined, or 0', () => {
      expect(calculateSuggestedPrice(250.756, null)).toBe(250.76);
      expect(calculateSuggestedPrice(250.756, undefined)).toBe(250.76);
      expect(calculateSuggestedPrice(250.756, 0)).toBe(250.76);
    });

    it('returns 0 when cost is zero, negative, or invalid', () => {
      expect(calculateSuggestedPrice(0, 50)).toBe(0);
      expect(calculateSuggestedPrice(-10, 50)).toBe(0);
      expect(calculateSuggestedPrice('invalid', 50)).toBe(0);
      expect(calculateSuggestedPrice(null, 50)).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('formats numeric values as ARS currency string', () => {
      const formatted = formatCurrency(1500.5);
      // es-AR currency format contains $ and 1.500,50
      expect(formatted).toContain('1.500,50');
    });

    it('returns em-dash on null or undefined or invalid', () => {
      expect(formatCurrency(null)).toBe('—');
      expect(formatCurrency(undefined)).toBe('—');
      expect(formatCurrency('invalid')).toBe('—');
    });
  });

  describe('formatDecimal', () => {
    it('formats decimal numbers up to given scale', () => {
      expect(formatDecimal(100.5, 2)).toContain('100,5');
      expect(formatDecimal(null)).toBe('—');
    });
  });
});
