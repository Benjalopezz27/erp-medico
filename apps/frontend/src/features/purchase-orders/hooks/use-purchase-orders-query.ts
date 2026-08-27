import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getPurchaseOrdersApi, getPurchaseOrderByIdApi } from '../api/purchase-orders.api';
import { getSupplierProductsApi } from '@/features/supplier-products/api/supplier-products.api';
import { purchaseOrdersKeys } from './purchase-orders-keys';
import type { IPurchaseOrderSearchParams } from '../types/purchase-orders.types';

export function usePurchaseOrdersListQuery(params: IPurchaseOrderSearchParams) {
  return useQuery({
    queryKey: purchaseOrdersKeys.list(params),
    queryFn: ({ signal }) => getPurchaseOrdersApi(params, { signal }),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function usePurchaseOrderDetailQuery(id: string) {
  return useQuery({
    queryKey: purchaseOrdersKeys.detail(id),
    queryFn: ({ signal }) => getPurchaseOrderByIdApi(id, { signal }),
    enabled: Boolean(id),
    staleTime: 1000 * 60, // 60 seconds
  });
}

export function useSupplierProductsInfiniteQuery(supplierId: string, search?: string) {
  return useInfiniteQuery({
    queryKey: ['supplier-products', 'infinite', supplierId, { search: search?.trim() || '' }],
    queryFn: ({ pageParam = 1, signal }) =>
      getSupplierProductsApi(
        supplierId,
        {
          page: pageParam as number,
          limit: 20,
          search: search?.trim() || undefined,
        },
        { signal },
      ),

    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
    enabled: Boolean(supplierId),
    staleTime: 1000 * 30,
  });
}
