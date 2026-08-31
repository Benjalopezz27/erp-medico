import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { PaymentMethod, SaleStatus } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { createSaleApi, getSalesApi } from './sales.api';

const productId = '30000000-0000-4000-8000-000000000001';

describe('sales API', () => {
  it('maps date filters to inclusive local-day ISO boundaries', async () => {
    server.use(
      http.get('*/api/v1/sales', ({ request }) => {
        const params = new URL(request.url).searchParams;
        const from = new Date(params.get('from')!);
        const to = new Date(params.get('to')!);
        expect(from.getHours()).toBe(0);
        expect(to.getHours()).toBe(23);
        expect(to.getMinutes()).toBe(59);
        return HttpResponse.json({
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
      }),
    );
    await getSalesApi({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('sends only authoritative input fields when confirming', async () => {
    server.use(
      http.post('*/api/v1/sales', async ({ request }) => {
        expect(await request.json()).toEqual({
          customerId: null,
          isCreditSale: false,
          requiresFiscalInvoice: false,
          paymentMethod: PaymentMethod.EFECTIVO,
          items: [{ productId, quantityBase: 2 }],
        });
        return HttpResponse.json({ id: 'sale-1', status: SaleStatus.CONFIRMADA }, { status: 201 });
      }),
    );
    await createSaleApi({
      isCreditSale: false,
      requiresFiscalInvoice: false,
      paymentMethod: PaymentMethod.EFECTIVO,
      items: [{ productId, quantityBase: 2 }],
    });
  });
});
