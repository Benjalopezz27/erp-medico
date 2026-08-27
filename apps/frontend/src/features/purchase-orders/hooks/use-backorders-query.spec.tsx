import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBackordersQuery } from './use-backorders-query';
import * as api from '../api/purchase-orders.api';
import { backordersFixture } from '../testing/backorder-fixtures';
import { purchaseOrdersKeys } from './purchase-orders-keys';

vi.mock('../api/purchase-orders.api');

describe('useBackordersQuery', () => {
  it('loads backorders with a stable filter-specific query key', async () => {
    vi.spyOn(api, 'getBackordersApi').mockResolvedValueOnce(backordersFixture);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const filters = { search: 'gasa', urgentOnly: true };

    const { result } = renderHook(() => useBackordersQuery(filters), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.getBackordersApi).toHaveBeenCalledWith(filters, {
      signal: expect.any(AbortSignal),
    });
    expect(queryClient.getQueryData(purchaseOrdersKeys.backorderList(filters))).toEqual(
      backordersFixture,
    );
  });
});
