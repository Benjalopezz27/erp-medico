import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getCustomerByIdApi, getCustomersApi } from '../api/customers.api';
import type { CustomerSearchParams } from '../types/customers.types';
import { customerKeys } from './customer-keys';

export function useCustomersQuery(
  params: CustomerSearchParams,
  enabled = true,
  preservePreviousData = true,
) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => getCustomersApi(params),
    placeholderData: preservePreviousData ? keepPreviousData : undefined,
    enabled,
  });
}

export function useCustomerDetailQuery(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => getCustomerByIdApi(id),
    enabled: Boolean(id),
  });
}
