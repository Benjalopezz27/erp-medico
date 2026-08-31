import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ICreateSalePayload } from '@erp/shared-types';
import { productKeys } from '@/features/products/hooks/use-products-query';
import { stockKeys } from '@/features/stock/hooks/stock-keys';
import { customerPricingKeys } from '@/features/customer-pricing/hooks/customer-pricing-keys';
import { createSaleApi } from '../api/sales.api';
import { salesKeys } from './sales-keys';

export function useCreateSaleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ICreateSalePayload) => createSaleApi(payload),
    retry: false,
    onSuccess: async (sale, variables) => {
      queryClient.setQueryData(salesKeys.detail(sale.id), sale);
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: salesKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
        queryClient.invalidateQueries({ queryKey: stockKeys.all }),
      ];
      if (variables.customerId) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: customerPricingKeys.resolutions(variables.customerId),
          }),
        );
      }
      await Promise.all(invalidations);
    },
  });
}
