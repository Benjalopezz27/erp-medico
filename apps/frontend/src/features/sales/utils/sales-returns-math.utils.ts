import Decimal from 'decimal.js';
import { type ISale, type ISaleReturn, SaleReturnItemQuality } from '@erp/shared-types';
import type { ISaleReturnLineForm, ISaleReturnSummary } from '../types/sales.types';

export function calculateRemainingQuantities(
  sale: ISale,
  returns: ISaleReturn[],
): ISaleReturnLineForm[] {
  const returnedByItem = new Map<string, Decimal>();

  for (const ret of returns) {
    for (const item of ret.items) {
      const current = returnedByItem.get(item.saleItemId) ?? new Decimal(0);
      returnedByItem.set(item.saleItemId, current.plus(item.quantityBase));
    }
  }

  return [...sale.items]
    .sort((a, b) => a.itemIndex - b.itemIndex)
    .map((item) => {
      const sold = new Decimal(item.quantityBase);
      const returned = returnedByItem.get(item.id) ?? new Decimal(0);
      const remaining = Decimal.max(0, sold.minus(returned));

      return {
        saleItemId: item.id,
        productId: item.productId,
        productName: item.product.name,
        internalCode: item.product.internalCode,
        soldQuantity: sold.toNumber(),
        returnedQuantity: returned.toNumber(),
        remainingQuantity: remaining.toNumber(),
        selected: false,
        quantityBase: remaining.toNumber(),
        quality: SaleReturnItemQuality.APTO,
        notes: '',
      };
    });
}

export function summarizeReturnDestinations(
  items: Array<{ quantityBase: number; quality: SaleReturnItemQuality; selected?: boolean }>,
): ISaleReturnSummary {
  let totalUnits = new Decimal(0);
  let aptoUnits = new Decimal(0);
  let noAptoUnits = new Decimal(0);

  for (const item of items) {
    if (item.selected !== false && item.quantityBase > 0) {
      const qty = new Decimal(item.quantityBase);
      totalUnits = totalUnits.plus(qty);
      if (item.quality === SaleReturnItemQuality.APTO) {
        aptoUnits = aptoUnits.plus(qty);
      } else {
        noAptoUnits = noAptoUnits.plus(qty);
      }
    }
  }

  return {
    totalUnits: totalUnits.toNumber(),
    aptoUnits: aptoUnits.toNumber(),
    noAptoUnits: noAptoUnits.toNumber(),
  };
}
