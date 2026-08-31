import React from 'react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { SaleReturnItemQuality } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { useSaleReturnsQuery } from './use-sale-returns-query';
import { useCreateSaleReturnMutation } from './use-create-sale-return-mutation';
import { salesKeys } from './sales-keys';

const saleId = '40000000-0000-4000-8000-000000000001';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe('sale returns hooks', () => {
  it('useSaleReturnsQuery fetches and returns list of returns', async () => {
    server.use(
      http.get(`*/api/v1/sales/${saleId}/returns`, () => {
        return HttpResponse.json([{ id: 'ret-1', saleId, reason: 'Devolución parcial' }]);
      }),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useSaleReturnsQuery(saleId), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].reason).toBe('Devolución parcial');
  });

  it('useCreateSaleReturnMutation invalidates sale detail and returns queries on success', async () => {
    server.use(
      http.post(`*/api/v1/sales/${saleId}/returns`, () => {
        return HttpResponse.json({ id: 'ret-1', saleId }, { status: 201 });
      }),
    );

    const { queryClient, wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateSaleReturnMutation(saleId), { wrapper });

    await result.current.mutateAsync({
      reason: 'Devolución aprobada',
      items: [
        {
          saleItemId: '60000000-0000-4000-8000-000000000001',
          quantityBase: 1,
          quality: SaleReturnItemQuality.APTO,
        },
      ],
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: salesKeys.detail(saleId) });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: salesKeys.returns(saleId) });
  });
});
