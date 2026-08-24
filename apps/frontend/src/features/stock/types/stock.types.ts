import {
  ProductStatus,
  StockMovementType,
  StockStatus,
  StockBulkRowErrorCode,
  StockBulkFileErrorCode,
  StockImportBatchResult,
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
} from '@erp/shared-types';

export {
  StockStatus,
  StockMovementType,
  ProductStatus,
  StockBulkRowErrorCode,
  StockBulkFileErrorCode,
  StockImportBatchResult,
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
};

export interface StockEvolutionParams {
  limit?: number;
  from?: string;
  to?: string;
}
