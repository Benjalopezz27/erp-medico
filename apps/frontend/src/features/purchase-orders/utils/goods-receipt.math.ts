import Decimal from 'decimal.js';
import { PurchaseOrderStatus } from '../types/purchase-orders.types';

const MAX_BASE_MOVEMENT = new Decimal('999999999999.99');

export type GoodsReceiptCalculationErrorCode =
  | 'INVALID_QUANTITY'
  | 'INVALID_FACTOR'
  | 'EXCEEDS_PENDING'
  | 'NOT_REPRESENTABLE'
  | 'RESIDUAL_NOT_REPRESENTABLE'
  | 'OVERFLOW';

export type GoodsReceiptBaseCalculationResult =
  | {
      valid: true;
      movementQtyBase: Decimal;
      newCumulativePurchaseQty: Decimal;
      newCumulativeBase: Decimal;
      totalExpectedBase: Decimal;
      remainingPendingPurchaseQty: Decimal;
    }
  | {
      valid: false;
      code: GoodsReceiptCalculationErrorCode;
    };

export interface GoodsReceiptBaseCalculationInput {
  orderedQty: string | number | Decimal;
  conversionFactor: string | number | Decimal;
  previousReceivedPurchaseQty: string | number | Decimal;
  deltaPurchaseQty: string | number | Decimal;
}

function parseFiniteDecimal(value: string | number | Decimal): Decimal | null {
  try {
    const decimal = value instanceof Decimal ? value : new Decimal(value);
    return decimal.isFinite() ? decimal : null;
  } catch {
    return null;
  }
}

export function calculateGoodsReceiptBaseMovement(
  input: GoodsReceiptBaseCalculationInput,
): GoodsReceiptBaseCalculationResult {
  const orderedQty = parseFiniteDecimal(input.orderedQty);
  const factor = parseFiniteDecimal(input.conversionFactor);
  const previousReceived = parseFiniteDecimal(input.previousReceivedPurchaseQty);
  const delta = parseFiniteDecimal(input.deltaPurchaseQty);

  if (!orderedQty || !previousReceived || !delta || delta.lte(0) || delta.decimalPlaces() > 4) {
    return { valid: false, code: 'INVALID_QUANTITY' };
  }
  if (!factor || factor.lte(0)) {
    return { valid: false, code: 'INVALID_FACTOR' };
  }

  const newCumulativePurchaseQty = previousReceived.plus(delta);
  if (newCumulativePurchaseQty.gt(orderedQty)) {
    return { valid: false, code: 'EXCEEDS_PENDING' };
  }

  const previousPostedBase = previousReceived
    .times(factor)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const newCumulativeBase = newCumulativePurchaseQty
    .times(factor)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const totalExpectedBase = orderedQty.times(factor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const movementQtyBase = newCumulativeBase.minus(previousPostedBase);
  const remainingPendingPurchaseQty = orderedQty.minus(newCumulativePurchaseQty);

  if (movementQtyBase.lte(0)) {
    return { valid: false, code: 'NOT_REPRESENTABLE' };
  }
  if (movementQtyBase.gt(MAX_BASE_MOVEMENT)) {
    return { valid: false, code: 'OVERFLOW' };
  }
  if (remainingPendingPurchaseQty.gt(0)) {
    const remainingFutureBase = totalExpectedBase.minus(newCumulativeBase);
    if (remainingFutureBase.lt('0.01')) {
      return { valid: false, code: 'RESIDUAL_NOT_REPRESENTABLE' };
    }
  }

  return {
    valid: true,
    movementQtyBase,
    newCumulativePurchaseQty,
    newCumulativeBase,
    totalExpectedBase,
    remainingPendingPurchaseQty,
  };
}

export function calculateGoodsReceiptSubtotal(
  receivedQty: string | number | Decimal,
  provisionalCost: string | number | Decimal,
): Decimal | null {
  const quantity = parseFiniteDecimal(receivedQty);
  const cost = parseFiniteDecimal(provisionalCost);
  if (!quantity || !cost || quantity.lte(0) || cost.lt(0)) return null;
  return quantity.times(cost).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
}

export function determineAnticipatedPurchaseOrderStatus(
  items: Array<{ id: string; pendingQty: string }>,
  quantities: Record<string, string>,
): PurchaseOrderStatus.PARCIAL | PurchaseOrderStatus.COMPLETADA | null {
  let hasActiveLine = false;
  let allCompleted = true;

  for (const item of items) {
    const pending = parseFiniteDecimal(item.pendingQty);
    const rawQuantity = quantities[item.id]?.trim() ?? '';
    if (!pending) return null;

    let receivedNow = new Decimal(0);
    if (rawQuantity !== '') {
      const parsed = parseFiniteDecimal(rawQuantity);
      if (!parsed || parsed.lte(0) || parsed.gt(pending)) return null;
      receivedNow = parsed;
      hasActiveLine = true;
    }

    const remaining = pending.minus(receivedNow);
    if (remaining.lt(0)) return null;
    if (!remaining.eq(0)) allCompleted = false;
  }

  if (!hasActiveLine) return null;
  return allCompleted ? PurchaseOrderStatus.COMPLETADA : PurchaseOrderStatus.PARCIAL;
}
