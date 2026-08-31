import { describe, expect, it } from 'vitest';
import { PaymentMethod } from '@erp/shared-types';
import { posSaleSchema, validateSaleSearchParams } from './sales.schema';

const productId = '30000000-0000-4000-8000-000000000001';
const customerId = '10000000-0000-4000-8000-000000000001';

describe('sales schemas', () => {
  it('accepts anonymous cash and rejects invalid credit conditions', () => {
    expect(
      posSaleSchema.safeParse({
        customerId: null,
        isCreditSale: false,
        requiresFiscalInvoice: false,
        paymentMethod: PaymentMethod.EFECTIVO,
        items: [{ productId, quantityBase: 1.25 }],
      }).success,
    ).toBe(true);
    const invalid = posSaleSchema.safeParse({
      customerId: null,
      isCreditSale: true,
      requiresFiscalInvoice: false,
      paymentMethod: PaymentMethod.EFECTIVO,
      items: [{ productId, quantityBase: 1 }],
    });
    expect(invalid.success).toBe(false);
  });

  it('requires two-decimal quantities and the current-account contract for credit', () => {
    expect(
      posSaleSchema.safeParse({
        customerId,
        isCreditSale: true,
        requiresFiscalInvoice: true,
        paymentMethod: PaymentMethod.CTA_CTE,
        items: [{ productId, quantityBase: 1.001 }],
      }).success,
    ).toBe(false);
    expect(
      posSaleSchema.safeParse({
        customerId,
        isCreditSale: true,
        requiresFiscalInvoice: true,
        paymentMethod: PaymentMethod.CTA_CTE,
        items: [{ productId, quantityBase: 1.01 }],
      }).success,
    ).toBe(true);
  });

  it('normalizes invalid list filters and inverted dates', () => {
    expect(
      validateSaleSearchParams({
        page: '-1',
        limit: '999',
        from: '2026-09-02',
        to: '2026-09-01',
        customerId: 'bad',
        status: 'BAD',
      }),
    ).toEqual({
      page: 1,
      limit: 20,
      from: undefined,
      to: undefined,
      customerId: undefined,
      status: undefined,
    });
    expect(validateSaleSearchParams({ from: '2026-02-31' }).from).toBeUndefined();
  });
});
