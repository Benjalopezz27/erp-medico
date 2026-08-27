import { useQuery } from '@tanstack/react-query';
import { getGoodsReceiptsByPurchaseOrderApi } from '../api/purchase-orders.api';
import { purchaseOrdersKeys } from './purchase-orders-keys';
import type { IQueryGoodsReceiptsParams } from '../types/purchase-orders.types';

export function useGoodsReceiptsQuery(
  purchaseOrderId: string,
  params: IQueryGoodsReceiptsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: purchaseOrdersKeys.receiptList(purchaseOrderId, params),
    queryFn: ({ signal }) =>
      getGoodsReceiptsByPurchaseOrderApi(purchaseOrderId, params, { signal }),
    enabled: Boolean(purchaseOrderId) && (options?.enabled ?? true),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 30,
  });
}
