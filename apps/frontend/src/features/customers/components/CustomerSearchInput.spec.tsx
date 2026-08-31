import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { CustomerDocumentType, TaxCondition } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { renderWithProviders } from '@/test/test-utils';
import { CustomerSearchInput } from './CustomerSearchInput';

describe('CustomerSearchInput', () => {
  it('searches active customers and supports keyboard selection', async () => {
    server.use(
      http.get('*/api/v1/customers', ({ request }) => {
        expect(new URL(request.url).searchParams.get('isActive')).toBe('true');
        return HttpResponse.json({
          data: [
            {
              id: '10000000-0000-4000-8000-000000000001',
              businessName: 'Farmacia Sur',
              documentType: CustomerDocumentType.CUIT,
              cuitOrDni: '30123456789',
              taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
              email: null,
              phone: null,
              address: null,
              creditLimit: '0.00',
              generalDiscountPercentage: '0.0000',
              isActive: true,
              createdAt: '2026-08-01',
              updatedAt: '2026-08-01',
            },
          ],
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
    const onSelect = vi.fn();
    const { user } = renderWithProviders(<CustomerSearchInput value={null} onSelect={onSelect} />);
    const input = screen.getByRole('combobox');
    await user.type(input, 'Farmacia');
    expect(await screen.findByText('Farmacia Sur')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ businessName: 'Farmacia Sur' }),
    );
  });
});
