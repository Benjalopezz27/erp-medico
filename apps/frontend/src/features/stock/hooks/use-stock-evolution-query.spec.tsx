import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useStockEvolutionQuery } from './use-stock-evolution-query';
import * as stockApi from '../api/stock.api';
import { StockMovementType } from '../types/stock.types';

vi.mock('../api/stock.api', () => ({
  getStockEvolutionApi: vi.fn(),
}));

describe('useStockEvolutionQuery Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches and returns evolution time series data successfully', async () => {
    const mockData = {
      productId: 'prod-1',
      minStock: 50,
      truncated: false,
      effectiveFrom: '2026-08-20T10:00:00.000Z',
      effectiveTo: '2026-08-24T12:00:00.000Z',
      points: [
        {
          timestamp: '2026-08-20T10:00:00.000Z',
          balance: 0,
          event: 'BASELINE' as const,
          quantity: 0,
        },
        {
          timestamp: '2026-08-20T10:00:00.000Z',
          balance: 50,
          event: StockMovementType.ENTRADA_COMPRA,
          quantity: 50,
        },
      ],
    };

    vi.mocked(stockApi.getStockEvolutionApi).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useStockEvolutionQuery('prod-1', { limit: 50 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(stockApi.getStockEvolutionApi).toHaveBeenCalledWith('prod-1', {
      limit: 50,
    });
  });
});
