import { useQuery } from '@tanstack/react-query';
import { getBackordersApi } from '../api/purchase-orders.api';
import type { IBackorderSearchParams } from '../types/purchase-orders.types';
import { purchaseOrdersKeys } from './purchase-orders-keys';

export function useBackordersQuery(params: IBackorderSearchParams) {
  return useQuery({
    queryKey: purchaseOrdersKeys.backorderList(params),
    queryFn: ({ signal }) => getBackordersApi(params, { signal }),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
  });
}
