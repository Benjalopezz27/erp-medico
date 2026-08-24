import { apiClient } from '@/services/api.client';
import type {
  IStockDetailResponse,
  IStockEvolutionResponse,
  IStockMovementsSearchParams,
  IStockOverviewItem,
  IStockSearchParams,
  PaginatedStockResponse,
  StockEvolutionParams,
} from '../types/stock.types';

/**
 * Fetches paginated stock overview of active products.
 */
export async function getStockOverviewApi(
  params: IStockSearchParams,
): Promise<PaginatedStockResponse<IStockOverviewItem>> {
  const queryParams: Record<string, string | number> = {
    page: params.page || 1,
    limit: params.limit || 10,
  };

  if (params.search && params.search.trim().length > 0) {
    queryParams.search = params.search.trim();
  }

  if (params.category && params.category !== 'ALL') {
    queryParams.categoryId = params.category;
  }

  if (params.stockStatus && params.stockStatus !== ('ALL' as any)) {
    queryParams.stockStatus = params.stockStatus;
  }

  const { data } = await apiClient.get<PaginatedStockResponse<IStockOverviewItem>>('/stock', {
    params: queryParams,
  });

  return data;
}

/**
 * Fetches paginated immutable movement ledger and product summary for a specific product.
 */
export async function getProductMovementsApi(
  productId: string,
  params: IStockMovementsSearchParams,
): Promise<IStockDetailResponse> {
  const queryParams: Record<string, string | number> = {
    page: params.page || 1,
    limit: params.limit || 10,
  };

  if (params.movementType && params.movementType !== ('ALL' as any)) {
    queryParams.movementType = params.movementType;
  }

  if (params.from) {
    queryParams.from = params.from;
  }

  if (params.to) {
    queryParams.to = params.to;
  }

  const { data } = await apiClient.get<IStockDetailResponse>(`/stock/${productId}/movements`, {
    params: queryParams,
  });

  return data;
}

/**
 * Fetches time-series stock evolution points for Recharts curve.
 */
export async function getStockEvolutionApi(
  productId: string,
  params: StockEvolutionParams = {},
): Promise<IStockEvolutionResponse> {
  const queryParams: Record<string, string | number> = {
    limit: params.limit || 50,
  };

  if (params.from) {
    queryParams.from = params.from;
  }

  if (params.to) {
    queryParams.to = params.to;
  }

  const { data } = await apiClient.get<IStockEvolutionResponse>(`/stock/${productId}/evolution`, {
    params: queryParams,
  });

  return data;
}
