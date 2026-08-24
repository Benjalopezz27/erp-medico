import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postStockAdjustmentApi } from '../api/stock.api';
import { stockKeys } from './stock-keys';
import type { ICreateStockAdjustmentDto, IStockMovement } from '../types/stock.types';

export function useStockAdjustmentMutation() {
  const queryClient = useQueryClient();

  return useMutation<IStockMovement, Error, ICreateStockAdjustmentDto>({
    mutationFn: (dto: ICreateStockAdjustmentDto) => postStockAdjustmentApi(dto),
    onSuccess: (_data, variables) => {
      // 1. Invalidate catalog overview queries
      queryClient.invalidateQueries({ queryKey: stockKeys.overviews() });
      // 2. Invalidate alerts list & sidebar count
      queryClient.invalidateQueries({ queryKey: stockKeys.alerts() });
      // 3. Invalidate specific product movement ledger
      queryClient.invalidateQueries({
        queryKey: stockKeys.movementLists(variables.productId),
      });
      // 4. Invalidate specific product evolution time-series
      queryClient.invalidateQueries({
        queryKey: stockKeys.evolutions(variables.productId),
      });
      // 5. Invalidate products typeahead search
      queryClient.invalidateQueries({ queryKey: ['products', 'search'] });
    },
  });
}
