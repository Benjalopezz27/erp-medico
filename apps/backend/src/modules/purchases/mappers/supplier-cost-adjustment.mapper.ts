import Decimal from 'decimal.js';
import {
  IPriceReview,
  ISupplierCostAdjustment,
  ISupplierInvoiceConfirmation,
} from '@erp/shared-types';
import { PriceReview } from '../entities/price-review.entity';
import { SupplierCostAdjustment } from '../entities/supplier-cost-adjustment.entity';
import { SupplierInvoice } from '../entities/supplier-invoice.entity';

const fixed = (value: string, places: number): string =>
  new Decimal(value).toFixed(places);

export function mapSupplierCostAdjustment(
  adjustment: SupplierCostAdjustment,
): ISupplierCostAdjustment {
  return {
    id: adjustment.id,
    supplierInvoiceId: adjustment.supplierInvoiceId,
    supplierInvoiceItemId: adjustment.supplierInvoiceItemId,
    goodsReceiptId: adjustment.goodsReceiptId,
    goodsReceiptItemId: adjustment.goodsReceiptItemId,
    productId: adjustment.productId,
    productCode: adjustment.productCodeSnapshot,
    productName: adjustment.productNameSnapshot,
    stockMovementId: adjustment.stockMovementId,
    provisionalCostPurchaseUnitNet: fixed(
      adjustment.provisionalCostPurchaseUnitNet,
      4,
    ),
    realCostPurchaseUnitNet: fixed(adjustment.realCostPurchaseUnitNet, 4),
    conversionFactor: fixed(adjustment.conversionFactor, 4),
    provisionalCostBaseUnitNet: fixed(adjustment.provisionalCostBaseUnitNet, 4),
    realCostBaseUnitNet: fixed(adjustment.realCostBaseUnitNet, 4),
    costDifferenceUnitNet: fixed(adjustment.costDifferenceUnitNet, 4),
    invoicedQtyBase: fixed(adjustment.invoicedQtyBase, 2),
    layerStartQtyBase: fixed(adjustment.layerStartQtyBase, 2),
    layerEndQtyBase: fixed(adjustment.layerEndQtyBase, 2),
    onHandAllocatedQty: fixed(adjustment.onHandAllocatedQty, 2),
    consumedAllocatedQty: fixed(adjustment.consumedAllocatedQty, 2),
    stockRevaluation: fixed(adjustment.stockRevaluation, 4),
    cogsAdjustment: fixed(adjustment.cogsAdjustment, 4),
    previousProductCostNet: fixed(adjustment.previousProductCostNet, 4),
    newProductCostNet: fixed(adjustment.newProductCostNet, 4),
    appliedAt: adjustment.appliedAt.toISOString(),
  };
}

export function mapPriceReview(review: PriceReview): IPriceReview {
  return {
    id: review.id,
    supplierInvoiceId: review.supplierInvoiceId,
    productId: review.productId,
    productCode: review.productCodeSnapshot,
    productName: review.productNameSnapshot,
    previousCostNet: fixed(review.previousCostNet, 4),
    newCostNet: fixed(review.newCostNet, 4),
    markupPercentageSnapshot:
      review.markupPercentageSnapshot === null
        ? null
        : fixed(review.markupPercentageSnapshot, 4),
    effectiveMarkupLevel: review.effectiveMarkupLevel,
    effectiveMarkupConfigurationId: review.effectiveMarkupConfigurationId,
    effectiveMarkupTargetId: review.effectiveMarkupTargetId,
    effectiveMarkupTargetName: review.effectiveMarkupTargetName,
    previousSuggestedPriceNet: fixed(review.previousSuggestedPriceNet, 2),
    suggestedPriceNet: fixed(review.suggestedPriceNet, 2),
    activePriceNetSnapshot: fixed(review.activePriceNetSnapshot, 2),
    approvedPriceNet:
      review.approvedPriceNet === null
        ? null
        : fixed(review.approvedPriceNet, 2),
    status: review.status,
    reviewedByUserId: review.reviewedByUserId,
    reviewedAt: review.reviewedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

export function mapSupplierInvoiceConfirmation(
  invoice: SupplierInvoice,
): ISupplierInvoiceConfirmation | null {
  if (!invoice.confirmedAt || !invoice.confirmedBy) return null;
  const adjustments = [...(invoice.costAdjustments ?? [])]
    .sort(
      (left, right) =>
        left.appliedAt.getTime() - right.appliedAt.getTime() ||
        left.id.localeCompare(right.id),
    )
    .map(mapSupplierCostAdjustment);
  const priceReviews = [...(invoice.priceReviews ?? [])]
    .sort(
      (left, right) =>
        left.createdAt.getTime() - right.createdAt.getTime() ||
        left.id.localeCompare(right.id),
    )
    .map(mapPriceReview);
  return {
    confirmedAt: invoice.confirmedAt.toISOString(),
    confirmedBy: {
      id: invoice.confirmedBy.id,
      name: invoice.confirmedBy.name,
      email: invoice.confirmedBy.email,
    },
    stockRevaluationTotal: adjustments
      .reduce((sum, item) => sum.plus(item.stockRevaluation), new Decimal(0))
      .toFixed(4),
    cogsAdjustmentTotal: adjustments
      .reduce((sum, item) => sum.plus(item.cogsAdjustment), new Decimal(0))
      .toFixed(4),
    adjustments,
    priceReviews,
  };
}
