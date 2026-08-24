import type {
  IStockSearchParams,
  IStockAlertsSearchParams,
  IStockMovementsSearchParams,
  StockEvolutionParams,
} from '../types/stock.types';

export const stockKeys = {
  all: ['stock'] as const,

  overviews: () => [...stockKeys.all, 'overview'] as const,
  overview: (params: IStockSearchParams) => [...stockKeys.overviews(), params] as const,

  alerts: () => [...stockKeys.all, 'alerts'] as const,
  alertList: (params?: IStockAlertsSearchParams) =>
    [...stockKeys.alerts(), 'list', params] as const,
  alertCount: () => [...stockKeys.alerts(), 'count'] as const,

  movementLists: (productId: string) => [...stockKeys.all, 'movements', productId] as const,
  movements: (productId: string, params?: IStockMovementsSearchParams) =>
    [...stockKeys.movementLists(productId), params] as const,

  evolutions: (productId: string) => [...stockKeys.all, 'evolution', productId] as const,
  evolution: (productId: string, params?: StockEvolutionParams) =>
    [...stockKeys.evolutions(productId), params] as const,
};
