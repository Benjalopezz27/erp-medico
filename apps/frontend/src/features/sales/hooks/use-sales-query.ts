import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ISaleSearchParams } from '@erp/shared-types';
import { getSaleByIdApi, getSalesApi } from '../api/sales.api';
import { salesKeys } from './sales-keys';

export function useSalesQuery(params: ISaleSearchParams) {
  return useQuery({
    queryKey: salesKeys.list(params),
    queryFn: () => getSalesApi(params),
    placeholderData: keepPreviousData,
  });
}

export function useSaleDetailQuery(id: string) {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: () => getSaleByIdApi(id),
    enabled: Boolean(id),
    retry: false,
  });
}
