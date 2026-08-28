import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomerPricingRuleApplied } from '@erp/shared-types';
import * as api from '../api/customer-pricing.api';
import { customerPricingKeys } from './customer-pricing-keys';
import { useDeleteCustomerSpecialPriceMutation } from './use-customer-pricing-mutations';

vi.mock('../api/customer-pricing.api');

describe('customer pricing mutations', () => {
  it('deletes once, obtains the authoritative fallback and invalidates the customer scope', async () => {
    vi.mocked(api.deleteCustomerSpecialPriceApi).mockResolvedValue();
    vi.mocked(api.resolveCustomerPriceApi).mockResolvedValue({
      customerId: 'customer-1',
      customerBusinessName: 'Cliente',
      productId: 'product-1',
      productCode: 'P001',
      productName: 'Jeringa',
      basePriceNet: '100.00',
      ruleApplied: CustomerPricingRuleApplied.CATALOG_PRICE,
      ruleId: null,
      discountPercentage: null,
      discountAmountNet: null,
      finalPriceNet: '100.00',
    });
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useDeleteCustomerSpecialPriceMutation('customer-1'), {
      wrapper,
    });
    let response: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      response = await result.current.mutateAsync({ id: 'rule-1', productId: 'product-1' });
    });
    expect(api.deleteCustomerSpecialPriceApi).toHaveBeenCalledTimes(1);
    expect(response?.fallback?.ruleApplied).toBe(CustomerPricingRuleApplied.CATALOG_PRICE);
    await waitFor(() =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: customerPricingKeys.customer('customer-1'),
      }),
    );
  });
});
