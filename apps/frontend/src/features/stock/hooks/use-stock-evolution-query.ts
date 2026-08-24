import { useQuery } from '@tanstack/react-query';
import { getStockEvolutionApi } from '../api/stock.api';
import type { IStockEvolutionResponse, StockEvolutionParams } from '../types/stock.types';

export const STOCK_EVOLUTION_QUERY_KEY = ['stock', 'evolution'] as const;

export function useStockEvolutionQuery(productId: string, params: StockEvolutionParams = {}) {
  return useQuery<IStockEvolutionResponse, Error>({
    queryKey: [...STOCK_EVOLUTION_QUERY_KEY, productId, params],
    queryFn: () => getStockEvolutionApi(productId, params),
    enabled: Boolean(productId && productId.trim().length > 0),
    staleTime: 1000 * 30, // 30 seconds
  });
}
