import Decimal from 'decimal.js';
import { StockMovementType } from '@erp/shared-types';

const INBOUND_TYPES = new Set<StockMovementType>([
  StockMovementType.ENTRADA_COMPRA,
  StockMovementType.AJUSTE_ENTRADA,
  StockMovementType.DEVOLUCION_CLIENTE,
]);
const OUTBOUND_TYPES = new Set<StockMovementType>([
  StockMovementType.SALIDA_VENTA,
  StockMovementType.MERMA,
  StockMovementType.AJUSTE_SALIDA,
]);

export interface FifoMovementInput {
  id: string;
  movementType: StockMovementType;
  quantityBase: string | number;
  previousStock: string | number;
  subsequentStock: string | number;
  createdAt: Date | string;
}

export interface FifoLayer {
  movementId: string;
  movementType: StockMovementType | 'OPENING_BALANCE';
  originalQty: string;
  remainingQty: string;
}

export class FifoLedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FifoLedgerError';
  }
}

function qty(value: string | number, label: string): Decimal {
  let result: Decimal;
  try {
    result = new Decimal(value);
  } catch {
    throw new FifoLedgerError(`${label} no es un decimal válido.`);
  }
  if (!result.isFinite() || result.isNegative() || result.decimalPlaces() > 2) {
    throw new FifoLedgerError(`${label} no respeta la escala del ledger.`);
  }
  return result;
}

export function reconstructFifoLayers(
  movementInputs: FifoMovementInput[],
  currentStock: string | number,
): FifoLayer[] {
  const movements = [...movementInputs].sort((left, right) => {
    const timeDiff =
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    return timeDiff !== 0 ? timeDiff : left.id.localeCompare(right.id);
  });
  const expectedCurrent = qty(currentStock, 'El stock actual');
  if (movements.length === 0) {
    if (!expectedCurrent.isZero()) {
      throw new FifoLedgerError(
        'Existe stock actual sin movimientos que permitan reconstruirlo.',
      );
    }
    return [];
  }

  const initialBalance = qty(
    movements[0].previousStock,
    'El saldo inicial del ledger',
  );
  let running = initialBalance;
  const mutableLayers: Array<{
    movementId: string;
    movementType: StockMovementType | 'OPENING_BALANCE';
    originalQty: Decimal;
    remainingQty: Decimal;
  }> = initialBalance.gt(0)
    ? [
        {
          movementId: 'OPENING_BALANCE',
          movementType: 'OPENING_BALANCE',
          originalQty: initialBalance,
          remainingQty: initialBalance,
        },
      ]
    : [];

  for (const movement of movements) {
    const previous = qty(movement.previousStock, 'El saldo previo');
    const subsequent = qty(movement.subsequentStock, 'El saldo posterior');
    const quantity = qty(movement.quantityBase, 'La cantidad del movimiento');
    if (quantity.lte(0)) {
      throw new FifoLedgerError(
        'Los movimientos deben tener cantidad positiva.',
      );
    }
    if (!previous.eq(running)) {
      throw new FifoLedgerError(
        `El movimiento ${movement.id} no continúa el saldo anterior.`,
      );
    }

    if (INBOUND_TYPES.has(movement.movementType)) {
      running = running.plus(quantity);
      mutableLayers.push({
        movementId: movement.id,
        movementType: movement.movementType,
        originalQty: quantity,
        remainingQty: quantity,
      });
    } else if (OUTBOUND_TYPES.has(movement.movementType)) {
      let pending = quantity;
      for (const layer of mutableLayers) {
        if (pending.isZero()) break;
        const consumed = Decimal.min(layer.remainingQty, pending);
        layer.remainingQty = layer.remainingQty.minus(consumed);
        pending = pending.minus(consumed);
      }
      if (!pending.isZero()) {
        throw new FifoLedgerError(
          `El movimiento ${movement.id} consume más stock que las capas disponibles.`,
        );
      }
      running = running.minus(quantity);
    } else {
      throw new FifoLedgerError(
        `El tipo ${movement.movementType} no tiene una política FIFO definida.`,
      );
    }

    if (!subsequent.eq(running)) {
      throw new FifoLedgerError(
        `El movimiento ${movement.id} tiene un saldo posterior inconsistente.`,
      );
    }
  }

  if (!running.eq(expectedCurrent)) {
    throw new FifoLedgerError(
      'El saldo reconstruido no coincide con el stock materializado.',
    );
  }

  return mutableLayers.map((layer) => ({
    movementId: layer.movementId,
    movementType: layer.movementType,
    originalQty: layer.originalQty.toFixed(2),
    remainingQty: layer.remainingQty.toFixed(2),
  }));
}

export function allocateFifoLayerTranche(input: {
  layer: FifoLayer;
  startQty: string | number;
  invoicedQty: string | number;
}): {
  layerStartQtyBase: string;
  layerEndQtyBase: string;
  onHandAllocatedQty: string;
  consumedAllocatedQty: string;
} {
  const original = qty(input.layer.originalQty, 'La cantidad original de capa');
  const remaining = qty(input.layer.remainingQty, 'El remanente de capa');
  const start = qty(input.startQty, 'El inicio del tramo');
  const invoiced = qty(input.invoicedQty, 'La cantidad confirmada');
  const end = start.plus(invoiced);
  if (remaining.gt(original) || end.gt(original)) {
    throw new FifoLedgerError(
      'El tramo confirmado excede la cantidad recibida en la capa.',
    );
  }

  const consumedPrefix = original.minus(remaining);
  const consumed = Decimal.max(
    Decimal.min(end, consumedPrefix).minus(Decimal.min(start, consumedPrefix)),
    0,
  );
  const onHand = invoiced.minus(consumed);

  return {
    layerStartQtyBase: start.toFixed(2),
    layerEndQtyBase: end.toFixed(2),
    onHandAllocatedQty: onHand.toFixed(2),
    consumedAllocatedQty: consumed.toFixed(2),
  };
}
