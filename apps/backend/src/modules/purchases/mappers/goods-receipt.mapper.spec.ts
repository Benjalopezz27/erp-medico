import {
  mapGoodsReceiptItemToResponseDto,
  mapGoodsReceiptToResponseDto,
  mapCreateGoodsReceiptToResponseDto,
} from './goods-receipt.mapper';
import { GoodsReceipt } from '../entities/goods-receipt.entity';
import { GoodsReceiptItem } from '../entities/goods-receipt-item.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { PurchaseOrderStatus } from '@erp/shared-types';

describe('goods-receipt.mapper', () => {
  const mockDate = new Date('2026-08-27T12:00:00.000Z');

  const mockPoItem: Partial<PurchaseOrderItem> = {
    id: 'poi-1',
    productCodeSnapshot: 'MED-001',
    productNameSnapshot: 'Jeringa 5ml',
    purchaseUnitNameSnapshot: 'Caja x 100',
    purchaseUnitSymbolSnapshot: 'CJA',
    orderedQty: '10.0000',
    receivedQty: '5.0000',
  };

  const mockItem: Partial<GoodsReceiptItem> = {
    id: 'gri-1',
    goodsReceiptId: 'gr-1',
    purchaseOrderItemId: 'poi-1',
    productId: 'prod-1',
    purchaseUnitId: 'unit-1',
    receivedQtyPurchaseUnit: '5.0000',
    receivedQtyBase: '500.00',
    conversionFactorUsed: '100.0000',
    provisionalCostUnitNet: '1200.5000',
    provisionalSubtotalNet: '6002.5000',
    stockMovementId: 'mov-1',
    purchaseOrderItem: mockPoItem as PurchaseOrderItem,
    stockMovement: {
      id: 'mov-1',
      previousStock: '100.00',
      subsequentStock: '600.00',
    } as any,
  };

  const mockReceipt: Partial<GoodsReceipt> = {
    id: 'gr-1',
    receiptNumber: 'REC-000001',
    purchaseOrderId: 'po-1',
    supplierId: 'sup-1',
    deliveryNoteNumber: '0001-00001234',
    deliveryNoteNormalized: '0001-00001234',
    userId: 'user-1',
    createdAt: mockDate,
    purchaseOrder: {
      id: 'po-1',
      orderNumber: 'OC-000001',
      status: PurchaseOrderStatus.PARCIAL,
    } as PurchaseOrder,
    supplier: {
      id: 'sup-1',
      businessName: 'Droguería Central S.A.',
      cuit: '30-12345678-9',
    } as any,
    user: {
      id: 'user-1',
      name: 'Admin User',
      email: 'admin@erp.com',
    } as any,
    items: [mockItem as GoodsReceiptItem],
  };

  it('maps GoodsReceiptItem to GoodsReceiptItemResponseDto', () => {
    const res = mapGoodsReceiptItemToResponseDto(mockItem as GoodsReceiptItem);

    expect(res.id).toBe('gri-1');
    expect(res.productCode).toBe('MED-001');
    expect(res.productName).toBe('Jeringa 5ml');
    expect(res.purchaseUnitSymbol).toBe('CJA');
    expect(res.receivedQtyPurchaseUnit).toBe('5.0000');
    expect(res.receivedQtyBase).toBe('500.00');
    expect(res.provisionalCostUnitNet).toBe('1200.5000');
    expect(res.provisionalSubtotalNet).toBe('6002.5000');
    expect(res.previousStock).toBe('100.00');
    expect(res.subsequentStock).toBe('600.00');
  });

  it('maps GoodsReceipt to GoodsReceiptResponseDto', () => {
    const res = mapGoodsReceiptToResponseDto(mockReceipt as GoodsReceipt);

    expect(res.id).toBe('gr-1');
    expect(res.receiptNumber).toBe('REC-000001');
    expect(res.orderNumber).toBe('OC-000001');
    expect(res.supplier.businessName).toBe('Droguería Central S.A.');
    expect(res.deliveryNoteNumber).toBe('0001-00001234');
    expect(res.items).toHaveLength(1);
  });

  it('maps CreateGoodsReceipt to CreateGoodsReceiptResponseDto with resulting PO status and items', () => {
    const mockPo: Partial<PurchaseOrder> = {
      id: 'po-1',
      status: PurchaseOrderStatus.PARCIAL,
      items: [
        {
          id: 'poi-1',
          orderedQty: '10.0000',
          receivedQty: '5.0000',
        } as PurchaseOrderItem,
      ],
    };

    const res = mapCreateGoodsReceiptToResponseDto(
      mockReceipt as GoodsReceipt,
      mockPo as PurchaseOrder,
    );

    expect(res.receipt.receiptNumber).toBe('REC-000001');
    expect(res.resultingPurchaseOrder.id).toBe('po-1');
    expect(res.resultingPurchaseOrder.status).toBe(PurchaseOrderStatus.PARCIAL);
    expect(res.resultingPurchaseOrder.items[0]).toEqual({
      purchaseOrderItemId: 'poi-1',
      orderedQty: '10.0000',
      receivedQty: '5.0000',
      pendingQty: '5.0000',
    });
  });
});
