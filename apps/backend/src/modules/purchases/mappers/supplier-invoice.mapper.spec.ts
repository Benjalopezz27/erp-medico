import {
  SupplierInvoiceQuantityStatus,
  SupplierInvoiceStatus,
} from '@erp/shared-types';
import { SupplierInvoice } from '../entities/supplier-invoice.entity';
import { SupplierInvoiceItem } from '../entities/supplier-invoice-item.entity';
import { mapSupplierInvoiceDetail } from './supplier-invoice.mapper';

describe('supplier invoice mapper', () => {
  it('serializes decimals canonically and orders lines by itemIndex', () => {
    const baseItem = {
      id: 'item',
      goodsReceiptItemId: 'receipt-item',
      purchaseOrderItemId: 'po-item',
      productId: 'product',
      productCodeSnapshot: '001',
      productNameSnapshot: 'Producto',
      purchaseUnitId: 'unit',
      purchaseUnitNameSnapshot: 'Caja',
      purchaseUnitSymbolSnapshot: 'CJA',
      conversionFactorSnapshot: '10',
      receivedQtyPurchaseUnit: '2',
      previouslyAllocatedQtyPurchaseUnit: '0',
      availableQtyBefore: '2',
      invoicedQtyPurchaseUnit: '1',
      allocatedReceivedQtyPurchaseUnit: '1',
      allocatedReceivedQtyBase: '10',
      pendingQtyAfter: '1',
      quantityExcess: '0',
      quantityStatus: SupplierInvoiceQuantityStatus.PARCIAL,
      provisionalCostUnitNet: '100',
      unitPriceNet: '110',
      discountNet: '0',
      bonusNet: '0',
      surchargeNet: '0',
      realCostUnitNet: '110',
      lineNetTotal: '110',
    } as SupplierInvoiceItem;
    const invoice = {
      id: 'invoice',
      invoiceNumber: 'A 1-1',
      supplierId: 'supplier',
      goodsReceiptId: 'receipt',
      purchaseOrderId: 'po',
      userId: 'user',
      invoiceDate: '2026-08-27',
      status: SupplierInvoiceStatus.VALIDANDO,
      netTotal: '220',
      taxTotal: '46.2',
      totalAmount: '266.2',
      createdAt: new Date('2026-08-27T12:00:00Z'),
      updatedAt: new Date('2026-08-27T12:00:00Z'),
      supplier: {
        id: 'supplier',
        businessName: 'Proveedor',
        cuit: '30123456789',
      },
      goodsReceipt: {
        id: 'receipt',
        receiptNumber: 'REC-1',
        deliveryNoteNumber: 'R-1',
        createdAt: new Date('2026-08-26T12:00:00Z'),
      },
      purchaseOrder: { id: 'po', orderNumber: 'OC-1' },
      user: { id: 'user', name: 'Admin', email: 'admin@erp.com' },
      items: [
        { ...baseItem, id: 'second', itemIndex: 2 },
        { ...baseItem, id: 'first', itemIndex: 1 },
      ],
    } as SupplierInvoice;
    const result = mapSupplierInvoiceDetail(invoice);
    expect(result.netTotal).toBe('220.0000');
    expect(result.taxTotal).toBe('46.2000');
    expect(result.items.map((item) => item.id)).toEqual(['first', 'second']);
    expect(result.items[0].allocatedReceivedQtyBase).toBe('10.00');
  });
});
