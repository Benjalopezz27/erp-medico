import Decimal from 'decimal.js';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import {
  PurchaseOrderSummaryResponseDto,
  PurchaseOrderDetailResponseDto,
  PurchaseOrderItemDetailResponseDto,
} from '../dto';

export class PurchaseOrderMapper {
  static toItemDetailDto(
    item: PurchaseOrderItem,
  ): PurchaseOrderItemDetailResponseDto {
    const orderedDec = new Decimal(item.orderedQty);
    const receivedDec = new Decimal(item.receivedQty || 0);
    const pendingDec = orderedDec.minus(receivedDec);

    return {
      id: item.id,
      itemIndex: item.itemIndex,
      supplierProductId: item.supplierProductId,
      productId: item.productId,
      purchaseUnitId: item.purchaseUnitId,
      supplierSku: item.supplierSkuSnapshot,
      productCode: item.productCodeSnapshot,
      productName: item.productNameSnapshot,
      purchaseUnitName: item.purchaseUnitNameSnapshot,
      purchaseUnitSymbol: item.purchaseUnitSymbolSnapshot,
      conversionFactor: new Decimal(item.conversionFactorSnapshot).toFixed(4),
      orderedQty: orderedDec.toFixed(4),
      receivedQty: receivedDec.toFixed(4),
      pendingQty: pendingDec.toFixed(4),
      expectedCostUnitNet: new Decimal(item.expectedCostUnitNet).toFixed(4),
      subtotalNet: new Decimal(item.subtotalNet).toFixed(4),
      createdAt: item.createdAt ? item.createdAt.toISOString() : '',
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : '',
    };
  }

  static toSummaryDto(
    entity: PurchaseOrder,
    itemsCount?: number,
  ): PurchaseOrderSummaryResponseDto {
    const computedCount =
      itemsCount !== undefined
        ? itemsCount
        : entity.items
          ? entity.items.length
          : 0;

    return {
      id: entity.id,
      orderNumber: entity.orderNumber,
      supplier: {
        id: entity.supplier ? entity.supplier.id : entity.supplierId,
        businessName: entity.supplier ? entity.supplier.businessName : '',
        cuit: entity.supplier ? entity.supplier.cuit : '',
      },
      status: entity.status,
      expectedDeliveryDate: entity.expectedDeliveryDate || null,
      notes: entity.notes || null,
      totalNet: new Decimal(entity.totalNet || 0).toFixed(4),
      itemsCount: computedCount,
      user: {
        id: entity.user ? entity.user.id : entity.userId,
        name: entity.user ? entity.user.name : '',
        email: entity.user ? entity.user.email : '',
      },
      emittedAt: entity.emittedAt ? entity.emittedAt.toISOString() : null,
      cancelledAt: entity.cancelledAt ? entity.cancelledAt.toISOString() : null,
      cancelReason: entity.cancelReason || null,
      createdAt: entity.createdAt ? entity.createdAt.toISOString() : '',
      updatedAt: entity.updatedAt ? entity.updatedAt.toISOString() : '',
    };
  }

  static toDetailDto(entity: PurchaseOrder): PurchaseOrderDetailResponseDto {
    const summary = this.toSummaryDto(entity);
    const sortedItems = (entity.items || []).sort(
      (a, b) => a.itemIndex - b.itemIndex,
    );

    return {
      ...summary,
      items: sortedItems.map((item) => this.toItemDetailDto(item)),
    };
  }
}
