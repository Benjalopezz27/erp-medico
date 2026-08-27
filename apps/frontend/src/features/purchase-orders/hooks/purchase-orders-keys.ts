import type { IPurchaseOrderSearchParams } from '../types/purchase-orders.types';

export const purchaseOrdersKeys = {
  all: ['purchase-orders'] as const,
  lists: () => [...purchaseOrdersKeys.all, 'list'] as const,
  list: (params: IPurchaseOrderSearchParams) => [...purchaseOrdersKeys.lists(), params] as const,
  details: () => [...purchaseOrdersKeys.all, 'detail'] as const,
  detail: (id: string) => [...purchaseOrdersKeys.details(), id] as const,
};
