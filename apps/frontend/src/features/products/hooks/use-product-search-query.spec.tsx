import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useProductSearchQuery } from './use-product-search-query';
import * as productsApi from '../api/products.api';

vi.mock('../api/products.api');

describe('useProductSearchQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('does not fire request if search term length < 2', () => {
    const { result } = renderHook(() => useProductSearchQuery('a'), { wrapper });
    expect(result.current.isFetching).toBe(false);
    expect(productsApi.searchProductsTypeaheadApi).not.toHaveBeenCalled();
  });

  it('fires search request when search term length >= 2 and returns results', async () => {
    const mockResults = [
      {
        id: 'p-1',
        internalCode: 'P0001',
        name: 'Ibuprofeno 400mg',
        baseUnit: { id: 'u-1', name: 'Unidad', symbol: 'u' },
        currentStock: null,
        activePriceNet: 1200,
      },
    ];

    vi.mocked(productsApi.searchProductsTypeaheadApi).mockResolvedValueOnce(mockResults);

    const { result } = renderHook(() => useProductSearchQuery('Ibu'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(productsApi.searchProductsTypeaheadApi).toHaveBeenCalledWith(
      { q: 'Ibu', limit: 10 },
      expect.any(AbortSignal),
    );
    expect(result.current.data).toEqual(mockResults);
  });
});
