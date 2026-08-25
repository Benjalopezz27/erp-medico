import { useQuery } from '@tanstack/react-query';
import { getSupplierProductsApi, getSupplierProductByIdApi } from '../api/supplier-products.api';
import { supplierProductsKeys } from './supplier-products-keys';
import type { ISupplierProductSearchParams } from '../types/supplier-products.types';

export function useSupplierProductsQuery(supplierId: string, params: ISupplierProductSearchParams) {
  return useQuery({
    queryKey: supplierProductsKeys.list(supplierId, params),
    queryFn: () => getSupplierProductsApi(supplierId, params),
    enabled: Boolean(supplierId),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useSupplierProductDetailQuery(supplierId: string, associationId: string) {
  return useQuery({
    queryKey: supplierProductsKeys.detail(supplierId, associationId),
    queryFn: () => getSupplierProductByIdApi(supplierId, associationId),
    enabled: Boolean(supplierId) && Boolean(associationId),
    staleTime: 1000 * 60, // 1 minute
  });
}
