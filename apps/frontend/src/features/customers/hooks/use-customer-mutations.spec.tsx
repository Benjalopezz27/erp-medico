import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomerDocumentType, TaxCondition } from '@erp/shared-types';
import * as api from '../api/customers.api';
import { customerKeys } from './customer-keys';
import { useUpdateCustomerMutation } from './use-customer-mutations';

vi.mock('../api/customers.api');

const customer = {
  id: '10000000-0000-4000-8000-000000000001',
  businessName: 'Farmacia Central',
  documentType: CustomerDocumentType.DNI,
  cuitOrDni: '35123456',
  taxCondition: TaxCondition.CONSUMIDOR_FINAL,
  email: null,
  phone: null,
  address: null,
  creditLimit: '0.00',
  generalDiscountPercentage: '0.0000',
  isActive: true,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

describe('customer mutations', () => {
  it('writes the authoritative detail and invalidates customer lists', async () => {
    const updated = { ...customer, phone: '351-555-0101' };
    vi.mocked(api.updateCustomerApi).mockResolvedValue(updated);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateCustomerMutation(), { wrapper });
    await act(() =>
      result.current.mutateAsync({ id: customer.id, payload: { phone: updated.phone } }),
    );
    expect(queryClient.getQueryData(customerKeys.detail(customer.id))).toEqual(updated);
    await waitFor(() =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: customerKeys.lists(),
      }),
    );
  });
});
