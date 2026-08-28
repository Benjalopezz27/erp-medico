import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { CustomerDocumentType, TaxCondition, UserRole } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/test-utils';
import { useAuthStore } from '@/stores/authStore';
import { CustomerFormModal } from './CustomerFormModal';

const customer = {
  id: '10000000-0000-4000-8000-000000000001',
  businessName: 'Farmacia Central',
  documentType: CustomerDocumentType.DNI,
  cuitOrDni: '35123456',
  taxCondition: TaxCondition.CONSUMIDOR_FINAL,
  email: 'cliente@example.com',
  phone: '351-555-0101',
  address: 'Av. Central 123',
  creditLimit: '100.00',
  generalDiscountPercentage: '0.0000',
  isActive: true,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

function authenticate(role: UserRole) {
  useAuthStore.setState({
    isAuthenticated: true,
    token: 'test-token',
    user: {
      id: '20000000-0000-4000-8000-000000000001',
      name: 'Test',
      email: 'test@example.com',
      role,
      isActive: true,
    },
  });
}

describe('CustomerFormModal', () => {
  it('lets a seller update operational data without sending sensitive fields', async () => {
    authenticate(UserRole.VENDEDOR);
    let body: unknown;
    server.use(
      http.patch('*/api/v1/customers/:id', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...customer, phone: '351-555-9999' });
      }),
    );
    const onSuccess = vi.fn();
    const view = renderWithProviders(
      <CustomerFormModal
        isOpen
        mode="edit"
        customer={customer}
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );
    expect(await screen.findByText(/solo lectura para vendedores/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/límite de crédito/i)).not.toBeInTheDocument();
    const phone = screen.getByLabelText('Teléfono');
    await view.user.clear(phone);
    await view.user.type(phone, '351-555-9999');
    await view.user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(body).toEqual({ phone: '351-555-9999' });
  });

  it('stops an empty delta before making a request', async () => {
    authenticate(UserRole.ADMINISTRADOR);
    let requests = 0;
    server.use(
      http.patch('*/api/v1/customers/:id', () => {
        requests += 1;
        return HttpResponse.json(customer);
      }),
    );
    const view = renderWithProviders(
      <CustomerFormModal
        isOpen
        mode="edit"
        customer={customer}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    await screen.findByDisplayValue('Farmacia Central');
    await view.user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('No se detectaron cambios para guardar.')).toBeInTheDocument();
    expect(requests).toBe(0);
  });

  it('keeps the form open and marks a duplicated document from a stable 409', async () => {
    authenticate(UserRole.ADMINISTRADOR);
    server.use(
      http.patch('*/api/v1/customers/:id', () =>
        HttpResponse.json(
          {
            code: 'CUSTOMER_DOCUMENT_ALREADY_EXISTS',
            message: 'Ya existe un cliente registrado con ese documento.',
          },
          { status: 409 },
        ),
      ),
    );
    const view = renderWithProviders(
      <CustomerFormModal
        isOpen
        mode="edit"
        customer={customer}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    const document = await screen.findByLabelText(/DNI o CUIT/);
    await view.user.clear(document);
    await view.user.type(document, '35.123.457');
    await view.user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(
      await screen.findByText('Ya existe un cliente registrado con este DNI o CUIT.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
