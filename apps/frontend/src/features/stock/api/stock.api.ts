import { apiClient } from '@/services/api.client';
import type {
  ICreateStockAdjustmentDto,
  IStockAlertsSearchParams,
  IStockDetailResponse,
  IStockEvolutionResponse,
  IStockMovement,
  IStockMovementsSearchParams,
  IStockOverviewItem,
  IStockSearchParams,
  PaginatedStockResponse,
  StockEvolutionParams,
} from '../types/stock.types';

/**
 * Fetches paginated stock overview of active products.
 * If params.alertsOnly is true, routes to /stock/alerts.
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

  if (!params.alertsOnly && params.stockStatus && params.stockStatus !== ('ALL' as any)) {
    queryParams.stockStatus = params.stockStatus;
  }

  const endpoint = params.alertsOnly ? '/stock/alerts' : '/stock';

  const { data } = await apiClient.get<PaginatedStockResponse<IStockOverviewItem>>(endpoint, {
    params: queryParams,
  });

  return data;
}

/**
 * Fetches products with stock balance at or below minimum threshold (alerts).
 */
export async function getStockAlertsApi(
  params: IStockAlertsSearchParams = {},
): Promise<PaginatedStockResponse<IStockOverviewItem>> {
  const queryParams: Record<string, string | number> = {
    page: params.page || 1,
    limit: params.limit || 10,
  };

  if (params.search && params.search.trim().length > 0) {
    queryParams.search = params.search.trim();
  }

  if (params.categoryId && params.categoryId !== 'ALL') {
    queryParams.categoryId = params.categoryId;
  }

  const { data } = await apiClient.get<PaginatedStockResponse<IStockOverviewItem>>(
    '/stock/alerts',
    {
      params: queryParams,
    },
  );

  return data;
}

/**
 * Submits a manual inventory adjustment (AJUSTE_ENTRADA, AJUSTE_SALIDA, MERMA).
 */
export async function postStockAdjustmentApi(
  dto: ICreateStockAdjustmentDto,
): Promise<IStockMovement> {
  const { data } = await apiClient.post<IStockMovement>('/stock/adjustments', dto);
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
