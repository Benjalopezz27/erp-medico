import {
  ProductStatus,
  StockMovementType,
  StockStatus,
  IStockPaginationMeta,
  PaginatedStockResponse,
  IStockOverviewItem,
  IStockMovementItem,
  IStockDetailResponse,
  IStockEvolutionPoint,
  IStockEvolutionResponse,
  IStockSearchParams,
  IStockMovementsSearchParams,
} from '@erp/shared-types';

export { StockStatus, StockMovementType, ProductStatus };
export type {
  IStockPaginationMeta,
  PaginatedStockResponse,
  IStockOverviewItem,
  IStockMovementItem,
  IStockDetailResponse,
  IStockEvolutionPoint,
  IStockEvolutionResponse,
  IStockSearchParams,
  IStockMovementsSearchParams,
};

export interface StockEvolutionParams {
  limit?: number;
  from?: string;
  to?: string;
}
