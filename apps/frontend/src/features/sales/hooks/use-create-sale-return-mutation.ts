import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ICreateSaleReturnPayload } from '@erp/shared-types';
import { productKeys } from '@/features/products/hooks/use-products-query';
import { stockKeys } from '@/features/stock/hooks/stock-keys';
import { quarantineKeys } from '@/features/stock/hooks/quarantine-keys';
import { createSaleReturnApi } from '../api/sales.api';
import { salesKeys } from './sales-keys';

export function useCreateSaleReturnMutation(saleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ICreateSaleReturnPayload) => createSaleReturnApi(saleId, payload),
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: salesKeys.detail(saleId) }),
        queryClient.invalidateQueries({ queryKey: salesKeys.returns(saleId) }),
        queryClient.invalidateQueries({ queryKey: stockKeys.all }),
        queryClient.invalidateQueries({ queryKey: quarantineKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
      ]);
    },
  });
}
