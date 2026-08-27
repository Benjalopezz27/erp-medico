import type { IPendingInvoiceReceipt } from '../types/supplier-invoices.types';

export const pendingReceiptFixture: IPendingInvoiceReceipt = {
  id: '11111111-1111-4111-a111-111111111111',
  receiptNumber: 'REC-000001',
  deliveryNoteNumber: 'R-0001',
  createdAt: '2026-08-27T10:00:00Z',
  supplier: {
    id: '22222222-2222-4222-a222-222222222222',
    businessName: 'Proveedor Médico',
    cuit: '30123456789',
  },
  purchaseOrder: {
    id: '33333333-3333-4333-a333-333333333333',
    orderNumber: 'OC-000001',
  },
  pendingLineCount: 1,
  items: [
    {
      goodsReceiptItemId: '44444444-4444-4444-a444-444444444444',
      purchaseOrderItemId: '55555555-5555-4555-a555-555555555555',
      productId: '66666666-6666-4666-a666-666666666666',
      productCode: '001',
      productName: 'Producto médico',
      supplierSku: 'SKU-001',
      purchaseUnitId: '77777777-7777-4777-a777-777777777777',
      purchaseUnitName: 'Caja',
      purchaseUnitSymbol: 'CJA',
      conversionFactor: '10.0000',
      receivedQtyPurchaseUnit: '5.0000',
      previouslyAllocatedQtyPurchaseUnit: '1.0000',
      availableQtyPurchaseUnit: '4.0000',
      receivedQtyBase: '50.00',
      provisionalCostUnitNet: '100.0000',
    },
  ],
};
