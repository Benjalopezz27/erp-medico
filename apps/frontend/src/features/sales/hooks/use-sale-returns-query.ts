import { useQuery } from '@tanstack/react-query';
import { getSaleReturnsApi } from '../api/sales.api';
import { salesKeys } from './sales-keys';

export function useSaleReturnsQuery(saleId: string) {
  return useQuery({
    queryKey: salesKeys.returns(saleId),
    queryFn: () => getSaleReturnsApi(saleId),
    enabled: Boolean(saleId),
    retry: false,
  });
}
