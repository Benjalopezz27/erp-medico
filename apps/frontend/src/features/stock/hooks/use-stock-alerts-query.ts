import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getStockAlertsApi } from '../api/stock.api';
import { stockKeys } from './stock-keys';
import type {
  IStockAlertsSearchParams,
  IStockOverviewItem,
  PaginatedStockResponse,
} from '../types/stock.types';

export function useStockAlertsQuery(params: IStockAlertsSearchParams = {}) {
  return useQuery<PaginatedStockResponse<IStockOverviewItem>, Error>({
    queryKey: stockKeys.alertList(params),
    queryFn: () => getStockAlertsApi(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30, // 30 seconds
  });
}
