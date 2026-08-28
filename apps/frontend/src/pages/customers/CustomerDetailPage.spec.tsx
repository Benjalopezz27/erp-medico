import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import { CustomerDocumentType, TaxCondition, UserRole } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { createTestRouter, renderWithRouter } from '@/test/test-utils';
import { useAuthStore } from '@/stores/authStore';
import { CustomerDetailPage } from './CustomerDetailPage';

const customer = {
  id: '10000000-0000-4000-8000-000000000001',
  businessName: 'Farmacia Central',
  documentType: CustomerDocumentType.CUIT,
  cuitOrDni: '30500010912',
  taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
  email: 'cliente@example.com',
  phone: '+54 351-555-0101',
  address: 'Av. Central 123',
  creditLimit: '2500.00',
  isActive: true,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

describe('CustomerDetailPage', () => {
  it('shows real customer information without fabricating account balances', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'test-token',
      user: {
        id: '20000000-0000-4000-8000-000000000001',
        name: 'Seller',
        email: 'seller@example.com',
        role: UserRole.VENDEDOR,
        isActive: true,
      },
    });
    server.use(http.get('*/api/v1/customers/:id', () => HttpResponse.json(customer)));
    const router = createTestRouter(
      [
        { path: '/customers', component: () => <div>Lista</div> },
        { path: '/customers/$id', component: CustomerDetailPage },
      ],
      `/customers/${customer.id}`,
    );
    renderWithRouter({ router });
    expect(await screen.findByRole('heading', { name: customer.businessName })).toBeInTheDocument();
    expect(screen.getByText(/no es un saldo ni crédito disponible/i)).toBeInTheDocument();
    expect(screen.queryByText(/saldo actual/i)).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /precios especiales/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /desactivar/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: customer.email })).toHaveAttribute(
      'href',
      'mailto:cliente%40example.com',
    );
  });
});
