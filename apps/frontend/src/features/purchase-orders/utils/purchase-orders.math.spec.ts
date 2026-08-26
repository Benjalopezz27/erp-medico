import Decimal from 'decimal.js';
import {
  calculateItemSubtotal,
  calculateItemBaseQty,
  calculateOrderTotalNet,
  formatCurrency,
  formatQuantity,
} from './purchase-orders.math';

describe('Purchase Orders Math Utilities', () => {
  describe('calculateItemSubtotal', () => {
    it('calculates exact subtotal with decimal precision (avoiding floating point errors)', () => {
      // 0.1 * 0.2 in native JS is 0.020000000000000004
      const result = calculateItemSubtotal('0.1', '0.2');
      expect(result.toString()).toBe('0.02');
    });

    it('calculates subtotal with 4 decimal places rounding half up', () => {
      const result = calculateItemSubtotal('10.5555', '120.3333');
      // 10.5555 * 120.3333 = 1270.17814815 -> rounded to 4 decimals = 1270.1781
      expect(result.toString()).toBe('1270.1781');
    });

    it('handles zero, null, undefined, and empty string safely', () => {
      expect(calculateItemSubtotal(0, 100).toString()).toBe('0');
      expect(calculateItemSubtotal(null, 100).toString()).toBe('0');
      expect(calculateItemSubtotal(undefined, 100).toString()).toBe('0');
      expect(calculateItemSubtotal('invalid', 100).toString()).toBe('0');
    });
  });

  describe('calculateItemBaseQty', () => {
    it('calculates presentation units into base unit quantity', () => {
      // 10 boxes * 12 units per box = 120 base units
      const result = calculateItemBaseQty('10', '12');
      expect(result.toString()).toBe('120');
    });

    it('handles fractional conversion factors correctly', () => {
      const result = calculateItemBaseQty('3.5', '2.5');
      expect(result.toString()).toBe('8.75');
    });
  });

  describe('calculateOrderTotalNet', () => {
    it('sums all item subtotals exactly', () => {
      const items = [
        { orderedQty: '10', expectedCostUnitNet: '15.5' }, // 155.00
        { orderedQty: '5', expectedCostUnitNet: '20.25' }, // 101.25
        { orderedQty: '0.5', expectedCostUnitNet: '100' }, // 50.00
      ];
      const total = calculateOrderTotalNet(items);
      expect(total.toString()).toBe('306.25');
    });

    it('returns zero for empty or null item list', () => {
      expect(calculateOrderTotalNet([]).toString()).toBe('0');
    });
  });

  describe('formatCurrency', () => {
    it('formats numbers into Argentine currency string', () => {
      const formatted = formatCurrency(1250.5);
      // es-AR formatting contains $ and comma for decimals
      expect(formatted).toContain('1.250,50');
    });

    it('handles Decimal instances and zero correctly', () => {
      expect(formatCurrency(new Decimal(0))).toContain('0,00');
      expect(formatCurrency(null)).toContain('0,00');
      expect(formatCurrency(undefined)).toContain('0,00');
    });
  });

  describe('formatQuantity', () => {
    it('formats quantities stripping unneeded trailing zeroes', () => {
      expect(formatQuantity('10.0000')).toBe('10');
      expect(formatQuantity('10.5000')).toBe('10.5');
      expect(formatQuantity('10.1234')).toBe('10.1234');
      expect(formatQuantity(0)).toBe('0');
      expect(formatQuantity(null)).toBe('0');
    });
  });
});
