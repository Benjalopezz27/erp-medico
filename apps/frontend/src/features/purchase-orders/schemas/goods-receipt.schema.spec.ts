import { describe, expect, it } from 'vitest';
import { PurchaseOrderStatus, type IPurchaseOrderDetail } from '../types/purchase-orders.types';
import {
  buildGoodsReceiptInitialValues,
  createGoodsReceiptFormSchema,
  mapGoodsReceiptFormToPayload,
} from './goods-receipt.schema';

const order: IPurchaseOrderDetail = {
  id: '11111111-1111-4111-8111-111111111111',
  orderNumber: 'OC-000001',
  supplier: {
    id: '22222222-2222-4222-8222-222222222222',
    businessName: 'Proveedor',
    cuit: '30712345678',
  },
  status: PurchaseOrderStatus.PARCIAL,
  expectedDeliveryDate: null,
  notes: null,
  totalNet: '1000.0000',
  itemsCount: 2,
  user: { id: '33333333-3333-4333-8333-333333333333', name: 'Admin', email: 'admin@erp.com' },
  emittedAt: '2026-08-01T00:00:00.000Z',
  cancelledAt: null,
  cancelReason: null,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  items: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      itemIndex: 1,
      supplierProductId: '55555555-5555-4555-8555-555555555555',
      productId: '66666666-6666-4666-8666-666666666666',
      purchaseUnitId: '77777777-7777-4777-8777-777777777777',
      supplierSku: 'SKU-1',
      productCode: '001',
      productName: 'Producto pendiente',
      purchaseUnitName: 'Caja',
      purchaseUnitSymbol: 'cja',
      conversionFactor: '10.0000',
      orderedQty: '10.0000',
      receivedQty: '4.0000',
      pendingQty: '6.0000',
      expectedCostUnitNet: '100.0000',
      subtotalNet: '1000.0000',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: '88888888-8888-4888-8888-888888888888',
      itemIndex: 2,
      supplierProductId: '99999999-9999-4999-8999-999999999999',
      productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      purchaseUnitId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      supplierSku: 'SKU-2',
      productCode: '002',
      productName: 'Producto completo',
      purchaseUnitName: 'Unidad',
      purchaseUnitSymbol: 'u',
      conversionFactor: '1.0000',
      orderedQty: '2.0000',
      receivedQty: '2.0000',
      pendingQty: '0.0000',
      expectedCostUnitNet: '50.0000',
      subtotalNet: '100.0000',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ],
};

describe('goods receipt form schema', () => {
  it('builds values only for pending lines and maps valid payload', () => {
    const values = buildGoodsReceiptInitialValues(order);
    expect(values.items).toHaveLength(1);
    values.deliveryNoteNumber = ' 0001-00001234 ';
    values.items[0].receivedQtyPurchaseUnit = '2.5';

    expect(createGoodsReceiptFormSchema(order).safeParse(values).success).toBe(true);
    expect(mapGoodsReceiptFormToPayload(values)).toEqual({
      deliveryNoteNumber: '0001-00001234',
      items: [
        {
          purchaseOrderItemId: order.items[0].id,
          receivedQtyPurchaseUnit: 2.5,
          provisionalCostUnitNet: 100,
        },
      ],
    });
  });

  it('rejects no active lines, explicit zero, over-receipt and invalid delivery-note chars', () => {
    const schema = createGoodsReceiptFormSchema(order);
    const values = buildGoodsReceiptInitialValues(order);
    values.deliveryNoteNumber = 'REM#1';
    expect(schema.safeParse(values).success).toBe(false);

    values.deliveryNoteNumber = 'REM_1.2026';
    values.items[0].receivedQtyPurchaseUnit = '0';
    expect(schema.safeParse(values).success).toBe(false);

    values.items[0].receivedQtyPurchaseUnit = '6.0001';
    expect(schema.safeParse(values).success).toBe(false);
  });
});
