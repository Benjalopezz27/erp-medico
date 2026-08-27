import {
  calculateCumulativeGoodsReceiptBaseStock,
  calculateProvisionalSubtotal,
} from './goods-receipt-math.utils';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('goods-receipt-math.utils', () => {
  describe('calculateCumulativeGoodsReceiptBaseStock', () => {
    it('calculates full receipt standard conversion cleanly (e.g. 10 cajas x 100)', () => {
      const res = calculateCumulativeGoodsReceiptBaseStock({
        orderedQty: '10.0000',
        conversionFactor: '100.0000',
        previousReceivedPurchaseQty: '0.0000',
        deltaPurchaseQty: 10,
        previousPostedBase: '0.00',
      });

      expect(res.movementQtyBase).toBe('1000.00');
      expect(res.newCumulativePurchaseQty).toBe('10.0000');
      expect(res.newCumulativeBase).toBe('1000.00');
      expect(res.totalExpectedBase).toBe('1000.00');
      expect(res.remainingPendingPurchaseQty).toBe('0.0000');
    });

    it('calculates partial receipts in multiple installments with exact total sum', () => {
      // Order 100 units, factor 0.5 -> totalExpectedBase = 50.00
      // Receipt 1: 40 units -> 40 * 0.5 = 20.00
      const r1 = calculateCumulativeGoodsReceiptBaseStock({
        orderedQty: '100.0000',
        conversionFactor: '0.5000',
        previousReceivedPurchaseQty: '0.0000',
        deltaPurchaseQty: 40,
        previousPostedBase: '0.00',
      });
      expect(r1.movementQtyBase).toBe('20.00');
      expect(r1.newCumulativeBase).toBe('20.00');
      expect(r1.remainingPendingPurchaseQty).toBe('60.0000');

      // Receipt 2: 60 units -> total 100 * 0.5 = 50.00 -> delta = 50 - 20 = 30.00
      const r2 = calculateCumulativeGoodsReceiptBaseStock({
        orderedQty: '100.0000',
        conversionFactor: '0.5000',
        previousReceivedPurchaseQty: '40.0000',
        deltaPurchaseQty: 60,
        previousPostedBase: '20.00',
      });
      expect(r2.movementQtyBase).toBe('30.00');
      expect(r2.newCumulativeBase).toBe('50.00');
      expect(r2.remainingPendingPurchaseQty).toBe('0.0000');
      expect(Number(r1.movementQtyBase) + Number(r2.movementQtyBase)).toBe(
        50.0,
      );
    });

    it('rejects sub-cent conversion that rounds to 0.00 (.004 -> 0.00)', () => {
      // 0.004 * 1 = 0.004 -> 0.00
      expect(() =>
        calculateCumulativeGoodsReceiptBaseStock({
          orderedQty: '1.0000',
          conversionFactor: '1.0000',
          previousReceivedPurchaseQty: '0.0000',
          deltaPurchaseQty: 0.004,
          previousPostedBase: '0.00',
        }),
      ).toThrow(BadRequestException);
    });

    it('rounds .005 -> 0.01 at boundary', () => {
      // 0.005 * 1 = 0.005 -> 0.01 (as full receipt of 0.005)
      const res = calculateCumulativeGoodsReceiptBaseStock({
        orderedQty: '0.0050',
        conversionFactor: '1.0000',
        previousReceivedPurchaseQty: '0.0000',
        deltaPurchaseQty: 0.005,
        previousPostedBase: '0.00',
      });
      expect(res.movementQtyBase).toBe('0.01');
      expect(res.totalExpectedBase).toBe('0.01');
    });

    it('prevents rounding inflation on two partials that would each round up if evaluated separately', () => {
      // orderedQty = 0.02, factor = 0.5 -> totalExpectedBase = 0.01
      // Attempting partial receipt 1 of 0.01:
      // 0.01 * 0.5 = 0.005 -> rounds to 0.01.
      // But remaining future base would be 0.01 - 0.01 = 0.00 while remaining purchase qty is 0.01!
      // Rule B detects this unmaterializable leftover and rejects receipt 1.
      expect(() =>
        calculateCumulativeGoodsReceiptBaseStock({
          orderedQty: '0.0200',
          conversionFactor: '0.5000',
          previousReceivedPurchaseQty: '0.0000',
          deltaPurchaseQty: 0.01,
          previousPostedBase: '0.00',
        }),
      ).toThrow(BadRequestException);

      // Receiving full 0.02 at once succeeds and yields exactly 0.01 base stock
      const fullRes = calculateCumulativeGoodsReceiptBaseStock({
        orderedQty: '0.0200',
        conversionFactor: '0.5000',
        previousReceivedPurchaseQty: '0.0000',
        deltaPurchaseQty: 0.02,
        previousPostedBase: '0.00',
      });
      expect(fullRes.movementQtyBase).toBe('0.01');
      expect(fullRes.totalExpectedBase).toBe('0.01');
    });

    it('throws ConflictException when delta exceeds pending quantity', () => {
      expect(() =>
        calculateCumulativeGoodsReceiptBaseStock({
          orderedQty: '10.0000',
          conversionFactor: '1.0000',
          previousReceivedPurchaseQty: '5.0000',
          deltaPurchaseQty: 6.0,
          previousPostedBase: '5.00',
        }),
      ).toThrow(ConflictException);
    });

    it('throws BadRequestException for negative, zero or >4 decimal places delta', () => {
      expect(() =>
        calculateCumulativeGoodsReceiptBaseStock({
          orderedQty: '10.0000',
          conversionFactor: '1.0000',
          previousReceivedPurchaseQty: '0.0000',
          deltaPurchaseQty: 0,
          previousPostedBase: '0.00',
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        calculateCumulativeGoodsReceiptBaseStock({
          orderedQty: '10.0000',
          conversionFactor: '1.0000',
          previousReceivedPurchaseQty: '0.0000',
          deltaPurchaseQty: -1,
          previousPostedBase: '0.00',
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        calculateCumulativeGoodsReceiptBaseStock({
          orderedQty: '10.0000',
          conversionFactor: '1.0000',
          previousReceivedPurchaseQty: '0.0000',
          deltaPurchaseQty: 1.12345,
          previousPostedBase: '0.00',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('calculateProvisionalSubtotal', () => {
    it('calculates provisional subtotal net correctly with rounding', () => {
      expect(calculateProvisionalSubtotal('10.5', '125.55')).toBe('1318.2750');
      expect(calculateProvisionalSubtotal(3, 100)).toBe('300.0000');
    });

    it('throws BadRequestException on negative cost or >4 decimal places', () => {
      expect(() => calculateProvisionalSubtotal('10', '-5')).toThrow(
        BadRequestException,
      );
      expect(() => calculateProvisionalSubtotal('10', '5.12345')).toThrow(
        BadRequestException,
      );
    });
  });
});
