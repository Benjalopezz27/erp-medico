import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { CustomerDocumentType, TaxCondition, UserRole } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { useAuthStore } from '@/stores/authStore';
import { validateCustomerSearchParams } from '@/router';
import { CustomersListPage } from './CustomersListPage';

const customers = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    businessName: 'Cliente activo',
    documentType: CustomerDocumentType.DNI,
    cuitOrDni: '35123456',
    taxCondition: TaxCondition.CONSUMIDOR_FINAL,
    email: null,
    phone: null,
    address: null,
    creditLimit: '0.00',
    isActive: true,
    createdAt: '2026-08-28T00:00:00.000Z',
    updatedAt: '2026-08-28T00:00:00.000Z',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    businessName: 'Cliente inactivo',
    documentType: CustomerDocumentType.DNI,
    cuitOrDni: '35123457',
    taxCondition: TaxCondition.CONSUMIDOR_FINAL,
    email: null,
    phone: null,
    address: null,
    creditLimit: '0.00',
    isActive: false,
    createdAt: '2026-08-28T00:00:00.000Z',
    updatedAt: '2026-08-28T00:00:00.000Z',
  },
];

describe('CustomersListPage', () => {
  it('navigates between active and inactive URL-backed lists without a global reload', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'test-token',
      user: {
        id: 'admin-id',
        name: 'Admin',
        email: 'admin@example.com',
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      },
    });
    server.use(
      http.get('*/api/v1/customers', ({ request }) => {
        const active = new URL(request.url).searchParams.get('isActive') !== 'false';
        const data = customers.filter((customer) => customer.isActive === active);
        return HttpResponse.json({
          data,
          meta: {
            total: data.length,
            page: 1,
            limit: 10,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
      }),
    );
    const router = createTestRouter(
      [
        {
          path: '/customers',
          component: CustomersListPage,
          validateSearch: validateCustomerSearchParams,
        },
        { path: '/customers/$id', component: () => <div>Detalle</div> },
      ],
      '/customers?page=1&limit=10&isActive=true',
    );
    const view = renderWithRouter({ router });
    expect(await screen.findByText('Cliente activo')).toBeInTheDocument();
    await view.user.click(screen.getByRole('button', { name: 'Inactivos' }));
    expect(await screen.findByText('Cliente inactivo')).toBeInTheDocument();
    expect(screen.queryByText('Cliente activo')).not.toBeInTheDocument();
    await waitFor(() => expect(router.state.location.search.isActive).toBe(false));
  });

  it('offers an actionable retry when the list fails', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'test-token',
      user: {
        id: 'seller-id',
        name: 'Seller',
        email: 'seller@example.com',
        role: UserRole.VENDEDOR,
        isActive: true,
      },
    });
    server.use(http.get('*/api/v1/customers', () => HttpResponse.json({}, { status: 500 })));
    const router = createTestRouter(
      [
        {
          path: '/customers',
          component: CustomersListPage,
          validateSearch: validateCustomerSearchParams,
        },
        { path: '/customers/$id', component: () => <div>Detalle</div> },
      ],
      '/customers',
    );
    renderWithRouter({ router });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
