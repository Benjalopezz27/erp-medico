import { BadRequestException } from '@nestjs/common';
import { StockMovementType, StockStatus } from '@erp/shared-types';
import Decimal from 'decimal.js';

/**
 * Returns the algebraic sign (+1 for inward, -1 for outward) associated with a StockMovementType.
 */
export function getStockMovementSign(movementType: StockMovementType): 1 | -1 {
  switch (movementType) {
    case StockMovementType.ENTRADA_COMPRA:
    case StockMovementType.AJUSTE_ENTRADA:
    case StockMovementType.DEVOLUCION_CLIENTE:
      return 1;
    case StockMovementType.SALIDA_VENTA:
    case StockMovementType.MERMA:
    case StockMovementType.AJUSTE_SALIDA:
      return -1;
    default:
      throw new BadRequestException(
        `Tipo de movimiento de stock no soportado: ${movementType}`,
      );
  }
}

/**
 * Parses a decimal string or number with the given scale using ROUND_HALF_UP.
 */
export function parseStockDecimal(
  val: string | number | null | undefined,
  scale = 2,
): number {
  if (val === null || val === undefined || val === '') {
    return 0;
  }
  return new Decimal(val)
    .toDecimalPlaces(scale, Decimal.ROUND_HALF_UP)
    .toNumber();
}

/**
 * Derives the stock health status (CRITICAL, LOW, NORMAL) based on current balance and min stock.
 */
export function deriveStockStatus(
  currentBaseStock: number | string | null | undefined,
  minStock: number | string | null | undefined,
): StockStatus {
  const current = parseStockDecimal(currentBaseStock, 2);
  const min = parseStockDecimal(minStock, 2);

  if (current <= 0) {
    return StockStatus.CRITICAL;
  }
  if (current <= min) {
    return StockStatus.LOW;
  }
  return StockStatus.NORMAL;
}
