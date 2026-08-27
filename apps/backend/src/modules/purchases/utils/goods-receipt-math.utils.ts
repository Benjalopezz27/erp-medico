import Decimal from 'decimal.js';
import {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { GoodsReceiptErrorCode } from '@erp/shared-types';

export interface CumulativeBaseStockInput {
  orderedQty: string | number;
  conversionFactor: string | number;
  previousReceivedPurchaseQty: string | number;
  deltaPurchaseQty: string | number;
  previousPostedBase: string | number;
}

export interface CumulativeBaseStockResult {
  movementQtyBase: string;
  newCumulativePurchaseQty: string;
  newCumulativeBase: string;
  totalExpectedBase: string;
  remainingPendingPurchaseQty: string;
}

/**
 * Calculates the exact cumulative base stock movement delta for a purchase order item receipt line.
 *
 * Implements cumulative delta arithmetic:
 *   newCumulativeBase = round(newCumulativePurchaseQty * factor, 2)
 *   movementQtyBase = newCumulativeBase - previousPostedBase
 *
 * Guarantees:
 * 1. Zero rounding inflation across partial receipts.
 * 2. Rejection of unmaterializable sub-cent movements (movementQtyBase <= 0).
 * 3. Rejection of partial receipts that would leave an unmaterializable residual future balance.
 * 4. Sum of all movementQtyBase upon order completion strictly equals round(orderedQty * factor, 2).
 */
export function calculateCumulativeGoodsReceiptBaseStock(
  input: CumulativeBaseStockInput,
): CumulativeBaseStockResult {
  const orderedQtyDec = new Decimal(input.orderedQty);
  const factorDec = new Decimal(input.conversionFactor);
  const previousReceivedDec = new Decimal(
    input.previousReceivedPurchaseQty || 0,
  );
  const deltaDec = new Decimal(input.deltaPurchaseQty);
  const previousPostedBaseDec = new Decimal(input.previousPostedBase || 0);

  if (!deltaDec.isFinite() || deltaDec.lte(0)) {
    throw new BadRequestException({
      code: GoodsReceiptErrorCode.GOODS_RECEIPT_INVALID_QUANTITY,
      message:
        'La cantidad a recibir debe ser un número positivo mayor a cero.',
    });
  }

  if (deltaDec.decimalPlaces() > 4) {
    throw new BadRequestException({
      code: GoodsReceiptErrorCode.GOODS_RECEIPT_INVALID_QUANTITY,
      message: 'La cantidad a recibir no puede tener más de 4 decimales.',
    });
  }

  const totalExpectedBase = orderedQtyDec
    .times(factorDec)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const newCumulativePurchaseQty = previousReceivedDec.plus(deltaDec);

  if (newCumulativePurchaseQty.gt(orderedQtyDec)) {
    throw new ConflictException({
      code: GoodsReceiptErrorCode.GOODS_RECEIPT_EXCEEDS_PENDING,
      message:
        'La cantidad a recibir supera el saldo pendiente de la orden de compra.',
    });
  }

  const newCumulativeBase = newCumulativePurchaseQty
    .times(factorDec)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const movementQtyBase = newCumulativeBase.minus(previousPostedBaseDec);

  if (movementQtyBase.lte(0)) {
    throw new BadRequestException({
      code: GoodsReceiptErrorCode.GOODS_RECEIPT_BASE_QUANTITY_NOT_REPRESENTABLE,
      message:
        'La cantidad parcial a recibir convertida a unidad base no produce un incremento representable en inventario (mínimo 0.01 unidades base).',
    });
  }

  if (movementQtyBase.gt('999999999999.99')) {
    throw new UnprocessableEntityException({
      code: GoodsReceiptErrorCode.GOODS_RECEIPT_BASE_QUANTITY_OVERFLOW,
      message:
        'La cantidad en unidad base supera el límite máximo permitido de inventario (999.999.999.999,99).',
    });
  }

  // Guard for partial receipts: verify that remaining future purchase quantity can still produce at least 0.01 base stock
  if (newCumulativePurchaseQty.lt(orderedQtyDec)) {
    const remainingFutureBase = totalExpectedBase.minus(newCumulativeBase);
    if (remainingFutureBase.lt('0.01')) {
      throw new BadRequestException({
        code: GoodsReceiptErrorCode.GOODS_RECEIPT_BASE_QUANTITY_NOT_REPRESENTABLE,
        message:
          'La cantidad parcial solicitada dejaría un saldo pendiente que no es representable en el inventario. Debe recibirse en conjunto con el saldo restante.',
      });
    }
  }

  const remainingPendingPurchaseQty = orderedQtyDec.minus(
    newCumulativePurchaseQty,
  );

  return {
    movementQtyBase: movementQtyBase.toFixed(2),
    newCumulativePurchaseQty: newCumulativePurchaseQty.toFixed(4),
    newCumulativeBase: newCumulativeBase.toFixed(2),
    totalExpectedBase: totalExpectedBase.toFixed(2),
    remainingPendingPurchaseQty: remainingPendingPurchaseQty.toFixed(4),
  };
}

/**
 * Computes provisional subtotal net = receivedQtyPurchaseUnit * provisionalCostUnitNet.
 */
export function calculateProvisionalSubtotal(
  receivedQtyPurchaseUnit: string | number,
  provisionalCostUnitNet: string | number,
): string {
  const qty = new Decimal(receivedQtyPurchaseUnit);
  const cost = new Decimal(provisionalCostUnitNet);

  if (!cost.isFinite() || cost.isNegative()) {
    throw new BadRequestException({
      code: GoodsReceiptErrorCode.GOODS_RECEIPT_INVALID_COST,
      message: 'El costo provisional debe ser un número no negativo.',
    });
  }

  if (cost.decimalPlaces() > 4) {
    throw new BadRequestException({
      code: GoodsReceiptErrorCode.GOODS_RECEIPT_INVALID_COST,
      message: 'El costo provisional no puede tener más de 4 decimales.',
    });
  }

  return qty.times(cost).toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toFixed(4);
}
