import { describe, expect, it } from 'vitest';
import { PurchaseOrderStatus } from '../types/purchase-orders.types';
import {
  calculateGoodsReceiptBaseMovement,
  calculateGoodsReceiptSubtotal,
  determineAnticipatedPurchaseOrderStatus,
} from './goods-receipt.math';

describe('goods receipt decimal math', () => {
  it('calculates an exact base movement for a standard receipt', () => {
    const result = calculateGoodsReceiptBaseMovement({
      orderedQty: '10',
      previousReceivedPurchaseQty: '0',
      deltaPurchaseQty: '4',
      conversionFactor: '100',
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.movementQtyBase.toFixed(2)).toBe('400.00');
      expect(result.remainingPendingPurchaseQty.toFixed(4)).toBe('6.0000');
    }
  });

  it('uses cumulative rounding across partial receipts', () => {
    const result = calculateGoodsReceiptBaseMovement({
      orderedQty: '1',
      previousReceivedPurchaseQty: '0.3333',
      deltaPurchaseQty: '0.3333',
      conversionFactor: '3',
    });

    expect(result.valid).toBe(true);
    if (result.valid) expect(result.movementQtyBase.toFixed(2)).toBe('1.00');
  });

  it('rejects movements and residuals that are not representable', () => {
    expect(
      calculateGoodsReceiptBaseMovement({
        orderedQty: '1',
        previousReceivedPurchaseQty: '0',
        deltaPurchaseQty: '0.001',
        conversionFactor: '1',
      }),
    ).toEqual({ valid: false, code: 'NOT_REPRESENTABLE' });

    expect(
      calculateGoodsReceiptBaseMovement({
        orderedQty: '0.014',
        previousReceivedPurchaseQty: '0',
        deltaPurchaseQty: '0.01',
        conversionFactor: '1',
      }),
    ).toEqual({ valid: false, code: 'RESIDUAL_NOT_REPRESENTABLE' });
  });

  it('rejects over-receipt and base overflow', () => {
    expect(
      calculateGoodsReceiptBaseMovement({
        orderedQty: '5',
        previousReceivedPurchaseQty: '4',
        deltaPurchaseQty: '2',
        conversionFactor: '1',
      }),
    ).toEqual({ valid: false, code: 'EXCEEDS_PENDING' });

    expect(
      calculateGoodsReceiptBaseMovement({
        orderedQty: '99999999',
        previousReceivedPurchaseQty: '0',
        deltaPurchaseQty: '99999999',
        conversionFactor: '999999',
      }),
    ).toEqual({ valid: false, code: 'OVERFLOW' });
  });

  it('calculates provisional subtotal and anticipated status', () => {
    expect(calculateGoodsReceiptSubtotal('2.5', '100.1234')?.toFixed(4)).toBe('250.3085');
    expect(calculateGoodsReceiptSubtotal('2', '0')?.toFixed(4)).toBe('0.0000');

    const items = [
      { id: 'a', pendingQty: '2' },
      { id: 'b', pendingQty: '3' },
    ];
    expect(determineAnticipatedPurchaseOrderStatus(items, {})).toBeNull();
    expect(determineAnticipatedPurchaseOrderStatus(items, { a: '2' })).toBe(
      PurchaseOrderStatus.PARCIAL,
    );
    expect(determineAnticipatedPurchaseOrderStatus(items, { a: '2', b: '3' })).toBe(
      PurchaseOrderStatus.COMPLETADA,
    );
    expect(determineAnticipatedPurchaseOrderStatus(items, { a: '3' })).toBeNull();
  });
});
