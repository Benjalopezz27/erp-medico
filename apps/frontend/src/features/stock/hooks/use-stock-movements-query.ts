import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getProductMovementsApi } from '../api/stock.api';
import { stockKeys } from './stock-keys';
import type { IStockDetailResponse, IStockMovementsSearchParams } from '../types/stock.types';

export const STOCK_MOVEMENTS_QUERY_KEY = ['stock', 'movements'] as const;

export function useStockMovementsQuery(productId: string, params: IStockMovementsSearchParams) {
  return useQuery<IStockDetailResponse, Error>({
    queryKey: stockKeys.movements(productId, params),
    queryFn: () => getProductMovementsApi(productId, params),
    enabled: Boolean(productId && productId.trim().length > 0),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30, // 30 seconds
  });
}
