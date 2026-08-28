import { http, HttpResponse } from 'msw';
import { CustomerDocumentType, CustomerSpecialPriceMode, TaxCondition } from '@erp/shared-types';
import { screen } from '@testing-library/react';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/test-utils';
import { CustomerPricingPanel } from './CustomerPricingPanel';

const customer = {
  id: '10000000-0000-4000-8000-000000000001',
  businessName: 'Farmacia Central',
  documentType: CustomerDocumentType.CUIT,
  cuitOrDni: '30500010912',
  taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
  email: null,
  phone: null,
  address: null,
  creditLimit: '0.00',
  generalDiscountPercentage: '5.0000',
  isActive: true,
  createdAt: '2026-08-28',
  updatedAt: '2026-08-28',
};
const rule = {
  id: '20000000-0000-4000-8000-000000000001',
  customerId: customer.id,
  productId: '30000000-0000-4000-8000-000000000001',
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

describe('CustomerPricingPanel', () => {
  it('shows catalog, authoritative final price and admin actions', async () => {
    server.use(
      http.get('*/api/v1/customers/:customerId/special-prices', () =>
        HttpResponse.json({
          data: [rule],
          meta: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        }),
      ),
    );
    renderWithProviders(<CustomerPricingPanel customer={customer} canManage />);
    expect(await screen.findByText('Jeringa')).toBeInTheDocument();
    expect(screen.getByText(/100,00/)).toBeInTheDocument();
    expect(screen.getAllByText(/80,00/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /nueva excepción/i })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: /editar precio especial para jeringa/i }),
    ).toBeEnabled();
  });

  it('keeps an inactive customer read-only', async () => {
    server.use(
      http.get('*/api/v1/customers/:customerId/special-prices', () =>
        HttpResponse.json({
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        }),
      ),
    );
    renderWithProviders(
      <CustomerPricingPanel customer={{ ...customer, isActive: false }} canManage />,
    );
    expect(
      await screen.findByText(/cliente inactivo: las condiciones comerciales/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nueva excepción/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /modificar/i })).toBeDisabled();
  });
});
