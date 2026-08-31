import { describe, expect, it } from 'vitest';
import {
  CustomerPricingRuleApplied,
  PaymentMethod,
  ProductTaxTreatment,
  SaleReturnItemQuality,
  SaleStatus,
  type ISale,
  type ISaleReturn,
} from '@erp/shared-types';
import {
  calculateRemainingQuantities,
  summarizeReturnDestinations,
} from './sales-returns-math.utils';

const mockSale: ISale = {
  id: 'sale-1',
  saleNumber: 'V-00000001',
  customerId: null,
  customer: null,
  user: { id: 'u1', name: 'Vendedor' },
  status: SaleStatus.CONFIRMADA,
  isCreditSale: false,
  requiresFiscalInvoice: false,
  paymentMethod: PaymentMethod.EFECTIVO,
  totalNet: '100.00',
  taxableNet: '100.00',
  exemptAmount: '0.00',
  nonTaxedAmount: '0.00',
  ivaTotal: '21.00',
  totalGross: '121.00',
  userId: 'u1',
  fiscalDocument: null,
  accountReceivable: null,
  createdAt: '2026-08-31T12:00:00Z',
  updatedAt: '2026-08-31T12:00:00Z',
  items: [
    {
      id: 'item-1',
      saleId: 'sale-1',
      productId: 'prod-1',
      itemIndex: 0,
      quantityBase: 10,
      catalogPriceNet: '10.00',
      pricingRuleApplied: CustomerPricingRuleApplied.CATALOG_PRICE,
      pricingRuleId: null,
      discountPercentage: null,
      discountAmountNet: '0.00',
      unitPriceNet: '10.00',
      subtotalNet: '100.00',
      taxTreatment: ProductTaxTreatment.GRAVADO,
      ivaPercentage: '21.00',
      ivaAmount: '21.00',
      subtotalGross: '121.00',
      product: { id: 'prod-1', internalCode: 'P1', name: 'Producto 1' },
    },
    {
      id: 'item-2',
      saleId: 'sale-1',
      productId: 'prod-2',
      itemIndex: 1,
      quantityBase: 5,
      catalogPriceNet: '20.00',
      pricingRuleApplied: CustomerPricingRuleApplied.CATALOG_PRICE,
      pricingRuleId: null,
      discountPercentage: null,
      discountAmountNet: '0.00',
      unitPriceNet: '20.00',
      subtotalNet: '100.00',
      taxTreatment: ProductTaxTreatment.GRAVADO,
      ivaPercentage: '21.00',
      ivaAmount: '21.00',
      subtotalGross: '121.00',
      product: { id: 'prod-2', internalCode: 'P2', name: 'Producto 2' },
    },
  ],
};

describe('sales-returns-math.utils', () => {
  it('calculates full remaining quantities when no returns exist', () => {
    const lines = calculateRemainingQuantities(mockSale, []);
    expect(lines).toHaveLength(2);
    expect(lines[0].soldQuantity).toBe(10);
    expect(lines[0].returnedQuantity).toBe(0);
    expect(lines[0].remainingQuantity).toBe(10);
    expect(lines[1].soldQuantity).toBe(5);
    expect(lines[1].returnedQuantity).toBe(0);
    expect(lines[1].remainingQuantity).toBe(5);
  });

  it('subtracts previously returned quantities accurately with Decimal.js', () => {
    const mockReturns: ISaleReturn[] = [
      {
        id: 'ret-1',
        saleId: 'sale-1',
        userId: 'u1',
        user: { id: 'u1', name: 'Vendedor' },
        reason: 'Primera devolución',
        taxableNet: '30.00',
        exemptAmount: '0.00',
        nonTaxedAmount: '0.00',
        totalNet: '30.00',
        ivaTotal: '6.30',
        totalGross: '36.30',
        fiscalDocument: null,
        createdAt: '2026-08-31T13:00:00Z',
        items: [
          {
            id: 'ri-1',
            saleReturnId: 'ret-1',
            saleItemId: 'item-1',
            productId: 'prod-1',
            quantityBase: 3.5,
            unitPriceNet: '10.00',
            subtotalNet: '35.00',
            taxTreatment: ProductTaxTreatment.GRAVADO,
            ivaPercentage: '21.00',
            ivaAmount: '7.35',
            subtotalGross: '42.35',
            quality: SaleReturnItemQuality.APTO,
            notes: null,
            stockMovementId: null,
            quarantineStockId: null,
            product: { id: 'prod-1', internalCode: 'P1', name: 'Producto 1' },
            createdAt: '2026-08-31T13:00:00Z',
          },
        ],
      },
      {
        id: 'ret-2',
        saleId: 'sale-1',
        userId: 'u1',
        user: { id: 'u1', name: 'Vendedor' },
        reason: 'Segunda devolución',
        taxableNet: '10.00',
        exemptAmount: '0.00',
        nonTaxedAmount: '0.00',
        totalNet: '10.00',
        ivaTotal: '2.10',
        totalGross: '12.10',
        fiscalDocument: null,
        createdAt: '2026-08-31T14:00:00Z',
        items: [
          {
            id: 'ri-2',
            saleReturnId: 'ret-2',
            saleItemId: 'item-1',
            productId: 'prod-1',
            quantityBase: 2.5,
            unitPriceNet: '10.00',
            subtotalNet: '25.00',
            taxTreatment: ProductTaxTreatment.GRAVADO,
            ivaPercentage: '21.00',
            ivaAmount: '5.25',
            subtotalGross: '30.25',
            quality: SaleReturnItemQuality.NO_APTO,
            notes: null,
            stockMovementId: null,
            quarantineStockId: null,
            product: { id: 'prod-1', internalCode: 'P1', name: 'Producto 1' },
            createdAt: '2026-08-31T14:00:00Z',
          },
          {
            id: 'ri-3',
            saleReturnId: 'ret-2',
            saleItemId: 'item-2',
            productId: 'prod-2',
            quantityBase: 5,
            unitPriceNet: '20.00',
            subtotalNet: '100.00',
            taxTreatment: ProductTaxTreatment.GRAVADO,
            ivaPercentage: '21.00',
            ivaAmount: '21.00',
            subtotalGross: '121.00',
            quality: SaleReturnItemQuality.APTO,
            notes: null,
            stockMovementId: null,
            quarantineStockId: null,
            product: { id: 'prod-2', internalCode: 'P2', name: 'Producto 2' },
            createdAt: '2026-08-31T14:00:00Z',
          },
        ],
      },
    ];

    const lines = calculateRemainingQuantities(mockSale, mockReturns);
    expect(lines[0].returnedQuantity).toBe(6);
    expect(lines[0].remainingQuantity).toBe(4);
    expect(lines[1].returnedQuantity).toBe(5);
    expect(lines[1].remainingQuantity).toBe(0);
  });

  it('summarizes destinations properly for mixed APTO and NO_APTO selections', () => {
    const summary = summarizeReturnDestinations([
      { quantityBase: 3, quality: SaleReturnItemQuality.APTO, selected: true },
      { quantityBase: 2, quality: SaleReturnItemQuality.NO_APTO, selected: true },
      { quantityBase: 5, quality: SaleReturnItemQuality.APTO, selected: false },
    ]);

    expect(summary.totalUnits).toBe(5);
    expect(summary.aptoUnits).toBe(3);
    expect(summary.noAptoUnits).toBe(2);
  });
});
