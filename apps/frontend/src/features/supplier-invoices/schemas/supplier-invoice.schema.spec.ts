import { describe, expect, it } from 'vitest';
import {
  buildSupplierInvoiceDefaults,
  createSupplierInvoiceSchema,
  mapSupplierInvoiceFormToPayload,
} from './supplier-invoice.schema';
import type { IPendingInvoiceReceipt } from '../types/supplier-invoices.types';
import { SupplierInvoiceAdjustmentMode } from '../types/supplier-invoices.types';

const receipt = {
  id: '11111111-1111-4111-a111-111111111111',
  receiptNumber: 'REC-1',
  deliveryNoteNumber: 'R-1',
  createdAt: '2026-08-27T10:00:00Z',
  supplier: {
    id: '22222222-2222-4222-a222-222222222222',
    businessName: 'Proveedor',
    cuit: '30123456789',
  },
  purchaseOrder: { id: '33333333-3333-4333-a333-333333333333', orderNumber: 'OC-1' },
  pendingLineCount: 1,
  items: [
    {
      goodsReceiptItemId: '44444444-4444-4444-a444-444444444444',
      purchaseOrderItemId: '55555555-5555-4555-a555-555555555555',
      productId: '66666666-6666-4666-a666-666666666666',
      productCode: '001',
      productName: 'Producto',
      supplierSku: 'SKU-1',
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
} as IPendingInvoiceReceipt;

describe('supplier invoice schema', () => {
  it('requires at least one selected line and validates negative net', () => {
    const defaults = buildSupplierInvoiceDefaults(receipt);
    expect(createSupplierInvoiceSchema(receipt).safeParse(defaults).success).toBe(false);
    defaults.invoiceNumber = 'A-1';
    defaults.items[0].invoicedQtyPurchaseUnit = '1';
    defaults.items[0].discountNet = '101';
    expect(createSupplierInvoiceSchema(receipt).safeParse(defaults).success).toBe(false);
  });

  it('allows excess and keeps canonical payload values as strings', () => {
    const form = buildSupplierInvoiceDefaults(receipt);
    form.invoiceNumber = ' A 1 ';
    form.items[0].invoicedQtyPurchaseUnit = '6';
    expect(createSupplierInvoiceSchema(receipt).safeParse(form).success).toBe(true);
    expect(mapSupplierInvoiceFormToPayload(receipt, form)).toMatchObject({
      invoiceNumber: 'A 1',
      taxTotal: '0.0000',
      items: [{ invoicedQtyPurchaseUnit: '6.0000', unitPriceNet: '100.0000' }],
    });
  });

  it('maps percentage adjustments and IVA without converting them to numbers', () => {
    const form = buildSupplierInvoiceDefaults(receipt);
    form.invoiceNumber = 'A-2';
    form.items[0].invoicedQtyPurchaseUnit = '2';
    form.items[0].discountMode = SupplierInvoiceAdjustmentMode.PERCENTAGE;
    form.items[0].discountNet = '10';
    form.taxMode = SupplierInvoiceAdjustmentMode.PERCENTAGE;
    form.taxTotal = '21';
    expect(createSupplierInvoiceSchema(receipt).safeParse(form).success).toBe(true);
    expect(mapSupplierInvoiceFormToPayload(receipt, form)).toMatchObject({
      taxTotal: '0.0000',
      taxMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
      taxPercentage: '21.0000',
      items: [
        {
          discountNet: '0.0000',
          discountMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
          discountPercentage: '10.0000',
        },
      ],
    });
  });
});
