import { StockMovementType, QuarantineStatus, StockStatus } from '../enums/stock.enum';
import type { ProductStatus } from '../enums/catalog.enum';

export interface IStock {
  id: string;
  productId: string;
  currentBaseStock: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IStockMovement {
  id: string;
  productId: string;
  movementType: StockMovementType;
  quantityBase: number;
  previousStock: number;
  subsequentStock: number;
  reason: string;
  documentReference?: string | null;
  userId: string;
  createdAt: Date | string;
}

export interface IQuarantineStock {
  id: string;
  productId: string;
  quantity: number;
  reason: string;
  status: QuarantineStatus;
  resolutionNotes?: string | null;
  resolvedAt?: Date | string | null;
  userId: string;
  createdAt: Date | string;
}

export interface IStockPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedStockResponse<T> {
  items: T[];
  meta: IStockPaginationMeta;
}

export interface IStockOverviewItem {
  productId: string;
  internalCode: string;
  productName: string;
  category: {
    id: string;
    name: string;
  };
  baseUnit: {
    id: string;
    name: string;
    symbol: string;
  };
  currentBaseStock: number;
  minStock: number;
  stockStatus: StockStatus;
  status: ProductStatus;
}

export interface IStockMovementItem {
  id: string;
  movementType: StockMovementType;
  quantityBase: number;
  previousStock: number;
  subsequentStock: number;
  reason: string;
  documentReference?: string | null;
  user: {
    id: string;
    name: string;
  };
  createdAt: Date | string;
}

export interface IStockDetailProductSummary {
  productId: string;
  internalCode: string;
  productName: string;
  status: ProductStatus;
  category: {
    id: string;
    name: string;
  };
  baseUnit: {
    id: string;
    name: string;
    symbol: string;
  };
  currentBaseStock: number;
  minStock: number;
  stockStatus: StockStatus;
}

export interface IStockDetailResponse {
  product: IStockDetailProductSummary;
  items: IStockMovementItem[];
  meta: IStockPaginationMeta;
}

export interface IStockEvolutionPoint {
  timestamp: string;
  balance: number;
  event: StockMovementType | 'BASELINE';
  quantity: number;
}

export interface IStockEvolutionResponse {
  productId: string;
  minStock: number;
  truncated: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  points: IStockEvolutionPoint[];
}

export interface IStockSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  stockStatus?: StockStatus;
  alertsOnly?: boolean;
}

export interface IStockMovementsSearchParams {
  page?: number;
  limit?: number;
  movementType?: StockMovementType;
  from?: string;
  to?: string;
}

export type StockAdjustmentMovementType =
  StockMovementType.AJUSTE_ENTRADA | StockMovementType.AJUSTE_SALIDA | StockMovementType.MERMA;

export interface ICreateStockAdjustmentDto {
  productId: string;
  movementType: StockAdjustmentMovementType;
  quantityBase: number;
  reason: string;
  documentReference?: string | null;
}

export interface IStockAlertsSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}
