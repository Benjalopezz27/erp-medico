import { ProductStatus, StockMovementType, StockStatus } from '@erp/shared-types';
import type {
  IStockOverviewItem,
  IStockMovementItem,
  IStockDetailResponse,
  PaginatedStockResponse,
  IStockMovement,
  ICreateStockAdjustmentDto,
} from '../types/stock.types';

export function buildStockOverviewItem(
  overrides?: Partial<IStockOverviewItem>,
): IStockOverviewItem {
  return {
    productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    internalCode: 'P0001',
    productName: 'Ibuprofeno 400mg',
    category: {
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
      name: 'Analgésicos',
    },
    baseUnit: {
      id: 'u0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
      name: 'Caja',
      symbol: 'cj',
    },
    currentBaseStock: 100,
    minStock: 50,
    stockStatus: StockStatus.NORMAL,
    status: ProductStatus.ACTIVE,
    ...overrides,
  };
}

export function buildStockMovementItem(
  overrides?: Partial<IStockMovementItem>,
): IStockMovementItem {
  return {
    id: 'm0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    movementType: StockMovementType.AJUSTE_ENTRADA,
    quantityBase: 10,
    previousStock: 100,
    subsequentStock: 110,
    reason: 'Ajuste inicial de inventario',
    documentReference: 'ACTA-001',
    user: {
      id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
      name: 'Admin Test',
    },
    createdAt: '2026-08-24T12:00:00.000Z',
    ...overrides,
  };
}

export function buildStockAdjustmentResponse(overrides?: Partial<IStockMovement>): IStockMovement {
  return {
    id: 'm0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
    productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    movementType: StockMovementType.AJUSTE_ENTRADA,
    quantityBase: 10,
    previousStock: 100,
    subsequentStock: 110,
    reason: 'Ajuste por conteo físico',
    documentReference: 'ACTA-2026-001',
    userId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
    createdAt: '2026-08-24T12:00:00.000Z',
    ...overrides,
  };
}

export function buildStockDetailResponse(
  overrides?: Partial<IStockDetailResponse>,
): IStockDetailResponse {
  const item = buildStockOverviewItem(overrides?.product);
  return {
    product: {
      productId: item.productId,
      internalCode: item.internalCode,
      productName: item.productName,
      status: item.status,
      category: item.category,
      baseUnit: item.baseUnit,
      currentBaseStock: item.currentBaseStock,
      minStock: item.minStock,
      stockStatus: item.stockStatus,
    },
    items: [buildStockMovementItem()],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    ...overrides,
  };
}

export function buildPaginatedStockResponse<T>(
  items: T[],
  metaOverrides?: Partial<PaginatedStockResponse<T>['meta']>,
): PaginatedStockResponse<T> {
  return {
    items,
    meta: {
      total: items.length,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      ...metaOverrides,
    },
  };
}

export function buildCreateStockAdjustmentDto(
  overrides?: Partial<ICreateStockAdjustmentDto>,
): ICreateStockAdjustmentDto {
  return {
    productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    movementType: StockMovementType.AJUSTE_ENTRADA,
    quantityBase: 10,
    reason: 'Ajuste por conteo físico',
    documentReference: 'ACTA-2026-001',
    ...overrides,
  };
}
