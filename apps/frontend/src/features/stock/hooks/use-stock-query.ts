import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getStockOverviewApi } from '../api/stock.api';
import type {
  IStockOverviewItem,
  IStockSearchParams,
  PaginatedStockResponse,
} from '../types/stock.types';

export const STOCK_QUERY_KEY = ['stock', 'overview'] as const;

export function useStockQuery(params: IStockSearchParams) {
  return useQuery<PaginatedStockResponse<IStockOverviewItem>, Error>({
    queryKey: [...STOCK_QUERY_KEY, params],
    queryFn: () => getStockOverviewApi(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30, // 30 seconds
  });
}
