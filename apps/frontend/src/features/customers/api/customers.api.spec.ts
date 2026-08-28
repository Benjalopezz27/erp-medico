import { http, HttpResponse } from 'msw';
import { CustomerDocumentType, TaxCondition } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { getCustomersApi, reactivateCustomerApi } from './customers.api';

const customer = {
  id: '10000000-0000-4000-8000-000000000001',
  businessName: 'Cliente inactivo',
  documentType: CustomerDocumentType.DNI,
  cuitOrDni: '35123456',
  taxCondition: TaxCondition.CONSUMIDOR_FINAL,
  email: null,
  phone: null,
  address: null,
  creditLimit: '0.00',
  generalDiscountPercentage: '0.0000',
  isActive: false,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

describe('customers API', () => {
  it('preserves the explicit inactive filter', async () => {
    server.use(
      http.get('*/api/v1/customers', ({ request }) => {
        expect(new URL(request.url).searchParams.get('isActive')).toBe('false');
        return HttpResponse.json({
          data: [customer],
          meta: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
      }),
    );
    expect((await getCustomersApi({ page: 1, limit: 10, isActive: false })).data).toEqual([
      customer,
    ]);
  });

  it('uses the dedicated customer reactivation endpoint without a body contract', async () => {
    server.use(
      http.patch('*/api/v1/customers/:id/reactivate', ({ params }) => {
        expect(params.id).toBe(customer.id);
        return HttpResponse.json({ ...customer, isActive: true });
      }),
    );
    expect((await reactivateCustomerApi(customer.id)).isActive).toBe(true);
  });
});
