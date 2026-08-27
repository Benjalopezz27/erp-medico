import { BadRequestException, ConflictException } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  SupplierInvoiceAdjustmentMode,
  SupplierInvoiceQuantityStatus,
} from '@erp/shared-types';
import {
  calculateSupplierInvoiceAllocation,
  calculateSupplierInvoiceAmounts,
  normalizeSupplierInvoiceTaxTotal,
  calculateSupplierInvoiceTax,
} from './supplier-invoice-math.utils';

describe('supplier invoice math', () => {
  it('calculates net and real unit cost with four-decimal HALF_UP rounding', () => {
    expect(
      calculateSupplierInvoiceAmounts({
        invoicedQty: '3.0000',
        unitPriceNet: '10.0000',
        discountNet: '1.0000',
        bonusNet: '2.0000',
        surchargeNet: '0.5000',
      }),
    ).toMatchObject({
      unitPriceNet: '10.0000',
      discountNet: '1.0000',
      bonusNet: '2.0000',
      surchargeNet: '0.5000',
      realCostUnitNet: '9.1667',
      lineNetTotal: '27.5000',
    });
  });

  it('calculates percentage adjustments over gross and percentage tax over net', () => {
    const amounts = calculateSupplierInvoiceAmounts({
      invoicedQty: '2',
      unitPriceNet: '100',
      discountMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
      discountPercentage: '10',
      bonusMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
      bonusPercentage: '5',
      surchargeMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
      surchargePercentage: '2',
    });
    expect(amounts).toMatchObject({
      discountNet: '20.0000',
      bonusNet: '10.0000',
      surchargeNet: '4.0000',
      lineNetTotal: '174.0000',
    });
    expect(
      calculateSupplierInvoiceTax({
        netTotal: new Decimal('174'),
        taxTotal: '0',
        taxMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
        taxPercentage: '21',
      }),
    ).toMatchObject({ taxTotal: '36.5400', taxPercentage: '21.0000' });
  });

  it('partitions base cumulatively and closes exactly on the last allocation', () => {
    const first = calculateSupplierInvoiceAllocation({
      receivedQtyPurchaseUnit: '3.0000',
      receivedQtyBase: '1.00',
      previouslyAllocatedQtyPurchaseUnit: '0',
      previouslyAllocatedQtyBase: '0',
      invoicedQtyPurchaseUnit: '1.0000',
    });
    const second = calculateSupplierInvoiceAllocation({
      receivedQtyPurchaseUnit: '3.0000',
      receivedQtyBase: '1.00',
      previouslyAllocatedQtyPurchaseUnit: '1.0000',
      previouslyAllocatedQtyBase: first.allocatedReceivedQtyBase,
      invoicedQtyPurchaseUnit: '2.0000',
    });
    expect(first.allocatedReceivedQtyBase).toBe('0.33');
    expect(first.quantityStatus).toBe(SupplierInvoiceQuantityStatus.PARCIAL);
    expect(second.allocatedReceivedQtyBase).toBe('0.67');
    expect(second.pendingQtyAfter).toBe('0.0000');
    expect(second.quantityStatus).toBe(SupplierInvoiceQuantityStatus.EXACTA);
  });

  it('records excess but allocates only the available receipt quantity', () => {
    expect(
      calculateSupplierInvoiceAllocation({
        receivedQtyPurchaseUnit: '10',
        receivedQtyBase: '100',
        previouslyAllocatedQtyPurchaseUnit: '8',
        previouslyAllocatedQtyBase: '80',
        invoicedQtyPurchaseUnit: '5',
      }),
    ).toMatchObject({
      availableQtyBefore: '2.0000',
      allocatedReceivedQtyPurchaseUnit: '2.0000',
      allocatedReceivedQtyBase: '20.00',
      pendingQtyAfter: '0.0000',
      quantityExcess: '3.0000',
      quantityStatus: SupplierInvoiceQuantityStatus.EXCEDIDA,
    });
  });

  it('rejects negative totals, invalid tax and inconsistent prior allocation', () => {
    expect(() =>
      calculateSupplierInvoiceAmounts({
        invoicedQty: '1',
        unitPriceNet: '10',
        discountNet: '11',
      }),
    ).toThrow(BadRequestException);
    expect(() => normalizeSupplierInvoiceTaxTotal('-1')).toThrow(
      BadRequestException,
    );
    expect(() =>
      calculateSupplierInvoiceAllocation({
        receivedQtyPurchaseUnit: '1',
        receivedQtyBase: '1',
        previouslyAllocatedQtyPurchaseUnit: '2',
        previouslyAllocatedQtyBase: '0',
        invoicedQtyPurchaseUnit: '1',
      }),
    ).toThrow(ConflictException);
  });
});
