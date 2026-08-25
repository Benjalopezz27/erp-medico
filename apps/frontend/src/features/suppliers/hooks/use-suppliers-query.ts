import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getSuppliersApi, getSupplierByIdApi } from '../api/suppliers.api';
import { supplierKeys } from './suppliers-keys';
import type { ISupplierSearchParams } from '../types/suppliers.types';

export function useSuppliersQuery(params: ISupplierSearchParams) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: () => getSuppliersApi(params),
    placeholderData: keepPreviousData,
  });
}

export function useSupplierDetailQuery(id: string) {
  return useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn: () => getSupplierByIdApi(id),
    enabled: Boolean(id),
  });
}
