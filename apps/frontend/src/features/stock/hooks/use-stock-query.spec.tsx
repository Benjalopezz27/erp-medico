import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useStockQuery } from './use-stock-query';
import * as stockApi from '../api/stock.api';
import { StockStatus, ProductStatus } from '../types/stock.types';

vi.mock('../api/stock.api', () => ({
  getStockOverviewApi: vi.fn(),
}));

describe('useStockQuery Hook', () => {
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

  it('fetches and returns paginated stock data successfully', async () => {
    const mockData = {
      items: [
        {
          productId: 'prod-1',
          internalCode: 'P0001',
          productName: 'Paracetamol 500mg',
          category: { id: 'cat-1', name: 'Farmacia' },
          baseUnit: { id: 'unit-1', name: 'Unidad', symbol: 'u' },
          currentBaseStock: 100,
          minStock: 50,
          stockStatus: StockStatus.NORMAL,
          status: ProductStatus.ACTIVE,
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
    };

    vi.mocked(stockApi.getStockOverviewApi).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useStockQuery({ page: 1, limit: 10 }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(stockApi.getStockOverviewApi).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
  });

  it('passes alertsOnly parameter to getStockOverviewApi', async () => {
    const mockData = {
      items: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    vi.mocked(stockApi.getStockOverviewApi).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useStockQuery({ page: 1, limit: 10, alertsOnly: true }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(stockApi.getStockOverviewApi).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      alertsOnly: true,
    });
  });
});
