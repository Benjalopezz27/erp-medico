import { describe, it, expect } from 'vitest';
import {
  calculateFinalFromNet,
  calculateNetFromFinal,
  calculateSuggestedPrice,
  formatDecimal,
} from './products.math';

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

  describe('calculateNetFromFinal / calculateFinalFromNet', () => {
    it('removes VAT from the final price', () => {
      expect(calculateNetFromFinal(121, 21)).toBe(100);
      expect(calculateNetFromFinal('110.5', 10.5)).toBe(100);
    });

    it('rounds net to 2 decimals with ROUND_HALF_UP', () => {
      // 100 / 1.21 = 82.644628... -> 82.64
      expect(calculateNetFromFinal(100, 21)).toBe(82.64);
      // 1.01 / 1.21 = 0.83471... -> 0.83
      expect(calculateNetFromFinal(1.01, 21)).toBe(0.83);
    });

    it('keeps net equal to final when VAT does not apply', () => {
      expect(calculateNetFromFinal(150.5, null)).toBe(150.5);
      expect(calculateNetFromFinal(150.5)).toBe(150.5);
    });

    it('returns 0 for empty, negative or invalid input', () => {
      expect(calculateNetFromFinal('', 21)).toBe(0);
      expect(calculateNetFromFinal(-5, 21)).toBe(0);
      expect(calculateNetFromFinal('abc', 21)).toBe(0);
      expect(calculateFinalFromNet(null, 21)).toBe(0);
    });

    it('adds VAT to the net price', () => {
      expect(calculateFinalFromNet(100, 21)).toBe(121);
      expect(calculateFinalFromNet(100, null)).toBe(100);
    });

    it('round trip final -> net (2 dec) -> final may differ by one cent', () => {
      // 100 / 1.21 = 82.64 -> 82.64 * 1.21 = 99.99: why the form keeps the typed final.
      expect(calculateFinalFromNet(calculateNetFromFinal(100, 21), 21)).toBe(99.99);
    });
  });

  describe('formatDecimal', () => {
    it('formats decimal numbers up to given scale', () => {
      expect(formatDecimal(100.5, 2)).toContain('100,5');
      expect(formatDecimal(null)).toBe('—');
    });
  });
});
