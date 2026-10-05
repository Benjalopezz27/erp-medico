import {
  ProductStatus,
  StockMovementType,
  StockStatus,
  StockBulkRowErrorCode,
  StockBulkFileErrorCode,
  StockImportBatchResult,
  StockBulkLoadRowStatus,
  QuarantineStatus,
  QuarantineResolution,
  IStockPaginationMeta,
  PaginatedStockResponse,
  IStockOverviewItem,
  IStockMovementItem,
  IStockDetailResponse,
  IStockEvolutionPoint,
  IStockEvolutionResponse,
  IStockSearchParams,
  IStockMovementsSearchParams,
  StockAdjustmentMovementType,
  ICreateStockAdjustmentDto,
  IStockAlertsSearchParams,
  IStockMovement,
  IStockImportBatch,
  IStockBulkLoadRawRow,
  IStockBulkLoadRowProduct,
  IStockBulkLoadRowError,
  IStockBulkLoadValidatedRow,
  IStockBulkLoadSummary,
  IStockBulkLoadPreviewResponse,
  IStockBulkLoadConfirmResponse,
  IStockBulkLoadTemplateQuery,
  IQuarantineStock,
  IQuarantineStockProduct,
  IQuarantineStockActor,
  IQuarantineSearchParams,
} from '@erp/shared-types';

export {
  StockStatus,
  StockMovementType,
  ProductStatus,
  StockBulkRowErrorCode,
  StockBulkFileErrorCode,
  StockImportBatchResult,
  StockBulkLoadRowStatus,
  QuarantineStatus,
  QuarantineResolution,
};

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
  StockAdjustmentMovementType,
  ICreateStockAdjustmentDto,
  IStockAlertsSearchParams,
  IStockMovement,
  IStockImportBatch,
  IStockBulkLoadRawRow,
  IStockBulkLoadRowProduct,
  IStockBulkLoadRowError,
  IStockBulkLoadValidatedRow,
  IStockBulkLoadSummary,
  IStockBulkLoadPreviewResponse,
  IStockBulkLoadConfirmResponse,
  IStockBulkLoadTemplateQuery,
  IQuarantineStock,
  IQuarantineStockProduct,
  IQuarantineStockActor,
  IQuarantineSearchParams,
};

export const STOCK_SORT_FIELDS = [
  'internalCode',
  'name',
  'category',
  'currentStock',
  'minStock',
  'status',
] as const;
export type StockSortField = (typeof STOCK_SORT_FIELDS)[number];

export const STOCK_MOVEMENT_SORT_FIELDS = [
  'createdAt',
  'movementType',
  'quantityBase',
  'previousStock',
  'subsequentStock',
  'user',
] as const;
export type StockMovementSortField = (typeof STOCK_MOVEMENT_SORT_FIELDS)[number];

export interface StockEvolutionParams {
  limit?: number;
  from?: string;
  to?: string;
}
