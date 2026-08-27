import type {
  IPurchaseOrderSearchParams,
  IQueryGoodsReceiptsParams,
  IBackorderSearchParams,
} from '../types/purchase-orders.types';

export const purchaseOrdersKeys = {
  all: ['purchase-orders'] as const,
  lists: () => [...purchaseOrdersKeys.all, 'list'] as const,
  list: (params: IPurchaseOrderSearchParams) => [...purchaseOrdersKeys.lists(), params] as const,
  details: () => [...purchaseOrdersKeys.all, 'detail'] as const,
  detail: (id: string) => [...purchaseOrdersKeys.details(), id] as const,
  receipts: (purchaseOrderId: string) =>
    [...purchaseOrdersKeys.detail(purchaseOrderId), 'receipts'] as const,
  receiptList: (purchaseOrderId: string, params: IQueryGoodsReceiptsParams) =>
    [...purchaseOrdersKeys.receipts(purchaseOrderId), params] as const,
  backorders: () => [...purchaseOrdersKeys.all, 'backorders'] as const,
  backorderList: (params: IBackorderSearchParams) =>
    [...purchaseOrdersKeys.backorders(), params] as const,
};
