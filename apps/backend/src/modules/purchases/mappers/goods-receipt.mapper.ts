import Decimal from 'decimal.js';
import { GoodsReceipt } from '../entities/goods-receipt.entity';
import { GoodsReceiptItem } from '../entities/goods-receipt-item.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { GoodsReceiptResponseDto } from '../dto/goods-receipt-response.dto';
import { GoodsReceiptItemResponseDto } from '../dto/goods-receipt-item-response.dto';
import {
  CreateGoodsReceiptResponseDto,
  ResultingPurchaseOrderDto,
} from '../dto/create-goods-receipt-response.dto';

export function mapGoodsReceiptItemToResponseDto(
  item: GoodsReceiptItem,
): GoodsReceiptItemResponseDto {
  const poItem = item.purchaseOrderItem;
  const product = item.product || poItem?.product;
  const unit = item.purchaseUnit || poItem?.purchaseUnit;

  const previousStockFormatted = item.stockMovement
    ? new Decimal(item.stockMovement.previousStock).toFixed(2)
    : '0.00';
  const subsequentStockFormatted = item.stockMovement
    ? new Decimal(item.stockMovement.subsequentStock).toFixed(2)
    : '0.00';

  return {
    id: item.id,
    purchaseOrderItemId: item.purchaseOrderItemId,
    productId: item.productId,
    productCode: poItem?.productCodeSnapshot || product?.internalCode || '',
    productName: poItem?.productNameSnapshot || product?.name || '',
    purchaseUnitId: item.purchaseUnitId,
    purchaseUnitName: poItem?.purchaseUnitNameSnapshot || unit?.name || '',
    purchaseUnitSymbol:
      poItem?.purchaseUnitSymbolSnapshot || unit?.symbol || '',
    receivedQtyPurchaseUnit: new Decimal(item.receivedQtyPurchaseUnit).toFixed(
      4,
    ),
    conversionFactorUsed: new Decimal(item.conversionFactorUsed).toFixed(4),
    receivedQtyBase: new Decimal(item.receivedQtyBase).toFixed(2),
    provisionalCostUnitNet: new Decimal(item.provisionalCostUnitNet).toFixed(4),
    provisionalSubtotalNet: new Decimal(item.provisionalSubtotalNet).toFixed(4),
    stockMovementId: item.stockMovementId,
    previousStock: previousStockFormatted,
    subsequentStock: subsequentStockFormatted,
  };
}

export function mapGoodsReceiptToResponseDto(
  receipt: GoodsReceipt,
): GoodsReceiptResponseDto {
  const items = receipt.items
    ? receipt.items.map(mapGoodsReceiptItemToResponseDto)
    : [];

  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    purchaseOrderId: receipt.purchaseOrderId,
    orderNumber: receipt.purchaseOrder?.orderNumber || '',
    supplier: {
      id: receipt.supplier?.id || receipt.supplierId,
      businessName: receipt.supplier?.businessName || '',
      cuit: receipt.supplier?.cuit || '',
    },
    deliveryNoteNumber: receipt.deliveryNoteNumber,
    user: {
      id: receipt.user?.id || receipt.userId,
      name: receipt.user?.name || '',
      email: receipt.user?.email || '',
    },
    createdAt:
      receipt.createdAt instanceof Date
        ? receipt.createdAt.toISOString()
        : String(receipt.createdAt),
    items,
  };
}

export function mapCreateGoodsReceiptToResponseDto(
  receipt: GoodsReceipt,
  purchaseOrder: PurchaseOrder,
): CreateGoodsReceiptResponseDto {
  const receiptDto = mapGoodsReceiptToResponseDto(receipt);

  const poItems = (purchaseOrder.items || []).map((poi) => {
    const ordered = new Decimal(poi.orderedQty);
    const received = new Decimal(poi.receivedQty);
    const pending = ordered.minus(received);

    return {
      purchaseOrderItemId: poi.id,
      orderedQty: ordered.toFixed(4),
      receivedQty: received.toFixed(4),
      pendingQty: pending.toFixed(4),
    };
  });

  const resultingPurchaseOrder: ResultingPurchaseOrderDto = {
    id: purchaseOrder.id,
    status: purchaseOrder.status,
    items: poItems,
  };

  return {
    receipt: receiptDto,
    resultingPurchaseOrder,
  };
}
