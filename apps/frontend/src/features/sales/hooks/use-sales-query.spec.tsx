import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArcaStatus } from '@erp/shared-types';
import type { ISale } from '@erp/shared-types';
import * as api from '../api/sales.api';
import { useSaleDetailQuery } from './use-sales-query';

vi.mock('../api/sales.api');

function wrapperFor(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function buildSale(arcaStatus: ArcaStatus | null): ISale {
  return {
    id: 'sale-1',
    fiscalDocument: arcaStatus ? ({ arcaStatus } as ISale['fiscalDocument']) : null,
  } as ISale;
}

describe('useSaleDetailQuery', () => {
  it('keeps polling while the fiscal document is PENDIENTE_FACTURACION (bug #236)', async () => {
    vi.mocked(api.getSaleByIdApi).mockResolvedValue(buildSale(ArcaStatus.PENDIENTE_FACTURACION));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useSaleDetailQuery('sale-1'), {
      wrapper: wrapperFor(queryClient),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: ['sales', 'detail', 'sale-1'] })!;
    const refetchInterval = (
      query.options as { refetchInterval: (q: typeof query) => number | false }
    ).refetchInterval;
    expect(refetchInterval(query)).toBe(5000);
  });

  it('stops polling once the fiscal document resolves to EMITIDO', async () => {
    vi.mocked(api.getSaleByIdApi).mockResolvedValue(buildSale(ArcaStatus.EMITIDO));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useSaleDetailQuery('sale-1'), {
      wrapper: wrapperFor(queryClient),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: ['sales', 'detail', 'sale-1'] })!;
    const refetchInterval = (
      query.options as { refetchInterval: (q: typeof query) => number | false }
    ).refetchInterval;
    expect(refetchInterval(query)).toBe(false);
  });

  it('does not poll a sale without a fiscal document', async () => {
    vi.mocked(api.getSaleByIdApi).mockResolvedValue(buildSale(null));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useSaleDetailQuery('sale-1'), {
      wrapper: wrapperFor(queryClient),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: ['sales', 'detail', 'sale-1'] })!;
    const refetchInterval = (
      query.options as { refetchInterval: (q: typeof query) => number | false }
    ).refetchInterval;
    expect(refetchInterval(query)).toBe(false);
  });
});
