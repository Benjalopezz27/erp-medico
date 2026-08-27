import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createGoodsReceiptApi } from '../api/purchase-orders.api';
import { purchaseOrdersKeys } from './purchase-orders-keys';
import { stockKeys } from '@/features/stock/hooks/stock-keys';
import type { ICreateGoodsReceiptPayload } from '../types/purchase-orders.types';

export function useCreateGoodsReceiptMutation(purchaseOrderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ICreateGoodsReceiptPayload) =>
      createGoodsReceiptApi(purchaseOrderId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: purchaseOrdersKeys.all }),
        queryClient.invalidateQueries({ queryKey: stockKeys.all }),
      ]);
    },
  });
}
