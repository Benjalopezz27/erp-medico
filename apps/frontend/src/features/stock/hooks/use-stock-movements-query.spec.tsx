import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useStockMovementsQuery } from './use-stock-movements-query';
import * as stockApi from '../api/stock.api';
import { StockStatus, ProductStatus, StockMovementType } from '../types/stock.types';

vi.mock('../api/stock.api', () => ({
  getProductMovementsApi: vi.fn(),
}));

describe('useStockMovementsQuery Hook', () => {
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

  it('fetches and returns product movements ledger successfully', async () => {
    const mockData = {
      product: {
        productId: 'prod-1',
        internalCode: 'P0001',
        productName: 'Paracetamol 500mg',
        status: ProductStatus.ACTIVE,
        category: { id: 'cat-1', name: 'Farmacia' },
        baseUnit: { id: 'unit-1', name: 'Unidad', symbol: 'u' },
        currentBaseStock: 100,
        minStock: 50,
        stockStatus: StockStatus.NORMAL,
      },
      items: [
        {
          id: 'mov-1',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: 50,
          previousStock: 50,
          subsequentStock: 100,
          reason: 'Compra inicial',
          documentReference: 'REM-001',
          user: { id: 'usr-1', name: 'Admin' },
          createdAt: '2026-08-24T12:00:00.000Z',
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

    vi.mocked(stockApi.getProductMovementsApi).mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useStockMovementsQuery('prod-1', { page: 1, limit: 10 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(stockApi.getProductMovementsApi).toHaveBeenCalledWith('prod-1', {
      page: 1,
      limit: 10,
    });
  });
});
