import Decimal from 'decimal.js';

const COST_SCALE = 4;
const MONEY_SCALE = 4;

export class SupplierCostAdjustmentMathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupplierCostAdjustmentMathError';
  }
}

function decimal(value: string | number, label: string): Decimal {
  let result: Decimal;
  try {
    result = new Decimal(value);
  } catch {
    throw new SupplierCostAdjustmentMathError(
      `${label} no es un decimal válido.`,
    );
  }
  if (!result.isFinite())
    throw new SupplierCostAdjustmentMathError(`${label} no es finito.`);
  return result;
}

export function calculateSupplierCostAdjustment(input: {
  provisionalCostPurchaseUnitNet: string | number;
  realCostPurchaseUnitNet: string | number;
  conversionFactor: string | number;
  onHandAllocatedQty: string | number;
  consumedAllocatedQty: string | number;
}): {
  provisionalCostBaseUnitNet: string;
  realCostBaseUnitNet: string;
  costDifferenceUnitNet: string;
  stockRevaluation: string;
  cogsAdjustment: string;
} {
  const provisional = decimal(
    input.provisionalCostPurchaseUnitNet,
    'El costo provisional',
  );
  const real = decimal(input.realCostPurchaseUnitNet, 'El costo real');
  const factor = decimal(input.conversionFactor, 'El factor de conversión');
  const onHand = decimal(input.onHandAllocatedQty, 'La cantidad en stock');
  const consumed = decimal(input.consumedAllocatedQty, 'La cantidad consumida');
  if (
    provisional.isNegative() ||
    real.isNegative() ||
    factor.lte(0) ||
    onHand.isNegative() ||
    consumed.isNegative()
  ) {
    throw new SupplierCostAdjustmentMathError(
      'Los costos, el factor o las cantidades son inconsistentes.',
    );
  }

  const provisionalBase = provisional
    .dividedBy(factor)
    .toDecimalPlaces(COST_SCALE, Decimal.ROUND_HALF_UP);
  const realBase = real
    .dividedBy(factor)
    .toDecimalPlaces(COST_SCALE, Decimal.ROUND_HALF_UP);
  const difference = realBase
    .minus(provisionalBase)
    .toDecimalPlaces(COST_SCALE, Decimal.ROUND_HALF_UP);

  return {
    provisionalCostBaseUnitNet: provisionalBase.toFixed(COST_SCALE),
    realCostBaseUnitNet: realBase.toFixed(COST_SCALE),
    costDifferenceUnitNet: difference.toFixed(COST_SCALE),
    stockRevaluation: onHand
      .times(difference)
      .toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP)
      .toFixed(MONEY_SCALE),
    cogsAdjustment: consumed
      .times(difference)
      .toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP)
      .toFixed(MONEY_SCALE),
  };
}

export function calculateWeightedProductCost(
  lines: Array<{ quantityBase: string; realCostBaseUnitNet: string }>,
): string | null {
  const applicable = lines.filter((line) =>
    new Decimal(line.quantityBase).gt(0),
  );
  if (applicable.length === 0) return null;
  const totalQty = applicable.reduce(
    (sum, line) => sum.plus(line.quantityBase),
    new Decimal(0),
  );
  const weightedTotal = applicable.reduce(
    (sum, line) =>
      sum.plus(new Decimal(line.quantityBase).times(line.realCostBaseUnitNet)),
    new Decimal(0),
  );
  return weightedTotal
    .dividedBy(totalQty)
    .toDecimalPlaces(COST_SCALE, Decimal.ROUND_HALF_UP)
    .toFixed(COST_SCALE);
}
