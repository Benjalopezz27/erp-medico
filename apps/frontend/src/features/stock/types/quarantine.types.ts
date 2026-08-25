export {
  QuarantineStatus,
  QuarantineResolution,
  type IQuarantineStock,
  type IQuarantineStockProduct,
  type IQuarantineStockActor,
  type IQuarantineSearchParams,
  type PaginatedStockResponse,
} from '@erp/shared-types';

export interface CreateQuarantinePayload {
  productId: string;
  quantityBase: number;
  reason: string;
}

export interface ResolveQuarantinePayload {
  resolution: import('@erp/shared-types').QuarantineResolution;
  resolutionNotes: string;
}
