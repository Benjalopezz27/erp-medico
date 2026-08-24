import { useQuery } from '@tanstack/react-query';
import { getStockAlertsApi } from '../api/stock.api';
import { stockKeys } from './stock-keys';

export function useStockAlertsCountQuery() {
  return useQuery({
    queryKey: stockKeys.alertCount(),
    queryFn: () => getStockAlertsApi({ limit: 1 }),
    select: (data) => data.meta.total,
    staleTime: 1000 * 60, // 60 seconds
  });
}
