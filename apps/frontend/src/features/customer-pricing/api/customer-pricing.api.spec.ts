import { http, HttpResponse } from 'msw';
import { CustomerSpecialPriceMode } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import {
  createCustomerSpecialPriceApi,
  deleteCustomerSpecialPriceApi,
  getAllCustomerSpecialPriceProductIdsApi,
  getCustomerSpecialPricesApi,
  resolveCustomerPriceApi,
  updateCustomerSpecialPriceApi,
} from './customer-pricing.api';

const customerId = '10000000-0000-4000-8000-000000000001';
const ruleId = '20000000-0000-4000-8000-000000000001';
const productId = '30000000-0000-4000-8000-000000000001';
const rule = {
  id: ruleId,
  customerId,
  productId,
  productCode: 'P001',
  productName: 'Jeringa',
  activeCatalogPriceNet: '100.00',
  mode: CustomerSpecialPriceMode.FIXED_PRICE,
  specialPriceNet: '80.00',
  discountPercentage: null,
  finalPriceNet: '80.00',
  version: 1,
  createdAt: '2026-08-28',
  updatedAt: '2026-08-28',
};

describe('customer pricing API', () => {
  it('sends trimmed filters and reads the paginated contract', async () => {
    server.use(
      http.get('*/api/v1/customers/:customerId/special-prices', ({ request }) => {
        const params = new URL(request.url).searchParams;
        expect(params.get('search')).toBe('jeri');
        expect(params.get('page')).toBe('2');
        return HttpResponse.json({
          data: [rule],
          meta: {
            total: 1,
            page: 2,
            limit: 10,
            totalPages: 2,
            hasNextPage: false,
            hasPreviousPage: true,
          },
        });
      }),
    );
    expect(
      (await getCustomerSpecialPricesApi(customerId, { page: 2, search: ' jeri ' })).data,
    ).toEqual([rule]);
  });

  it('keeps create and update payloads mutually exclusive and versioned', async () => {
    server.use(
      http.post('*/api/v1/customers/:customerId/special-prices', async ({ request }) => {
        expect(await request.json()).toEqual({
          productId,
          mode: CustomerSpecialPriceMode.FIXED_PRICE,
          specialPriceNet: '80.00',
        });
        return HttpResponse.json(rule, { status: 201 });
      }),
      http.patch('*/api/v1/customers/:customerId/special-prices/:id', async ({ request }) => {
        expect(await request.json()).toEqual({
          mode: CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE,
          discountPercentage: '10.0000',
          expectedVersion: 1,
        });
        return HttpResponse.json({ ...rule, mode: CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE });
      }),
    );
    await createCustomerSpecialPriceApi(customerId, {
      productId,
      mode: CustomerSpecialPriceMode.FIXED_PRICE,
      specialPriceNet: '80.00',
    });
    await updateCustomerSpecialPriceApi(customerId, ruleId, {
      mode: CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE,
      discountPercentage: '10.0000',
      expectedVersion: 1,
    });
  });

  it('deletes the rule and resolves the authoritative fallback', async () => {
    server.use(
      http.delete(
        '*/api/v1/customers/:customerId/special-prices/:id',
        () => new HttpResponse(null, { status: 204 }),
      ),
      http.get('*/api/v1/customers/:customerId/special-prices/resolve/:productId', () =>
        HttpResponse.json({
          customerId,
          customerBusinessName: 'Cliente',
          productId,
          productCode: 'P001',
          productName: 'Jeringa',
          basePriceNet: '100.00',
          ruleApplied: 'CATALOG_PRICE',
          ruleId: null,
          discountPercentage: null,
          discountAmountNet: null,
          finalPriceNet: '100.00',
        }),
      ),
    );
    await expect(deleteCustomerSpecialPriceApi(customerId, ruleId)).resolves.toBeUndefined();
    expect((await resolveCustomerPriceApi(customerId, productId)).finalPriceNet).toBe('100.00');
  });

  it('collects configured product ids across every page for selector exclusion', async () => {
    server.use(
      http.get('*/api/v1/customers/:customerId/special-prices', ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        return HttpResponse.json({
          data: [{ ...rule, productId: `product-${page}` }],
          meta: {
            total: 2,
            page,
            limit: 100,
            totalPages: 2,
            hasNextPage: page === 1,
            hasPreviousPage: page === 2,
          },
        });
      }),
    );
    await expect(getAllCustomerSpecialPriceProductIdsApi(customerId)).resolves.toEqual([
      'product-1',
      'product-2',
    ]);
  });
});
