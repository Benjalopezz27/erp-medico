import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  usePurchaseOrdersListQuery,
  usePurchaseOrderDetailQuery,
  useSupplierProductsInfiniteQuery,
} from './use-purchase-orders-query';
import * as api from '../api/purchase-orders.api';
import * as supplierProductApi from '@/features/supplier-products/api/supplier-products.api';

vi.mock('../api/purchase-orders.api');
vi.mock('@/features/supplier-products/api/supplier-products.api');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('Purchase Orders Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePurchaseOrdersListQuery', () => {
    it('fetches list of purchase orders', async () => {
      const mockData = { data: [{ id: 'po-1' }], meta: { total: 1 } };
      vi.spyOn(api, 'getPurchaseOrdersApi').mockResolvedValueOnce(mockData as any);

      const { result } = renderHook(() => usePurchaseOrdersListQuery({ page: 1, limit: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('usePurchaseOrderDetailQuery', () => {
    it('fetches purchase order detail by ID', async () => {
      const mockDetail = { id: 'po-1', orderNumber: 'OC-000001' };
      vi.spyOn(api, 'getPurchaseOrderByIdApi').mockResolvedValueOnce(mockDetail as any);

      const { result } = renderHook(() => usePurchaseOrderDetailQuery('po-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockDetail);
    });

    it('does not execute when ID is empty', () => {
      const { result } = renderHook(() => usePurchaseOrderDetailQuery(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useSupplierProductsInfiniteQuery', () => {
    it('fetches infinite catalog pages', async () => {
      const mockPage1 = {
        data: [{ id: 'sp-1' }],
        meta: { page: 1, limit: 20, total: 25, totalPages: 2, hasNextPage: true },
      };
      vi.spyOn(supplierProductApi, 'getSupplierProductsApi').mockResolvedValueOnce(
        mockPage1 as any,
      );

      const { result } = renderHook(() => useSupplierProductsInfiniteQuery('supplier-1', 'med'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.pages[0]).toEqual(mockPage1);
      expect(result.current.hasNextPage).toBe(true);
    });
  });
});
